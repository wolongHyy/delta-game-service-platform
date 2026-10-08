const core = require('./lib-core')
const store = require('./lib-store')
const orders = require('./handler-orders')

const APPLY_LABEL = {
  none: '尚未提交入驻申请',
  pending: '申请审核中，请等待管理员通过',
  approved: '已通过审核，可以接单',
  rejected: '申请被驳回，可以修改后重新提交'
}

async function dashboard (ctx) {
  const openid = ctx.openid
  const fighter = await core.getDoc(core.C.fighters, openid)
  const application = await core.queryOne(core.C.applications, { userId: openid })

  let appView = { status: 'none', statusLabel: APPLY_LABEL.none }
  if (application) {
    appView = {
      id: application._id,
      status: String(application.status || 'pending'),
      statusLabel: APPLY_LABEL[application.status] || String(application.status || ''),
      gameName: String(application.gameName || ''),
      contact: String(application.contact || ''),
      rank: String(application.rank || ''),
      modes: Array.isArray(application.modes) ? application.modes : [],
      intro: String(application.intro || ''),
      createdAt: String(application.createdAt || ''),
      reviewNote: String(application.reviewNote || '')
    }
  }

  const approved = !!(application && application.status === 'approved')
  const available = approved && !!fighter && fighter.status !== 'paused'

  const pool = approved
    ? await core.queryAll(core.C.orders, { status: core.STATUS.PENDING, fighterId: '' }, { orderBy: { field: 'createdAt', type: 'asc' }, limit: 30 })
    : []

  const mineA = await core.queryAll(core.C.orders, { fighterId: openid, status: core.STATUS.ASSIGNED }, { orderBy: { field: 'createdAt', type: 'desc' }, limit: 20 })
  const mineB = await core.queryAll(core.C.orders, { fighterId: openid, status: core.STATUS.IN_PROGRESS }, { orderBy: { field: 'createdAt', type: 'desc' }, limit: 20 })
  const mineC = await core.queryAll(core.C.orders, { fighterId: openid, status: core.STATUS.COMPLETION_PENDING }, { orderBy: { field: 'createdAt', type: 'desc' }, limit: 20 })

  const seen = {}
  const list = []
  pool.concat(mineA, mineB, mineC).forEach(function (row) {
    const key = String(row._id)
    if (seen[key]) return
    seen[key] = true
    list.push(row)
  })

  return {
    application: appView,
    approved: approved,
    available: available,
    fighter: fighter
      ? {
          gameName: String(fighter.gameName || ''),
          rank: String(fighter.rank || ''),
          sales: Number(fighter.sales || 0),
          rating: String(fighter.rating || '--'),
          status: String(fighter.status || 'active')
        }
      : null,
    orders: list.map(orders.readable)
  }
}

async function apply (ctx) {
  const openid = ctx.openid
  const payload = ctx.payload || {}
  await core.ensureUser(openid)
  const gameName = core.requireText(payload.gameName, 2, '游戏名').slice(0, 30)
  const contact = core.requireText(payload.contact, 4, '联系方式').slice(0, 60)
  const rank = String(payload.rank || '').slice(0, 30)
  const modes = (Array.isArray(payload.modes) ? payload.modes : []).map(function (mode) {
    return String(mode || '').trim().slice(0, 16)
  }).filter(Boolean).slice(0, 8)
  const intro = String(payload.intro || '').slice(0, 400)
  const now = core.nowLocal()

  const existing = await core.queryOne(core.C.applications, { userId: openid })
  if (existing && existing.status === 'approved') throw new Error('你已经是通过审核的操作手，无需重复申请')
  if (existing && existing.status === 'pending') throw new Error('申请正在审核中，请耐心等待')

  if (existing) {
    await core.updateDoc(core.C.applications, existing._id, {
      gameName: gameName,
      contact: contact,
      rank: rank,
      modes: modes,
      intro: intro,
      status: 'pending',
      reviewNote: '',
      updatedAt: now
    })
    await store.notifyAdmins('打手申请', '有操作手重新提交了入驻申请：' + gameName, '')
    return { id: existing._id, status: 'pending' }
  }

  const created = await core.addDoc(core.C.applications, {
    userId: openid,
    gameName: gameName,
    contact: contact,
    rank: rank,
    modes: modes,
    intro: intro,
    status: 'pending',
    reviewNote: '',
    createdAt: now,
    updatedAt: now
  })
  await store.notifyAdmins('打手申请', '有新的操作手入驻申请：' + gameName, '')
  return { id: created._id, status: 'pending' }
}

async function requireFighter (openid) {
  const application = await core.queryOne(core.C.applications, { userId: openid })
  if (!application || application.status !== 'approved') throw new Error('请先通过操作手入驻审核')
  return application
}

async function claim (ctx) {
  const openid = ctx.openid
  const id = core.requireText(ctx.payload.id, 1, '订单编号')
  const application = await requireFighter(openid)
  const order = await core.getDoc(core.C.orders, id)
  if (!order) throw new Error('订单不存在')
  if (order.status !== core.STATUS.PENDING) throw new Error('该订单已被其他操作手接走')

  const now = core.nowLocal()
  const res = await core.db.collection(core.C.orders)
    .where({ _id: String(id), status: core.STATUS.PENDING, fighterId: '' })
    .update({
      data: {
        fighterId: openid,
        fighterName: String(application.gameName || ''),
        status: core.STATUS.ASSIGNED,
        assignedBy: 'fighter',
        assignedAt: now,
        updatedAt: now
      }
    })

  const updated = Number((res && res.stats && res.stats.updated) || 0)
  if (updated !== 1) throw new Error('手慢了，该订单已被其他操作手接走')

  await store.addEvent(id, core.STATUS.PENDING, core.STATUS.ASSIGNED, 'fighter', openid, '操作手接单')
  await store.notify(order.customerId, '订单进度', '你的订单已被操作手接单，即将开始服务。', '')
  return { id: id, status: core.STATUS.ASSIGNED }
}

async function start (ctx) {
  const openid = ctx.openid
  const id = core.requireText(ctx.payload.id, 1, '订单编号')
  const order = await core.getDoc(core.C.orders, id)
  if (!order) throw new Error('订单不存在')
  if (String(order.fighterId || '') !== openid) throw new Error('这不是分配给你的订单')
  if (order.status !== core.STATUS.ASSIGNED) throw new Error('当前订单状态为「' + core.statusLabel(order.status) + '」，无法开始服务')
  const now = core.nowLocal()
  await core.updateDoc(core.C.orders, id, { status: core.STATUS.IN_PROGRESS, startedAt: now, updatedAt: now })
  await store.addEvent(id, core.STATUS.ASSIGNED, core.STATUS.IN_PROGRESS, 'fighter', openid, '操作手开始服务')
  await store.notify(order.customerId, '订单进度', '你的订单已开始服务。', '')
  return { id: id, status: core.STATUS.IN_PROGRESS }
}

async function complete (ctx) {
  const openid = ctx.openid
  const id = core.requireText(ctx.payload.id, 1, '订单编号')
  const order = await core.getDoc(core.C.orders, id)
  if (!order) throw new Error('订单不存在')
  if (String(order.fighterId || '') !== openid) throw new Error('这不是分配给你的订单')
  if (order.status !== core.STATUS.IN_PROGRESS) throw new Error('当前订单状态为「' + core.statusLabel(order.status) + '」，无法申请完工')
  const now = core.nowLocal()
  await core.updateDoc(core.C.orders, id, {
    status: core.STATUS.COMPLETION_PENDING,
    completionRequestedAt: now,
    completionNote: String(ctx.payload.note || '').slice(0, 200),
    updatedAt: now
  })
  await store.addEvent(id, core.STATUS.IN_PROGRESS, core.STATUS.COMPLETION_PENDING, 'fighter', openid, '操作手申请完工')
  await store.notify(order.customerId, '订单进度', '操作手已提交完工申请，等待管理员确认。', '')
  return { id: id, status: core.STATUS.COMPLETION_PENDING }
}

module.exports = {
  dashboard: dashboard,
  apply: apply,
  claim: claim,
  start: start,
  complete: complete
}