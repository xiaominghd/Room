# 房间

> 一个只属于两个人的房间，和一本按天留着的相册。

话会收起来，照片可以留下。房间只有两个人；说过的话留 28 天，第 7 天起收成一张图文卡进相册，第 28 天原文消失、卡留下。想停就把门关上，想回来就写一张卡片。

---

## 仓库里有什么

| 目录 | 是什么 |
|---|---|
| [docs/](docs) | 文档。产品规则的唯一事实源是 [docs/PRD-v4.md](docs/PRD-v4.md)（v4.1） |
| [demo/](demo) | **网页版原型**：25 屏、房间 18 个状态、8 个弹层，双击就能跑，交互已按 PRD 串通 |
| [app/](app) | 旧的 React Native / Expo 原型（v2 模型，未按 v4 改，只作工程骨架参考） |
| [_design/](_design) | 设计源 `room-app-wireframe.kui.fig`（34 个画板）与解析产物 |

## 先看 demo

```
双击 demo/index.html
```

没有构建、没有依赖。左边是跳转与调试（时间 +7/+28 天、让对方关门、对方递卡、模拟发送失败），右边是 402×874 的手机。

能走通的流程和每一步的预期，写在 [demo/README.md](demo/README.md)。

## 文档索引

| 文件 | 内容 |
|---|---|
| [docs/PRD-v4.md](docs/PRD-v4.md) | 产品规则（房间 / 门 / 记忆 / 相册 / 账号 / 通知 / 未定） |
| [docs/VISION.md](docs/VISION.md) | 产品定义、四条规则、判断标准 |
| [docs/UI-STRUCTURE.md](docs/UI-STRUCTURE.md) | 每屏的元素结构、状态、文案（给设计用） |
| [docs/APP-PAGES.md](docs/APP-PAGES.md) | 页面清单与跳转 |
| [docs/BACKEND.md](docs/BACKEND.md) | 后端清单（**落后于 v4，待重写**） |
| [docs/STATE.md](docs/STATE.md) | 进度与待办 |
| [docs/AGREEMENTS.md](docs/AGREEMENTS.md) | 工作约定 |

## 自测

```
node _design/smoke.js        # 逻辑：页面切换、门、卡片、28 天、留一天、特别记忆
node _design/check_dom.py    # 结构：页面/弹层必须都在 #screen 里
```

## 状态

- 产品规则：v4.1 已定，§13 还剩两条未定（卡片通知、没卡的点开什么）
- 界面：网页原型可用，真机 App 尚未按 v4 重写
- 后端：不存在
