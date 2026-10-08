const core = require('../lib/core')
const seed = require('../lib/seed')

function decorated (companion) {
  const item = core.withId(companion) || {}
  item.price = Number(item.price || 0)
  item.sales = Number(item.sales || 0)
  item.tags = Array.isArray(item.tags) ? item.tags : []
  return item
}

async function bootstrap (ctx) {
  const types = await core.queryAll(core.C.serviceTypes, { active: true }, { orderBy: { field: 'order', type: 'asc' }, limit: 20 })
  const hot = await core.queryAll(core.C.companions, { active: true }, { orderBy: { field: 'sales', type: 'desc' }, limit: 6 })
  const posts = await core.queryAll(core.C.posts, { status: 'published' }, { orderBy: { field: 'createdAt', type: 'desc' }, limit: 3 })
  const publishedPosts = await core.countWhere(core.C.posts, { status: 'published' })
  const completedOrders = await core.countWhere(core.C.orders, { status: core.STATUS.COMPLETED })
  const users = await core.countWhere(core.C.users, {})

  return {
    serviceTypes: core.withIds(types),
    hot: hot.map(decorated),
    banners: [
      { id: 'banner-flow', title: '付款核销 + 打手接单', text: '管理员确认到账后订单进入接单池，完工后回写脱敏凭证。' }
    ],
    posts: core.withIds(posts),
    stats: {
      posts: publishedPosts,
      completedOrders: completedOrders,
      contributors: users,
      companions: hot.length
    }
  }
}

async function types () {
  const list = await core.queryAll(core.C.serviceTypes, { active: true }, { orderBy: { field: 'order', type: 'asc' }, limit: 20 })
  if (!list.length) {
    const fallback = seed.SERVICE_TYPES.map(function (item) { return Object.assign({ _id: item.id }, item) })
    return core.withIds(fallback)
  }
  return core.withIds(list)
}

async function companionList (ctx) {
  const payload = ctx.payload || {}
  const where = { active: true }
  if (payload.serviceTypeId) where.serviceTypeId = String(payload.serviceTypeId)
  const sort = String(payload.sort || 'default')
  const field = sort === 'sales' ? 'sales' : (sort === 'price' ? 'price' : 'sales')
  let list = await core.queryAll(core.C.companions, where, {
    orderBy: { field: field, type: sort === 'price' ? 'asc' : 'desc' },
    limit: 60
  })
  if (!list.length && !payload.serviceTypeId) {
    list = seed.COMPANIONS.map(function (item) { return Object.assign({ _id: item.id }, item) })
  }
  const keyword = String(payload.keyword || '').trim().toLowerCase()
  if (keyword) {
    list = list.filter(function (item) {
      const haystack = [item.name, item.description, item.rank, (item.tags || []).join(' ')].join(' ').toLowerCase()
      return haystack.indexOf(keyword) >= 0
    })
  }
  return list.map(decorated)
}

async function companionGet (ctx) {
  const id = core.requireText(ctx.payload.id, 1, '服务编号')
  let item = await core.getDoc(core.C.companions, id)
  if (!item) {
    const fallback = seed.COMPANIONS.filter(function (row) { return row.id === id })[0]
    if (fallback) item = Object.assign({ _id: fallback.id }, fallback)
  }
  if (!item) throw new Error('服务档位不存在或已下架')
  return decorated(item)
}

async function messages (ctx) {
  const openid = ctx.openid
  const official = await core.queryAll(core.C.messages, { active: true }, { orderBy: { field: 'createdAt', type: 'desc' }, limit: 20 })
  const list = official.map(function (item) {
    const row = core.withId(item) || {}
    row.type = row.type || 'official'
    return row
  })
  const mine = await core.queryAll(core.C.aiMessages, { userId: openid }, { orderBy: { field: 'createdAt', type: 'desc' }, limit: 5 })
  mine.forEach(function (item) {
    list.push({
      id: item._id,
      type: 'customer_service',
      title: String(item.question || 'AI 客服咨询'),
      content: String(item.answer || ''),
      createdAt: String(item.createdAt || '')
    })
  })
  return list
}

function matchFaq (question) {
  const text = String(question || '').toLowerCase()
  let best = null
  let bestScore = 0
  seed.FAQ.forEach(function (item) {
    let score = 0
    item.keys.forEach(function (key) {
      if (text.indexOf(String(key).toLowerCase()) >= 0) score += 1
    })
    if (score > bestScore) { bestScore = score; best = item }
  })
  return bestScore > 0 ? best.answer : ''
}

async function aiAsk (ctx) {
  const openid = ctx.openid
  const question = core.requireText(ctx.payload.message, 1, '问题').slice(0, 200)
  const answer = matchFaq(question) || seed.FAQ_FALLBACK
  try {
    await core.addDoc(core.C.aiMessages, {
      userId: openid,
      question: question,
      answer: answer,
      createdAt: core.nowLocal()
    })
  } catch (error) {}
  return { answer: answer, matched: answer !== seed.FAQ_FALLBACK }
}

async function profileMe (ctx) {
  const openid = ctx.openid
  const user = await core.ensureUser(openid)
  const admin = await core.isAdmin(openid)
  const orderCount = await core.countWhere(core.C.orders, { customerId: openid })
  const completedOrders = await core.countWhere(core.C.orders, { customerId: openid, status: core.STATUS.COMPLETED })
  const postCount = await core.countWhere(core.C.posts, { authorId: openid, status: 'published' })
  const favoriteCount = await core.countWhere(core.C.favorites, { userId: openid })
  const fighter = await core.getDoc(core.C.fighters, openid)

  return {
    user: {
      openid: openid,
      nickname: String(user.nickname || ''),
      avatarUrl: String(user.avatarUrl || ''),
      phone: String(user.phone || ''),
      isAdmin: admin,
      level: Number(user.level || 1),
      createdAt: String(user.createdAt || '')
    },
    profile: {
      contributionScore: Number(user.contributionScore || 0),
      postCount: postCount,
      favoriteCount: favoriteCount,
      completedOrders: completedOrders,
      level: Number(user.level || 1),
      fighterStatus: fighter ? String(fighter.status || 'active') : 'none'
    },
    counts: {
      orders: orderCount,
      completed: completedOrders,
      posts: postCount,
      favorites: favoriteCount
    }
  }
}

async function paymentConfig () {
  const settings = await core.getDoc(core.C.settings, 'payment')
  if (!settings) return Object.assign({}, seed.SETTINGS.payment)
  return {
    qrUrl: String(settings.qrUrl || ''),
    title: String(settings.title || '扫码付款后提交备注'),
    instructions: String(settings.instructions || '')
  }
}

module.exports = {
  bootstrap: bootstrap,
  types: types,
  companionList: companionList,
  companionGet: companionGet,
  messages: messages,
  aiAsk: aiAsk,
  profileMe: profileMe,
  paymentConfig: paymentConfig
}