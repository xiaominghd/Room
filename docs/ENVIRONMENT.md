# 后端环境：从零跑起来

> 给执行的人或 AI。目标：**一条命令起数据库，三条命令验证规则生效**。
> 依据：`docs/DATA-MODEL.md`（v0.2）、`server/schema.sql`、`server/seed.sql`、`server/verify.sql`。
> 状态：SQL 已按模型写全，但**没有在真实 Postgres 上跑过**（写这份文档的机器没有 Docker）。

---

## 0. 验收标准（做完要看到什么）

全部做完，应当满足：

1. `docker compose ps` 里 `room-db` 是 **healthy**
2. `\dt` 能看到 **10 张表**：`rooms users days day_keeps day_cards media messages door_closures day_moments day_marks`
3. `seed.sql` 最后那条查询输出 **两行**（同一天、两个人的日记，内容不同）
4. `verify.sql` 里标了「期望报错」的语句**全部真的报错**（13 条）
5. 调用 `select purge_day(1, '一句话');` 之后：
   - 这一天有人留 → 原文还在
   - 删掉留的票再调用 → 原文被删、日记留下

任何一条没达到，就是没做完。

---

## 1. 前置条件

| 项 | 要求 |
|---|---|
| 系统 | Windows 10/11（本仓库在这台机器上开发） |
| 权限 | 能装软件（管理员）；会要求重启一次 |
| 网络 | 能访问国内镜像；**Docker Hub 大概率不通**，要配镜像加速 |
| 磁盘 | 至少 5 GB 空闲 |

---

## 2. 装 Docker Desktop

管理员 PowerShell：

```powershell
winget install -e --id Docker.DockerDesktop
```

装完**重启**。重启后启动 Docker Desktop，等托盘图标变成「Engine running」。

> 如果提示要启用 WSL2：`wsl --install`，然后再重启。
> 如果公司电脑不让装：跳到第 10 节「不装 Docker 的替代方案」。

---

## 3. 配镜像加速（关键）

Docker Hub 在这条网络下不通，直接 `docker pull postgres:16-alpine` 会超时。

Docker Desktop → Settings → Docker Engine，把配置改成：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerproxy.net",
    "https://hub.rat.dev"
  ]
}
```

点 **Apply & restart**。然后验证：

```powershell
docker pull postgres:16-alpine
```

能拉下来再往下走。三个镜像站可以逐个试，哪个通用哪个。

---

## 4. 起数据库

仓库里已经准备好 `server/docker-compose.yml`，在仓库根目录执行：

```powershell
cd D:\Work\IM\server
Copy-Item .env.example .env
docker compose up -d
docker compose ps
```

第一行 `Copy-Item` 只是为了有个本地密码文件；`.env` 已经在 `.gitignore` 里（如果没有，加一行）。

等健康检查通过：

```powershell
docker compose exec db pg_isready -U room -d room
# room-db 输出: /var/run/postgresql:5432 - accepting connections
```

### 它做了什么

- `postgres:16-alpine`，库名 `room`，用户 `room`
- 端口 `5432` 映射到本机
- 数据落在卷 `room_pgdata`（**删卷 = 删库**）
- 第一次初始化时，自动按顺序执行 `schema.sql` → `seed.sql`

> 初始化脚本只在**空卷**时跑。想重来：`docker compose down -v` 再 `up -d`。

---

## 5. 验证表结构

```powershell
docker compose exec db psql -U room -d room -c "\dt"
```

应当看到 10 张表。再看几条关键约束：

```powershell
docker compose exec db psql -U room -d room -c "\d day_keeps"
docker compose exec db psql -U room -d room -c "\d day_cards"
docker compose exec db psql -U room -d room -c "select room_today('11111111-1111-1111-1111-111111111111');"
```

最后一条应该返回今天的日期（房间时区）。

---

## 6. 灌种子数据（如果初始化没跑）

```powershell
docker compose exec -T db psql -U room -d room -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/20-seed.sql
```

期望结尾输出两行日记：

```
   day    | username | rev |        text_head
----------+----------+-----+------------------------
 2025-10-16 | 小满     |   1 | 白天各忙各的，晚上聊到想吃什么…
 2025-10-16 | 阿澄     |   1 | 他到家很晚，我先把饭吃了…
```

**这两行内容不一样**，是「日记一人一份」的证据。

---

## 7. 跑自检（最重要的一步）

```powershell
docker compose exec -T db psql -U room -d room -f /docker-entrypoint-initdb.d/../verify.sql
```

如果 `verify.sql` 没被挂进去，用复制进去的方式：

```powershell
Get-Content .\verify.sql | docker compose exec -T db psql -U room -d room
```

**expectation**：标了「期望：ERROR」的 13 条，每条都真的报错。
逐条对照 `server/verify.sql` 里的注释，重点看：

| 自检 | 应该报什么 |
|---|---|
| 第三个人进房 | `slot_domain` / `users_slot` |
| 同名进房 | `users_name` |
| 空房间名 | `name_len` |
| 房间码带 0/1/I/O/L | `code_shape` |
| 空关门句 | `line_len` |
| 同一个人关两道门 | `door_one_closed` |
| 没有卡就开门 | `opened_needs_key` |
| 此刻第二条 | 主键冲突 |
| 同一条消息标两次 | `marks_one_per_person` |
| 改已生成好的日记 | 「已经生成好的卡不能改」 |
| 定型后再写一版 | 「已经定型」 |

最后两条不是约束，是调用函数的结果：
- 有人留 → `purge_day` 不动原文
- 没人留 → `purge_day` 删原文、留日记

---

## 8. 试一次「第 21 天」

```powershell
docker compose exec db psql -U room -d room -c "select count(*) from messages where day_id = 1;"
docker compose exec db psql -U room -d room -c "select purge_day(1, '那天很短。');"
docker compose exec db psql -U room -d room -c "select count(*) from messages where day_id = 1;"
```

因为种子里这天有人留（`day_keeps` 有一行），所以两次 `count` **一样**。

把票删掉再试：

```powershell
docker compose exec db psql -U room -d room -c "delete from day_keeps where day_id = 1;"
docker compose exec db psql -U room -d room -c "select purge_day(1, '那天很短。');"
docker compose exec db psql -U room -d room -c "select count(*) from messages where day_id = 1 and kind <> 'card';"
```

最后一次应该是 **0**，而 `select * from day_cards where day_id = 1;` 里多了 `rev = 21`。

---

## 9. 常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| `docker pull` 超时 | Docker Hub 不通 | 回到第 3 节配镜像 |
| `docker compose up` 报端口被占 | 本机已有 Postgres | 改 `.env` 里 `POSTGRES_PORT=5433`，同时改 `ports` |
| `psql: FATAL: password authentication failed` | `.env` 密码和卷里的不一致 | `docker compose down -v` 重来（会清数据） |
| 初始化脚本没跑 | 卷不是空的 | `docker compose down -v` |
| `function room_today does not exist` | schema 没跑成功 | 手动 `psql -f schema.sql`，看报错行 |
| `verify.sql` 某条没报错 | 那条规则没锁住 | **停下来**，把那条发给写模型的人（这是真 bug） |
| 中文乱码 | 终端编码 | 用 `chcp 65001`，或把输出重定向到文件再用编辑器看 |

---

## 10. 不装 Docker 的替代方案

按优先级：

1. **云上的托管 Postgres**（Supabase / Neon / 阿里云 RDS）：把 `schema.sql`、`seed.sql`、`verify.sql` 在 SQL 控制台里依次执行，验收标准完全一样
2. **便携版 Postgres**：下载 `postgresql-16.x-windows-x64-binaries.zip`，解压后 `initdb` + `pg_ctl start`，同样能跑
3. **WSL2 + apt 装 postgresql-16**：`wsl --install` 之后 `sudo apt install postgresql`

三种都能达到第 0 节的验收标准，Docker 只是最省事的一种。

---

## 11. 交接给下一个 AI 的提示词

直接复制这段：

```
项目在 D:\Work\IM。目标：把后端数据库环境跑起来，不改业务代码。

1. 读 server/schema.sql、server/seed.sql、server/verify.sql，以及 docs/DATA-MODEL.md §3–§5。
2. 用 Docker 起 Postgres 16（server/docker-compose.yml 已准备好）。
   如果 Docker Hub 拉不动，先配 registry-mirrors（见 docs/ENVIRONMENT.md §3）。
3. 按 docs/ENVIRONMENT.md §5–§8 验收：
   - 10 张表
   - 种子输出两行内容不同的日记
   - verify.sql 里 13 条「期望报错」全部报错
   - purge_day 在「有人留」时不删原文、「没人留」时删原文且留下 rev=21 的日记
4. 任何一条不通过，先定位是哪条约束/函数的问题，报告行号，不要改文档去迁就实现。
5. 全部通过后，输出一份「实测结果」，列出每条自检的实际报错信息。

不要做的事：不要改 PRD、不要改 DATA-MODEL、不要引入 ORM、不要建额外的表。
```

---

## 12. 这份文档之后

数据库跑通后，后端还剩三块，按顺序：

1. **API 骨架**：注册 / 登录 / 进房 / 发消息 / 补拉 / 对齐（`DATA-MODEL.md` §6 有 21 个接口的清单）
2. **每日任务**：一个 SQL + 一个 cron（`docs/BACKEND.md` §3）
3. **AI 与推送**：AI 写不出来就落降级日记；推送只推新消息

这三块都不需要再改数据模型。
