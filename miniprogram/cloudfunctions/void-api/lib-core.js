const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const C = {
  users: 'void_users',
  admins: 'void_admins',
  serviceTypes: 'void_service_types',
  companions: 'void_companions',
  orders: 'void_orders',
  orderEvents: 'void_order_events',
  messages: 'void_messages',
  posts: 'void_posts',
  comments: 'void_comments',
  likes: 'void_post_likes',
  favorites: 'void_post_favorites',
  follows: 'void_follows',
  notifications: 'void_notifications',
  applications: 'void_fighter_applications',
  fighters: 'void_fighters',
  aiMessages: 'void_ai_messages',
  settings: 'void_settings'
}

const ALL_COLLECTIONS = Object.keys(C).map(function (key) { return C[key] })

const STATUS = {
  UNPAID: 'unpaid',
  PAYMENT_REVIEW: 'payment_review',
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETION_PENDING: 'completion_pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
}

const STATUS_LABEL = {
  unpaid: '待付款',
  payment_review: '待确认到账',
  pending: '待接单',
  assigned: '已派单',
  in_progress: '服务中',
  completion_pending: '待确认完工',
  completed: '已完成',
  cancelled: '已取消'
}

const CANCELABLE = [STATUS.UNPAID, STATUS.PAYMENT_REVIEW, STATUS.PENDING, STATUS.ASSIGNED, STATUS.IN_PROGRESS]

const TRANSITIONS = {
  unpaid: [STATUS.PAYMENT_REVIEW, STATUS.CANCELLED],
  payment_review: [STATUS.PENDING, STATUS.UNPAID, STATUS.CANCELLED],
  pending: [STATUS.ASSIGNED, STATUS.CANCELLED],
  assigned: [STATUS.IN_PROGRESS, STATUS.CANCELLED],
  in_progress: [STATUS.COMPLETION_PENDING, STATUS.CANCELLED],
  completion_pending: [STATUS.COMPLETED, STATUS.IN_PROGRESS],
  completed: [],
  cancelled: []
}

function ok (data) {
  return { ok: true, data: data === undefined ? null : data }
}

function fail (message, code) {
  return { ok: false, error: String(message || '操作失败'), code: String(code || 'ERROR') }
}

function pad (value) { return value < 10 ? '0' + value : String(value) }

function nowDate () { return new Date(Date.now() + 8 * 60 * 60 * 1000) }

function nowLocal () {
  const d = nowDate()
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes())
}

function todayKey () {
  const d = nowDate()
  return String(d.getUTCFullYear()) + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate())
}

function randStr (len) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < (len || 4); i += 1) out += chars.charAt(Math.floor(Math.random() * chars.length))
  return out
}

function orderNo () { return 'VOID' + todayKey() + randStr(4) }

function clone (value) {
  if (value === undefined || value === null) return value
  return JSON.parse(JSON.stringify(value))
}

function clean (data) {
  const out = clone(data) || {}
  delete out._id
  delete out.id
  Object.keys(out).forEach(function (key) {
    if (out[key] === undefined) delete out[key]
  })
  return out
}

async function getDoc (collection, id) {
  if (!id) return null
  try {
    const res = await db.collection(collection).doc(String(id)).get()
    return (res && res.data) || null
  } catch (error) {
    return null
  }
}

async function setDoc (collection, id, data) {
  const value = clean(data)
  await db.collection(collection).doc(String(id)).set({ data: value })
  return value
}

async function addDoc (collection, data) {
  const value = clean(data)
  const res = await db.collection(collection).add({ data: value })
  return Object.assign({ _id: res._id, id: res._id }, value)
}

async function updateDoc (collection, id, data) {
  const value = clean(data)
  if (!Object.keys(value).length) return
  await db.collection(collection).doc(String(id)).update({ data: value })
}

async function removeDoc (collection, id) {
  try { await db.collection(collection).doc(String(id)).remove() } catch (error) {}
}

async function queryAll (collection, where, options) {
  const opt = options || {}
  let ref = db.collection(collection)
  if (where) ref = ref.where(where)
  if (opt.orderBy) ref = ref.orderBy(opt.orderBy.field, opt.orderBy.type || 'desc')
  const size = Math.max(1, Math.min(Number(opt.limit || 50), 100))
  const skip = Math.max(0, Number(opt.skip || 0))
  if (skip > 0) ref = ref.skip(skip)
  try {
    const res = await ref.limit(size).get()
    return res.data || []
  } catch (error) {
    return []
  }
}

async function queryOne (collection, where) {
  const list = await queryAll(collection, where, { limit: 1 })
  return list[0] || null
}

async function countWhere (collection, where) {
  try {
    let ref = db.collection(collection)
    if (where) ref = ref.where(where)
    const res = await ref.count()
    return Number(res.total || 0)
  } catch (error) {
    return 0
  }
}

function withId (doc) {
  if (!doc) return null
  const out = clone(doc)
  out.id = doc._id
  return out
}

function withIds (list) { return (list || []).map(withId) }

async function ensureUser (openid) {
  const existing = await getDoc(C.users, openid)
  if (existing) return existing
  const user = {
    _id: openid,
    openid: openid,
    nickname: '',
    avatarUrl: '',
    phone: '',
    isAdmin: false,
    level: 1,
    contributionScore: 0,
    postCount: 0,
    orderCount: 0,
    createdAt: nowLocal(),
    updatedAt: nowLocal()
  }
  try { await setDoc(C.users, openid, user) } catch (error) {}
  return user
}

async function isAdmin (openid) {
  const doc = await getDoc(C.admins, openid)
  return !!doc
}

async function assertAdmin (openid) {
  const granted = await isAdmin(openid)
  if (!granted) throw new Error('需要管理员权限，请先完成云环境初始化')
  return true
}

async function createCollectionSafe (name) {
  try {
    await db.createCollection(name)
    return 'created'
  } catch (error) {
    const msg = String((error && error.errMsg) || (error && error.message) || '')
    if (msg.indexOf('exist') >= 0 || msg.indexOf('already') >= 0) return 'exists'
    return 'skip'
  }
}

function requireText (value, min, label) {
  const text = String(value || '').trim()
  if (text.length < Number(min || 1)) throw new Error('请填写' + String(label || '内容'))
  return text
}

function maskName (name, fallback) {
  const text = String(name || fallback || 'VOID 玩家').trim()
  if (text.length <= 1) return text
  return text.slice(0, 1) + '**'
}

function statusLabel (status) { return STATUS_LABEL[status] || String(status || '未知') }

module.exports = {
  cloud: cloud,
  db: db,
  _: _,
  C: C,
  ALL_COLLECTIONS: ALL_COLLECTIONS,
  STATUS: STATUS,
  STATUS_LABEL: STATUS_LABEL,
  CANCELABLE: CANCELABLE,
  TRANSITIONS: TRANSITIONS,
  ok: ok,
  fail: fail,
  nowLocal: nowLocal,
  todayKey: todayKey,
  randStr: randStr,
  orderNo: orderNo,
  clone: clone,
  clean: clean,
  getDoc: getDoc,
  setDoc: setDoc,
  addDoc: addDoc,
  updateDoc: updateDoc,
  removeDoc: removeDoc,
  queryAll: queryAll,
  queryOne: queryOne,
  countWhere: countWhere,
  withId: withId,
  withIds: withIds,
  ensureUser: ensureUser,
  isAdmin: isAdmin,
  assertAdmin: assertAdmin,
  createCollectionSafe: createCollectionSafe,
  requireText: requireText,
  maskName: maskName,
  statusLabel: statusLabel
}