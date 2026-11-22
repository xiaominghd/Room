# 后端实现清单与云端开发方案

> 依据：`docs/PRD-v4.md`、`HANDOFF.md` 第 6 节
> **已过期**：本文按 7 天 TTL 写，PRD 现在是 **21 天分级压缩**（第 1 天成卡、第 7/14/21 天压、第 21 天删原文），见 `PRD-v4.md` §4 与 `DATA-MODEL.md`。重写前不要照本文实现。
> 范围：房间 / 相册 / 底座。不写前端怎么画，只写服务端要负责什么。

---

## 0. 一句话

后端只做三件事：**替两个人保管七天内的话**、**替他们保存永久留下的照片**、**在该消失的时候真的删掉**。
其余（说给自己、已读、在线、推荐、统计）一条都不做。

结构上按 **「一个部署、很多房间」** 来写：v2 只有一间在用，但代码里不留「the room」这种单例——§12 是这一条的具体做法。

---

## 1. 范围

### 1.1 必须实现

| 域 | 服务端职责 |
|---|---|
| 邀请 | 一次性邀请码、内嵌服务器地址、上限 2 人、注册即失效 |
| 身份 | 用户名 + 密码 + 恢复码；登录、刷新、找回、单设备会话 |
| 房间 | 两人一个房间，无列表、无第三人 |
| 消息 | 文本 / 图片 / 语音；seq 递增；2 分钟撤回；断线补拉 |
| 消散 | **7 天到期硬删除内容**，只留「日期 · 条数」 |
| 相册 | 留后永久、双方共同、不可单方删、只能从我这边隐藏 |
| 脚注 | 单张开关；AI 只读那段时间的对话；只存摘要 |
| 停 | 单方、立即、只有按停的人能解除 |
| 想聊 | 单人只记状态；双人出问题；各答一句；AI 复述一次；24h 过期 |
| 导出 | 生成本人副本，对方收到提示，链接 7 天失效 |
| 通知 | 只推新消息；停 / 想聊不推；锁屏不显示内容 |
| 运维 | 备份、清理任务、监控、审计（不含内容） |

### 1.2 明确不做

说给自己（**只存本机，服务端没有这张表**）、已读回执、在线状态、输入中、消息搜索、聊天列表、群、联系人、推荐、情绪分析、纪念日、打卡、端到端加密（v2 不做）、多设备同步（v2 不做）。

---

## 2. 在云上开发：怎么搭

### 2.1 两种形态，别混在一起

| | 用途 | 放哪 |
|---|---|---|
| **开发环境** | 写代码、跑测试、连本地库 | 本地 devcontainer，或一台云开发机 |
| **预发 / 生产** | 真机联调、给另一台手机用 | 一台小 VPS 或一个 PaaS 应用 |

开发环境的数据是假的；生产数据不进开发环境。两边用不同的数据库、不同的对象存储桶、不同的密钥。

### 2.2 推荐：仓库里的 devcontainer（一致性最好）

```
server/
  docker-compose.dev.yml     # postgres:16 + minio + mailhog
  .devcontainer/devcontainer.json
  package.json
  src/
```

`docker-compose.dev.yml` 三件套：

```yaml
services:
  db:
    image: postgres:16
    environment: { POSTGRES_PASSWORD: dev, POSTGRES_DB: room }
    ports: ['5432:5432']
    volumes: ['pgdata:/var/lib/postgresql/data']
  minio:
    image: minio/minio
    command: server /data --console-address ':9001'
    environment: { MINIO_ROOT_USER: dev, MINIO_ROOT_PASSWORD: devdevdev }
    ports: ['9000:9000', '9001:9001']
  mailhog:
    image: mailhog/mailhog
    ports: ['8025:8025']
```

好处：换机器只 clone + `docker compose up`，数据库和对象存储的行为与线上一致。

### 2.3 如果要在云上写代码

| 方案 | 适合 | 注意 |
|---|---|---|
| GitHub Codespaces | 网络能稳定访问 GitHub | 国内延迟高，4C8G 免费额度有限 |
| 一台云开发机 + code-server | 国内网络、想要固定 IP | 2C4G 足够；端口只开 443，走 Tailscale / SSH 隧道 |
| Coder / Gitpod self-host | 多人协作 | 对两个人的项目过重 |

**建议**：本地写 + 云上一台预发机。真要云上写，用**香港/新加坡**的小机器（2C4G），避免备案与跨境延迟两头堵。

### 2.4 预发/生产：一台机器就够（房间多起来也是这套）

两个人用，不要上 K8s。单机 Docker Compose：

```
Caddy (443, 自动证书)
 ├─ api      Node 22 + Fastify
 ├─ worker   同一个镜像，跑 TTL / 过期 / 导出任务
 ├─ postgres 16（数据卷，每日备份）
 └─ minio    或直接用 Cloudflare R2 / 阿里云 OSS
```

- 域名：`room.example.com`（邀请链接就是 `https://room.example.com/i/<code>`）
- 机器：2C2G 起，Hetzner CX22 / 阿里云香港轻量 都行
- 备份：每天 `pg_dump` 到对象存储，保留 7 天；**备份里不含消息正文**（见 §8.3）

### 2.5 成本（两个人）

| 项 | 月成本 |
|---|---|
| VPS 2C2G | €4–8 / ¥40–90 |
| 对象存储（照片，几十 GB） | ¥0–10（R2 免费 10GB） |
| AI 调用（想聊 + 脚注） | 几块钱 |
| 域名 + 证书 | 证书免费，域名每年几十 |
| **合计** | **约 ¥50–120 / 月** |

---

## 3. 技术选型

| 层 | 选择 | 理由 |
|---|---|---|
| 运行时 | Node 22 + TypeScript | 与 App 同语言，一个人维护成本最低 |
| HTTP | Fastify | 快、插件化、WS 支持好 |
| DB | Postgres 16 | 事务、部分唯一索引、`timestamptz` 都够用 |
| 队列 | pg-boss | 不引入 Redis，任务表就在同一个库 |
| 对象存储 | S3 兼容（R2 / MinIO / OSS） | 预签名直传，服务端不过大文件 |
| 实时 | WebSocket（同进程） | 两人一屋，不需要独立网关 |
| 密码 | Argon2id | 内存硬，比 bcrypt 更抗 GPU |
| 令牌 | JWT 15min + 刷新令牌 30 天（库内存哈希） | 单设备，可随时吊销 |
| AI | 抽象层，默认国内模型 | 只发「想聊」的两句回答或照片附近的对话 |

---

## 4. 数据模型

只列关键字段与约束，不写完整迁移。

```sql
-- 房间与身份
rooms(id uuid pk, timezone text not null default 'Asia/Shanghai',
      created_at timestamptz, ended_at timestamptz, end_reason text)

-- 账号是全局的，房间靠 membership 关联：
-- v2 一人只进一间，但表结构允许一个人以后有多间（见 §12）
users(id uuid pk, username citext unique, password_hash text, recovery_hash text,
      display_name text, created_at timestamptz,
      unique (lower(username)))

memberships(id uuid pk, user_id uuid fk, room_id uuid fk,
            slot smallint check (slot in (1,2)),
            joined_at timestamptz, left_at timestamptz,
            unique (room_id, slot), unique (room_id, user_id))

invites(id uuid pk, room_id uuid fk, created_by uuid, code_hash text unique,
        expires_at timestamptz, used_at timestamptz, used_by uuid)

refresh_tokens(id uuid pk, user_id uuid fk, token_hash text,
               device_name text, expires_at timestamptz, revoked_at timestamptz)

-- 消息（唯一的临时数据）
messages(id bigserial pk, room_id uuid fk, sender_id uuid fk,
         seq bigint not null,                       -- 每房间递增，补拉用
         kind text check (kind in ('text','photo','voice')),
         body text, media_id uuid, voice_seconds int,
         created_at timestamptz not null,
         expires_at timestamptz not null,           -- created_at + 7d
         recalled_at timestamptz,
         unique (room_id, seq))

-- 消散痕迹（正文删掉后只剩这个）
traces(id bigserial pk, room_id uuid fk, day date not null, count int not null,
       unique (room_id, day))

-- 媒体：retain=true 表示已进相册，不随消息过期
media(id uuid pk, room_id uuid fk, owner_id uuid,
      kind text, storage_key text, bytes bigint, width int, height int,
      taken_at timestamptz, place text,
      retain boolean not null default false, created_at timestamptz)

-- 相册：共同内容，只能 hide，不能删
album_items(id uuid pk, room_id uuid fk, media_id uuid unique,
            kept_by uuid, kept_at timestamptz,
            taken_at timestamptz, place text,
            footnote_enabled boolean default false,
            footnote_summary text, footnote_at timestamptz)
album_hides(album_item_id uuid, user_id uuid, created_at timestamptz, primary key (album_item_id, user_id))

-- 停：同一房间同时只能有一条未清除的
stops(id uuid pk, room_id uuid fk, by_user uuid, line text,
      created_at timestamptz, cleared_at timestamptz)
create unique index one_active_stop on stops(room_id) where cleared_at is null;

-- 想聊
talks(id uuid pk, room_id uuid fk, status text, question text,
      started_at timestamptz, expires_at timestamptz, closed_at timestamptz)
talk_presses(talk_id uuid, user_id uuid, created_at timestamptz, primary key (talk_id, user_id))
talk_answers(talk_id uuid, user_id uuid, body text, created_at timestamptz, primary key (talk_id, user_id))
talk_reflections(talk_id uuid unique, body text, model text, created_at timestamptz)

-- 导出
exports(id uuid pk, room_id uuid fk, user_id uuid, scope text, format text,
        status text, file_key text, expires_at timestamptz, created_at timestamptz)

devices(id uuid pk, user_id uuid fk, push_token text, platform text,
        enabled boolean, last_seen timestamptz)
```

**没有 `notes` 表**——说给自己只存本机，这条要在服务端代码里彻底不存在。

---

## 5. API

统一前缀 `/v1`，除注册/登录外全部要求 Bearer token；每个请求都校验 `user.room_id`。

### 5.1 身份与邀请

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/i/:code` | 邀请落地页：校验码、返回房间的服务器地址与「还剩几个位置」 |
| POST | `/v1/rooms` | 开一间房（未来「很多对情侣」的入口；v2 先只给内部用，一个部署也能跑） |
| POST | `/v1/rooms/:id/invites` | 房间成员生成邀请：一码一人、可设过期 |
| POST | `/v1/invites/:code/accept` | 注册第二个账号：用户名 + 密码 → 返回一次性**恢复码**（只显示这一次） |
| POST | `/v1/auth/login` | 用户名 + 密码 → access + refresh |
| POST | `/v1/auth/refresh` | 刷新令牌换新 access |
| POST | `/v1/auth/recover` | 用户名 + 恢复码 + 新密码 → 旧会话全吊销，返回新恢复码 |
| POST | `/v1/auth/logout` | 吊销当前 refresh |

### 5.2 房间与消息

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/v1/room` | 房间、对方昵称、房间时区、是否有未清除的 stop、想聊状态 |
| GET | `/v1/messages?after_seq=&limit=100` | 增量补拉，正序返回 |
| POST | `/v1/messages` | 发消息；`client_id` 幂等去重；返回 seq 与 expires_at |
| POST | `/v1/messages/:id/recall` | ≤120s 且只能撤回自己的；硬删 |
| POST | `/v1/media/presign` | 返回 PUT 预签名，限制 content-type 与大小 |
| POST | `/v1/media/:id/complete` | 客户端上报宽高、拍摄时间、地点，落库 |

### 5.3 相册

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/v1/messages/:id/keep` | 留：复制媒体为 retain、创建 album_item；幂等 |
| GET | `/v1/album?month=2025-10` | 按月返回，过滤自己 hide 掉的 |
| POST | `/v1/album/:id/hide` | 只写 album_hides，不影响对方 |
| PATCH | `/v1/album/:id/footnote` | 开关；打开时服务端触发生成摘要 |

### 5.4 停 / 想聊

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/v1/stop` | 单方按停；默认文案「今晚到这儿」 |
| PATCH | `/v1/stop` | 只有 by_user 能改文案（可空） |
| DELETE | `/v1/stop` | 只有 by_user 能点亮点；对方调用 403 |
| POST | `/v1/talk/press` | 单人只记录；双人返回问题 |
| POST | `/v1/talk/answer` | 各答一句 |
| POST | `/v1/talk/dismiss` | 收起来，不落档 |

### 5.5 导出 / 设备

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/v1/exports` | 入队；生成后广播给对方「对方导出了」 |
| GET | `/v1/exports/:id` | 状态 + 7 天签名链接 |
| POST | `/v1/devices` | 注册推送 token |
| PATCH | `/v1/me` | 昵称 / 通知开关 |

### 5.6 WebSocket

`/v1/ws?token=...`，只推进本房间事件：

```
message.created   { seq, message }
message.recalled  { id }
message.expired   { day, count }      // 消散后只剩这个
stop.changed      { stop | null }
talk.updated      { talk }
album.kept        { albumItem }
export.ready      { exportId }
```

断线重连：先 `GET /messages?after_seq=<last>` 补齐，再接 WS；WS 事件带 seq，发现空洞就补拉。

---

## 6. 关键规则（服务端必须自己判，不信客户端）

| 规则 | 实现要点 |
|---|---|
| 7 天删除 | `expires_at = created_at + interval '7 days'`；定时任务按房间、按天聚合后 **DELETE**，再删孤儿媒体。不做软删标记 |
| 痕迹 | 只写 `traces(room_id, day, count)`；day 用房间时区算，跨时区不跑偏 |
| 留 | 幂等；复制媒体为 retain（或引用计数）；之后消息过期不影响相册 |
| 不可删 | 没有任何删除相册的 API；只有 hide |
| 撤回 | 校验 `sender_id = me` 且 `now - created_at <= 120s`；硬删，不留痕 |
| 停 | 部分唯一索引保证同时只有一条；DELETE 时校验 `by_user` |
| 想聊 | 截止时间 = 房间时区当天 24:00；双人后 `expires_at = now + 24h`；AI 只发一次，失败落 `AI · 未接上` |
| 邀请 | 一码一人，用后写 `used_at`；`slot` 只允许 1、2；无公开注册 |
| 恢复码 | 服务端生成、只存 Argon2 哈希、返回一次；找回成功后**轮换** |
| 导出 | 只含消息与照片；**不含 notes（本来就没有）、不含恢复码**；链接 7 天 |

---

## 7. 后台任务

| 任务 | 频率 | 做什么 |
|---|---|---|
| `purge-expired` | 5 分钟 | 聚合到期消息 → 写 traces → 删消息 → 删孤儿媒体与对象 |
| `talk-expire` | 1 分钟 | 单人过 24:00 → `24:00 · 未成`；双人 24h 未答完 → `24 小时 · 未成` |
| `reflection` | 事件驱动 | 两句都答完 → 调模型 → 写复述 → 推送事件 |
| `export-build` | 事件驱动 | 生成 PDF / 文本 → 上传 → 7 天后清理 |
| `invite-expire` | 每天 | 过期邀请置为失效 |
| `backup` | 每天 | `pg_dump` 到对象存储；只含账号、相册、痕迹，**消息正文不入备份** |

`purge-expired` 的伪代码（一个事务里）：

```sql
with dead as (
  select id, room_id, created_at, media_id from messages
  where expires_at <= now() for update skip locked
), agg as (
  select room_id, (created_at at time zone r.timezone)::date as day, count(*) n
  from dead join rooms r on r.id = dead.room_id group by 1,2
)
insert into traces(room_id, day, count) select room_id, day, n from agg
on conflict (room_id, day) do update set count = traces.count + excluded.count;

delete from messages where id in (select id from dead);
```

---

## 8. 安全与隐私

### 8.1 传输与存储

- 全站 HTTPS，HSTS；数据库与对象存储不对公网开放
- 对象存储只通过预签名 URL 访问，URL 5 分钟过期
- 数据库磁盘加密（云厂商默认开）；备份同样加密

### 8.2 访问控制

- 每个查询都带 `room_id`，中间件强制校验归属
- 邀请码只存哈希；恢复码只存哈希
- 登录、找回、邀请尝试都要限流（按 IP + 用户名）
- 消息发送限流（如 30 条/分钟），上传限流（如 10 张/小时）
- 错误信息不含「这个用户名是否存在」

### 8.3 日志与备份（这条最容易翻车）

- 日志只记录 `request_id`、路由、状态码、耗时、user_id 的哈希；**不记录 body、不记录消息、不记录恢复码**
- 备份保留 7 天，且**不含消息正文**；否则「七天后删除」会被备份打脸
- 若必须整库备份，需在隐私说明里写清「备份中的内容最多再保留 7 天」

### 8.4 数据出境

- 服务器放哪，决定隐私说明怎么写（「服务器在谁手里」是产品承诺，不是运维细节）
- AI 调用会把文本发到模型厂商：默认只发「想聊」的两句回答 / 照片附近对话，且厂商侧不得留存（选支持零留存的接口）

---

## 9. 部署与运维

```
GitHub Actions
  ├─ lint / typecheck / test（含 Testcontainers 起 Postgres）
  ├─ build → ghcr.io/<you>/room-api:sha
  └─ ssh deploy → docker compose pull && up -d --no-deps api worker
```

- 迁移：`drizzle-kit` 或 `node-pg-migrate`，部署前跑，失败即回滚
- 健康检查：`/healthz`（进程）、`/readyz`（DB + 存储）
- 监控：Uptime Kuma / BetterStack；关键是 `purge-expired` 的最近成功时间
- 告警：清理任务连续两次失败 → 邮件/Telegram
- 恢复演练：每季度从备份恢复到临时库，跑一次登录 + 相册读取

---

## 10. 里程碑（单人，约 2–3 周）

| 阶段 | 内容 | 估时 |
|---|---|---|
| M1 | 仓库骨架、devcontainer、迁移、邀请 + 注册 + 登录 + 恢复码 | 3 天 |
| M2 | 房间、发消息、seq 补拉、媒体直传、撤回、WS | 3 天 |
| M3 | TTL 清理 + 痕迹 + 对象清理 + 边界测试 | 2 天 |
| M4 | 留 + 相册 + hide + 脚注（AI） | 3 天 |
| M5 | 停 + 想聊 + 复述 | 2 天 |
| M6 | 推送、导出、部署、备份、监控 | 2–3 天 |

每个阶段都要带一条**边界测试**：到期确实删了、对方点不亮、单人按不出问题、隐藏不影响对方。

---

## 11. 需要你拍板的 10 件事

1. **服务器放哪**：境内（要备案，域名解析受限）还是香港/新加坡（免备案，延迟 30–60ms）？
2. **AI 用谁**：DeepSeek / 通义 / OpenAI？数据出境与零留存条款能不能接受？
3. **推送通道**：Android 上 FCM 在国内不可用，是用厂商推送（小米/华为/OPPO/vivo），还是 v2 先只做「前台在线 + 手动刷新」？
4. **备份与七天删除的冲突**：备份保留多久？要不要「备份不含正文」？
5. **恢复码**：设计稿文案是「由你自己设」，我建议改成**服务端生成、只显示一次**（用户自设的恢复码强度不可控）。
6. **七天按条还是按对话**（PRD 第 5 节未决）：按条最直接；按对话则 trace 要按「最后一条 + 7 天」聚合。
7. **照片原图还是压缩**：原图更可信，存储与流量更高；建议客户端长边 1600、保留原图另存为可选。
8. **托管还是自建，还是两种都要**：托管 = 服务器在我们手里（隐私说明要改口径）；自建 = 服务器在用户手里。见 §12.5。
9. **公开注册还是只发邀请**：公开注册要面对滥用、限流、内容安全与应用商店审核。
10. **注销账号时相册怎么办**：法律上用户有删除权，产品上「相册不可单方删」——这两个会正面冲突，得提前定规则（例如：注销只删该用户身份与私密数据，共同相册转为只读并保留给另一方）。

这 10 条定下来，M1 就可以开工。

---

## 12. 为未来留的口子（很多对情侣）

结论先说：**现在多花 2 天把「一个部署 = 很多房间」写对，比以后改表便宜一个数量级。**
代码里永远不要出现「the room」这种单例假设——所有查询都从 `membership` 拿 `room_id`。

### 12.1 现在就要做对的 8 件事

| # | 口子 | 具体做法 |
|---|---|---|
| 1 | 多租户隔离 | 所有业务表带 `room_id`；每个查询强制带 `room_id`；**一条测试**：A 的 token 读不到 B 的任何数据 |
| 2 | 账号与房间分离 | `users` 全局唯一 + `memberships(user_id, room_id, slot)`；v2 一人一屋，但表允许一人多屋 |
| 3 | 服务地址不写死 | `PUBLIC_BASE_URL` 来自配置；邀请链接里带地址（自建版和托管版用同一套代码） |
| 4 | 广播可替换 | `publish(roomId, event)` 接口：今天进程内 → 明天 `LISTEN/NOTIFY` → 再大换 Redis，只改实现不改调用方 |
| 5 | 存储按房间分区 | 对象键 `rooms/{room_id}/{kind}/{id}`；生命周期规则按前缀配，导出文件单独前缀 |
| 6 | 限流与配额 | 按 user / room / IP 三档；`rooms.plan` 字段先留着，暂不接计费，但代码里有一个 `assertQuota(room)` 的空实现 |
| 7 | 级联删除 | 房间级（结束/清理）、账号级（注销）两条路径都写出来，测试覆盖 |
| 8 | 指标按房间聚合 | 活跃房间、消息量、清理成功率；**不采内容**，不建用户画像 |

### 12.2 现在不做、但别挡路

- 多房间 UI（一人多屋）——表支持，界面不做
- 订阅与计费——`plan` 字段占位，支付不接
- 内容审核后台——先留 `reports` 表的位置，不做界面
- 端到端加密——v2 明确不做；但**别把消息正文写进日志和备份**，将来加 E2EE 时不用清洗历史
- 跨区多活——单区域够用，数据库放一个区

### 12.3 容量测算（按 1 万对情侣）

| 项 | 估算 | 说明 |
|---|---|---|
| 用户 / 房间 | 2 万 / 1 万 | 每对一间 |
| 消息 | 50 条/对/天 → 50 万条/天 | 7 天窗口 → 约 350 万行、5 GB 左右 |
| 相册照片 | 1 张/对/天、300 KB → 3 GB/天 | **一年约 1.1 TB，这是真正的成本项** |
| AI | 1 次想聊/对/天 → 1 万次/天 | 单次几百 token，费用几十元/天量级以内 |
| 峰值 QPS | 30–60 | 单实例够用；两人一屋，天然低频 |
| WebSocket | 同时在线 2–4 千 | 单实例 5 千连接以内不用拆 |

**扩容触发点**（到了再改，不提前做）：

| 触发 | 动作 |
|---|---|
| 单实例 WS 连接 > 5 千 | 加一个 API 实例 + 广播换成 Postgres `LISTEN/NOTIFY` |
| API CPU > 60% 持续 | 加实例 + 前面放 Caddy/负载均衡，WS 用粘性会话 |
| Postgres 数据 > 50 GB 或写入打满 | 换托管 PG、加连接池（PgBouncer）、消息表按时间分区 |
| 照片 > 1 TB | 对象存储加 CDN、按热度分层、导出文件走单独桶 |

### 12.4 演进阶段

| 阶段 | 房间数 | 形态 | 要做的事 |
|---|---|---|---|
| 0（现在） | 1 | 单机、邀请制 | 把多租户结构写对，内部两个人用 |
| 1 | 10–1,000 | 单机 + 域名 | 公开创建房间、应用商店上架、基础限流 |
| 2 | 1,000–10,000 | 2–3 个 API 实例 + 托管 PG | 广播外置、连接池、CDN、告警 |
| 3 | 1 万+ | 多实例 + 分区 | 账单、内容安全、数据合规流程 |

### 12.5 口子之外：产品承诺会变

现在的文案是「服务器在谁手里」——这句话在**自建版**成立，在**托管版**就变成「我们的服务器」。
建议保留两种形态、同一套代码：

- **自建版**：用户自己一台机器，邀请链接指向他自己的域名
- **托管版**：`room.example.com`，我们运维，隐私说明写清「谁在看、看什么、看多久」

邀请链接已经内嵌服务器地址，所以两种形态不需要改协议，只需要不同的部署配置。

### 12.6 如果要在应用商店上架

这会反过来影响 §2 的选区域与 §8 的合规：

- 中国区：需要 ICP 备案、软著、内容安全机制；社交/情侣类审核更严
- 海外区：需要隐私政策、账号删除入口、数据导出（GDPR/PIPL 类要求）
- 两端都要：**举报/屏蔽入口**、**注销账号**、**未成年人保护**声明

这些不写进 M1，但 `reports` 表、注销接口、隐私页的字段位要预留。
