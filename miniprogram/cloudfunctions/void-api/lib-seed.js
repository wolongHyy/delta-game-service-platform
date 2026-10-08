const SERVICE_TYPES = [
  { id: 'st-escort', name: '护航上分', description: '老练操作手全程护航，护送撤离、守住收益。', order: 1, active: true },
  { id: 'st-companion', name: '陪玩组队', description: '按小时组队陪玩，沟通节奏、补位配合都由你定。', order: 2, active: true },
  { id: 'st-train', name: '战术教学', description: '一对一点评走位、枪线与搜点思路，可复盘录像。', order: 3, active: true },
  { id: 'st-loot', name: '摸金带飞', description: '带新人跑图摸金，讲解点位与撤离路线。', order: 4, active: true }
]

const COMPANIONS = [
  {
    id: 'cp-escort-standard',
    name: '机密护航 · 标准档',
    serviceTypeId: 'st-escort',
    kind: 'fighter',
    serviceName: '按局护航',
    price: 39,
    unit: '局',
    rank: '标准档',
    sales: 128,
    rating: '4.9',
    avatar: '',
    tags: ['机密', '护航', '保收益'],
    description: '适合常规上分，操作手负责开路与断后，全程语音同步战况。',
    active: true
  },
  {
    id: 'cp-escort-premium',
    name: '绝密护航 · 尊享档',
    serviceTypeId: 'st-escort',
    kind: 'fighter',
    serviceName: '按局护航',
    price: 89,
    unit: '局',
    rank: '尊享档',
    sales: 76,
    rating: '4.9',
    avatar: '',
    tags: ['绝密', '高价值物资', '双排指挥'],
    description: '高强度地图护航，优先保障高价值物资安全撤离。',
    active: true
  },
  {
    id: 'cp-escort-rank',
    name: '排位护航 · 冲分档',
    serviceTypeId: 'st-escort',
    kind: 'fighter',
    serviceName: '按局护航',
    price: 129,
    unit: '局',
    rank: '冲分档',
    sales: 41,
    rating: '4.8',
    avatar: '',
    tags: ['排位', '冲分', '全程指挥'],
    description: '面向冲分需求，操作手负责节奏推进与关键局决策。',
    active: true
  },
  {
    id: 'cp-companion-hour',
    name: '陪玩组队 · 休闲档',
    serviceTypeId: 'st-companion',
    kind: 'fighter',
    serviceName: '按小时陪玩',
    price: 29,
    unit: '小时',
    rank: '休闲档',
    sales: 214,
    rating: '4.9',
    avatar: '',
    tags: ['组队', '语音', '轻松局'],
    description: '按小时组队，打法随你，聊天氛围轻松不催单。',
    active: true
  },
  {
    id: 'cp-train-one',
    name: '战术教学 · 一对一',
    serviceTypeId: 'st-train',
    kind: 'fighter',
    serviceName: '按小时教学',
    price: 59,
    unit: '小时',
    rank: '教学档',
    sales: 58,
    rating: '5.0',
    avatar: '',
    tags: ['一对一', '复盘', '枪线走位'],
    description: '一对一讲解，可带录像复盘，结束给出训练建议清单。',
    active: true
  },
  {
    id: 'cp-loot-run',
    name: '摸金带飞 · 保底档',
    serviceTypeId: 'st-loot',
    kind: 'fighter',
    serviceName: '按局带图',
    price: 69,
    unit: '局',
    rank: '带图档',
    sales: 93,
    rating: '4.8',
    avatar: '',
    tags: ['摸金', '点位讲解', '撤离路线'],
    description: '带新人熟悉高价值点位与撤离路线，边打边讲。',
    active: true
  }
]

const MESSAGES = [
  {
    id: 'msg-welcome',
    type: 'official',
    title: '欢迎来到 VOID 三角洲游戏服务平台',
    content: '下单后在订单详情提交付款备注，管理员核对到账即进入接单池，完工后可在社区帖子看到脱敏成交凭证。',
    active: true
  },
  {
    id: 'msg-rules',
    type: 'official',
    title: '社区发帖规则',
    content: '帖子默认进入人工审核，禁止发布代练外挂、账号买卖、联系方式等违规内容；成交凭证只展示脱敏数据。',
    active: true
  }
]

const POSTS = [
  {
    id: 'post-welcome',
    authorId: 'system',
    authorName: 'VOID 指挥台',
    authorLevel: 9,
    title: '社区上线：看帖可以直接下单了',
    content: '新社区把情报和交易放在同一条链路里。看到感兴趣的陪玩档位，点“看帖下单”就会带着来源帖子进入下单流程；订单完成后帖子会自动展示脱敏成交凭证。',
    topic: '平台公告',
    tags: ['公告', '社区', '下单'],
    serviceId: 'cp-escort-standard',
    images: [],
    status: 'published',
    featured: true,
    knowledge: false,
    likeCount: 12,
    commentCount: 0,
    favoriteCount: 5,
    evidenceCount: 0
  },
  {
    id: 'post-zero-dam',
    authorId: 'system',
    authorName: 'VOID 指挥台',
    authorLevel: 9,
    title: '零号大坝开局三分钟搜点路线',
    content: '开局先贴左侧集装箱吃保底，第二段绕开主楼正门，从侧门进地下。中段留意二层窗口，撤离前留一颗烟。新手最容易犯的错是一路直冲主楼，物资没吃到还容易被夹。',
    topic: '战术交流',
    tags: ['零号大坝', '搜点', '新手'],
    serviceId: '',
    images: [],
    status: 'published',
    featured: false,
    knowledge: true,
    likeCount: 34,
    commentCount: 0,
    favoriteCount: 18,
    evidenceCount: 0
  },
  {
    id: 'post-payment-guide',
    authorId: 'system',
    authorName: 'VOID 指挥台',
    authorLevel: 9,
    title: '付款核销怎么走？完整流程一次说清',
    content: '第一步选档位下单；第二步在订单详情提交付款方式与备注；第三步管理员核对到账，订单进入接单池；第四步操作手接单开始服务；第五步申请完工并由管理员确认，订单完成。',
    topic: '新手答疑',
    tags: ['付款', '核销', '流程'],
    serviceId: 'cp-companion-hour',
    images: [],
    status: 'published',
    featured: false,
    knowledge: true,
    likeCount: 21,
    commentCount: 0,
    favoriteCount: 9,
    evidenceCount: 0
  }
]

const SETTINGS = {
  payment: {
    qrUrl: '',
    title: '扫码付款后提交备注',
    instructions: '请使用微信扫一扫付款，付款完成后回到订单详情填写付款方式与付款备注（建议填写微信昵称 + 手机号后四位），管理员核对到账后订单进入接单池。'
  }
}

const FAQ = [
  {
    keys: ['下单', '怎么买', '购买', '流程'],
    answer: '进入“服务”页选择档位 → 点“立即下单” → 填写游戏 ID 与模式 → 提交订单。提交后在订单详情上传付款备注即可。'
  },
  {
    keys: ['付款', '支付', '转账', '核销', '到账'],
    answer: '付款完成后回到订单详情，点“提交付款”，填写付款方式和备注（建议微信昵称 + 手机号后四位）。管理员核对到账后，订单会进入待接单池。'
  },
  {
    keys: ['多久', '时间', '接单'],
    answer: '管理员确认到账后订单进入接单池，操作手通常在 10 分钟内接单。若长时间无人接单，可联系客服协助调度。'
  },
  {
    keys: ['取消', '退款'],
    answer: '待付款、待确认到账、待接单、已派单、服务中的订单都可以在订单详情点“取消订单”。已完成的订单如需退款，请联系客服人工处理。'
  },
  {
    keys: ['价格', '多少钱', '收费', '档位'],
    answer: '服务页按“服务矩阵”分类展示档位，价格单位为局或小时，页面上的单价 × 服务单位数量就是应付合计，下单页会实时显示。'
  },
  {
    keys: ['社区', '发帖', '帖子', '规则', '审核'],
    answer: '社区帖子默认进入人工审核。禁止发布代练外挂、账号买卖、联系方式等内容。帖子可以关联服务，其他玩家可以从帖子直接进入下单流程。'
  },
  {
    keys: ['凭证', '成交', '隐私', '脱敏'],
    answer: '订单完成后，如果来源是社区帖子，帖子会展示成交凭证。凭证只展示订单号后段、服务名、局数、金额与完成时间，不展示手机号和 OpenID。'
  },
  {
    keys: ['打手', '操作手', '入驻', '接单'],
    answer: '在“我的 → 打手入驻”提交申请，管理员在管理指挥台审核通过后即可在接单大厅抢单。接单后依次是开始服务、申请完工，由管理员确认完工。'
  },
  {
    keys: ['管理员', '初始化', '云开发', '部署'],
    answer: '首次部署请进入“云开发设置”保存云环境 ID，再回到设置页执行“初始化云环境”，会自动创建数据集合、示例服务档位，并把当前微信账号设为管理员。'
  }
]

const FAQ_FALLBACK = '暂时没有匹配到答案。可以换个说法，或者把问题发到社区“新手答疑”频道，客服会补充回复。也可以直接问：怎么下单、付款后多久接单、订单怎么取消、社区发帖规则是什么。'

module.exports = {
  SERVICE_TYPES: SERVICE_TYPES,
  COMPANIONS: COMPANIONS,
  MESSAGES: MESSAGES,
  POSTS: POSTS,
  SETTINGS: SETTINGS,
  FAQ: FAQ,
  FAQ_FALLBACK: FAQ_FALLBACK
}