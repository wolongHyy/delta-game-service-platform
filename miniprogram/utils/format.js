const STATUS = {
  unpaid: { label: '待付款', tone: 'amber', short: 'PAY' },
  payment_review: { label: '待确认到账', tone: 'blue', short: 'REVIEW' },
  pending: { label: '待接单', tone: 'amber', short: 'QUEUE' },
  assigned: { label: '已派单', tone: 'blue', short: 'ASSIGNED' },
  in_progress: { label: '服务中', tone: 'lime', short: 'LIVE' },
  completion_pending: { label: '待确认完工', tone: 'amber', short: 'PROOF' },
  completed: { label: '已完成', tone: 'gold', short: 'DONE' },
  cancelled: { label: '已取消', tone: 'red', short: 'VOID' }
}
function statusInfo(status) { return STATUS[status] || { label: status || '未知', tone: 'muted', short: 'UNKNOWN' } }
function money(value) { const n = Number(value || 0); return Number.isInteger(n) ? String(n) : n.toFixed(2) }
function compactTime(value) { const text = String(value || ''); if (!text) return '--'; return text.replace(/:\d{2}$/, '').replace(' ', ' · ') }
function orderShort(orderNo) { const text = String(orderNo || ''); return text.length > 10 ? `…${text.slice(-10)}` : text }
function userInitial(name, fallback) { const text = String(name || fallback || 'VOID').trim(); return text.slice(0, 1).toUpperCase() }
function normalizePost(post) {
  const item = post || {}; const status = statusInfo(item.status)
  return Object.assign({}, item, { statusLabel: status.label, statusTone: status.tone, timeText: compactTime(item.publishedAt || item.createdAt), likeCountText: String(item.likeCount || 0), commentCountText: String(item.commentCount || 0), authorInitial: userInitial(item.authorName, item.authorId) })
}
function normalizeOrder(order) {
  const item = order || {}; const status = statusInfo(item.status)
  return Object.assign({}, item, { statusLabel: status.label, statusTone: status.tone, statusCode: status.short, amountText: money(item.amount), timeText: compactTime(item.createdAt), orderShort: orderShort(item.orderNo), unitCountText: String(item.unitCount || 1) })
}
module.exports = { STATUS, statusInfo, money, compactTime, orderShort, userInitial, normalizePost, normalizeOrder }
