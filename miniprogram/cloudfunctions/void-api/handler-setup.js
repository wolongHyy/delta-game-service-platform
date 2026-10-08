const core = require('./lib-core')
const seed = require('./lib-seed')

async function ensureRecord (collection, id, data) {
  const existing = await core.getDoc(collection, id)
  if (existing) return 'exists'
  try {
    await core.setDoc(collection, id, Object.assign({ _id: id }, data))
    return 'created'
  } catch (error) {
    return 'skip'
  }
}

async function setup (ctx) {
  const openid = ctx.openid
  const report = { collections: [], seeded: {}, admin: false, adminCount: 0, message: '' }

  for (let i = 0; i < core.ALL_COLLECTIONS.length; i += 1) {
    const name = core.ALL_COLLECTIONS[i]
    const result = await core.createCollectionSafe(name)
    report.collections.push({ name: name, result: result })
  }

  const adminTotal = await core.countWhere(core.C.admins, {})
  report.adminCount = adminTotal

  if (adminTotal === 0) {
    await core.setDoc(core.C.admins, openid, {
      _id: openid,
      openid: openid,
      role: 'owner',
      note: '首次执行初始化的微信账号',
      createdAt: core.nowLocal()
    })
    await core.ensureUser(openid)
    await core.updateDoc(core.C.users, openid, { isAdmin: true })
    report.admin = true
    report.adminCount = 1
  } else {
    report.admin = await core.isAdmin(openid)
  }

  const typeResult = { created: 0, exists: 0 }
  for (let i = 0; i < seed.SERVICE_TYPES.length; i += 1) {
    const item = seed.SERVICE_TYPES[i]
    const state = await ensureRecord(core.C.serviceTypes, item.id, Object.assign({}, item, { createdAt: core.nowLocal() }))
    if (state === 'created') typeResult.created += 1
    else typeResult.exists += 1
  }
  report.seeded.serviceTypes = typeResult

  const companionResult = { created: 0, exists: 0 }
  for (let i = 0; i < seed.COMPANIONS.length; i += 1) {
    const item = seed.COMPANIONS[i]
    const state = await ensureRecord(core.C.companions, item.id, Object.assign({}, item, { createdAt: core.nowLocal() }))
    if (state === 'created') companionResult.created += 1
    else companionResult.exists += 1
  }
  report.seeded.companions = companionResult

  const messageResult = { created: 0, exists: 0 }
  for (let i = 0; i < seed.MESSAGES.length; i += 1) {
    const item = seed.MESSAGES[i]
    const state = await ensureRecord(core.C.messages, item.id, Object.assign({}, item, { createdAt: core.nowLocal() }))
    if (state === 'created') messageResult.created += 1
    else messageResult.exists += 1
  }
  report.seeded.messages = messageResult

  const postResult = { created: 0, exists: 0 }
  for (let i = 0; i < seed.POSTS.length; i += 1) {
    const item = seed.POSTS[i]
    const state = await ensureRecord(core.C.posts, item.id, Object.assign({}, item, {
      publishedAt: core.nowLocal(),
      createdAt: core.nowLocal(),
      updatedAt: core.nowLocal()
    }))
    if (state === 'created') postResult.created += 1
    else postResult.exists += 1
  }
  report.seeded.posts = postResult

  const settings = await core.getDoc(core.C.settings, 'payment')
  if (!settings) {
    await core.setDoc(core.C.settings, 'payment', Object.assign({ _id: 'payment' }, seed.SETTINGS.payment, { updatedAt: core.nowLocal() }))
    report.seeded.payment = 'created'
  } else {
    report.seeded.payment = 'exists'
  }

  report.message = report.admin
    ? '云环境已初始化，当前微信账号已设为管理员。'
    : '云环境已初始化。当前微信账号不是管理员，如需管理权限请用已初始化的管理员微信重新执行。'

  return report
}

module.exports = { setup: setup }