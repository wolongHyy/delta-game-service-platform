## 一键启动（按平台选一条）

- **Windows** — 双击 `start.bat`，浏览器打开 <http://localhost:3000>。首次运行会自动安装依赖并编译（约 2-5 分钟，需要联网），完成后按提示访问即可；便携包自带 `node\node.exe`，无需另装 Node。
- **macOS**   — 双击 `start.command`（脚本会自动 `chmod +x`，并在 Terminal 窗口里看日志）。首次运行需要先装 Node.js 22+（`brew install node@22`），首次启动会自动 `npm install` 并编译。
- **Linux**   — 在终端执行 `./start.sh` 或 `bash start.sh`（需要 Node.js 22+，`/usr/bin/node` 或 `node/bin/node`）。

> 端口冲突？把脚本里 3000 换成你想要的（生产侧 `app/server.js` 也可改）。


# 三角洲游戏服务平台

三角洲行动护航 / 陪玩 / 趣味单俱乐部的在线点单、支付核销与社区平台。面向三类角色：顾客（下单、交易、社区互动与咨询）、打手（抢单、服务、完工与提现）、管理员（商品、订单、付款核销、打手、提现、客服与社区治理）。系统内置 24 小时智能客服，并使用 VOID Command Deck 战术指挥台设计系统统一用户端与管理端体验。

## 功能

### 顾客端（/）

- 首页：服务类型入口、热门商品、公告
- 分类：按服务类型与关键词筛选商品
- 商品详情与下单：单陪/双陪、时长或单数、加购项、区服、段位、备注
- 指定打手，或放入公共抢单池
- 订单：待付款、待确认到账、待接单、服务中、已完成、已取消；待付款/待确认到账/待接单可取消
- 消息：官方公告、24 小时智能客服（消息页入口 + 悬浮气泡）
- 社区：推荐、关注、知识、最新四个频道；发帖、评论、点赞、收藏、关注、通知和用户主页
- 看帖下单：帖子可关联陪玩服务，下单时写入 `sourcePostId`；订单完成后帖子展示脱敏成交凭证
- 我的：玩家身份卡、贡献数据、社区个人主页、打手入驻申请入口

### 社区（/）

- 推荐 / 关注 / 知识 / 最新四频道；推荐优先展示精选、置顶和近期高互动内容，关注频道保留自己的帖子
- 帖子支持标题、正文、主题、标签、图片和关联服务；新帖默认进入人工审核，通过后才公开
- 帖子详情支持评论、点赞、收藏、关注作者、查看关联服务和成交凭证
- 通知中心支持未读数量、全部/未读筛选和标记已读
- 社区用户主页展示身份、等级、贡献分、发帖数和关注/粉丝数据
- 成交凭证只展示订单号后段、服务名、局数、金额和完成时间，不公开手机号或 OpenID

### 打手端（/fighter）

- 账号密码登录；已审核打手支持微信一键登录
- 抢单大厅：滑块验证（拖到最右侧）防脚本，带冷却与限流；娱乐档不可抢公共池
- 服务中的订单：查看老板联系方式，开始服务
- 完工申请：至少 1 张结单截图 + 完成说明
- 收益：完工后抽成进入待结算，管理员确认后进入可提现余额
- 提现申请与记录
- 在线状态与个人资料

### 管理端（/admin）

- 登录：账号密码 + httpOnly Cookie 会话 + 审计日志
- 仪表盘：今日订单、营收、服务中、在售陪玩、待审核打手
- 订单调度：二维码收款核销、派单、放回公共池、取消、线下已收款、确认完工
- 陪玩管理：增删改、上下架
- 打手申请：审核入驻，审核通过自动建立打手账号与商品
- 社区治理（/admin/community）：审核、发布、驳回、下架、置顶、精选、知识库收录和成交数据查看
- 服务类型、消息管理、数据统计、提现审核、设置
- 智能客服控制台（/admin/ai）：对话记录、知识库管理、客服设置、连接测试

### 智能客服

- 24 小时在线，流式输出回答
- RAG 架构：中文分词 + BM25 检索 + 业务知识库；每次回答附带当前在售商品信息
- 人格化人设：自然口语、短句、价格引用约束、纠纷问题引导人工客服
- 知识库可在管理后台增删改，也可用 seed 脚本重建

## 技术栈

- Next.js 16（App Router）+ React 19 + TypeScript + Tailwind CSS
- SQLite（node:sqlite 内置驱动，无需单独安装数据库）
- 智能客服：OpenAI 兼容大模型接口（默认 DeepSeek）+ 本地 RAG
- 设计系统：三层 CSS token + Tailwind 语义色 + 自研 HUD 组件；用户端暗色、管理端浅色/暗色主题
- 微信小程序：原生小程序 + 微信云开发（云函数 `void-api` + 云数据库 `void_*`），蓝白主题与克制动效，见 `miniprogram/`

## 环境要求

- Node.js 22 或更高（项目自带便携版运行时 `node/`，Windows 下可免安装）
- 操作系统：Windows / macOS / Linux
- 不需要 Docker、不需要外部数据库

## 快速开始

### 方式一：Windows 便携版

```bat
start.bat
```

首次运行会自动完成：生成 `app/.env`（若缺失）→ 安装依赖 → 编译前端 → 启动服务，全程无需手动敲命令。
若启动过程中提示错误，窗口会保留并提示截图反馈，不会一闪而过。

需要演示数据或客服知识库时，再在 `app/` 目录执行（可选，仅开发/演示用）：

```bat
..\node\node.exe --experimental-sqlite scripts/seed.cjs
..\node\node.exe --experimental-sqlite scripts/seed-knowledge.cjs
```

> 注意：`npm run seed` 会写入演示数据，正式环境请勿执行，以免覆盖真实数据。

### 方式二：npm 开发模式（在 app/ 目录）

```bash
npm install
npm run dev        # 开发模式，http://localhost:3000
npm run seed       # 重置演示数据
npm run seed:ai    # 重建智能客服知识库（幂等）
npm run build      # 生产构建（含 postbuild 复制静态资源）
npm run start      # 生产启动
npm run test       # 数据库单元测试
```

## 目录结构

```text
app/                    # Next.js 应用
  src/app/              # 页面与 API 路由
  src/components/       # 用户端 / 打手端 / 管理端组件
  src/lib/              # 数据库、鉴权、智能客服（lib/ai/）
  scripts/              # seed.cjs、seed-knowledge.cjs、db-tests.ts
  db/                   # SQLite 数据文件（不入库）
  public/               # 静态资源
  .env                  # 环境变量（不入库）
  start.bat             # Windows 便携版启动
  server.js             # 生产版入口
miniprogram/            # 原生微信小程序（云开发版，独立于网页版）
  cloudfunctions/void-api/   # 云函数：全部业务读写入口（扁平结构：index/handler-*/lib-*）
  pages/                     # 首页/服务/社区/消息/订单/打手/管理端等
  utils/                     # 云函数调用封装、环境 ID、格式化
node/                   # 便携版 Node.js 运行时（不入库）
```

## 配置（app/.env）

复制 `app/.env.example` 为 `app/.env` 后按需填写。`.env` 不入库。

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| DB_PATH | SQLite 文件路径 | `app/db/custom.db` |
| PORT / HOSTNAME | 服务端口与监听地址 | 3000 / 0.0.0.0 |
| ADMIN_USERNAME / ADMIN_PASSWORD | 管理端账号密码 | admin / admin123（本地默认；生产必须设置） |
| ADMIN_SESSION_SECRET | 管理端会话签名密钥 | 本地默认值 |
| CUSTOMER_SESSION_SECRET | 顾客会话签名密钥 | 本地默认值 |
| FIGHTER_SESSION_SECRET | 打手端会话签名密钥 | 本地默认值 |
| ORDER_AUTO_CANCEL_MINUTES | 待接单超时自动取消分钟数，0 关闭 | 30 |
| CLAIM_COOLDOWN_MS | 抢单冷却毫秒数 | 3000 |
| RATE_LIMIT_SHARED | 多实例共享限流（db）或内存限流（空） | 空 |
| MAINTENANCE_TOKEN | 维护接口令牌 | 空 |
| UPLOAD_DIR | 结单截图和收款码图片上传目录 | D:/delta_app_uploads |
| WECHAT_APPID / WECHAT_SECRET | 微信服务号配置（可选） | 空 |
| WECHAT_SCOPE | 微信授权范围 | snsapi_base |
| APP_BASE_URL | 对外访问地址（微信回调用） | http://localhost:3000 |
| WECHAT_MINI_APPID / WECHAT_MINI_SECRET / MINI_BIND_SECRET | 小程序 web-view 绑定（可选） | 空 |
| AI_ENABLED / AI_BASE_URL / AI_API_KEY / AI_MODEL | 智能客服接口配置 | 1 / 空 / 空 / 空 |

生产环境必须设置：强管理密码、两个不同的 64 位随机会话密钥、HTTPS、定期备份数据库。生成随机密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 订单状态

```text
unpaid（待付款）→ payment_review（待确认到账）→ pending（待接单）→ assigned（已指派）→ in_progress（服务中）
→ completion_pending（待确认完工）→ completed（已完成）
取消：unpaid / payment_review / pending 可取消 → cancelled
```

- 顾客扫码付款后只提交付款人昵称、转账备注或后四位，订单进入「待确认到账」
- 管理员核对微信/支付宝/银行账单后点击「确认已到账」，订单才会进入派单/抢单池
- 管理员确认未收到款时可点击「未收到，退回」，订单回到「待付款」
- 管理员也可直接把待付款订单标记为「线下已收款」，兼容面对面收款
- 已指派或已被打手抢走的订单不可强行改派
- 待接单超过设定时间自动取消
- 待确认到账状态不会自动取消，避免顾客已付款却被系统误取消，需要管理员核对后确认或退回

## 二维码收款配置

当前版本不依赖微信支付或支付宝官方接口，采用「静态/经营收款码 + 人工核销」：

1. 登录管理后台，进入「设置 → 二维码收款」。
2. 分别上传微信收款码和支付宝收款码，填写收款码标题和付款说明。
3. 顾客下单后在支付弹窗切换「微信支付 / 支付宝」并扫码，填写付款人昵称、转账备注或手机号后四位，点击「我已完成付款」。
4. 管理员进入「订单管理 → 待确认到账」，核对实际账单后点击「确认已到账」，订单进入待接单/已指派。
5. 未查到款时点击「未收到，退回」，让顾客重新核对付款信息。

注意：二维码截图和顾客提交的信息只作为核对线索，不能代替真实入账记录。个人收款码用于经营活动可能存在平台风控、限额、冻结和对账风险，正式规模化经营建议申请个体工商户/企业主体及官方支付商户号。

## 智能客服配置

接口与模型可通过环境变量或管理后台「智能客服 → 客服设置」配置，环境变量优先级更高：

```env
AI_ENABLED=1
AI_BASE_URL=https://api.deepseek.com/v1
AI_API_KEY=sk-你的Key
AI_MODEL=deepseek-chat
```

支持任意 OpenAI 兼容接口（DeepSeek、智谱 GLM、豆包等）。知识库文件 `app/src/lib/ai/knowledge-seed.json` 为内部资料，不入库；结构参考 `knowledge-seed.example.json`。修改知识库后可执行 `npm run seed:ai` 重建。

## 微信接入

系统支持两条互不影响的微信路线：

1. **微信服务号网页授权登录**（网页版用户端 / 打手端）——需要备案域名、HTTPS、服务器；
2. **原生微信小程序 + 微信云开发**（`miniprogram/`）——不需要自购域名与服务器，业务读写全部走云函数。

不同主体（个人 / 个体工商户 / 企业）与不同账号类型（服务号 / 企业微信 / 小程序）的上线流程不同，参见《微信接入与上线指南.md》。

未配置微信时，账号密码登录完全可用，不影响本地开发与演示。

### 小程序（云开发版）

小程序不依赖网页版服务，数据独立存放在微信云数据库。服务点单直接同步俱乐部实际价目表（陪玩 / 护航 / 趣味单，共 40 个档位），不展示抽成等内部规则。首次部署见 `miniprogram/README.md`，核心步骤：

```text
0. 正式注册的小程序 AppID（测试号不能用云开发）已预置：wxb365a50412fa923d
1. 微信开发者工具导入 miniprogram/
2. 云开发环境已建好：void-prod-d7gncmu1ua9c18208（已写入 utils/env.js）
3. 用 CLI 部署云函数（当前必须扁平结构，详见 miniprogram/README.md 第 3 节）
4. 小程序内「我的 → 云开发设置」→ 初始化云环境（同步最新 40 档实际价目表；第一个初始化的人自动成为管理员）
5. 后台把客户加成「体验成员」→ 设为体验版 → 扫码即可使用
```

> `cloudfunctions/void-api/` 必须保持**扁平**：只有 `index.js`、`handler-*.js`、`lib-*.js` 等文件，
> 不能有 `handlers/`、`lib/` 子文件夹，否则当前开发者工具 CLI 会报 `EISDIR`。

> 云开发只解决「接口能不能访问」，**不能绕过**小程序备案、服务类目审核与内容审核。
> 另外，微信的「小程序测试号」不能使用云开发，必须换成正式 AppID。
> 提审前请先完成备案并确认「游戏服务」类目资质，详见《微信接入与上线指南.md》第 5 节。

## 部署上线

1. 生产构建：`npm run build`（Windows 下收尾可能提示 `kill EPERM`，属环境噪音，构建产物完整；随后执行 `node scripts/postbuild.cjs` 复制静态资源）
2. 启动：`npm run start` 或 `start.bat`（读取 `.env`）
3. 前置条件：公网域名 + HTTPS 证书；如启用微信登录，域名需完成 ICP 备案并配置网页授权域名
4. 上线后先在管理后台「设置 → 二维码收款」上传正式收款码，并测试下单、提交付款信息、管理员确认到账完整流程
5. 安全项：强管理密码、独立会话密钥、数据库备份、错误日志
6. 数据库备份：停止服务后复制 `app/db/custom.db`（含 WAL 文件）即可

## 测试

```bash
npm run test
```

覆盖订单状态流转、付款核销、抢单令牌、提现审核和社区点赞/收藏/评论/关注/通知等数据库核心逻辑。

## 协作方式

- `main` 分支启用 GitHub 分支保护
- 仓库管理员可直接 push / 直接合并
- 其他协作者与外部贡献者须通过 fork + Pull Request 提交，且需至少 1 人审核通过
- 禁止强推与删除 main 分支

## 内部资料与安全

- 以下内容一律不入库（见 `.gitignore`）：价格/规则/客服细则、需求文档、智能客服知识库 `knowledge-seed.json`、演示种子数据 `seed.cjs`
- 新克隆后如需恢复演示数据与知识库：从本地备份复制 `app/scripts/seed.cjs` 与 `app/src/lib/ai/knowledge-seed.json`
- `.env` 存放真实密钥，已被 `.gitignore` 排除，禁止提交

## 文档

| 文档 | 说明 |
| --- | --- |
| 微信接入与上线指南.md | 微信服务号 / 企业微信 / 小程序云开发的上线流程与合规提醒（公开） |
| miniprogram/README.md | 小程序云开发部署、action 列表、真机验收与常见问题（公开） |
| 保姆级开发教程.md | 面向初学者的代码讲解（公开） |
| PRODUCT.md | 产品定位、角色权限、交易闭环、社区模块和 API 边界（公开） |
| DESIGN.md | VOID Command Deck 设计 token、组件、布局、动效与主题规范（公开） |
| 需求文档与设计方案.md | 产品需求与架构方案（内部资料，不入库） |
