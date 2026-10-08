const core = require('./lib-core')
const seed = require('./lib-seed')

// 并发写入宽度：云数据库单次并发过高会抖动，8 是实测比较稳的值。
// 这样初始化总耗时能压进云函数默认 3 秒超时里。
const WRITE_WIDTH = 8

/**
 * 已下线的旧版编造档位 / 分类。
 * 只精确清理这些固定 id —— 管理员后来自己新增的档位、帖子一律不动，
 * 避免"同步价目表"变成破坏性操作。
 */
const LEGACY_STALE_TYPES = ['st-companion', 'st-train', 'st-loot']
const LEGACY_STALE_COMPANIONS = [
  'cp-escort-standard',
  'cp-escort-premium',
  'cp-escort-rank',
  'cp-companion-hour',
  'cp-train-one',
  'cp-loot-run'
]

async function runJobs (jobs, width) {
  const w = Math.max(1, Number(width || WRITE_WIDTH))
  for (let i = 0; i < jobs.length; i += w) {
    const batch = jobs.slice(i, i + w)
    await Promise.all(batch.map(function (job) {
      return Promise.resolve()
        .then(job)
        .catch(function () { return null })
    }))
  }
}

async function loadAll (collection, cap) {
  const out = []
  const max = Number(cap || 300)
  let skip = 0
  while (out.length < max) {
    const chunk = await core.queryAll(collection, {}, { limit: 100, skip: skip })
    if (!chunk.length) break
    out.push.apply(out, chunk)
    if (chunk.length < 100) break
    skip += chunk.length
  }
  return out
}

/**
 * 把一份种子数据同步到某个集合：
 * 已存在 -> 覆盖为最新（保留原始 createdAt）；不存在 -> 创建。
 * staleIds 只删除写死的旧 id，不做"非种子即删除"。
 */
async function syncCollection (collection, items, options) {
  const opt = options || {}
  const now = core.nowLocal()
  const existing = opt.existing || await loadAll(collection)
  const byId = {}
  for (let i = 0; i < existing.length; i += 1) byId[String(existing[i]._id)] = existing[i]

  let created = 0
  let updated = 0
  let removed = 0
  const jobs = []

  const stale = opt.staleIds || []
  for (let i = 0; i < stale.length; i += 1) {
    if (!byId[stale[i]]) continue
    removed += 1
    jobs.push((function (id) {
      return function () { return core.removeDoc(collection, id) }
    })(stale[i]))
  }

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]
    const prev = byId[String(item.id)]
    if (prev) updated += 1
    else created += 1
    const doc = Object.assign({}, item, opt.decorate ? opt.decorate(item) : null, {
      createdAt: (prev && prev.createdAt) || now,
      updatedAt: now
    })
    jobs.push((function (record) {
      return function () { return core.setDoc(collection, record.id, record) }
    })(doc))
  }

  await runJobs(jobs, opt.width)
  return { created: created, updated: updated, removed: removed }
}

/** 只创建、不覆盖：用于公告/欢迎语，避免覆盖运营后续的修改。 */
async function ensureCollection (collection, items, options) {
  const opt = options || {}
  const existing = opt.existing || await loadAll(collection)
  const seen = {}
  for (let i = 0; i < existing.length; i += 1) seen[String(existing[i]._id)] = true

  let created = 0
  let exists = 0
  const jobs = []
  const now = core.nowLocal()

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]
    if (seen[String(item.id)]) { exists += 1; continue }
    created += 1
    const doc = Object.assign({}, item, { createdAt: now })
    jobs.push((function (record) {
      return function () { return core.setDoc(collection, record.id, record) }
    })(doc))
  }

  await runJobs(jobs, opt.width)
  return { created: created, exists: exists }
}

/**
 * 同步展示类数据（服务分类、档位价格、官方帖子）。
 * 俱乐部价目表以 lib-seed.js 为唯一来源，每次初始化都会覆盖为最新价格，
 * 保证小程序展示的永远是俱乐部实际价目表而不是示例数据。
 * 用户自己发的帖子、管理员新增的内容不会被删除。
 */
async function syncSeedData (report) {
  const store = {}

  store.types = await loadAll(core.C.serviceTypes)
  store.companions = await loadAll(core.C.companions)
  store.posts = await loadAll(core.C.posts)
  store.messages = await loadAll(core.C.messages)

  report.seeded.serviceTypes = await syncCollection(core.C.serviceTypes, seed.SERVICE_TYPES, {
    existing: store.types,
    staleIds: LEGACY_STALE_TYPES
  })
  report.seeded.companions = await syncCollection(core.C.companions, seed.COMPANIONS, {
    existing: store.companions,
    staleIds: LEGACY_STALE_COMPANIONS
  })
  report.seeded.posts = await syncCollection(core.C.posts, seed.POSTS, {
    existing: store.posts,
    decorate: function () { return { publishedAt: core.nowLocal() } }
  })
  report.seeded.messages = await ensureCollection(core.C.messages, seed.MESSAGES, {
    existing: store.messages
  })
}

async function setup (ctx) {
  const started = Date.now()
  const openid = ctx.openid
  const report = { collections: [], seeded: {}, admin: false, adminCount: 0, message: '', durationMs: 0 }

  const collectionResults = []
  await runJobs(core.ALL_COLLECTIONS.map(function (name, index) {
    return function () {
      return core.createCollectionSafe(name).then(function (result) {
        collectionResults[index] = { name: name, result: result }
      })
    }
  }), 6)
  report.collections = collectionResults.filter(function (row) { return !!row })

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

  await syncSeedData(report)

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
  report.durationMs = Date.now() - started

  return report
}

module.exports = { setup: setup }
