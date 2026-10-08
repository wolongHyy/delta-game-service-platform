const SERVICE_TYPES = [
  { id: "st-play", name: "陪玩", description: "按小时组队陪玩，单陪/双陪可选，档位按击杀能力划分。", order: 1, active: true },
  { id: "st-escort", name: "护航", description: "保底护航单，没打到保底一直打，撤离成功才算。", order: 2, active: true },
  { id: "st-fun", name: "趣味单", description: "指定物品/指定条件的挑战单，按单结算。", order: 3, active: true }
]

// 档位与价格同步自俱乐部实际价目表（app/scripts/seed.cjs，2026-08-07 会议价目表）
// 只保留客户可见的价格与规则，抽成等内部规则不写入小程序
const COMPANIONS = [
  {
    id: "cp-play-ent",
    name: "娱乐",
    serviceTypeId: "st-play",
    kind: 'product',
    serviceName: "娱乐",
    price: 40,
    unit: "小时",
    rank: '',
    tags: ["单陪", "双陪"],
    description: "无人头赔付。",
    active: true
  },
  {
    id: "cp-play-gan",
    name: "干事",
    serviceTypeId: "st-play",
    kind: 'product',
    serviceName: "干事",
    price: 58,
    unit: "小时",
    rank: '',
    tags: ["单陪", "双陪"],
    description: "绝密无人头赔付；机密 6 杀/小时。",
    active: true
  },
  {
    id: "cp-play-bz",
    name: "部长",
    serviceTypeId: "st-play",
    kind: 'product',
    serviceName: "部长",
    price: 108,
    unit: "小时",
    rank: '',
    tags: ["单陪", "双陪"],
    description: "任意绝密地图单人 6 杀/小时。",
    active: true
  },
  {
    id: "cp-play-fzx",
    name: "副主席",
    serviceTypeId: "st-play",
    kind: 'product',
    serviceName: "副主席",
    price: 175,
    unit: "小时",
    rank: '',
    tags: ["单陪", "双陪"],
    description: "任意绝密地图 9 杀/小时。",
    active: true
  },
  {
    id: "cp-play-zx",
    name: "主席",
    serviceTypeId: "st-play",
    kind: 'product',
    serviceName: "主席",
    price: 368,
    unit: "小时",
    rank: '',
    tags: ["单陪", "双陪"],
    description: "任意绝密地图 13 杀/小时，或 9 杀/小时 + 撤离一把（丢包撤离不算）。",
    active: true
  },
  {
    id: "cp-escort-800",
    name: "护航·800W低价单",
    serviceTypeId: "st-escort",
    kind: 'product',
    serviceName: "护航·800W低价单",
    price: 108,
    unit: "单",
    rank: '',
    tags: ["护航", "保底"],
    description: "保底 800W，每周限 1 次。",
    active: true
  },
  {
    id: "cp-escort-888",
    name: "护航·888W保底",
    serviceTypeId: "st-escort",
    kind: 'product',
    serviceName: "护航·888W保底",
    price: 138,
    unit: "单",
    rank: '',
    tags: ["护航", "保底"],
    description: "保底 888W。",
    active: true
  },
  {
    id: "cp-escort-1688",
    name: "护航·1688W保底",
    serviceTypeId: "st-escort",
    kind: 'product',
    serviceName: "护航·1688W保底",
    price: 238,
    unit: "单",
    rank: '',
    tags: ["护航", "保底"],
    description: "保底 1688W。",
    active: true
  },
  {
    id: "cp-escort-3288",
    name: "护航·3288W保底",
    serviceTypeId: "st-escort",
    kind: 'product',
    serviceName: "护航·3288W保底",
    price: 428,
    unit: "单",
    rank: '',
    tags: ["护航", "保底"],
    description: "保底 3288W。",
    active: true
  },
  {
    id: "cp-escort-5888",
    name: "护航·5888W保底",
    serviceTypeId: "st-escort",
    kind: 'product',
    serviceName: "护航·5888W保底",
    price: 648,
    unit: "单",
    rank: '',
    tags: ["护航", "保底"],
    description: "保底 5888W。",
    active: true
  },
  {
    id: "cp-escort-10000",
    name: "护航·10000W保底",
    serviceTypeId: "st-escort",
    kind: 'product',
    serviceName: "护航·10000W保底",
    price: 1266,
    unit: "单",
    rank: '',
    tags: ["护航", "保底"],
    description: "保底 10000W。",
    active: true
  },
  {
    id: "cp-fun-htqt",
    name: "航天清图特价单",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "航天清图特价单",
    price: 168,
    unit: "单",
    rank: '',
    tags: ["趣味单", "航天"],
    description: "航天清图 + 600W 保底，清图且必须带出 600W 才结单，否则一直打。最后一波闸或最后 1 分钟撤离无人，即为清图；护航击杀人数需满 5 人（老板丢包撤离不算清图）。",
    active: true
  },
  {
    id: "cp-fun-hunt-awm",
    name: "猎杀AWM单",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "猎杀AWM单",
    price: 688,
    unit: "单",
    rank: '',
    tags: ["趣味单", "AWM"],
    description: "基础保底 2000W，必须打到 5 发 AWM 子弹才结单；出了 AWM 子弹必须塞保险。",
    active: true
  },
  {
    id: "cp-fun-bridge",
    name: "乌鲁鲁堵桥单",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "乌鲁鲁堵桥单",
    price: 238,
    unit: "单",
    rank: '',
    tags: ["趣味单", "乌鲁鲁"],
    description: "保底 1300W，和老板一起选乌鲁开局复活，带老板一起堵桥。",
    active: true
  },
  {
    id: "cp-fun-1200-3red",
    name: "保1200W+3个红",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "保1200W+3个红",
    price: 238,
    unit: "单",
    rank: '',
    tags: ["趣味单", "出红"],
    description: "保底 1288W + 单局 3 个红，不出一直打；甲修不算红，变卖物才算（护航玩法，不涉及游戏代练）。",
    active: true
  },
  {
    id: "cp-fun-688-2red",
    name: "保688W+单局2个红",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "保688W+单局2个红",
    price: 238,
    unit: "单",
    rank: '',
    tags: ["趣味单", "出红"],
    description: "保底 688W + 单局 2 个红，不出一直打；甲修不算红，变卖物才算（护航玩法，不涉及游戏代练）。",
    active: true
  },
  {
    id: "cp-fun-1588-fuel",
    name: "保1588W+1个航天燃料",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "保1588W+1个航天燃料",
    price: 588,
    unit: "单",
    rank: '',
    tags: ["趣味单", "航天燃料"],
    description: "保底 1588W + 1 个航天燃料，不出一直打；两个条件都完成才结单，导师选图。",
    active: true
  },
  {
    id: "cp-fun-babel",
    name: "必出巴别塔三幻神",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "必出巴别塔三幻神",
    price: 5888,
    unit: "单",
    rank: '',
    tags: ["趣味单", "巴别塔"],
    description: "必出巴别塔三幻神（3 个都要出够），不出一直打，再送 1.5 亿保底；出了有保险必须塞。",
    active: true
  },
  {
    id: "cp-fun-satellite",
    name: "保700W+1个卫星锅",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "保700W+1个卫星锅",
    price: 288,
    unit: "单",
    rank: '',
    tags: ["趣味单", "卫星锅"],
    description: "保底 700W + 1 个卫星锅，不出一直打；两个条件都完成才结单，出了有保险必须塞。",
    active: true
  },
  {
    id: "cp-fun-coffee",
    name: "必出一个高级咖啡豆",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "必出一个高级咖啡豆",
    price: 188,
    unit: "单",
    rank: '',
    tags: ["趣味单", "咖啡豆"],
    description: "基础保底 600W + 1 个高级咖啡豆，两个条件都完成才结单；出了有保险必须塞。",
    active: true
  },
  {
    id: "cp-fun-redcard",
    name: "必出一张红色房卡",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "必出一张红色房卡",
    price: 2888,
    unit: "单",
    rank: '',
    tags: ["趣味单", "房卡"],
    description: "基础保底 8888W，必出一张红色房卡，不出一直打；出了必须塞保险。",
    active: true
  },
  {
    id: "cp-fun-tricolor",
    name: "必出三色卡",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "必出三色卡",
    price: 688,
    unit: "单",
    rank: '',
    tags: ["趣味单", "房卡"],
    description: "基础保底 3000W，累计带出蓝、紫、金房卡才结单；红卡为万能卡，出了必须塞保险（金卡指 40W 以上）。",
    active: true
  },
  {
    id: "cp-fun-purplecard",
    name: "必出一张紫色房卡",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "必出一张紫色房卡",
    price: 288,
    unit: "单",
    rank: '',
    tags: ["趣味单", "房卡"],
    description: "基础保底 1000W，必出一张紫色房卡，不出一直打；红卡为万能卡，出了必须塞保险。",
    active: true
  },
  {
    id: "cp-fun-anycard",
    name: "必出一张房卡",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "必出一张房卡",
    price: 188,
    unit: "单",
    rank: '',
    tags: ["趣味单", "房卡"],
    description: "基础保底 600W + 必出一张房卡，不出一直打；出了必须塞保险（仿制卡不算，撤离失败也不算）。",
    active: true
  },
  {
    id: "cp-fun-goldbullet",
    name: "单局必出360发金弹",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "单局必出360发金弹",
    price: 488,
    unit: "单",
    rank: '',
    tags: ["趣味单", "金弹"],
    description: "基础保底 2688W，单局必出 360 发金弹，不出一直打；过程中老板需要用金弹要先和导师沟通（1 发 AWM 子弹算 30 发金弹，1 发红弹算 5 发金弹）。",
    active: true
  },
  {
    id: "cp-fun-5gold",
    name: "5个相同小金单",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "5个相同小金单",
    price: 188,
    unit: "单",
    rank: '',
    tags: ["趣味单", "小金"],
    description: "基础保底 600W，单局必出 5 个相同的小金，不出够一直打（1 个红可以抵 1 个相同金），撤离成功才算。",
    active: true
  },
  {
    id: "cp-fun-9gold",
    name: "单局必出9个不同小金",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "单局必出9个不同小金",
    price: 168,
    unit: "单",
    rank: '',
    tags: ["趣味单", "小金"],
    description: "基础保底 600W+，单局必带出 9 个不同小金，不出一直打（1 个红可以抵 1 个不同金），撤离成功才算。",
    active: true
  },
  {
    id: "cp-fun-parts",
    name: "必出一个高级子弹零件",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "必出一个高级子弹零件",
    price: 268,
    unit: "单",
    rank: '',
    tags: ["趣味单", "子弹零件"],
    description: "基础保底 1000W，必出一个高级子弹零件，不出一直打；1 个百万大红或房卡（金卡/红卡）可抵消 1 个高级子弹；出了必须塞保险，子弹零件必须撤离才算。",
    active: true
  },
  {
    id: "cp-fun-redinf",
    name: "出红无限单",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "出红无限单",
    price: 598,
    unit: "单",
    rank: '',
    tags: ["趣味单", "出红"],
    description: "保底 700W，出红对局保底免费送（无上限）。",
    active: true
  },
  {
    id: "cp-fun-bingo",
    name: "Bingo单四连",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "Bingo单四连",
    price: 588,
    unit: "单",
    rank: '',
    tags: ["趣味单", "Bingo"],
    description: "保底 1088W，打手选图；板板需带六格以上保险进图连消，可以是竖/横/斜的海洋之泪、非洲之心、复苏呼吸机；红卡可抵任意格子。故意藏匿物资或故意不塞保险，经核实后俱乐部有权立即结单。",
    active: true
  },
  {
    id: "cp-fun-suppress",
    name: "打压同行单",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "打压同行单",
    price: 158,
    unit: "单",
    rank: '',
    tags: ["趣味单", "击杀"],
    description: "保底 600W，必须打掉 1 个女医或蝶，不然一直打；敌方干员带 40 或 45 格大红包等于一个女医（需要撤离成功才算）。",
    active: true
  },
  {
    id: "cp-fun-fullgold",
    name: "满金满红单",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "满金满红单",
    price: 328,
    unit: "单",
    rank: '',
    tags: ["趣味单", "满金满红"],
    description: "保底 1500W，40 格大红包必须塞满金或红，不够一直打（满耐红修、一整组金弹也算；金修不算，空白存储、暗星燃料不算）。此单性价比偏高，仅可由导师选图，不支持客户指定地图。",
    active: true
  },
  {
    id: "cp-fun-vgold",
    name: "弹挂版满金满红单",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "弹挂版满金满红单",
    price: 188,
    unit: "单",
    rank: '',
    tags: ["趣味单", "满金满红"],
    description: "保底 788W，24 格大弹挂必须塞满红或金，否则一直打（红头修红甲修只有满耐久可卖的才算，金弹只有整组才算，金甲金头修不算；没有大弹挂时满 24 格金红也算，按弹挂格式填进去）。",
    active: true
  },
  {
    id: "cp-fun-ginger5",
    name: "必出5个姜饼人单",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "必出5个姜饼人单",
    price: 488,
    unit: "单",
    rank: '',
    tags: ["趣味单", "姜饼人"],
    description: "保底 2388W，必须累计带出 5 个姜饼人，不出一直打，撤离成功才算。",
    active: true
  },
  {
    id: "cp-fun-ginger10",
    name: "必出10个姜饼人单",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "必出10个姜饼人单",
    price: 788,
    unit: "单",
    rank: '',
    tags: ["趣味单", "姜饼人"],
    description: "保底 4000W，必须累计带出 10 个姜饼人，不出一直打，撤离成功才算。",
    active: true
  },
  {
    id: "cp-fun-sand",
    name: "必摸沙色保险单",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "必摸沙色保险单",
    price: 158,
    unit: "单",
    rank: '',
    tags: ["趣味单", "沙色保险"],
    description: "保底 600W + 单局必摸 2 个沙色保险（只有老板摸的才算）。",
    active: true
  },
  {
    id: "cp-fun-sand10",
    name: "必摸10沙色保险单",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "必摸10沙色保险单",
    price: 568,
    unit: "单",
    rank: '',
    tags: ["趣味单", "沙色保险"],
    description: "保底 2688W + 必摸 10 个沙色保险，不然一直打，没有上限；成功撤离才算摸到保险（只有老板摸的才算）。",
    active: true
  },
  {
    id: "cp-fun-985",
    name: "985三条件单",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "985三条件单",
    price: 238,
    unit: "单",
    rank: '',
    tags: ["趣味单", "挑战"],
    description: "保底 700W，单局必出 9 个小金、8 个击杀、摸 5 个保险；单局未满足以上 3 个条件一直打，撤离成功才算（小保险也算，护航没双倒之前老板击杀的人也算人头）。",
    active: true
  },
  {
    id: "cp-fun-gun100",
    name: "99保必出100W的枪",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "99保必出100W的枪",
    price: 99,
    unit: "单",
    rank: '',
    tags: ["趣味单", "保底枪"],
    description: "保底 600W+，不带出 100W 的枪一直打（可组装子弹也计入枪的保底）。",
    active: true
  },
  {
    id: "cp-fun-gun15",
    name: "单局必出15把不同的枪",
    serviceTypeId: "st-fun",
    kind: 'product',
    serviceName: "单局必出15把不同的枪",
    price: 288,
    unit: "单",
    rank: '',
    tags: ["趣味单", "枪械"],
    description: "保底 1000W，单局找到 15 把不同的枪才能结单，否则一直打（撤离失败不计入，人机武器也算）。",
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
    serviceId: 'cp-escort-888',
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
    serviceId: 'cp-play-ent',
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