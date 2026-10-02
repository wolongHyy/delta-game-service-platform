# 三角洲游戏服务平台产品说明

## 产品定位

三角洲游戏服务平台是面向《三角洲行动》玩家与俱乐部运营人员的在线交易与社区系统。平台把陪玩、护航、趣味单等服务的浏览、下单、扫码付款、管理员核销、打手接单、服务执行、完工确认和结算统一在同一条订单链路中；社区模块让战术内容、用户互动和真实成交流程互相连接，而不是独立于交易的论坛。

平台默认以移动端网页为主要使用场景，同时支持桌面宽屏。它不替代官方支付渠道，也不承诺自动验证真实到账；当前版本使用“收款码 + 付款信息提交 + 管理员人工核验”完成支付确认。

## 用户与权限

| 角色 | 主要入口 | 可以做什么 | 不能做什么 |
| --- | --- | --- | --- |
| 顾客 / 社区用户 | `/` | 浏览服务、下单、提交付款信息、查看订单、发帖评论、点赞收藏、关注用户、查看通知和成交凭证 | 不能确认自己的付款到账，不能直接改写订单状态 |
| 打手 | `/fighter` | 登录、查看公共池、通过滑块验证抢单、开始服务、提交完工截图、查看收益、申请提现 | 娱乐档不能抢公共池；不能绕过指派或直接修改订单 |
| 管理员 | `/admin` | 审核付款、派单、取消订单、确认完工、审核提现、管理陪玩与服务类型、配置收款码、管理 AI 客服和社区内容 | 不能绕过订单状态机强行覆盖已被接走的订单；关键操作进入审计日志 |

顾客身份由服务端客户会话确定。未接入微信时使用本地客户标识和 `/api/customer/me` 引导迁移；社区写入接口必须通过 `requireCustomer()`，管理端接口必须通过 `requireAdmin()`。

## 核心交易闭环

1. 顾客在服务详情选择商品、时长或局数、区服、模式、目标和备注，可选择指定打手或进入公共池。
2. 创建订单后进入 `unpaid`。顾客扫码付款并提交付款人昵称、转账备注或后四位，订单进入 `payment_review`。
3. 管理员核对真实入账记录后确认到账，订单进入 `pending`；未收到款可退回 `unpaid`。管理员也可记录线下已收款。
4. 指定打手时订单进入 `assigned`；公共池订单由符合条件的打手通过滑块验证后抢单。
5. 打手开始服务后进入 `in_progress`，完工时必须提交至少一张结单截图和完成说明，订单进入 `completion_pending`。
6. 管理员或平台流程确认完工后进入 `completed`。平台抽成、打手收益、提现审核和订单事件记录保持原交易系统的数据结构与兼容性。

订单状态机：

```text
unpaid -> payment_review -> pending -> assigned -> in_progress -> completion_pending -> completed
   |            |
   +------------+-------------------------------> cancelled
```

`unpaid`、`payment_review`、`pending` 可由顾客取消；`payment_review` 不参与超时自动取消，避免已付款订单被误取消。

## 社区模块

社区提供四个公开频道：

- **推荐**：优先呈现精选、置顶和近期高互动内容。
- **关注**：只呈现当前用户关注作者的内容，并保留自己的帖子。
- **知识**：呈现被管理员收录为知识库的攻略、规则和战术内容。
- **最新**：按发布时间呈现最新公开帖子。

帖子支持标题、正文、主题、标签、图片和服务关联。新帖默认进入 `pending`，只有管理员审核通过后才进入公共信息流；审核状态包括 `draft`、`pending`、`published`、`rejected`、`hidden`。帖子详情包含作者资料、服务卡片、评论、点赞、收藏、关注和成交凭证。

社区交易连接规则：

- 帖子可以关联一个在售陪玩/服务商品；看帖用户点击下单时，`sourcePostId` 随订单创建请求写入 `Order`。
- 结算只读取 `sourcePostId` 对应且 `status = completed`、`paid = 1` 的订单，生成公开成交凭证。
- 凭证只展示订单号后段、商品/服务名、局数、金额和时间，不返回手机号、OpenID 或其他隐私字段。
- 点赞、收藏、评论和关注会写入通知；通知支持已读，用户主页展示发帖数、贡献值、关注/粉丝数据。

## 管理端社区治理

`/admin/community` 提供：

- 审核、发布、驳回、下架帖子；改变状态时记录管理员审计日志。
- 设置置顶、精选、知识库收录。
- 按状态、关键词和作者查看内容队列。
- 查看社区帖子、评论互动、成交订单、贡献用户指标，以及从帖子产生的成交数据。

管理端默认浅色主题，支持切换暗色并保存到浏览器本地。管理端表格、筛选、状态标签和操作反馈使用独立的 `AdminUI` 组件，不改变用户端暗色视觉。

## 公共接口与兼容边界

社区接口：

```text
GET    /api/community/posts
POST   /api/community/posts
GET    /api/community/posts/:id
PATCH  /api/community/posts/:id
DELETE /api/community/posts/:id
GET    /api/community/posts/:id/comments
POST   /api/community/posts/:id/comments
POST   /api/community/posts/:id/like
POST   /api/community/posts/:id/favorite
GET    /api/community/posts/:id/evidence
GET    /api/community/knowledge
GET    /api/community/topics
GET    /api/community/me
PATCH  /api/community/me
GET    /api/community/users/:id
POST   /api/community/users/:id/follow
GET    /api/community/notifications
POST   /api/community/notifications/read
```

管理接口：

```text
GET    /api/admin/community
PATCH  /api/admin/community/:id
```

订单接口保持原有路径和行为，仅增加可空字段 `sourcePostId`。支付配置、二维码收款、AI 客服、打手端、提现和数据统计接口不因社区模块改变既有语义。

## 非目标与已知边界

- 当前不是微信支付/支付宝官方直连系统，到账确认依赖人工核验。
- 社区内容是用户生成内容，平台必须保留审核、下架和审计能力。
- 当前不提供社区私信、直播、音视频和第三方内容推荐算法。
- 静态收款码用于经营存在平台风控、限额和冻结风险，规模化运营应升级为合规商户支付主体。
- 社区图片依赖现有上传能力；未上传或上传失败的图片应显示空状态，不影响文字交易流程。