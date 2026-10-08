# 微信小程序（原生 + 微信云开发）

`miniprogram/` 是**原生微信小程序**，不再用 `web-view` 套壳加载 Next.js 网页。
所有业务读写都走云函数 `void-api`，数据存在微信云开发数据库里（集合名统一 `void_*`）。

- 前端：原生小程序（WXML / WXSS / JS），不引入任何 npm 依赖
- 后端：单个云函数 `cloudfunctions/void-api`，按 `action` 路由分发
- 数据库：微信云开发数据库，客户端**不直连**，只允许云函数读写
- 网页版：`../app` 的 Next.js + SQLite 保持不变，继续用于 PC 端与管理端

## 一、首次部署（照着做即可）

### 1. 用微信开发者工具导入本目录

1. 打开微信开发者工具 →「导入项目」。
2. 目录选择：`C:\Users\1\Desktop\VOID\delta_app\miniprogram`。
3. AppID 填 `wxd25e5b566879a5d5`（已在 `project.config.json` 中预置）。
4. 导入后确认顶部编译按钮能正常编译，控制台没有红色报错。

### 2. 开通云开发并新建环境

1. 开发者工具顶部点「云开发」按钮（首次会提示开通，免费额度足够测试）。
2. 「环境」→「新建环境」，建议命名 `void-prod`，创建完成后**记下环境 ID**
   （形如 `void-prod-3g8x9a`，是一串字母数字短横线组合，不是中文名称）。
3. 环境 ID 在云开发控制台「设置 → 环境 ID」里也能查到。

### 3. 部署云函数

1. 左侧资源管理器展开 `cloudfunctions/void-api`。
2. **右键 `void-api` 文件夹** →「上传并部署：云端安装依赖（不上传 node_modules）」。
3. 等待终端出现「上传成功」。`wx-server-sdk` 由云端安装，本地不用 `npm install`。
4. 部署完成后在云开发控制台「云函数」里应能看到 `void-api`。

> 必须选「云端安装依赖」，不要选「上传所有文件」，否则会把本地 `node_modules` 一起传上去，又慢又容易失败。

### 4. 在小程序里填写环境 ID 并初始化

1. 编译运行小程序，进入「我的 → 云开发设置」（首次启动会自动跳到 `/pages/setup/setup`）。
2. 在输入框填写第 2 步记下的**环境 ID**。
3. 点「保存并重新连接」，状态栏显示”已切换到 xxx，可以继续初始化云环境”。
4. 点「初始化云环境」。云函数会自动建表、写入示例服务档位与公告。
5. 初始化完成后：
   - 「数据集合」显示 17 个；
   - 「当前账号管理员」显示**已授权**（第一个执行初始化的人自动成为管理员）。
6. 点「去登录」，填写昵称，即可开始使用。

> 初始化可以重复执行，已存在的数据不会被覆盖或清空。
> 如果你不是第一个初始化的人，`当前账号管理员` 会是「否」，需要用管理员的微信号在首页 → 管理入口操作。

## 二、日常开发

- 改前端代码：保存后开发者工具自动热编译，直接看模拟器即可。
- 改云函数代码：**必须重新「上传并部署：云端安装依赖」**，改完不部署等于没改。
- 改了 `utils/env.js` 里的 `CLOUD_ENV_ID` 默认值：只影响首次安装的默认环境，已保存过的用户仍读本地缓存。

### 目录结构

```text
miniprogram/
  app.js                  启动时初始化云开发（wx.cloud.init）
  app.json                页面注册 + 底部 TabBar（首页/服务/社区/消息/我的）
  app.wxss                VOID Command Deck 设计 token 与公共组件样式
  pages/
    setup/                云环境 ID 填写与初始化入口
    login/                昵称/头像登录与手机号绑定
    home/                 首页作战信息台
    services/             服务分类列表
    service-detail/       服务详情 + 固定下单操作台（ActionDock）
    order-create/          下单表单（可带 sourcePostId 从帖子下单）
    orders/  order-detail/ 订单列表与状态时间轴、提交付款凭证
    messages/  ai-chat/   官方消息与 24 小时智能客服
    community/            社区四频道（推荐/关注/知识/最新）
    post-create/          发帖（可关联服务）
    post-detail/          帖子详情、评论、点赞、收藏、成交凭证
    notifications/        通知中心
    profile/              玩家身份卡与贡献数据、打手/管理入口
    fighter/              打手工作台：入驻申请、抢单、开始服务、申请完工
    admin/                管理端：订单核销、派单、打手审核、社区治理
  utils/
    api.js                wx.cloud.callFunction 封装（call/toastError/requireLogin）
    env.js                云环境 ID 的读写与本地缓存
    format.js             金额/时间/订单状态等展示格式化
  cloudfunctions/
    void-api/
      index.js            action 路由表
      handlers/           按业务域拆分的处理函数
      lib/                core（集合名/状态机/统一返回）、store、seed 示例数据
```

## 三、云函数 action 一览

| 分组 | action |
| --- | --- |
| 初始化 | `setup` |
| 身份 | `auth.session`、`auth.updateProfile`、`auth.bindPhone` |
| 首页与商品 | `home.bootstrap`、`services.types`、`companions.list`、`companions.get` |
| 消息与客服 | `messages.list`、`ai.ask`、`profile.me`、`payment.config` |
| 订单 | `orders.create`、`orders.list`、`orders.get`、`orders.pay`、`orders.cancel` |
| 社区 | `community.list`、`community.detail`、`community.create`、`community.like`、`community.favorite`、`community.follow`、`community.comment`、`community.evidence`、`community.notifications.list`、`community.notifications.readAll` |
| 打手 | `fighter.dashboard`、`fighter.apply`、`fighter.claim`、`fighter.start`、`fighter.complete` |
| 管理端 | `admin.dashboard`、`admin.orders.pay`、`admin.orders.reject`、`admin.orders.status`、`admin.orders.assign`、`admin.fighters.list`、`admin.fighter.review`、`admin.community.review` |

订单状态机：

```text
unpaid（待付款）→ payment_review（待确认到账）→ pending（待接单）→ assigned（已指派）
→ in_progress（服务中）→ completion_pending（待确认完工）→ completed（已完成）
可取消：unpaid / payment_review / pending / assigned / in_progress → cancelled
```

## 四、真机完整验收流程

在开发者工具「预览」扫码，用手机走一遍：

```text
1.  登录：填昵称 → 进入首页
2.  选服务：首页/服务页选一个档位 → 服务详情 → 立即下单
3.  下单：填写区服、段位、局数 → 提交订单 → 跳到订单详情
4.  付款：订单详情点「提交付款凭证」→ 选支付方式 → 填备注 → 提交
5.  管理员确认到账：管理端 → 订单调度 → 待确认到账 → 确认到账
6.  打手接单：「我的 → 打手工作台」→ 入驻申请 → 管理员审核通过
     → 抢单大厅 → 接单
7.  开始服务 → 申请完工（需至少 1 张结单截图）
8.  管理员确认完工：管理端 → 订单调度 → 确认完工
9.  社区回写：订单完成后，关联的社区帖子会展示脱敏成交凭证
10. 社区发帖：社区页 → 发帖 → 关联服务 → 提交（进入待审核）
     → 管理端 → 社区治理 → 通过 → 帖子公开可见
```

重点回归检查：

- 「立即下单」「提交订单」按钮不会被底部 TabBar 或固定操作台挡住
- 三种尺寸（390×844 / 768×1024 / 1440×900）都没有横向滚动
- 每笔订单的订单号、金额、时间在不同页面显示一致
- 社区帖子未审核时，其他用户看不到

## 五、安全与权限建议

- **客户端不要直接操作数据库**：本项目所有读写都经过云函数，云数据库集合的权限建议设为
  「仅创建者可读写」或「所有用户不可读写」，把权限完全交给云函数。
- **不要在云函数里硬编码密钥**：微信 AppSecret、AI Key 等应放在
  云开发控制台 → 云函数 `void-api` → 配置 → 环境变量中。
- **管理员判定**：`void_admins` 集合里的 OpenID 才是管理员，普通用户在管理端会被拒绝。
- **隐私脱敏**：成交凭证只展示订单号后段、服务名、局数、金额、完成时间，
  不展示手机号、OpenID、真实姓名。

## 六、上线前的合规提醒（重要）

云开发只解决「接口能不能访问」，**不能绕过**微信平台本身的审核要求：

1. **小程序备案**：2024 年起新上架小程序必须完成备案（工信部），个人主体也可备案，
   但周期约 1~3 周，必须在提审前完成。未备案无法发布正式版。
2. **服务类目**：本项目的「陪玩 / 代练 / 护航」属于**游戏服务**方向。微信要求
   该类目提供相应资质（如《网络文化经营许可证》等），且对「代练」类内容审核较严，
   提审时容易被驳回。请先在小程序后台「设置 → 基本设置 → 服务类目」确认可选类目。
3. **内容审核**：社区发帖属于 UGC，平台要求有内容审核机制。本项目已实现
   「新帖先审后发 + 管理端人工审核」，提审时可在说明里体现这一点。
4. **交易合规**：目前采用「静态收款码 + 人工核销」，属于线下收款模式，
   不涉及微信支付接口。但个人收款码用于经营存在风控与对账风险，
   规模化前建议办理个体工商户/企业主体并申请官方支付商户号。
5. **不要用违规文案**：提审描述里避免出现「代练」「上分」「陪玩」等敏感词，
   可用「游戏陪练咨询」「游戏社交社区」等中性表述（最终以审核意见为准）。

> 旧版本 `1.0.0` 是 `web-view` 套壳方案，本次改造后**必须重新编译上传**，
> 在开发者工具点「上传」→ 在小程序后台「版本管理」里提交审核。

## 七、常见问题

| 现象 | 原因与处理 |
| --- | --- |
| 提示「云开发尚未初始化」 | 还没填环境 ID。进入「我的 → 云开发设置」填写并保存 |
| 提示「尚未部署 void-api 云函数」 | 忘记上传云函数，或上传时没选「云端安装依赖」 |
| 提示「未获取到微信身份 OpenID」 | 在开发者工具/真机里运行才会带 OpenID，纯浏览器预览不行 |
| 初始化显示「当前账号管理员：否」 | 该环境已被别人初始化过。用第一个初始化的微信号登录管理端 |
| 云函数报 `collection not exists` | 没执行过「初始化云环境」，进设置页点一次初始化 |
| 数据改了但页面没变 | 云函数改完要重新「上传并部署」，前端改完要重新编译 |
| 真机预览空白 | 检查是否已部署云函数、环境 ID 是否填对、手机网络是否正常 |
| 想换环境 | 在设置页填新环境 ID → 保存并重新连接 → 重新初始化 |
