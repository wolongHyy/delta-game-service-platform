---
name: VOID Command Deck
description: 三角洲游戏服务平台的战术指挥台设计系统
colors:
  void-black: "#030507"
  surface: "#06090c"
  surface-raised: "#0f171e"
  border: "#263540"
  border-strong: "#415460"
  signal-lime: "#beff40"
  signal-lime-deep: "#679d10"
  signal-red: "#ff4d52"
  signal-amber: "#ffb744"
  signal-blue: "#4da3ff"
  trade-gold: "#d8b770"
  text: "#f6f7f4"
  text-muted: "#acb5b8"
  text-faint: "#6b777d"
  admin-bg: "#f2f5f7"
  admin-surface: "#ffffff"
  admin-text: "#10181f"
  admin-primary: "#1d72d8"
typography:
  display:
    fontFamily: "Bahnschrift, DIN Alternate, Cascadia Mono, Microsoft YaHei, sans-serif"
    fontSize: "clamp(2rem, 7vw, 5rem)"
    fontWeight: 650
    lineHeight: 0.95
    letterSpacing: "-0.025em"
  body:
    fontFamily: "HarmonyOS Sans SC, MiSans, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  data:
    fontFamily: "Cascadia Mono, SFMono-Regular, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "18px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.signal-lime}"
    textColor: "{colors.void-black}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 18px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 18px"
  hud-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 12px"
---

# Design System: VOID Command Deck

## Overview

**Creative North Star: “Tactical command deck with a trading ledger.”**

VOID Command Deck 把《三角洲行动》的战术 HUD 语言改造成高频交易界面的信息秩序：深黑背景像夜战终端，荧光绿只负责在线、选中、成功和主操作，红色负责失败与危险，琥珀负责等待，金属金只标记价格、等级和成交凭证。它不追求廉价霓虹，而是用细边框、低透明网格、编号标签、等宽数字和少量扫描线制造“正在运行的作战系统”感。

用户端是沉浸式暗色，阅读密度高但信息分组清楚；管理端默认恢复为石墨浅色，优先表格、对比度和长时间操作的可读性，并按用户选择持久化暗色主题。页面动效只服务于层级出现、状态变化和按键反馈，不劫持滚动，不用满屏粒子，也不让持续动画干扰阅读。

**Key Characteristics:**

- 黑灰战术基底，RGB 自定义属性贯穿 primitive → semantic → Tailwind token。
- 荧光绿是稀缺信号，金属金只用于价值信息。
- 44px 最小触控高度，390px 移动端优先，桌面通过左侧导航轨道扩展。
- 1px 边框、切角、编号和扫描线建立 HUD 结构，阴影只用于层级，不依赖强发光。
- 管理端与用户端共享组件语言，但使用独立色彩语义和密度策略。

## Colors

调色板以近黑战术底、冷灰层级和四种信号色构成；所有语义颜色都能在用户端与管理端独立映射。

### Primary

- **Signal Lime** (`#beff40`): 用户端在线、选中、主按钮和成功状态；不作为大面积背景，也不承担正文颜色。
- **Signal Lime Deep** (`#679d10`): 荧光绿的深阶，用于边框、悬停和低透明背景。
- **Admin Primary Blue** (`#1d72d8`): 管理端浅色主题的操作色，用于主按钮、链接和选中筛选。

### Secondary

- **Signal Amber** (`#ffb744`): 等待处理、审核中、付款核验和需要注意的状态。
- **Signal Red** (`#ff4d52`): 失败、驳回、取消、危险操作和限时警示。
- **Signal Blue** (`#4da3ff`): 信息提示、系统说明和管理端暗色主题的操作色。
- **Trade Gold** (`#d8b770`): 价格、等级、成交凭证和收益，仅限于价值语境。

### Neutral

- **Void Black** (`#030507`): 用户端页面底色和最外层空间。
- **Surface** (`#06090c`): 主面板、底部操作栏和会话背景。
- **Surface Raised** (`#0f171e`): 次级面板、输入框和卡片内部层级。
- **Border** (`#263540`): 默认 1px 分隔线、面板轮廓和网格。
- **Border Strong** (`#415460`): 悬停、聚焦和层级加强状态。
- **Text** (`#f6f7f4`): 主要正文和标题。
- **Text Muted** (`#acb5b8`): 说明、元数据和次要操作。
- **Text Faint** (`#6b777d`): 标签、占位和低优先级信息，不用于长段落。
- **Admin BG** (`#f2f5f7`) / **Admin Surface** (`#ffffff`) / **Admin Text** (`#10181f`): 管理端浅色主题的工作区、面板和正文。

### Named Rules

**The Signal Rarity Rule.** 荧光绿在一个视口内主要承担一个主操作和少量状态信号，不能把整页染成绿色。

**The Gold Value Rule.** 金色只出现在价格、等级、收益和成交凭证；普通信息不使用金色制造“高级感”。

**The Admin Readability Rule.** 管理端浅色主题以对比度和表格效率优先，暗色主题降低装饰密度，不照搬用户端的 HUD 强度。

## Typography

**Display Font:** Bahnschrift (with DIN Alternate, Cascadia Mono, Microsoft YaHei fallbacks)  
**Body Font:** HarmonyOS Sans SC (with MiSans, PingFang SC, Microsoft YaHei fallbacks)  
**Label/Mono Font:** Cascadia Mono (with SFMono-Regular, Consolas fallbacks)

**Character:** 中文正文保持系统字体的稳定和易读，标题与英文编号采用窄体工业感字形，金额、时间、订单号和状态码使用等宽数字。字体全部来自本机或系统回退，不依赖远程字体服务。

### Hierarchy

- **Display** (650, clamp 2rem–5rem, 0.95): 首页主标题、社区主编情报和关键数字展示。
- **Headline** (650, 1.5rem–2rem, 1.05): 页面主标题、面板标题和详情关键区。
- **Title** (600, 1rem–1.125rem, 1.25): 卡片标题、列表分组和操作区标题。
- **Body** (400, 0.875rem–1rem, 1.6–1.75): 正文、说明和表格内容，长文保持 65–75ch 的阅读宽度。
- **Label** (500–650, 0.625rem–0.75rem, 0.08em–0.2em, uppercase): 英文系统标签、状态码、面板编号和数据列标题。

### Named Rules

**The Numeric Integrity Rule.** 金额、时间、订单号和统计值必须使用 `font-data` 或等价等宽数字，不能使用比例字体导致列跳动。

**The No Web Font Rule.** 不为视觉效果引入远程字体；新增字形必须先确认本机字体栈可回退。

## Layout

用户端以 390px 移动端为基准，内容最大宽度 520px；桌面端切换到 1180px 内容区和 240px 左侧导航轨道。移动端底部导航固定在 `bottom-2`，页面内容预留底部安全区；详情页和确认订单使用 `ActionDock` 作为固定主操作区，并与 TabBar 分层，不允许被遮挡。

管理端使用 240px 侧栏和紧凑数据区，宽屏表格允许横向滚动，移动端改为纵向卡片。页面主要间距节奏为 4 / 8 / 16 / 24 / 32px；面板内边距通常 16–24px。内容区使用细网格背景和低透明径向光，网格尺寸在用户端为 24px，管理端可降为纯色或更低密度。390、768、1440 三个宽度必须检查无横向滚动。

## Elevation & Depth

系统采用“边框 + 色阶 + 局部阴影”的混合层级，不依赖大面积发光。用户端最深背景接近纯黑，面板通过比背景高一阶的表面色和 1px 边框建立层级；悬停时才增加阴影和细微位移。付款弹窗、二维码和底部操作栏使用半透明表面加 `backdrop-blur`，保证仍然能辨认后方订单上下文。

### Shadow Vocabulary

- **Card** (`0 1px 2px rgb(0 0 0 / 0.16), 0 12px 36px rgb(0 0 0 / 0.18)`): 普通浮层和交互卡片。
- **Dock** (`0 -12px 36px rgb(0 0 0 / 0.3)`): 底部固定操作区和付款操作层。
- **Glow** (`0 0 0 1px rgb(190 255 64 / 0.12), 0 10px 28px rgb(0 0 0 / 0.22)`): 只用于主信号按钮或悬浮客服，不作为卡片默认状态。

### Named Rules

**The Flat-By-Default Rule.** 面板在静止状态以边框和色阶表达层级；阴影只在浮层、固定操作栏或交互反馈中出现。

**The No Neon Flood Rule.** 不使用贯穿全屏的强烈外发光、持续雷达扫描、满屏粒子或高帧率故障动画。

## Shapes

主要圆角为 6px（按钮和输入）、10px（面板和卡片）、18px（大容器和移动端底部抽屉）。大部分轮廓保持直角或轻微圆角，关键面板通过左上/右下切角、角标、短横线和顶部细线建立 HUD 识别，而不是大量胶囊形状。按钮高度至少 44px，图标使用 16–22px 线框或几何造型；边框始终为 1px，只有聚焦、危险或选中状态才提升颜色和透明度。

## Components

### Buttons

- **Shape:** 6px 圆角，最小高度 44px；移动端主操作可拉伸整行。
- **Primary:** 荧光绿背景、深色文字、紧凑水平内边距；用于下单、提交、确认和抢单。
- **Hover / Focus:** 220ms 颜色/边框/位移反馈，键盘焦点使用 2px 荧光绿 outline，保证可见。
- **Secondary / Ghost / Tertiary:** 透明或深色表面配合 1px 边框；危险操作使用红色边框和低透明红底。按钮不会依赖持续脉冲提示可点击。

### Chips

- **Style:** 以 1px 边框和小圆角为主，选中时使用低透明荧光绿背景和绿色文字，不使用高饱和胶囊堆叠。
- **State:** 未选中为灰色表面，选中增加边框和文字对比；频道路由标签与状态标签共享语义色。

### Cards / Containers

- **Corner Style:** 面板 10px，大容器 18px，必要时使用切角轮廓。
- **Background:** 用户端 `surface` / `surface-raised`，管理端 `admin-surface` / `admin-bg`。
- **Shadow Strategy:** 静止以边框为主，交互卡片可使用 hover-lift；不使用悬浮无边框发光。
- **Border:** 1px `border`，重要面板通过短顶线和角标建立编号感。
- **Internal Padding:** 16px 移动端，24px 桌面端；信息密集区使用 12–16px。

### Inputs / Fields

- **Style:** 深色或白色表面、1px 边框、6px 圆角、44px 最小高度；标签在输入框上方，必填和字数提示右对齐。
- **Focus:** 边框切到主色，配合轻微色阶提升；不添加不可见文本或过度闪烁。
- **Error / Disabled:** 错误使用红色边框和红色说明，禁用降低不透明度但保留可读标签；提交中明确显示进行态。

### Navigation

- **Style:** 移动端底部五项导航为“首页 / 服务 / 社区 / 消息 / 我的”，使用图标、中文标签和英文代码；当前项用荧光绿底边或信号点表示。
- **Desktop:** 左侧固定导航轨道承载主导航、AI 客服和工作台信息，主内容偏移 240px。
- **Admin:** 240px 侧栏分组呈现“指挥中心 / 交易链路 / 内容与供给 / 系统”，当前项使用浅蓝底和左侧指示线。

### HUD Panel

- **Character:** 每个面板像一块可操作的战术终端，顶部有索引或英文元数据，底部或角部有状态线。
- **Usage:** 首页模块、服务详情、订单时间轴、社区帖子、付款凭证和管理端指标卡均复用该结构。
- **Behavior:** `scan` 只作为短时状态表达，`hover-lift` 只用于确实可点击或可展开的面板。

### ActionDock

- **Character:** 移动端详情页底部的固定交易操作台，承载金额和唯一主 CTA。
- **Usage:** 服务详情、确认订单、订单详情、帖子详情等需要持续可见操作的位置。
- **Behavior:** 具有安全区 padding，层级高于 TabBar；任何页面入场动画都不得对祖先元素保留 `transform`，以免把 `fixed` 错定位到长页面底部。

### EvidenceCard

- **Character:** 将“从帖子完成订单”的结果显示为可核验的成交凭证。
- **Content:** 订单号后段、服务名、局数、金额和完成时间；不显示手机号或 OpenID。
- **State:** 只有 `completed` 且 `paid` 的订单进入凭证，加载、空数据和审核中状态都要有明确文案。

## Do's and Don'ts

### Do:

- **Do** 使用明确的三层 token，先改 primitive 或 semantic 变量，再让 Tailwind 和组件读取它们。
- **Do** 在 390px 视口保留至少 44px 的触控高度，并为固定底栏预留安全区和内容底部间距。
- **Do** 用红色表达失败、取消和危险，用琥珀色表达等待，用蓝色表达信息，避免状态颜色只靠文字说明。
- **Do** 保持页面切换、按钮点击和状态变化的反馈克制，遵循 120ms / 260ms / 300–500ms 的节奏，并尊重 `prefers-reduced-motion`。
- **Do** 为用户生成内容提供审核、驳回、下架、置顶、精选和知识库收录能力。
- **Do** 对移动端标题、金额和表格数字使用等宽字形，防止布局跳动。

### Don't:

- **Don't** 把荧光绿铺满背景，或用金色修饰普通文字和装饰线条。
- **Don't** 在整页根节点保留 `transform` 动画填充状态，否则 `position: fixed` 的 ActionDock 和付款弹窗会相对长内容定位。
- **Don't** 使用满屏粒子、强烈故障、持续旋转雷达、自动播放音效或影响阅读的无限动画。
- **Don't** 在社区公开成交凭证中返回或展示手机号、OpenID 等隐私信息。
- **Don't** 管理端直接套用用户端暗色 HUD 强度；浅色工作区必须优先保证长时间数据阅读和表格对比。
- **Don't** 为社区交易另建一套绕过订单状态机的旁路逻辑；社区下单必须复用 `sourcePostId` 和现有订单/支付/打手流程。