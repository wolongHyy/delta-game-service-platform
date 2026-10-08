const core = require('../lib/core')
const store = require('../lib/store')
const orders = require('./orders')

async function dashboard (ctx) {
  await core.assertAdmin(ctx.openid)

  const pendingPayments = await core.countWhere(core.C.orders, { status: core.STATUS.PAYMENT_REVIEW })
  const pendingOrders = await core.countWhere(core.C.orders, { status: core.STATUS.PENDING })
  const inProgress = await core.countWhere(core.C.orders, { status: core.STATUS.IN_PROGRESS })
  const completionPending = await core.countWhere(core.C.orders, { status: core.STATUS.COMPLETION_PENDING })
  const completed = await core.countWhere(core.C.orders, { status: core.STATUS.COMPLETED })
  const users = await core.countWhere(core.C.users, {})
  const postsPending = await core.countWhere(core.C.posts, { status: 'pending' })
  const applicationsPending = await core.countWhere(core.C.applications, { status: 'pending' })

  const orderRows = await core.queryAll(core.C.orders, {}, { orderBy: { field: 'createdAt', type: 'desc' }, limit: 50 })
  const appRows = await core.queryAll(core.C.applications, {}, { orderBy: { field: 'createdAt', type: 'desc' }, limit: 40 })
  const postRows = await core.queryAll(core.C.posts, {}, { orderBy: { field: 'createdAt', type: 'desc' }, limit: 40 })

  return {
    stats: {
      pendingPayments: pendingPayments,
      pendingOrders: pendingOrders,
      inProgress: inProgress,
      completionPending: completionPending,
      completed: completed,
      users: users,
      postsPending: postsPending,
      applicationsPending: applicationsPending
    },
    orders: orderRows.map(orders.readable),
    applications: appRows.map(function (row) {
      const item = core.withId(row) || {}
      item.modes = Array.isArray(item.modes) ? item.modes : []
      return item
    }),
    posts: postRows.map(function (row) {
      const item = core.withId(row) || {}
      item.tags = Array.isArray(item.tags) ? item.tags : []
      return item
    })
  }
}

async function confirmPay (ctx) {
  const openid = ctx.openid
  await core.assertAdmin(openid)
  const id = core.requireText(ctx.payload.id, 1, '订单编号')
  const order = await core.getDoc(core.C.orders, id)
  if (!order) throw new Error('订单不存在')
  if (order.status !== core.STATUS.PAYMENT_REVIEW) {
    throw new Error('当前订单状态为「' + core.statusLabel(order.status) + '」，无需确认到账')
  }
  const now = core.nowLocal()
  await core.updateDoc(core.C.orders, id, {
    status: core.STATUS.PENDING,
    confirmedAt: now,
    confirmedBy: openid,
    updatedAt: now
  })
  await store.addEvent(id, core.STATUS.PAYMENT_REVIEW, core.STATUS.PENDING, 'admin', openid, '管理员确认到账')
  await store.notify(order.customerId, '订单进度', '管理员已确认到账，订单进入接单池。', '')
  return { id: id, status: core.STATUS.PENDING }
}

async function rejectPay (ctx) {
  const openid = ctx.openid
  await core.assertAdmin(openid)
  const id = core.requireText(ctx.payload.id, 1, '订单编号')
  const order = await core.getDoc(core.C.orders, id)
  if (!order) throw new Error('订单不存在')
  if (order.status !== core.STATUS.PAYMENT_REVIEW) {
    throw new Error('当前订单状态为「' + core.statusLabel(order.status) + '」，无法驳回付款')
  }
  const reason = String(ctx.payload.reason || '未核对到对应到账记录').slice(0, 120)
  const now = core.nowLocal()
  await core.updateDoc(core.C.orders, id, {
    status: core.STATUS.UNPAID,
    paymentNote: '',
    rejectReason: reason,
    updatedAt: now
  })
  await store.addEvent(id, core.STATUS.PAYMENT_REVIEW, core.STATUS.UNPAID, 'admin', openid, '驳回付款：' + reason)
  await store.notify(order.customerId, '订单进度', '付款凭证未通过核对：' + reason, '')
  return { id: id, status: core.STATUS.UNPAID }
}

async function setStatus (ctx) {
  const openid = ctx.openid
  await core.assertAdmin(openid)
  const id = core.requireText(ctx.payload.id, 1, '订单编号')
  const next = core.requireText(ctx.payload.status, 1, '目标状态')
  if (!core.STATUS_LABEL[next]) throw new Error('未知的订单状态：' + next)

  const order = await core.getDoc(core.C.orders, id)
  if (!order) throw new Error('订单不存在')
  orders.assertTransition(order.status, next)

  const patch = { status: next, updatedAt: core.nowLocal() }

  if (next === core.STATUS.ASSIGNED) {
    const fighterId = String(ctx.payload.fighterId || '').trim()
    if (!fighterId) throw new Error('订单需由操作手在接单大厅接单；如需管理员派单，请指定操作手 OpenID')
    const fighter = await core.getDoc(core.C.fighters, fighterId)
    if (!fighter) throw new Error('指定操作手不存在')
    patch.fighterId = fighterId
    patch.fighterName = String(fighter.gameName || '')
    patch.assignedBy = 'admin'
    patch.assignedAt = patch.updatedAt
  }
  if (next === core.STATUS.IN_PROGRESS) patch.startedAt = patch.updatedAt
  if (next === core.STATUS.COMPLETION_PENDING) patch.completionRequestedAt = patch.updatedAt
  if (next === core.STATUS.COMPLETED) {
    patch.completedAt = patch.updatedAt
    patch.confirmedBy = openid
  }

  await core.updateDoc(core.C.orders, id, patch)
  await store.addEvent(id, order.status, next, 'admin', openid, '管理员手动流转')

  if (next === core.STATUS.COMPLETED) {
    const fresh = await core.getDoc(core.C.orders, id)
    await store.syncPostEvidence(fresh)
    await store.notify(order.customerId, '订单完成', '订单已完成，感谢使用 VOID 服务。', '')
    if (order.fighterId) {
      await core.updateDoc(core.C.fighters, order.fighterId, { sales: core._.inc(1), updatedAt: patch.updatedAt })
    }
  }
  return { id: id, status: next }
}

async function reviewFighter (ctx) {
  const openid = ctx.openid
  await core.assertAdmin(openid)
  const id = core.requireText(ctx.payload.id, 1, '申请编号')
  const status = String(ctx.payload.status || '').trim()
  if (['approved', 'rejected'].indexOf(status) < 0) throw new Error('审核结果只能是 approved 或 rejected')
  const application = await core.getDoc(core.C.applications, id)
  if (!application) throw new Error('申请不存在')

  const now = core.nowLocal()
  await core.updateDoc(core.C.applications, id, {
    status: status,
    reviewNote: String(ctx.payload.note || '').slice(0, 200),
    reviewedAt: now,
    reviewedBy: openid,
    updatedAt: now
  })

  if (status === 'approved') {
    await core.setDoc(core.C.fighters, application.userId, {
      _id: application.userId,
      userId: application.userId,
      gameName: String(application.gameName || ''),
      contact: String(application.contact || ''),
      rank: String(application.rank || ''),
      modes: Array.isArray(application.modes) ? application.modes : [],
      status: 'active',
      sales: 0,
      rating: '--',
      createdAt: now,
      updatedAt: now
    })
    await store.notify(application.userId, '入驻审核', '你的操作手入驻申请已通过，可以到接单大厅接单了。', '')
  } else {
    await store.notify(application.userId, '入驻审核', '你的操作手入驻申请未通过，可修改资料后重新提交。', '')
  }
  return { id: id, status: status }
}

async function reviewCommunity (ctx) {
  const openid = ctx.openid
  await core.assertAdmin(openid)
  const id = core.requireText(ctx.payload.id, 1, '帖子编号')
  const status = String(ctx.payload.status || '').trim()
  if (['published', 'rejected', 'hidden'].indexOf(status) < 0) throw new Error('审核结果只能是 published / rejected / hidden')
  const post = await core.getDoc(core.C.posts, id)
  if (!post) throw new Error('帖子不存在')

  const flags = ctx.payload.flags || {}
  const now = core.nowLocal()
  const patch = { status: status, updatedAt: now }
  if (status === 'published') patch.publishedAt = String(post.publishedAt || now)
  if (flags.featured !== undefined) patch.featured = !!flags.featured
  if (flags.knowledge !== undefined) patch.knowledge = !!flags.knowledge

  await core.updateDoc(core.C.posts, id, patch)

  const label = status === 'published' ? '已发布' : (status === 'hidden' ? '已下架' : '未通过审核')
  await store.notify(post.authorId, '帖子审核', '你的帖子「' + String(post.title || '') + '」' + label, String(id))
  return { id: id, status: status }
}

async function listFighters (ctx) {
  await core.assertAdmin(ctx.openid)
  const rows = await core.queryAll(core.C.fighters, { status: 'active' }, { orderBy: { field: 'createdAt', type: 'desc' }, limit: 50 })
  return rows.map(function (row) {
    return {
      id: String(row._id),
      gameName: String(row.gameName || '未命名操作手'),
      rank: String(row.rank || ''),
      modes: Array.isArray(row.modes) ? row.modes : [],
      sales: Number(row.sales || 0)
    }
  })
}

async function assignOrder (ctx) {
  const openid = ctx.openid
  await core.assertAdmin(openid)
  const id = core.requireText(ctx.payload.id, 1, '订单编号')
  const fighterId = core.requireText(ctx.payload.fighterId, 1, '操作手')
  const order = await core.getDoc(core.C.orders, id)
  if (!order) throw new Error('订单不存在')
  if (order.status !== core.STATUS.PENDING) {
    throw new Error('当前订单状态为「' + core.statusLabel(order.status) + '」，只有待接单订单可以派单')
  }
  const fighter = await core.getDoc(core.C.fighters, fighterId)
  if (!fighter) throw new Error('指定的操作手不存在或尚未通过入驻审核')
  const now = core.nowLocal()
  await core.updateDoc(core.C.orders, id, {
    status: core.STATUS.ASSIGNED,
    fighterId: fighterId,
    fighterName: String(fighter.gameName || ''),
    assignedBy: 'admin',
    assignedAt: now,
    updatedAt: now
  })
  await store.addEvent(id, core.STATUS.PENDING, core.STATUS.ASSIGNED, 'admin', openid, '管理员指派操作手：' + String(fighter.gameName || ''))
  await store.notify(order.customerId, '订单进度', '管理员已为你指派操作手，即将开始服务。', '')
  await store.notify(fighterId, '新任务', '管理员为你指派了一笔新订单。', '')
  return { id: id, status: core.STATUS.ASSIGNED }
}

module.exports = {
  dashboard: dashboard,
  confirmPay: confirmPay,
  rejectPay: rejectPay,
  setStatus: setStatus,
  reviewFighter: reviewFighter,
  reviewCommunity: reviewCommunity,
  listFighters: listFighters,
  assignOrder: assignOrder
}