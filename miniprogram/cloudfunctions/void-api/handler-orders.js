const core = require('./lib-core')
const store = require('./lib-store')

function readable (order) {
  const item = core.withId(order)
  if (!item) return null
  item.statusLabel = core.statusLabel(item.status)
  return item
}

function assertTransition (fromStatus, toStatus) {
  const allowed = core.TRANSITIONS[fromStatus] || []
  if (allowed.indexOf(toStatus) < 0) {
    throw new Error('订单状态不允许从「' + core.statusLabel(fromStatus) + '」变更为「' + core.statusLabel(toStatus) + '」')
  }
}

async function create (ctx) {
  const openid = ctx.openid
  const payload = ctx.payload || {}
  const user = await core.ensureUser(openid)
  const companionId = core.requireText(payload.companionId, 1, '服务档位')
  const companion = await core.getDoc(core.C.companions, companionId)
  if (!companion || companion.active === false) throw new Error('服务档位不存在或已下架')

  const idempotencyKey = String(payload.idempotencyKey || '').trim().slice(0, 64)
  if (idempotencyKey) {
    const existing = await core.queryOne(core.C.orders, { customerId: openid, idempotencyKey: idempotencyKey })
    if (existing) return { id: existing._id, orderNo: existing.orderNo, duplicated: true }
  }

  const unitCount = Math.max(1, Math.min(24, Number(payload.unitCount || 1)))
  const amount = Number(companion.price || 0) * unitCount
  const inGameId = core.requireText(payload.inGameId, 1, '游戏 ID').slice(0, 40)

  let sourcePostId = String(payload.sourcePostId || '').trim()
  let sourcePostAuthorId = ''
  if (sourcePostId) {
    const post = await core.getDoc(core.C.posts, sourcePostId)
    if (!post) sourcePostId = ''
    else sourcePostAuthorId = String(post.authorId || '')
  }

  const now = core.nowLocal()
  const doc = {
    orderNo: core.orderNo(),
    customerId: openid,
    customerName: String(user.nickname || '玩家'),
    customerPhone: String(user.phone || ''),
    serviceTypeId: String(companion.serviceTypeId || ''),
    companionId: companionId,
    companionName: String(companion.name || ''),
    serviceName: String(companion.name || '陪玩服务'),
    unit: String(companion.unit || '局'),
    unitCount: unitCount,
    spec: String(payload.spec || '').slice(0, 40),
    gameField: String(payload.gameField || '').slice(0, 40),
    gameMode: String(payload.gameMode || '').slice(0, 40),
    mapName: String(payload.mapName || '').slice(0, 40),
    inGameId: inGameId,
    rank: String(payload.rank || '').slice(0, 40),
    remark: String(payload.remark || '').slice(0, 300),
    amount: amount,
    status: core.STATUS.UNPAID,
    fighterId: '',
    fighterName: '',
    sourcePostId: sourcePostId,
    sourcePostAuthorId: sourcePostAuthorId,
    paymentMethod: '',
    paymentNote: '',
    payProof: '',
    idempotencyKey: idempotencyKey,
    createdAt: now,
    updatedAt: now
  }

  const created = await core.addDoc(core.C.orders, doc)
  await store.addEvent(created._id, '', core.STATUS.UNPAID, 'customer', openid, '订单创建')
  try { await core.updateDoc(core.C.users, openid, { orderCount: core._.inc(1), updatedAt: now }) } catch (error) {}

  return { id: created._id, orderNo: created.orderNo, amount: amount, status: created.status }
}

async function list (ctx) {
  const openid = ctx.openid
  const status = String(ctx.payload.status || '').trim()
  const where = { customerId: openid }
  if (status) where.status = status
  const orders = await core.queryAll(core.C.orders, where, {
    orderBy: { field: 'createdAt', type: 'desc' },
    limit: 60
  })
  return orders.map(readable)
}

async function get (ctx) {
  const openid = ctx.openid
  const id = core.requireText(ctx.payload.id, 1, '订单编号')
  const order = await core.getDoc(core.C.orders, id)
  if (!order) throw new Error('订单不存在')
  const isOwner = String(order.customerId || '') === openid
  const isFighter = String(order.fighterId || '') === openid
  const admin = await core.isAdmin(openid)
  if (!isOwner && !isFighter && !admin) throw new Error('没有权限查看该订单')

  const events = await core.queryAll(core.C.orderEvents, { orderId: String(id) }, {
    orderBy: { field: 'createdAt', type: 'asc' },
    limit: 50
  })

  const result = { order: readable(order), events: events.map(core.withId) }
  if (!isOwner && !admin) {
    const owner = await core.getDoc(core.C.users, order.customerId)
    result.order.customerName = core.maskName(owner && owner.nickname, '客户')
    result.order.customerPhone = owner && owner.phone ? String(owner.phone).slice(-4) : ''
    result.order.inGameId = order.inGameId || ''
  }
  return result
}

async function pay (ctx) {
  const openid = ctx.openid
  const id = core.requireText(ctx.payload.id, 1, '订单编号')
  const order = await core.getDoc(core.C.orders, id)
  if (!order) throw new Error('订单不存在')
  if (String(order.customerId || '') !== openid) throw new Error('只有下单本人可以提交付款凭证')
  const method = core.requireText(ctx.payload.method, 1, '付款方式').slice(0, 30)
  const note = core.requireText(ctx.payload.note, 2, '付款备注').slice(0, 80)
  if (order.status !== core.STATUS.UNPAID && order.status !== core.STATUS.PAYMENT_REVIEW) {
    throw new Error('当前订单状态为「' + core.statusLabel(order.status) + '」，无法提交付款凭证')
  }
  const fromStatus = order.status
  const now = core.nowLocal()
  await core.updateDoc(core.C.orders, id, {
    status: core.STATUS.PAYMENT_REVIEW,
    paymentMethod: method,
    paymentNote: note,
    paidAt: now,
    updatedAt: now
  })
  await store.addEvent(id, fromStatus, core.STATUS.PAYMENT_REVIEW, 'customer', openid, '提交付款凭证：' + method + ' / ' + note)
  await store.notifyAdmins('待核销', '有一笔订单提交了付款凭证，等待核对到账。', '')
  return { id: id, status: core.STATUS.PAYMENT_REVIEW }
}

async function cancel (ctx) {
  const openid = ctx.openid
  const id = core.requireText(ctx.payload.id, 1, '订单编号')
  const order = await core.getDoc(core.C.orders, id)
  if (!order) throw new Error('订单不存在')
  const admin = await core.isAdmin(openid)
  const isOwner = String(order.customerId || '') === openid
  if (!isOwner && !admin) throw new Error('没有权限取消该订单')
  if (core.CANCELABLE.indexOf(order.status) < 0) {
    throw new Error('当前订单状态为「' + core.statusLabel(order.status) + '」，无法取消')
  }
  const now = core.nowLocal()
  await core.updateDoc(core.C.orders, id, {
    status: core.STATUS.CANCELLED,
    cancelledAt: now,
    cancelledBy: openid,
    updatedAt: now
  })
  await store.addEvent(id, order.status, core.STATUS.CANCELLED, isOwner ? 'customer' : 'admin', openid, '取消订单')
  if (order.fighterId) await store.notify(order.fighterId, '订单取消', '一笔你已接单的订单被取消。', '')
  return { id: id, status: core.STATUS.CANCELLED }
}

module.exports = {
  create: create,
  list: list,
  get: get,
  pay: pay,
  cancel: cancel,
  readable: readable,
  assertTransition: assertTransition
}