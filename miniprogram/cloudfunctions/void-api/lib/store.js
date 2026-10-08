const core = require('./core')

async function addEvent (orderId, fromStatus, toStatus, actorRole, actorId, note) {
  try {
    await core.addDoc(core.C.orderEvents, {
      orderId: String(orderId || ''),
      fromStatus: String(fromStatus || ''),
      toStatus: String(toStatus || ''),
      actorRole: String(actorRole || 'system'),
      actorId: String(actorId || ''),
      note: String(note || ''),
      createdAt: core.nowLocal()
    })
  } catch (error) {}
}

async function notify (userId, type, content, postId) {
  if (!userId) return
  try {
    await core.addDoc(core.C.notifications, {
      userId: String(userId),
      type: String(type || '系统'),
      content: String(content || ''),
      postId: String(postId || ''),
      isRead: false,
      createdAt: core.nowLocal()
    })
  } catch (error) {}
}

async function notifyAdmins (type, content, postId) {
  const admins = await core.queryAll(core.C.admins, {}, { limit: 20 })
  for (let i = 0; i < admins.length; i += 1) {
    await notify(admins[i]._id, type, content, postId)
  }
}

function evidenceOf (order) {
  const item = order || {}
  const orderNo = String(item.orderNo || '')
  return {
    orderShort: orderNo.length > 8 ? '…' + orderNo.slice(-8) : orderNo,
    serviceName: String(item.serviceName || item.companionName || '陪玩服务'),
    unitCount: Number(item.unitCount || 1),
    unit: String(item.unit || '局'),
    amount: Number(item.amount || 0),
    completedAt: String(item.completedAt || item.updatedAt || '')
  }
}

async function syncPostEvidence (order) {
  const item = order || {}
  if (!item.sourcePostId || item.status !== core.STATUS.COMPLETED) return false
  const post = await core.getDoc(core.C.posts, item.sourcePostId)
  if (!post) return false
  const nextCount = Number(post.evidenceCount || 0) + 1
  await core.updateDoc(core.C.posts, item.sourcePostId, {
    evidenceCount: nextCount,
    lastEvidenceAt: core.nowLocal(),
    updatedAt: core.nowLocal()
  })
  if (post.authorId) {
    await notify(post.authorId, '成交凭证', '你关联服务的帖子新增 1 条脱敏成交凭证。', item.sourcePostId)
  }
  return true
}

async function listEvidence (postId) {
  if (!postId) return []
  const orders = await core.queryAll(
    core.C.orders,
    { sourcePostId: String(postId), status: core.STATUS.COMPLETED },
    { orderBy: { field: 'completedAt', type: 'desc' }, limit: 20 }
  )
  return orders.map(evidenceOf)
}

module.exports = {
  addEvent: addEvent,
  notify: notify,
  notifyAdmins: notifyAdmins,
  evidenceOf: evidenceOf,
  syncPostEvidence: syncPostEvidence,
  listEvidence: listEvidence
}