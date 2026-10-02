import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import type {
  AnalyticsBreakdownRow,
  AnalyticsFilters,
  AnalyticsTrendPoint,
  Analytics,
  Companion,
  CommunityComment,
  CommunityEvidence,
  CommunityFeed,
  CommunityNotification,
  CommunityPost,
  CommunityPostStatus,
  CommunityProfile,
  CommunityProfileView,
  FighterAccount,
  FighterEarnings,
  FighterApplication,
  FighterApplicationStatus,
  Message,
  Order,
  OrderEvent,
  OrderStatus,
  ServiceType,
  Stats,
  Withdrawal,
  WithdrawalStatus,
} from './types'
import { cacheWrap, invalidateCache } from './cache.ts'

let db: DatabaseSync | null = null
let lastExpiredCancelCheckAt = 0

export function getDb(): DatabaseSync {
  if (!db) {
    const file = process.env.DB_PATH || path.join(process.cwd(), 'db', 'custom.db')
    db = new DatabaseSync(file)
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      PRAGMA synchronous = NORMAL;
    `)
    ensureSchema(db)
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

function maybeCancelExpiredOrders() {
  const now = Date.now()
  if (now - lastExpiredCancelCheckAt < 60_000) return
  lastExpiredCancelCheckAt = now

  const minutes = Number(process.env.ORDER_AUTO_CANCEL_MINUTES ?? 30)
  if (!Number.isFinite(minutes) || minutes <= 0) return
  try {
    cancelExpiredOrders(minutes)
  } catch (error) {
    console.error('lazy cancel expired orders failed', error)
  }
}

function ensureSchema(d: DatabaseSync) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS ServiceType (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'gamepad-2',
      sort INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      reserved INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS Companion (
      id TEXT PRIMARY KEY,
      serviceTypeId TEXT NOT NULL,
      kind TEXT DEFAULT 'product',
      name TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      gender TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      price REAL NOT NULL,
      priceCents INTEGER DEFAULT NULL,
      unit TEXT DEFAULT '小时',
      "rank" TEXT DEFAULT '',
      description TEXT DEFAULT '',
      sales INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      status INTEGER DEFAULT 1,
      sort INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS "Order" (
      id TEXT PRIMARY KEY,
      orderNo TEXT UNIQUE NOT NULL,
      companionId TEXT,
      companionName TEXT NOT NULL,
      serviceTypeId TEXT,
      serviceName TEXT NOT NULL,
      sourcePostId TEXT DEFAULT '',
      spec TEXT DEFAULT '',
      unitCount REAL NOT NULL,
      price REAL NOT NULL,
      amount REAL NOT NULL,
      priceCents INTEGER DEFAULT NULL,
      amountCents INTEGER DEFAULT NULL,
      gameField TEXT DEFAULT '',
      gameMode TEXT DEFAULT '',
      mapName TEXT DEFAULT '',
      inGameId TEXT DEFAULT '',
      "rank" TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      paid INTEGER DEFAULT 0,
      paidAt TEXT DEFAULT '',
      paymentMethod TEXT DEFAULT '',
      paymentNote TEXT DEFAULT '',
      paymentSubmittedAt TEXT DEFAULT '',
      customerPhone TEXT DEFAULT '',
      completionNote TEXT DEFAULT '',
      completionProof TEXT DEFAULT '[]',
      status TEXT DEFAULT 'pending',
      customerId TEXT DEFAULT '',
      customerName TEXT DEFAULT '',
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS Message (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'official',
      title TEXT DEFAULT '',
      content TEXT DEFAULT '',
      isRead INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS AppSetting (
      key TEXT PRIMARY KEY,
      value TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS FighterApplication (
      id TEXT PRIMARY KEY,
      customerId TEXT DEFAULT '',
      openid TEXT DEFAULT '',
      nickname TEXT DEFAULT '',
      avatarUrl TEXT DEFAULT '',
      gameName TEXT NOT NULL,
      contact TEXT NOT NULL,
      "rank" TEXT DEFAULT '',
      modes TEXT DEFAULT '[]',
      intro TEXT DEFAULT '',
      username TEXT DEFAULT '',
      passwordHash TEXT DEFAULT '',
      fighterAccountId TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS FighterAccount (
      id TEXT PRIMARY KEY,
      applicationId TEXT UNIQUE,
      companionId TEXT DEFAULT '',
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      openid TEXT DEFAULT '',
      nickname TEXT DEFAULT '',
      avatarUrl TEXT DEFAULT '',
      displayName TEXT NOT NULL,
      online INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS Withdrawal (
      id TEXT PRIMARY KEY,
      fighterId TEXT NOT NULL,
      fighterName TEXT DEFAULT '',
      amount REAL NOT NULL,
      amountCents INTEGER DEFAULT NULL,
      accountInfo TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      createdAt TEXT DEFAULT (datetime('now')),
      reviewedAt TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS OrderEvent (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      action TEXT NOT NULL,
      fromStatus TEXT NOT NULL,
      toStatus TEXT NOT NULL,
      actorType TEXT NOT NULL,
      actorId TEXT DEFAULT '',
      actorName TEXT DEFAULT '',
    metadata TEXT DEFAULT '{}',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS AuditLog (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      actorType TEXT NOT NULL,
      actorName TEXT NOT NULL DEFAULT '',
      targetId TEXT NOT NULL DEFAULT '',
      method TEXT NOT NULL DEFAULT '',
      path TEXT NOT NULL DEFAULT '',
      metadata TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS RateLimitBucket (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      resetAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS OrderSequence (
      dateKey TEXT PRIMARY KEY,
      lastNumber INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS AiConversation (
      id TEXT PRIMARY KEY,
      customerId TEXT NOT NULL,
      title TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      messageCount INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS AiMessage (
      id TEXT PRIMARY KEY,
      conversationId TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT DEFAULT '',
      sources TEXT DEFAULT '[]',
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS AiKnowledgeChunk (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE,
      category TEXT DEFAULT '',
      title TEXT DEFAULT '',
      content TEXT DEFAULT '',
      keywords TEXT DEFAULT '',
      source TEXT DEFAULT '',
      enabled INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_conversation_customer ON AiConversation (customerId, updatedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_message_conversation ON AiMessage (conversationId, createdAt ASC);
    CREATE INDEX IF NOT EXISTS idx_ai_knowledge_enabled ON AiKnowledgeChunk (enabled, category);

    CREATE TABLE IF NOT EXISTS CommunityProfile (
      customerId TEXT PRIMARY KEY,
      nickname TEXT DEFAULT '',
      avatarUrl TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      level INTEGER DEFAULT 1,
      contributionScore INTEGER DEFAULT 0,
      postCount INTEGER DEFAULT 0,
      followerCount INTEGER DEFAULT 0,
      followingCount INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS CommunityPost (
      id TEXT PRIMARY KEY,
      authorId TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      topic TEXT DEFAULT '战术交流',
      status TEXT DEFAULT 'pending',
      featured INTEGER DEFAULT 0,
      pinned INTEGER DEFAULT 0,
      knowledge INTEGER DEFAULT 0,
      serviceId TEXT DEFAULT '',
      serviceName TEXT DEFAULT '',
      images TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      likeCount INTEGER DEFAULT 0,
      favoriteCount INTEGER DEFAULT 0,
      commentCount INTEGER DEFAULT 0,
      viewCount INTEGER DEFAULT 0,
      orderCount INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      publishedAt TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS CommunityComment (
      id TEXT PRIMARY KEY,
      postId TEXT NOT NULL,
      authorId TEXT NOT NULL,
      parentId TEXT DEFAULT '',
      content TEXT NOT NULL,
      status TEXT DEFAULT 'published',
      likeCount INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS CommunityPostLike (
      postId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (postId, userId)
    );
    CREATE TABLE IF NOT EXISTS CommunityPostFavorite (
      postId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (postId, userId)
    );
    CREATE TABLE IF NOT EXISTS CommunityFollow (
      followerId TEXT NOT NULL,
      followingId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (followerId, followingId)
    );
    CREATE TABLE IF NOT EXISTS CommunityNotification (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      actorId TEXT DEFAULT '',
      type TEXT DEFAULT 'system',
      postId TEXT DEFAULT '',
      content TEXT DEFAULT '',
      isRead INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_community_post_feed ON CommunityPost (status, pinned DESC, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_community_post_author ON CommunityPost (authorId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_community_post_knowledge ON CommunityPost (knowledge, status, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_community_comment_post ON CommunityComment (postId, status, createdAt ASC);
    CREATE INDEX IF NOT EXISTS idx_community_notification_user ON CommunityNotification (userId, isRead, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_community_follow_following ON CommunityFollow (followingId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_companion_serv ON Companion (serviceTypeId, status, deleted);
    CREATE INDEX IF NOT EXISTS idx_companion_status ON Companion (status, deleted);
    CREATE INDEX IF NOT EXISTS idx_order_status ON "Order" (status);
    CREATE INDEX IF NOT EXISTS idx_order_status_created ON "Order" (status, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_order_created ON "Order" (createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_order_customer ON "Order" (customerId);
    CREATE INDEX IF NOT EXISTS idx_message_created ON Message (createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_fighter_status ON FighterApplication (status);
    CREATE INDEX IF NOT EXISTS idx_fighter_customer ON FighterApplication (customerId);
    CREATE INDEX IF NOT EXISTS idx_fighter_account_username ON FighterAccount (username);
    CREATE INDEX IF NOT EXISTS idx_withdrawal_fighter ON Withdrawal (fighterId, status);
    CREATE INDEX IF NOT EXISTS idx_order_customer_created ON "Order" (customerId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_order_event_order ON OrderEvent (orderId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON AuditLog (createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON AuditLog (action, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_rate_limit_reset ON RateLimitBucket (resetAt);
  `)

  // 老库补列：Companion.kind / Order.spec（新表由上方 CREATE 自带）
  const compCols = d.prepare('PRAGMA table_info(Companion)').all() as any[]
  if (!compCols.some((c) => c.name === 'kind')) {
    d.exec(`ALTER TABLE Companion ADD COLUMN kind TEXT DEFAULT 'product'`)
  }
  const orderCols = d.prepare('PRAGMA table_info("Order")').all() as any[]
  if (!orderCols.some((c) => c.name === 'spec')) {
    d.exec(`ALTER TABLE "Order" ADD COLUMN spec TEXT DEFAULT ''`)
  }
  const addOrderColumn = (name: string, definition: string) => {
    if (!orderCols.some((c) => c.name === name)) d.exec(`ALTER TABLE "Order" ADD COLUMN ${definition}`)
  }
  addOrderColumn('fighterId', "fighterId TEXT DEFAULT ''")
  addOrderColumn('fighterName', "fighterName TEXT DEFAULT ''")
  addOrderColumn('assignedBy', "assignedBy TEXT DEFAULT ''")
  addOrderColumn('isTrial', 'isTrial INTEGER DEFAULT 0')
  addOrderColumn('platformRate', 'platformRate REAL DEFAULT 0.2')
  addOrderColumn('fighterIncome', 'fighterIncome REAL DEFAULT 0')
  addOrderColumn('paid', 'paid INTEGER DEFAULT 0')
  addOrderColumn('paidAt', "paidAt TEXT DEFAULT ''")
  addOrderColumn('paymentMethod', "paymentMethod TEXT DEFAULT ''")
  addOrderColumn('paymentNote', "paymentNote TEXT DEFAULT ''")
  addOrderColumn('paymentSubmittedAt', "paymentSubmittedAt TEXT DEFAULT ''")
  addOrderColumn('customerPhone', "customerPhone TEXT DEFAULT ''")
  addOrderColumn('completionNote', "completionNote TEXT DEFAULT ''")
  addOrderColumn('completionProof', "completionProof TEXT DEFAULT '[]'")
  addOrderColumn('completionRequestedAt', "completionRequestedAt TEXT DEFAULT ''")
  addOrderColumn('completedAt', "completedAt TEXT DEFAULT ''")
  addOrderColumn('gameMode', "gameMode TEXT DEFAULT ''")
  addOrderColumn('mapName', "mapName TEXT DEFAULT ''")
  addOrderColumn('inGameId', "inGameId TEXT DEFAULT ''")
  addOrderColumn('idempotencyKey', "idempotencyKey TEXT DEFAULT ''")
  addOrderColumn('sourcePostId', "sourcePostId TEXT DEFAULT ''")
  const addOrderIntegerColumn = (name: string) => {
    if (!orderCols.some((c) => c.name === name)) d.exec(`ALTER TABLE "Order" ADD COLUMN ${name} INTEGER DEFAULT NULL`)
  }
  addOrderIntegerColumn('priceCents')
  addOrderIntegerColumn('amountCents')
  addOrderIntegerColumn('fighterIncomeCents')

  const addColumn = (table: string, columns: any[], name: string, definition: string) => {
    if (!columns.some((c) => c.name === name)) d.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`)
  }
  addColumn('Companion', compCols, 'priceCents', 'priceCents INTEGER DEFAULT NULL')
  addColumn('Withdrawal', d.prepare('PRAGMA table_info(Withdrawal)').all() as any[], 'amountCents', 'amountCents INTEGER DEFAULT NULL')

  // 旧库一次性用“元”换算成“分”。新数据以后一律以 cents 为权威值。
  d.exec(`
    UPDATE Companion SET priceCents = CAST(ROUND(price * 100) AS INTEGER) WHERE priceCents IS NULL OR priceCents = 0;
    UPDATE "Order" SET
      priceCents = CAST(ROUND(price * 100) AS INTEGER),
      amountCents = CAST(ROUND(amount * 100) AS INTEGER),
      fighterIncomeCents = CAST(ROUND(fighterIncome * 100) AS INTEGER)
    WHERE priceCents IS NULL OR amountCents IS NULL OR fighterIncomeCents IS NULL;
    UPDATE Withdrawal SET amountCents = CAST(ROUND(amount * 100) AS INTEGER) WHERE amountCents IS NULL OR amountCents = 0;
  `)

  // 老库一次性迁移：新增“付款”流程前已存在的订单一律视为已付款（旧流程没有待付款环节）。
  // 必须使用标记避免模块重载时重复执行，否则新的 payment_review 订单会被误写成已付款。
  const legacyPaidMigrationKey = 'migration.legacy_order_paid.v1'
  const legacyPaidMigration = d.prepare('SELECT value FROM AppSetting WHERE key = ?').get(legacyPaidMigrationKey) as any
  if (!legacyPaidMigration) {
    d.exec(`UPDATE "Order" SET paid = 1 WHERE status NOT IN ('unpaid', 'payment_review') AND (paid IS NULL OR paid = 0)`)
    d.prepare('INSERT OR REPLACE INTO AppSetting (key, value) VALUES (?, ?)').run(legacyPaidMigrationKey, 'done')
  }
  const appCols = d.prepare('PRAGMA table_info(FighterApplication)').all() as any[]
  if (!appCols.some((c) => c.name === 'username')) d.exec("ALTER TABLE FighterApplication ADD COLUMN username TEXT DEFAULT ''")
  if (!appCols.some((c) => c.name === 'passwordHash')) d.exec("ALTER TABLE FighterApplication ADD COLUMN passwordHash TEXT DEFAULT ''")
  if (!appCols.some((c) => c.name === 'fighterAccountId')) d.exec("ALTER TABLE FighterApplication ADD COLUMN fighterAccountId TEXT DEFAULT ''")
  if (!appCols.some((c) => c.name === 'openid')) d.exec("ALTER TABLE FighterApplication ADD COLUMN openid TEXT DEFAULT ''")
  if (!appCols.some((c) => c.name === 'nickname')) d.exec("ALTER TABLE FighterApplication ADD COLUMN nickname TEXT DEFAULT ''")
  if (!appCols.some((c) => c.name === 'tier')) d.exec("ALTER TABLE FighterApplication ADD COLUMN tier TEXT DEFAULT ''")
  if (!appCols.some((c) => c.name === 'avatarUrl')) d.exec("ALTER TABLE FighterApplication ADD COLUMN avatarUrl TEXT DEFAULT ''")
  const accCols = d.prepare('PRAGMA table_info(FighterAccount)').all() as any[]
  if (!accCols.some((c) => c.name === 'openid')) d.exec("ALTER TABLE FighterAccount ADD COLUMN openid TEXT DEFAULT ''")
  if (!accCols.some((c) => c.name === 'nickname')) d.exec("ALTER TABLE FighterAccount ADD COLUMN nickname TEXT DEFAULT ''")
  if (!accCols.some((c) => c.name === 'tier')) d.exec("ALTER TABLE FighterAccount ADD COLUMN tier TEXT DEFAULT ''")
  if (!accCols.some((c) => c.name === 'avatarUrl')) d.exec("ALTER TABLE FighterAccount ADD COLUMN avatarUrl TEXT DEFAULT ''")

  d.exec(`
    CREATE INDEX IF NOT EXISTS idx_order_fighter_status ON "Order" (fighterId, status);
    CREATE INDEX IF NOT EXISTS idx_order_pending_created ON "Order" (status, fighterId, createdAt DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_order_idempotency ON "Order" (idempotencyKey) WHERE idempotencyKey <> '';
    CREATE UNIQUE INDEX IF NOT EXISTS idx_fighter_account_openid ON FighterAccount (openid) WHERE openid <> '';
    CREATE INDEX IF NOT EXISTS idx_order_source_post ON "Order" (sourcePostId, status);
  `)
}

export function genId(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

export function nowLocal(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function yuanToCents(yuan: number): number {
  return Math.round(yuan * 100)
}

function centsToYuan(cents: unknown): number {
  return Math.round(Number(cents || 0)) / 100
}

function parseTags(s: string): string[] {
  try {
    const a = JSON.parse(s)
    return Array.isArray(a) ? a.map(String) : []
  } catch {
    return []
  }
}

function stRow(r: any): ServiceType {
  return { id: r.id, name: r.name, icon: r.icon, sort: r.sort, enabled: !!r.enabled, reserved: !!r.reserved }
}

function cRow(r: any): Companion {
  return {
    id: r.id,
    serviceTypeId: r.serviceTypeId,
    kind: r.kind === 'fighter' ? 'fighter' : 'product',
    name: r.name,
    avatar: r.avatar,
    gender: r.gender,
    tags: parseTags(r.tags),
    price: centsToYuan(r.priceCents ?? r.price),
    unit: r.unit,
    rank: r.rank,
    description: r.description,
    sales: r.sales,
    rating: r.rating,
    status: r.status,
    sort: r.sort,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

function oRow(r: any): Order {
  return {
    id: r.id,
    orderNo: r.orderNo,
    companionId: r.companionId,
    companionName: r.companionName,
    serviceTypeId: r.serviceTypeId,
    serviceName: r.serviceName,
    sourcePostId: r.sourcePostId || '',
    spec: r.spec || '',
    unitCount: r.unitCount,
    price: centsToYuan(r.priceCents ?? r.price),
    amount: centsToYuan(r.amountCents ?? r.amount),
    gameField: r.gameField,
    gameMode: r.gameMode || '',
    mapName: r.mapName || '',
    inGameId: r.inGameId || '',
    rank: r.rank,
    remark: r.remark,
    status: r.status,
    customerId: r.customerId,
    customerName: r.customerName,
    fighterId: r.fighterId || '',
    fighterName: r.fighterName || '',
    assignedBy: r.assignedBy || '',
    isTrial: !!r.isTrial,
    paid: !!r.paid,
    paidAt: r.paidAt || '',
    paymentMethod: r.paymentMethod || '',
    paymentNote: r.paymentNote || '',
    paymentSubmittedAt: r.paymentSubmittedAt || '',
    customerPhone: r.customerPhone || '',
    completionNote: r.completionNote || '',
    completionProof: (() => { try { const a = JSON.parse(r.completionProof || '[]'); return Array.isArray(a) ? a.map(String) : [] } catch { return [] } })(),
    platformRate: Number(r.platformRate || 0),
    fighterIncome: centsToYuan(r.fighterIncomeCents ?? r.fighterIncome),
    idempotencyKey: r.idempotencyKey || '',
    completionRequestedAt: r.completionRequestedAt || '',
    completedAt: r.completedAt || '',
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

function orderEventRow(r: any): OrderEvent {
  let metadata: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(r.metadata || '{}')
    if (parsed && typeof parsed === 'object') metadata = parsed
  } catch {}
  return {
    id: r.id,
    orderId: r.orderId,
    action: r.action,
    fromStatus: r.fromStatus,
    toStatus: r.toStatus,
    actorType: r.actorType,
    actorId: r.actorId || '',
    actorName: r.actorName || '',
    metadata,
    createdAt: r.createdAt,
  }
}

export function recordOrderEvent(
  d: DatabaseSync,
  orderId: string,
  action: string,
  fromStatus: string,
  toStatus: string,
  actorType: string,
  actorId = '',
  actorName = '',
  metadata: Record<string, unknown> = {},
) {
  d.prepare(
    `INSERT INTO OrderEvent (id, orderId, action, fromStatus, toStatus, actorType, actorId, actorName, metadata, createdAt)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    genId(),
    orderId,
    action,
    fromStatus,
    toStatus,
    actorType,
    actorId,
    actorName,
    JSON.stringify(metadata),
    nowLocal(),
  )
}

export function listOrderEvents(orderId: string): OrderEvent[] {
  return (getDb().prepare('SELECT * FROM OrderEvent WHERE orderId = ? ORDER BY rowid DESC LIMIT 100').all(orderId) as any[]).map(orderEventRow)
}

export function recordAuditLog(input: {
  action: string
  actorType: string
  actorName?: string
  targetId?: string
  method?: string
  path?: string
  metadata?: Record<string, unknown>
}) {
  const now = nowLocal()
  getDb()
    .prepare(
      `INSERT INTO AuditLog (id, action, actorType, actorName, targetId, method, path, metadata, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      genId(),
      input.action,
      input.actorType,
      input.actorName || '',
      input.targetId || '',
      input.method || '',
      input.path || '',
      JSON.stringify(input.metadata || {}),
      now,
    )
}

function mRow(r: any): Message {
  return { id: r.id, type: r.type, title: r.title, content: r.content, isRead: !!r.isRead, createdAt: r.createdAt }
}

export function listServiceTypes(includeDisabled = false): ServiceType[] {
  return cacheWrap(`service-types:${includeDisabled ? 'all' : 'enabled'}`, 30_000, () => {
    const rows = getDb()
      .prepare('SELECT * FROM ServiceType ORDER BY sort ASC, name ASC')
      .all() as any[]
    return rows.filter((r) => includeDisabled || r.enabled).map(stRow)
  })
}

export function createServiceType(input: { name: string; icon?: string; sort?: number; reserved?: boolean }): ServiceType {
  const d = getDb()
  const id = genId()
  d.prepare('INSERT INTO ServiceType (id, name, icon, sort, enabled, reserved) VALUES (?,?,?,?,1,?)').run(
    id,
    input.name,
    input.icon || 'gamepad-2',
    input.sort ?? 0,
    input.reserved ? 1 : 0,
  )
  invalidateCache('service-types')
  return listServiceTypes(true).find((s) => s.id === id)!
}

export function updateServiceType(id: string, input: { name?: string; icon?: string; sort?: number; enabled?: boolean }): ServiceType | null {
  const d = getDb()
  const cur = d.prepare('SELECT * FROM ServiceType WHERE id = ?').get(id) as any
  if (!cur) return null
  d.prepare('UPDATE ServiceType SET name = ?, icon = ?, sort = ?, enabled = ? WHERE id = ?').run(
    input.name ?? cur.name,
    input.icon ?? cur.icon,
    input.sort ?? cur.sort,
    input.enabled === undefined ? cur.enabled : input.enabled ? 1 : 0,
    id,
  )
  invalidateCache('service-types')
  return listServiceTypes(true).find((s) => s.id === id)!
}

export function listCompanions(
  opts: {
    serviceTypeId?: string
    keyword?: string
    sort?: string
    all?: boolean
    kind?: 'product' | 'fighter' | 'all'
  } = {},
): Companion[] {
  const conds: string[] = ['deleted = 0']
  const args: any[] = []
  if (!opts.all) conds.push('status = 1')
  // 用户端默认只展示商品档位，管理端传 kind='all' 时包含入驻打手
  const kind = opts.kind || 'product'
  if (kind !== 'all') {
    conds.push('kind = ?')
    args.push(kind)
  }
  if (opts.serviceTypeId) {
    conds.push('serviceTypeId = ?')
    args.push(opts.serviceTypeId)
  }
  if (opts.keyword) {
    conds.push('(name LIKE ? OR tags LIKE ? OR gender LIKE ? OR description LIKE ?)')
    const k = `%${opts.keyword}%`
    args.push(k, k, k, k)
  }
  const order =
    opts.sort === 'sales' ? 'sales DESC, sort ASC' : opts.sort === 'price' ? 'price ASC, sort ASC' : 'sort ASC, createdAt DESC'
  const cacheKey = `companions:${opts.all ? 'all' : 'public'}:${kind}:${opts.serviceTypeId || ''}:${opts.keyword || ''}:${opts.sort || ''}`
  return cacheWrap(cacheKey, 30_000, () => {
    const rows = getDb()
      .prepare(`SELECT * FROM Companion WHERE ${conds.join(' AND ')} ORDER BY ${order} LIMIT 200`)
      .all(...args) as any[]
    return rows.map(cRow)
  })
}

export function getCompanion(id: string): Companion | null {
  const r = getDb().prepare('SELECT * FROM Companion WHERE id = ? AND deleted = 0').get(id) as any
  return r ? cRow(r) : null
}

export function createCompanion(input: {
  serviceTypeId: string
  kind?: 'product' | 'fighter'
  name: string
  gender?: string
  tags?: string[]
  price: number
  unit?: string
  rank?: string
  description?: string
  sort?: number
}): Companion {
  const d = getDb()
  const id = genId()
  const now = nowLocal()
  const priceCents = yuanToCents(input.price)
  d.prepare(
    `INSERT INTO Companion (id, serviceTypeId, kind, name, avatar, gender, tags, price, priceCents, unit, "rank", description, sales, rating, status, sort, deleted, createdAt, updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,0,1,?,0,?,?)`,
  ).run(
    id,
    input.serviceTypeId,
    input.kind || 'product',
    input.name,
    '',
    input.gender || '',
    JSON.stringify(input.tags || []),
    input.price,
    priceCents,
    input.unit || '小时',
    input.rank || '',
    input.description || '',
    input.sort ?? 0,
    now,
    now,
  )
  invalidateCache('companions')
  return getCompanion(id)!
}

export function updateCompanion(
  id: string,
  input: Partial<{
    serviceTypeId: string
    name: string
    gender: string
    tags: string[]
    price: number
    unit: string
    rank: string
    description: string
    sort: number
    status: number
  }>,
): Companion | null {
  const d = getDb()
  const cur = d.prepare('SELECT * FROM Companion WHERE id = ? AND deleted = 0').get(id) as any
  if (!cur) return null
  const now = nowLocal()
  const priceCents = input.price === undefined ? (cur.priceCents ?? yuanToCents(cur.price)) : yuanToCents(input.price)
  d.prepare(
    `UPDATE Companion SET serviceTypeId = ?, name = ?, gender = ?, tags = ?, price = ?, priceCents = ?, unit = ?, "rank" = ?, description = ?, sort = ?, status = ?, updatedAt = ? WHERE id = ?`,
  ).run(
    input.serviceTypeId ?? cur.serviceTypeId,
    input.name ?? cur.name,
    input.gender ?? cur.gender,
    JSON.stringify(input.tags ?? parseTags(cur.tags)),
    priceCents / 100,
    priceCents,
    input.unit ?? cur.unit,
    input.rank ?? cur.rank,
    input.description ?? cur.description,
    input.sort ?? cur.sort,
    input.status ?? cur.status,
    now,
    id,
  )
  invalidateCache('companions')
  return getCompanion(id)
}

export function deleteCompanion(id: string): boolean {
  const r = getDb().prepare('UPDATE Companion SET deleted = 1, updatedAt = ? WHERE id = ?').run(nowLocal(), id)
  if (r.changes > 0) invalidateCache('companions')
  return r.changes > 0
}

function genOrderNo(d: DatabaseSync): string {
  const now = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const dateKey = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}`
  const existingSequence = d.prepare('SELECT lastNumber FROM OrderSequence WHERE dateKey = ?').get(dateKey) as any
  let firstNumber = 1
  if (!existingSequence) {
    const maxRow = d
      .prepare(`SELECT MAX(CAST(substr(orderNo, length(?) + 2) AS INTEGER)) AS n FROM "Order" WHERE orderNo LIKE ?`)
      .get(dateKey, `${dateKey}-%`) as any
    firstNumber = Math.max(Number(maxRow?.n || 0), 0) + 1
  }
  const seqRow = d
    .prepare(
      `INSERT INTO OrderSequence (dateKey, lastNumber) VALUES (?, ?)
       ON CONFLICT(dateKey) DO UPDATE SET lastNumber = lastNumber + 1
       RETURNING lastNumber`,
    )
    .get(dateKey, firstNumber) as any
  return `${dateKey}-${String(seqRow.lastNumber).padStart(4, '0')}`
}

const ADDON_UNIT_PRICE_CENTS = 2_000

function serverUnitPriceCents(c: Companion, spec: string): number {
  const specs = spec.split(' · ').filter(Boolean)
  const isDouble = specs.includes('双陪')
  const addons = ['教学单', '甜蜜单'].filter((item) => specs.includes(item)).length
  const basePriceCents = Math.round(c.price * 100)
  return Math.round(basePriceCents * (isDouble ? 2 : 1)) + addons * ADDON_UNIT_PRICE_CENTS
}

export function countUsedTrialThisWeek(customerId: string): number {
  if (!customerId) return 0
  const d = getDb()
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + 1)
  monday.setHours(0, 0, 0, 0)
  const p = (n: number) => String(n).padStart(2, '0')
  const start = `${monday.getFullYear()}-${p(monday.getMonth() + 1)}-${p(monday.getDate())} 00:00:00`
  const row = d
    .prepare(
      `SELECT COUNT(*) AS n FROM "Order"
       WHERE customerId = ? AND isTrial = 1 AND paid = 1 AND status != 'cancelled' AND createdAt >= ?`,
    )
    .get(customerId, start) as any
  return Number(row?.n || 0)
}

export function createOrder(input: {
  companionId: string
  sourcePostId?: string
  unitCount: number
  spec?: string
  price?: number
  gameField?: string
  gameMode?: string
  mapName?: string
  inGameId?: string
  rank?: string
  remark?: string
  customerId?: string
  customerName?: string
  customerPhone?: string
  fighterId?: string
  isTrial?: boolean
  idempotencyKey?: string
}): Order {
  const d = getDb()
  const key = (input.idempotencyKey || '').trim()
  const scopedKey = key ? `${input.customerId || ''}:${key}` : ''
  if (key) {
    const existing = d.prepare('SELECT * FROM "Order" WHERE idempotencyKey = ?').get(scopedKey) as any
    if (existing) return oRow(existing)
  }
  if (!Number.isInteger(input.unitCount) || input.unitCount <= 0 || input.unitCount > 24) {
    throw new Error('数量必须在 1 到 24 之间')
  }
  const c = getCompanion(input.companionId)
  if (!c || c.status !== 1) throw new Error('该陪玩已下架，请重新选择')
  const st = listServiceTypes(true).find((s) => s.id === c.serviceTypeId)
  const sourcePostId = String(input.sourcePostId || '').trim()
  if (sourcePostId) {
    const post = d.prepare('SELECT id, status, serviceId FROM CommunityPost WHERE id = ?').get(sourcePostId) as any
    if (!post || post.status !== 'published') throw new Error('关联帖子不可用或尚未审核通过')
    if (post.serviceId !== c.id) throw new Error('帖子关联的服务与当前选择不一致，请重新进入帖子下单')
  }
  const id = genId()
  const now = nowLocal()
  const unitCount = input.unitCount
  const unitPriceCents = serverUnitPriceCents(c, input.spec || '')
  const amountCents = unitPriceCents * unitCount
  const isTrial = !!input.isTrial
  if (isTrial && input.customerId && countUsedTrialThisWeek(input.customerId) >= 1) {
    throw new Error('体验单每微信号每周限 1 次，本周已使用，请选择普通订单')
  }
  const platformRate = isTrial ? 0.1 : 0.2
  const platformRateBps = isTrial ? 1_000 : 2_000
  const fighterIncomeCents = Math.round((amountCents * (10_000 - platformRateBps)) / 10_000)
  const fighter = input.fighterId ? getFighterAccount(input.fighterId) : null
  if (input.fighterId && (!fighter || !fighter.enabled)) throw new Error('指定打手不可用，请重新选择')
  // 下单先进入“待付款”，付款成功后才会进入公共池/指派给指定打手
  const status: OrderStatus = 'unpaid'
  d.exec('BEGIN IMMEDIATE')
  try {
    const orderNo = genOrderNo(d)
  d.prepare(
      `INSERT INTO "Order" (id, orderNo, companionId, companionName, serviceTypeId, serviceName, sourcePostId, spec, unitCount, price, priceCents, amount, amountCents, gameField, gameMode, mapName, inGameId, "rank", remark, status, customerId, customerName, customerPhone, fighterId, fighterName, assignedBy, isTrial, platformRate, fighterIncome, fighterIncomeCents, idempotencyKey, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    id,
    orderNo,
    c.id,
    c.name,
    c.serviceTypeId,
    st?.name || '陪玩',
    String(input.sourcePostId || '').trim(),
    input.spec || '',
    unitCount,
    unitPriceCents / 100,
    unitPriceCents,
    amountCents / 100,
    amountCents,
    input.gameField || '',
    input.gameMode || '',
    input.mapName || '',
    input.inGameId || '',
    input.rank || '',
    input.remark || '',
    status,
    input.customerId || '',
    input.customerName || '',
    input.customerPhone || '',
    fighter?.id || '',
    fighter?.displayName || '',
    fighter ? 'customer' : '',
    isTrial ? 1 : 0,
    platformRate,
    fighterIncomeCents / 100,
    fighterIncomeCents,
    scopedKey,
    now,
    now,
  )
    recordOrderEvent(d, id, 'create', '', status, 'customer', input.customerId || '', input.customerName || '', {
      unitPriceCents,
      amountCents,
      fighterId: fighter?.id || '',
      sourcePostId,
    })
    if (sourcePostId) syncPostOrderCount(sourcePostId, d)
    d.exec('COMMIT')
  } catch (error) {
    d.exec('ROLLBACK')
    if (scopedKey) {
      const existing = d.prepare('SELECT * FROM "Order" WHERE idempotencyKey = ?').get(scopedKey) as any
      if (existing) return oRow(existing)
    }
    throw error
  }
  return getOrder(id)!
}

// 顾客提交扫码付款凭证：订单进入“待确认收款”，不会提前进入抢单池。
// 是否真正到账由管理员核对账单后确认，避免顾客伪造“已付款”直接解锁订单。
export function submitPaymentProof(
  orderId: string,
  customerId: string,
  note: string,
  customerName = '',
): Order | null {
  const cleanNote = note.trim().slice(0, 200)
  if (cleanNote.length < 2) throw new Error('请填写付款人昵称、转账备注或后四位，至少 2 个字')
  const d = getDb()
  const cur = d.prepare('SELECT id, customerId, status, paid, paymentNote FROM "Order" WHERE id = ?').get(orderId) as any
  if (!cur) throw new Error('订单不存在')
  if (cur.customerId && cur.customerId !== customerId) throw new Error('无权操作该订单')
  if (cur.paid) return getOrder(orderId)
  if (!['unpaid', 'payment_review'].includes(cur.status)) throw new Error('当前订单状态不允许提交付款信息')

  const now = nowLocal()
  const result = d.prepare(
    `UPDATE "Order"
     SET status = 'payment_review', paymentNote = ?, paymentSubmittedAt = ?, updatedAt = ?
     WHERE id = ? AND status IN ('unpaid', 'payment_review')`,
  ).run(cleanNote, now, now, orderId)
  if (!result.changes) throw new Error('订单状态已变化，请刷新后重试')

  const eventAction = cur.status === 'payment_review' ? 'update_payment' : 'submit_payment'
  recordOrderEvent(d, orderId, eventAction, cur.status, 'payment_review', 'customer', customerId, customerName, {
    paymentNote: cleanNote,
  })
  return getOrder(orderId)
}

// 管理员核对后未收到款：退回待付款，顾客可以重新付款，仍不会进入抢单池。
export function rejectPaymentProof(orderId: string): Order | null {
  const d = getDb()
  const cur = d.prepare('SELECT id, status, paymentNote FROM "Order" WHERE id = ?').get(orderId) as any
  if (!cur) throw new Error('订单不存在')
  if (cur.status !== 'payment_review') throw new Error('订单不在待确认收款状态')
  const now = nowLocal()
  const result = d.prepare(
    `UPDATE "Order"
     SET status = 'unpaid', paymentNote = '', paymentSubmittedAt = '', updatedAt = ?
     WHERE id = ? AND status = 'payment_review'`,
  ).run(now, orderId)
  if (!result.changes) throw new Error('订单状态已变化，请刷新后重试')
  recordOrderEvent(d, orderId, 'reject_payment', 'payment_review', 'unpaid', 'admin', 'admin', '', {
    rejectedPaymentNote: cur.paymentNote || '',
  })
  return getOrder(orderId)
}

// 付款：把“待付款/待确认收款”订单变成“待接单”（进入公共池或指派给下单时指定的打手）。
// 只应由管理员确认到账或未来的官方支付回调调用，重复调用幂等。
export function payOrder(
  orderId: string,
  actor: { type: 'admin' | 'system'; id?: string; name?: string },
  method: string,
): Order | null {
  const d = getDb()
  const cur = d.prepare('SELECT id, status, paid, fighterId, fighterName, assignedBy, sourcePostId, customerId FROM "Order" WHERE id = ?').get(orderId) as any
  if (!cur) throw new Error('订单不存在')
  if (cur.paid && !['unpaid', 'payment_review'].includes(cur.status)) return getOrder(orderId) // 已付款，幂等返回
  if (!['unpaid', 'payment_review'].includes(cur.status)) throw new Error('当前订单状态不允许付款')
  const fromStatus = cur.status
  const now = nowLocal()
  const toStatus = cur.fighterId ? 'assigned' : 'pending'
  const result = d.prepare(
    "UPDATE \"Order\" SET paid = 1, paidAt = ?, paymentMethod = ?, status = ?, updatedAt = ? WHERE id = ? AND status IN ('unpaid', 'payment_review')",
  ).run(now, method, toStatus, now, orderId)
  if (!result.changes) throw new Error('订单状态已变化，请刷新后重试')
  const order = getOrder(orderId)
  if (order) {
    recordOrderEvent(d, orderId, 'pay', fromStatus, toStatus, actor.type, actor.id || '', actor.name || '', {
      method,
      amount: order.amount,
      fighterId: cur.fighterId || '',
    })
    if (cur.fighterId && cur.assignedBy === 'customer') {
      recordOrderEvent(d, orderId, 'assign', fromStatus, toStatus, 'customer', actor.id || '', actor.name || '', { fighterId: cur.fighterId })
    }
    if (cur.sourcePostId) {
      const sourcePost = d.prepare('SELECT authorId FROM CommunityPost WHERE id = ?').get(cur.sourcePostId) as any
      if (sourcePost?.authorId && sourcePost.authorId !== order.customerId) {
        d.prepare(
          'INSERT INTO CommunityNotification (id, userId, actorId, type, postId, content, isRead, createdAt) VALUES (?,?,?,?,?,?,0,?)',
        ).run(genId(), sourcePost.authorId, order.customerId, 'order', cur.sourcePostId, '你的帖子带来一笔已付款订单', now)
      }
    }
  }
  return getOrder(orderId)
}

export function listOrders(
  opts: { status?: string; customerId?: string; fighterId?: string; all?: boolean; page?: number; pageSize?: number } = {},
): Order[] {
  maybeCancelExpiredOrders()
  const conds: string[] = ['1=1']
  const args: any[] = []
  if (opts.status) {
    conds.push('status = ?')
    args.push(opts.status)
  }
  if (!opts.all && opts.customerId) {
    conds.push('customerId = ?')
    args.push(opts.customerId)
  }
  if (!opts.all && opts.fighterId) {
    conds.push('fighterId = ?')
    args.push(opts.fighterId)
  }
  const rows = getDb()
    .prepare(`SELECT * FROM "Order" WHERE ${conds.join(' AND ')} ORDER BY createdAt DESC LIMIT ? OFFSET ?`)
    .all(...args, Math.min(Math.max(1, Number(opts.pageSize) || 20), 100), (Math.max(1, Number(opts.page) || 1) - 1) * Math.min(Math.max(1, Number(opts.pageSize) || 20), 100)) as any[]
  return rows.map(oRow)
}

export function getOrder(id: string): Order | null {
  const r = getDb().prepare('SELECT * FROM "Order" WHERE id = ?').get(id) as any
  return r ? oRow(r) : null
}

const VALID_STATUS: OrderStatus[] = ['unpaid', 'payment_review', 'pending', 'assigned', 'in_progress', 'completion_pending', 'completed', 'cancelled']

export function updateOrderStatus(
  id: string,
  status: OrderStatus,
  actor: { type: 'customer' | 'admin' | 'system'; id?: string; name?: string } = { type: 'customer' },
): Order | null {
  if (!VALID_STATUS.includes(status)) throw new Error('无效的订单状态')
  const d = getDb()
  const cur = d.prepare('SELECT * FROM "Order" WHERE id = ?').get(id) as any
  if (!cur) return null
  // 通用状态接口只允许“取消订单”，防止绕过业务状态机直接把订单改成已完成等状态
  if (status !== 'cancelled') throw new Error('当前订单状态不允许该操作')
  if (!['unpaid', 'payment_review', 'pending', 'assigned', 'in_progress'].includes(cur.status)) throw new Error('当前订单状态不允许取消')
  const now = nowLocal()
  d.exec('BEGIN IMMEDIATE')
  try {
    d.prepare('UPDATE "Order" SET status = ?, updatedAt = ? WHERE id = ?').run(status, now, id)
    recordOrderEvent(d, id, 'cancel', cur.status, status, actor.type, actor.id || '', actor.name || '')
    d.exec('COMMIT')
  } catch (error) {
    d.exec('ROLLBACK')
    throw error
  }
  return getOrder(id)
}

export function listMessages(): Message[] {
  const rows = getDb().prepare('SELECT * FROM Message ORDER BY createdAt DESC LIMIT 100').all() as any[]
  return rows.map(mRow)
}

export function createMessage(input: { type: 'official' | 'customer_service'; title: string; content: string }): Message {
  const d = getDb()
  const id = genId()
  const now = nowLocal()
  d.prepare('INSERT INTO Message (id, type, title, content, isRead, createdAt) VALUES (?,?,?,?,0,?)').run(
    id,
    input.type,
    input.title,
    input.content,
    now,
  )
  return listMessages().find((m) => m.id === id)!
}

export function getSettings(): Record<string, string> {
  const rows = getDb().prepare('SELECT key, value FROM AppSetting').all() as any[]
  const out: Record<string, string> = {}
  for (const r of rows) out[r.key] = r.value
  return out
}

export function setSetting(key: string, value: string) {
  getDb()
    .prepare('INSERT INTO AppSetting (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, value)
}

function faRow(r: any): FighterApplication {
  return {
    id: r.id,
    customerId: r.customerId || '',
    openid: r.openid || '',
    nickname: r.nickname || '',
    avatarUrl: r.avatarUrl || '',
    gameName: r.gameName,
    contact: r.contact,
    rank: r.rank || '',
    modes: parseTags(r.modes),
    intro: r.intro || '',
    username: r.username || '',
    tier: r.tier || '',
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

export function createFighterApplication(input: {
  customerId: string
  openid?: string
  nickname?: string
  avatarUrl?: string
  gameName: string
  contact: string
  rank?: string
  modes?: string[]
  intro?: string
  tier?: string
  username: string
  passwordHash: string
}): FighterApplication {
  const d = getDb()
  const id = genId()
  const now = nowLocal()
  d.prepare(
    `INSERT INTO FighterApplication (id, customerId, openid, nickname, avatarUrl, gameName, contact, "rank", modes, intro, tier, username, passwordHash, status, createdAt, updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?,?)`,
  ).run(
    id,
    input.customerId || '',
    input.openid || '',
    input.nickname || '',
    input.avatarUrl || '',
    input.gameName,
    input.contact,
    input.rank || '',
    JSON.stringify(input.modes || []),
    input.intro || '',
    input.tier || '',
    input.username,
    input.passwordHash,
    now,
    now,
  )
  return getFighterApplication(id)!
}

export function listFighterApplications(
  opts: { status?: string; customerId?: string } = {},
): FighterApplication[] {
  const conds: string[] = ['1=1']
  const args: any[] = []
  if (opts.status) {
    conds.push('status = ?')
    args.push(opts.status)
  }
  if (opts.customerId) {
    conds.push('customerId = ?')
    args.push(opts.customerId)
  }
  const rows = getDb()
    .prepare(`SELECT * FROM FighterApplication WHERE ${conds.join(' AND ')} ORDER BY createdAt DESC LIMIT 200`)
    .all(...args) as any[]
  return rows.map(faRow)
}

export function getFighterApplication(id: string): FighterApplication | null {
  const r = getDb().prepare('SELECT * FROM FighterApplication WHERE id = ?').get(id) as any
  return r ? faRow(r) : null
}

const VALID_FIGHTER_STATUS: FighterApplicationStatus[] = ['pending', 'approved', 'rejected']

export function reviewFighterApplication(
  id: string,
  status: FighterApplicationStatus,
): FighterApplication | null {
  if (!VALID_FIGHTER_STATUS.includes(status)) throw new Error('无效的审核状态')
  const d = getDb()
  const cur = d.prepare('SELECT * FROM FighterApplication WHERE id = ?').get(id) as any
  if (!cur) return null
  d.prepare('UPDATE FighterApplication SET status = ?, updatedAt = ? WHERE id = ?').run(status, nowLocal(), id)

  // 通过审核：自动登记为打手商品（同昵称已登记过则跳过，避免重复）
  if (status === 'approved') {
    const playType = listServiceTypes(true).find((s) => s.name === '陪玩')
    const exists = d
      .prepare(`SELECT id FROM Companion WHERE kind = 'fighter' AND name = ? AND deleted = 0 LIMIT 1`)
      .get(cur.gameName) as any
    let companionId = exists?.id || ''
    if (playType && !exists) {
      companionId = createCompanion({
        serviceTypeId: playType.id,
        kind: 'fighter',
        name: cur.gameName,
        tags: parseTags(cur.modes),
        price: 40,
        unit: '小时',
        rank: cur.rank || '',
        description: cur.intro || `入驻打手：${cur.gameName}`,
        sort: 100,
      }).id
    }
    const currentAccount = d.prepare('SELECT id FROM FighterAccount WHERE applicationId = ?').get(id) as any
    if (!currentAccount && cur.username && cur.passwordHash) {
      const accountId = genId()
      const now = nowLocal()
      d.prepare(`INSERT INTO FighterAccount (id, applicationId, companionId, username, passwordHash, openid, nickname, avatarUrl, displayName, tier, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(accountId, id, companionId, cur.username, cur.passwordHash, cur.openid || '', cur.nickname || '', cur.avatarUrl || '', cur.gameName, cur.tier || '', now, now)
      d.prepare('UPDATE FighterApplication SET fighterAccountId = ? WHERE id = ?').run(accountId, id)
    }
  }
  return getFighterApplication(id)
}

function localDateStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function fighterRow(r: any): FighterAccount {
  return { id: r.id, applicationId: r.applicationId || '', companionId: r.companionId || '', username: r.username, openid: r.openid || '', nickname: r.nickname || '', avatarUrl: r.avatarUrl || '', displayName: r.displayName, tier: r.tier || '', online: !!r.online, enabled: !!r.enabled, createdAt: r.createdAt }
}

function withdrawalRow(r: any): Withdrawal {
  return { id: r.id, fighterId: r.fighterId, fighterName: r.fighterName || '', amount: centsToYuan(r.amountCents ?? r.amount), accountInfo: r.accountInfo, status: r.status, createdAt: r.createdAt, reviewedAt: r.reviewedAt || '' }
}

export function getFighterAccount(id: string): FighterAccount | null {
  const row = getDb().prepare('SELECT * FROM FighterAccount WHERE id = ?').get(id) as any
  return row ? fighterRow(row) : null
}

export function getFighterByUsername(username: string): (FighterAccount & { passwordHash: string }) | null {
  const row = getDb().prepare('SELECT * FROM FighterAccount WHERE username = ?').get(username) as any
  return row ? { ...fighterRow(row), passwordHash: row.passwordHash } : null
}

export function getFighterByOpenid(openid: string): FighterAccount | null {
  if (!openid) return null
  const row = getDb().prepare('SELECT * FROM FighterAccount WHERE openid = ? LIMIT 1').get(openid) as any
  return row ? fighterRow(row) : null
}

export function listAvailableFighters(): FighterAccount[] {
  return (getDb().prepare('SELECT * FROM FighterAccount WHERE enabled = 1 ORDER BY online DESC, displayName ASC').all() as any[]).map(fighterRow)
}

export function setFighterOnline(id: string, online: boolean): FighterAccount | null {
  getDb().prepare('UPDATE FighterAccount SET online = ?, updatedAt = ? WHERE id = ?').run(online ? 1 : 0, nowLocal(), id)
  return getFighterAccount(id)
}

export function updateFighterProfile(id: string, input: { displayName?: string; online?: boolean } = {}): FighterAccount | null {
  const fighter = getFighterAccount(id)
  if (!fighter) throw new Error('打手不存在')
  const displayName = input.displayName === undefined ? fighter.displayName : input.displayName.trim()
  if (displayName.length < 2 || displayName.length > 20) throw new Error('显示名必须是 2 到 20 个字符')
  const online = input.online === undefined ? fighter.online : input.online
  getDb().prepare('UPDATE FighterAccount SET displayName = ?, online = ?, updatedAt = ? WHERE id = ?').run(displayName, online ? 1 : 0, nowLocal(), id)
  return getFighterAccount(id)
}

export function listFighterOrders(fighterId: string, status?: string): Order[] {
  return listOrders({ status, fighterId })
}

// ---- 滑块验证 + 抢单令牌：防“一键抢单脚本”。
// 服务端给每个订单生成一个随机目标位置，打手把滑块拖到提示的百分比附近后，
// 服务端校验通过才发放一次性抢单令牌（claimToken），抢单必须携带该令牌。 ----
const sliderChallenges = new Map<string, { orderId: string; expiresAt: number }>()
const claimTokens = new Map<string, { orderId: string; fighterId: string; expiresAt: number }>()
const CHALLENGE_TTL_MS = 60_000

export function issueSliderChallenge(orderId: string): { sliderId: string } {
  const now = Date.now()
  if (sliderChallenges.size > 500) {
    for (const [k, v] of sliderChallenges) { if (v.expiresAt <= now) sliderChallenges.delete(k) }
  }
  const sliderId = randomBytes(8).toString('hex')
  sliderChallenges.set(sliderId, { orderId, expiresAt: now + CHALLENGE_TTL_MS })
  return { sliderId }
}

export function verifySliderChallenge(sliderId: string, orderId: string, position: number): boolean {
  const c = sliderChallenges.get(sliderId)
  if (!c || c.orderId !== orderId || c.expiresAt <= Date.now()) return false
  if (!Number.isFinite(position)) return false
  // 市面上常见模式：把滑块拖到最右侧即通过（≥95%）
  return position >= 95
}

export function issueClaimToken(orderId: string, fighterId: string): string {
  const token = randomBytes(16).toString('hex')
  claimTokens.set(token, { orderId, fighterId, expiresAt: Date.now() + CHALLENGE_TTL_MS })
  return token
}

export function consumeClaimToken(token: string, orderId: string, fighterId: string): boolean {
  if (!token) return false
  const t = claimTokens.get(token)
  if (!t || t.orderId !== orderId || t.fighterId !== fighterId || t.expiresAt <= Date.now()) return false
  claimTokens.delete(token)
  return true
}

// ---- 打手抢单冷却：两次抢单之间至少间隔 N 秒，防止连点脚本连续抢单 ----
const fighterLastClaimAt = new Map<string, number>()
const CLAIM_COOLDOWN_MS = Number(process.env.CLAIM_COOLDOWN_MS || 3000)
export function assertClaimCooldown(fighterId: string): void {
  const last = fighterLastClaimAt.get(fighterId) || 0
  const wait = CLAIM_COOLDOWN_MS - (Date.now() - last)
  if (wait > 0) throw new Error(`抢单太快了，请 ${Math.ceil(wait / 1000)} 秒后再试`)
  fighterLastClaimAt.set(fighterId, Date.now())
}

export function listOpenOrders(keyword?: string): Order[] {
  maybeCancelExpiredOrders()
  const args: any[] = []
  let where = `status = 'pending' AND paid = 1 AND (fighterId = '' OR fighterId IS NULL)`
  if (keyword) { where += ' AND (orderNo LIKE ? OR serviceName LIKE ? OR companionName LIKE ?)'; const k = `%${keyword}%`; args.push(k, k, k) }
  return (getDb().prepare(`SELECT * FROM "Order" WHERE ${where} ORDER BY createdAt DESC LIMIT 100`).all(...args) as any[]).map(oRow)
}

export function claimOrder(orderId: string, fighterId: string, claimToken = ''): Order | null {
  const fighter = getFighterAccount(fighterId)
  if (!fighter?.enabled) throw new Error('打手账号不可用')
  // 娱乐档次打手只能被顾客指定或管理员派单，不能抢公共池订单
  if (fighter.tier === '娱乐') throw new Error('娱乐档次打手不能抢公共池订单，请联系管理员派单')
  assertClaimCooldown(fighterId)
  if (!consumeClaimToken(claimToken, orderId, fighterId)) throw new Error('请先完成滑块验证，再确认抢单')
  const d = getDb()
  const current = d.prepare('SELECT id, status, paid, fighterId FROM "Order" WHERE id = ?').get(orderId) as any
  if (!current) throw new Error('订单不存在，请刷新抢单大厅')
  if (current.status === 'cancelled') throw new Error('订单已超时自动取消，请刷新抢单大厅')
  if (!current.paid) throw new Error('订单尚未付款，不能抢单')
  if (current.status !== 'pending' || current.fighterId) throw new Error('订单已被其他打手抢走，请刷新抢单大厅')
  const now = nowLocal()
  const result = d.prepare(`UPDATE "Order" SET fighterId = ?, fighterName = ?, assignedBy = 'fighter', status = 'assigned', updatedAt = ? WHERE id = ? AND status = 'pending' AND paid = 1 AND (fighterId = '' OR fighterId IS NULL)`).run(fighter.id, fighter.displayName, now, orderId)
  if (!result.changes) throw new Error('手速慢了，订单刚被其他打手抢走，请刷新抢单大厅')
  const order = getOrder(orderId)
  if (order) recordOrderEvent(getDb(), orderId, 'claim', 'pending', 'assigned', 'fighter', fighter.id, fighter.displayName)
  return getOrder(orderId)
}

export function assignOrder(orderId: string, fighterId: string | ''): Order | null {
  const d = getDb()
  const fighter = fighterId ? getFighterAccount(fighterId) : null
  if (fighterId && !fighter?.enabled) throw new Error('打手账号不可用')
  const current = d.prepare('SELECT status, paid, fighterId, assignedBy FROM "Order" WHERE id = ?').get(orderId) as any
  if (!current) throw new Error('订单不存在')
  // 业务规则：
  // 1) 未付款订单不能派单；
  // 2) 只有“待接单”或“管理员自己刚派出去的”订单可以派单/改派/放回公共池；
  // 3) 一旦被打手抢走（assignedBy='fighter'）或被顾客指定（assignedBy='customer'），管理员不能强行改派。
  if (!current.paid) throw new Error('该订单尚未付款，不能派单')
  const canManage = current.status === 'pending' || (current.status === 'assigned' && current.assignedBy === 'admin')
  if (!canManage) throw new Error('该订单已被抢/已指定/已开始服务，不能强行指派')
  const fromStatus = current.status
  const result = d.prepare(`UPDATE "Order" SET fighterId = ?, fighterName = ?, assignedBy = ?, status = ?, updatedAt = ? WHERE id = ? AND paid = 1 AND ((status = 'pending') OR (status = 'assigned' AND assignedBy = 'admin'))`).run(fighter?.id || '', fighter?.displayName || '', fighter ? 'admin' : '', fighter ? 'assigned' : 'pending', nowLocal(), orderId)
  const order = result.changes ? getOrder(orderId) : null
  if (order) recordOrderEvent(d, orderId, fighterId ? 'assign' : 'unassign', fromStatus, order.status, 'admin')
  return order
}

export function fighterStartOrder(orderId: string, fighterId: string): Order | null {
  const result = getDb().prepare(`UPDATE "Order" SET status = 'in_progress', updatedAt = ? WHERE id = ? AND fighterId = ? AND status = 'assigned'`).run(nowLocal(), orderId, fighterId)
  if (!result.changes) throw new Error('订单不属于当前打手或状态不允许开始')
  recordOrderEvent(getDb(), orderId, 'start', 'assigned', 'in_progress', 'fighter', fighterId)
  return getOrder(orderId)
}

export function requestOrderCompletion(orderId: string, fighterId: string, input: { note?: string; proof?: string[] } = {}): Order | null {
  const proof = (input.proof || []).map(String).filter(Boolean)
  if (!proof.length) throw new Error('申请结单必须至少上传 1 张截图证明')
  const now = nowLocal()
  const result = getDb().prepare(`UPDATE "Order" SET status = 'completion_pending', completionRequestedAt = ?, completionNote = ?, completionProof = ?, updatedAt = ? WHERE id = ? AND fighterId = ? AND status = 'in_progress'`).run(now, (input.note || '').slice(0, 500), JSON.stringify(proof), now, orderId, fighterId)
  if (!result.changes) throw new Error('订单不属于当前打手或状态不允许提交完工')
  recordOrderEvent(getDb(), orderId, 'request_complete', 'in_progress', 'completion_pending', 'fighter', fighterId, '', { proofCount: proof.length })
  return getOrder(orderId)
}

export function confirmOrderCompletion(orderId: string): Order | null {
  const d = getDb()
  const now = nowLocal()
  const current = d.prepare('SELECT sourcePostId, customerId FROM "Order" WHERE id = ?').get(orderId) as any
  const result = d.prepare(`UPDATE "Order" SET status = 'completed', completedAt = ?, updatedAt = ? WHERE id = ? AND status = 'completion_pending'`).run(now, now, orderId)
  if (!result.changes) throw new Error('订单不在待确认状态')
  recordOrderEvent(d, orderId, 'complete', 'completion_pending', 'completed', 'admin')
  if (current?.sourcePostId) {
    const sourcePost = d.prepare('SELECT authorId FROM CommunityPost WHERE id = ?').get(current.sourcePostId) as any
    if (sourcePost?.authorId) {
      d.prepare(
        'INSERT INTO CommunityNotification (id, userId, actorId, type, postId, content, isRead, createdAt) VALUES (?,?,?,?,?,?,0,?)',
      ).run(genId(), sourcePost.authorId, 'system', 'order', current.sourcePostId, '关联帖子的成交凭证已回写', now)
    }
  }
  return getOrder(orderId)
}

export function cancelExpiredOrders(minutes = 30): number {
  if (minutes <= 0) return 0
  const threshold = new Date(Date.now() - minutes * 60 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  const cutoff = `${threshold.getFullYear()}-${p(threshold.getMonth() + 1)}-${p(threshold.getDate())} ${p(threshold.getHours())}:${p(threshold.getMinutes())}:${p(threshold.getSeconds())}`
  const d = getDb()
  // 待接单（公共池）超时取消 + 待付款超时取消
  const expired = d
    .prepare(`SELECT id, customerId, customerName, status FROM "Order" WHERE ((status = 'pending' AND fighterId = '' ) OR status = 'unpaid') AND createdAt < ? LIMIT 500`)
    .all(cutoff) as any[]
  if (!expired.length) return 0
  d.exec('BEGIN IMMEDIATE')
  try {
    for (const order of expired) {
      const fromStatus = order.status
      const cond = fromStatus === 'unpaid' ? "AND status = 'unpaid'" : "AND status = 'pending' AND fighterId = ''"
      d.prepare(`UPDATE "Order" SET status = 'cancelled', updatedAt = ? WHERE id = ? ${cond}`).run(nowLocal(), order.id)
      recordOrderEvent(d, order.id, 'auto_cancel', fromStatus, 'cancelled', 'system', '', '', { minutes })
    }
    d.exec('COMMIT')
  } catch (error) {
    d.exec('ROLLBACK')
    throw error
  }
  return expired.length
}

export function getFighterEarnings(fighterId: string): FighterEarnings {
  const d = getDb()
  const settledCents = Math.round(Number((d.prepare(`SELECT COALESCE(SUM(fighterIncomeCents),0) AS n FROM "Order" WHERE fighterId = ? AND status = 'completed'`).get(fighterId) as any).n))
  // 提交结单申请后（待确认）即为“待结算”，管理员确认后才进入已结算
  const pendingSettlementCents = Math.round(Number((d.prepare(`SELECT COALESCE(SUM(fighterIncomeCents),0) AS n FROM "Order" WHERE fighterId = ? AND status = 'completion_pending'`).get(fighterId) as any).n))
  const withdrawnCents = Math.round(Number((d.prepare(`SELECT COALESCE(SUM(amountCents),0) AS n FROM Withdrawal WHERE fighterId = ? AND status = 'approved'`).get(fighterId) as any).n))
  const pendingWithdrawalCents = Math.round(Number((d.prepare(`SELECT COALESCE(SUM(amountCents),0) AS n FROM Withdrawal WHERE fighterId = ? AND status = 'pending'`).get(fighterId) as any).n))
  return {
    available: (settledCents - withdrawnCents - pendingWithdrawalCents) / 100,
    settled: settledCents / 100,
    pendingSettlement: pendingSettlementCents / 100,
    withdrawn: withdrawnCents / 100,
    pendingWithdrawal: pendingWithdrawalCents / 100,
    recentOrders: listFighterOrders(fighterId).slice(0, 10),
  }
}

export function listWithdrawals(fighterId?: string): Withdrawal[] {
  const rows = fighterId ? getDb().prepare('SELECT * FROM Withdrawal WHERE fighterId = ? ORDER BY createdAt DESC').all(fighterId) : getDb().prepare('SELECT * FROM Withdrawal ORDER BY createdAt DESC').all()
  return (rows as any[]).map(withdrawalRow)
}

export function createWithdrawal(fighterId: string, amount: number, accountInfo: string): Withdrawal {
  const fighter = getFighterAccount(fighterId)
  if (!fighter) throw new Error('打手不存在')
  const amountCents = yuanToCents(amount)
  if (!Number.isFinite(amount) || amountCents <= 0 || amountCents !== Math.round(amount * 100) || amountCents > Math.round(getFighterEarnings(fighterId).available * 100)) throw new Error('提现金额必须为不超过可提现余额的两位小数')
  const id = genId(); const now = nowLocal()
  getDb().prepare('INSERT INTO Withdrawal (id, fighterId, fighterName, amount, amountCents, accountInfo, status, createdAt) VALUES (?,?,?,?,?,?,\'pending\',?)').run(id, fighterId, fighter.displayName, amountCents / 100, amountCents, accountInfo, now)
  return listWithdrawals(fighterId).find((w) => w.id === id)!
}

export function reviewWithdrawal(id: string, status: WithdrawalStatus): Withdrawal | null {
  if (status !== 'approved' && status !== 'rejected') throw new Error('提现状态无效')
  const result = getDb().prepare('UPDATE Withdrawal SET status = ?, reviewedAt = ? WHERE id = ? AND status = \'pending\'').run(status, nowLocal(), id)
  if (!result.changes) throw new Error('提现申请不存在或已处理')
  return listWithdrawals().find((w) => w.id === id) || null
}

export function getStats(): Stats {
  const d = getDb()
  const today = localDateStr(new Date())
  const todayOrders = (d.prepare('SELECT COUNT(*) AS n FROM "Order" WHERE substr(createdAt, 1, 10) = ?').get(today) as any).n
  const todayRevenue = centsToYuan((d
    .prepare('SELECT COALESCE(SUM(amountCents), 0) AS s FROM "Order" WHERE substr(createdAt, 1, 10) = ? AND status = ?')
    .get(today, 'completed') as any).s)
  const inProgress = (d.prepare('SELECT COUNT(*) AS n FROM "Order" WHERE status = ?').get('in_progress') as any).n
  const activeCompanions = (d.prepare('SELECT COUNT(*) AS n FROM Companion WHERE status = 1 AND deleted = 0').get() as any).n
  const pendingFighters = (d
    .prepare(`SELECT COUNT(*) AS n FROM FighterApplication WHERE status = 'pending'`)
    .get() as any).n

  const weekOrders: { date: string; count: number; revenue: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const dt = new Date()
    dt.setDate(dt.getDate() - i)
    const ds = localDateStr(dt)
    const row = d
      .prepare(
      'SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN status = ? THEN amountCents ELSE 0 END), 0) AS s FROM "Order" WHERE substr(createdAt, 1, 10) = ?',
      )
      .get('completed', ds) as any
    weekOrders.push({ date: ds.slice(5), count: row.n, revenue: centsToYuan(row.s) })
  }

  const topRows = d
    .prepare(
      'SELECT companionName AS name, SUM(unitCount) AS sales FROM "Order" WHERE status != ? GROUP BY companionName ORDER BY sales DESC LIMIT 5',
    )
    .all('cancelled') as any[]
  const statusRows = d.prepare('SELECT status, COUNT(*) AS n FROM "Order" GROUP BY status').all() as any[]
  const statusCounts: Record<string, number> = { pending: 0, assigned: 0, in_progress: 0, completion_pending: 0, completed: 0, cancelled: 0 }
  for (const r of statusRows) statusCounts[r.status] = r.n

  return {
    todayOrders,
    todayRevenue,
    inProgress,
    activeCompanions,
    pendingFighters,
    weekOrders,
    topCompanions: topRows.map((r) => ({ name: r.name, sales: r.sales })),
    statusCounts,
  }
}

function buildAnalyticsWhere(filters: AnalyticsFilters): { where: string; args: any[] } {
  const conds: string[] = ['1=1']
  const args: any[] = []
  const datePattern = /^\d{4}-\d{2}-\d{2}$/

  if (datePattern.test(filters.start || '')) {
    conds.push('createdAt >= ?')
    args.push(`${filters.start} 00:00:00`)
  }
  if (datePattern.test(filters.end || '')) {
    conds.push('createdAt <= ?')
    args.push(`${filters.end} 23:59:59`)
  }
  if (filters.status && VALID_STATUS.includes(filters.status as OrderStatus)) {
    conds.push('status = ?')
    args.push(filters.status)
  }
  if (filters.source === 'unassigned') {
    conds.push(`(assignedBy = '' OR assignedBy IS NULL)`)
  } else if (['customer', 'fighter', 'admin'].includes(filters.source || '')) {
    conds.push('assignedBy = ?')
    args.push(filters.source)
  }
  if (filters.fighterId) {
    conds.push('fighterId = ?')
    args.push(filters.fighterId)
  }
  if (filters.serviceTypeId) {
    conds.push('serviceTypeId = ?')
    args.push(filters.serviceTypeId)
  }
  if (filters.companionId) {
    conds.push('companionId = ?')
    args.push(filters.companionId)
  }
  if (filters.keyword) {
    conds.push('(orderNo LIKE ? OR companionName LIKE ? OR serviceName LIKE ? OR customerName LIKE ? OR customerId LIKE ?)')
    const keyword = `%${filters.keyword}%`
    args.push(keyword, keyword, keyword, keyword, keyword)
  }

  return { where: conds.join(' AND '), args }
}

function analyticsBreakdown(
  groupExpression: string,
  where: string,
  args: any[],
  limit = 12,
): AnalyticsBreakdownRow[] {
  const rows = getDb()
    .prepare(
      `SELECT COALESCE(NULLIF(${groupExpression}, ''), '未分配') AS label,
              COUNT(*) AS orders,
              COALESCE(SUM(amountCents), 0) AS grossVolumeCents,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN amountCents ELSE 0 END), 0) AS completedRevenueCents,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN amountCents - fighterIncomeCents ELSE 0 END), 0) AS platformRevenueCents,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN fighterIncomeCents ELSE 0 END), 0) AS fighterIncomeCents,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
       FROM "Order"
       WHERE ${where}
       GROUP BY label
       ORDER BY orders DESC, grossVolumeCents DESC
       LIMIT ?`,
    )
    .all(...args, limit) as any[]

  return rows.map((row) => ({
    label: String(row.label),
    orders: Number(row.orders),
    grossVolume: centsToYuan(row.grossVolumeCents),
    completedRevenue: centsToYuan(row.completedRevenueCents),
    platformRevenue: centsToYuan(row.platformRevenueCents),
    fighterIncome: centsToYuan(row.fighterIncomeCents),
    completionRate: Number(row.orders) ? Math.round((Number(row.completed || 0) / Number(row.orders)) * 1000) / 10 : 0,
  }))
}

function analyticsTrend(
  where: string,
  args: any[],
  start: string,
  end: string,
): AnalyticsTrendPoint[] {
  const rows = getDb()
    .prepare(
      `SELECT substr(createdAt, 1, 10) AS date,
              COUNT(*) AS orders,
              SUM(CASE WHEN status != 'cancelled' THEN 1 ELSE 0 END) AS validOrders,
              COALESCE(SUM(amountCents), 0) AS grossVolumeCents,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN amountCents ELSE 0 END), 0) AS completedRevenueCents,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN amountCents - fighterIncomeCents ELSE 0 END), 0) AS platformRevenueCents,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN fighterIncomeCents ELSE 0 END), 0) AS fighterIncomeCents
       FROM "Order"
       WHERE ${where}
       GROUP BY substr(createdAt, 1, 10)
       ORDER BY date ASC`,
    )
    .all(...args) as any[]
  const byDate = new Map(rows.map((row) => [String(row.date), row]))
  const points: AnalyticsTrendPoint[] = []
  const datePattern = /^\d{4}-\d{2}-\d{2}$/

  if (datePattern.test(start) && datePattern.test(end)) {
    const cursor = new Date(`${start}T00:00:00`)
    const last = new Date(`${end}T00:00:00`)
    while (cursor <= last && points.length < 366) {
      const date = localDateStr(cursor)
      const row = byDate.get(date)
      points.push({
        date,
        orders: Number(row?.orders || 0),
        validOrders: Number(row?.validOrders || 0),
        revenue: centsToYuan(row?.grossVolumeCents),
        completedRevenue: centsToYuan(row?.completedRevenueCents),
        platformRevenue: centsToYuan(row?.platformRevenueCents),
        fighterIncome: centsToYuan(row?.fighterIncomeCents),
      })
      cursor.setDate(cursor.getDate() + 1)
    }
  } else {
    for (const row of rows) {
      points.push({
        date: String(row.date),
        orders: Number(row.orders),
        validOrders: Number(row.validOrders || 0),
        revenue: centsToYuan(row.grossVolumeCents),
        completedRevenue: centsToYuan(row.completedRevenueCents),
        platformRevenue: centsToYuan(row.platformRevenueCents),
        fighterIncome: centsToYuan(row.fighterIncomeCents),
      })
    }
  }
  return points
}

export function getAnalytics(filters: AnalyticsFilters = {}): Analytics {
  const { where, args } = buildAnalyticsWhere(filters)
  const summary = getDb()
    .prepare(
      `SELECT COUNT(*) AS orders,
              SUM(CASE WHEN status != 'cancelled' THEN 1 ELSE 0 END) AS validOrders,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) AS assigned,
              SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS inProgress,
              SUM(CASE WHEN status = 'completion_pending' THEN 1 ELSE 0 END) AS completionPending,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
              SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
              SUM(CASE WHEN isTrial = 1 THEN 1 ELSE 0 END) AS trialOrders,
              SUM(CASE WHEN status = 'pending' AND (fighterId = '' OR fighterId IS NULL) THEN 1 ELSE 0 END) AS unassignedPending,
              COALESCE(SUM(amountCents), 0) AS grossVolumeCents,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN amountCents ELSE 0 END), 0) AS completedRevenueCents,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN amountCents - fighterIncomeCents ELSE 0 END), 0) AS platformRevenueCents,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN fighterIncomeCents ELSE 0 END), 0) AS fighterIncomeCents
       FROM "Order"
       WHERE ${where}`,
    )
    .get(...args) as any

  const orders = Number(summary.orders || 0)
  const validOrders = Number(summary.validOrders || 0)
  const completed = Number(summary.completed || 0)
  const cancelled = Number(summary.cancelled || 0)
  const grossVolumeCents = Number(summary.grossVolumeCents || 0)
  const totals = {
    orders,
    validOrders,
    pending: Number(summary.pending || 0),
    assigned: Number(summary.assigned || 0),
    inProgress: Number(summary.inProgress || 0),
    completionPending: Number(summary.completionPending || 0),
    completed,
    cancelled,
    trialOrders: Number(summary.trialOrders || 0),
    unassignedPending: Number(summary.unassignedPending || 0),
    grossVolume: centsToYuan(grossVolumeCents),
    completedRevenue: centsToYuan(summary.completedRevenueCents),
    platformRevenue: centsToYuan(summary.platformRevenueCents),
    fighterIncome: centsToYuan(summary.fighterIncomeCents),
    avgOrderValue: validOrders ? Math.round((grossVolumeCents / validOrders)) / 100 : 0,
    completionRate: validOrders ? Math.round((completed / validOrders) * 1000) / 10 : 0,
    cancellationRate: orders ? Math.round((cancelled / orders) * 1000) / 10 : 0,
  }

  const recentRows = getDb()
    .prepare(`SELECT * FROM "Order" WHERE ${where} ORDER BY createdAt DESC, rowid DESC LIMIT 20`)
    .all(...args) as any[]

  return {
    generatedAt: nowLocal(),
    filters: { ...filters },
    totals,
    trend: analyticsTrend(where, args, filters.start || '', filters.end || ''),
    statusBreakdown: analyticsBreakdown('status', where, args),
    sourceBreakdown: analyticsBreakdown(`COALESCE(NULLIF(assignedBy, ''), 'unassigned')`, where, args),
    serviceBreakdown: analyticsBreakdown('serviceName', where, args),
    fighterBreakdown: analyticsBreakdown('fighterName', where, args),
    companionBreakdown: analyticsBreakdown('companionName', where, args),
    recentOrders: recentRows.map(oRow),
  }
}
﻿
// ===== Community =====
const COMMUNITY_POST_STATUSES: CommunityPostStatus[] = ['draft', 'pending', 'published', 'rejected', 'hidden']
const COMMUNITY_TOPIC_FALLBACK = '战术交流'

function parseStringArray(raw: unknown): string[] {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(value) ? value.map((item) => String(item)).slice(0, 12) : []
  } catch {
    return []
  }
}

function cleanCommunityText(value: unknown, max = 200): string {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, max)
}

function normalizeTags(value: unknown): string[] {
  return parseStringArray(value)
    .map((tag) => cleanCommunityText(tag, 16))
    .filter(Boolean)
    .slice(0, 6)
}

function normalizeImages(value: unknown): string[] {
  return parseStringArray(value)
    .map((url) => cleanCommunityText(url, 500))
    .filter((url) => /^(https?:\/\/|\/api\/uploads\/)/.test(url))
    .slice(0, 6)
}

function communityProfileRow(r: any): CommunityProfile {
  return {
    customerId: r.customerId,
    nickname: r.nickname || 'VOID指挥官',
    avatarUrl: r.avatarUrl || '',
    bio: r.bio || '',
    level: Number(r.level || 1),
    contributionScore: Number(r.contributionScore || 0),
    postCount: Number(r.postCount || 0),
    followerCount: Number(r.followerCount || 0),
    followingCount: Number(r.followingCount || 0),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

function communityPostRow(r: any): CommunityPost {
  return {
    id: r.id,
    authorId: r.authorId,
    authorName: r.authorName || 'VOID指挥官',
    authorAvatar: r.authorAvatar || '',
    authorLevel: Number(r.authorLevel || 1),
    title: r.title,
    content: r.content,
    topic: r.topic || COMMUNITY_TOPIC_FALLBACK,
    status: r.status as CommunityPostStatus,
    featured: !!r.featured,
    pinned: !!r.pinned,
    knowledge: !!r.knowledge,
    serviceId: r.serviceId || '',
    serviceName: r.serviceName || '',
    images: parseStringArray(r.images),
    tags: parseStringArray(r.tags),
    likeCount: Number(r.likeCount || 0),
    favoriteCount: Number(r.favoriteCount || 0),
    commentCount: Number(r.commentCount || 0),
    viewCount: Number(r.viewCount || 0),
    orderCount: Number(r.liveOrderCount ?? r.orderCount ?? 0),
    evidenceCount: Number(r.evidenceCount || 0),
    liked: !!r.liked,
    favorited: !!r.favorited,
    followingAuthor: !!r.followingAuthor,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    publishedAt: r.publishedAt || '',
  }
}

function communityCommentRow(r: any): CommunityComment {
  return {
    id: r.id,
    postId: r.postId,
    authorId: r.authorId,
    authorName: r.authorName || 'VOID指挥官',
    authorAvatar: r.authorAvatar || '',
    parentId: r.parentId || '',
    content: r.content,
    status: r.status === 'hidden' ? 'hidden' : 'published',
    likeCount: Number(r.likeCount || 0),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

function communityNotificationRow(r: any): CommunityNotification {
  return {
    id: r.id,
    userId: r.userId,
    actorId: r.actorId || '',
    actorName: r.actorName || 'VOID System',
    actorAvatar: r.actorAvatar || '',
    type: r.type || 'system',
    postId: r.postId || '',
    content: r.content || '',
    isRead: !!r.isRead,
    createdAt: r.createdAt,
  }
}

function communityEvidenceRow(r: any): CommunityEvidence {
  return {
    orderId: r.id,
    orderNo: r.orderNo,
    companionName: r.companionName,
    serviceName: r.serviceName,
    unitCount: Number(r.unitCount || 0),
    amount: centsToYuan(r.amountCents ?? r.amount),
    completedAt: r.completedAt || r.updatedAt || r.createdAt,
    status: 'completed',
  }
}

function refreshCommunityProfileStats(customerId: string, d = getDb()): void {
  d.prepare(
    `UPDATE CommunityProfile
     SET postCount = (SELECT COUNT(*) FROM CommunityPost p WHERE p.authorId = CommunityProfile.customerId AND p.status = 'published'),
         followerCount = (SELECT COUNT(*) FROM CommunityFollow f WHERE f.followingId = CommunityProfile.customerId),
         followingCount = (SELECT COUNT(*) FROM CommunityFollow f WHERE f.followerId = CommunityProfile.customerId),
         contributionScore = (
           (SELECT COUNT(*) FROM CommunityPost p WHERE p.authorId = CommunityProfile.customerId AND p.status = 'published') * 10 +
           (SELECT COUNT(*) FROM CommunityComment c JOIN CommunityPost p ON p.id = c.postId WHERE p.authorId = CommunityProfile.customerId AND c.status = 'published') * 2 +
           (SELECT COUNT(*) FROM CommunityPostLike l JOIN CommunityPost p ON p.id = l.postId WHERE p.authorId = CommunityProfile.customerId) +
           (SELECT COUNT(*) FROM "Order" o WHERE o.customerId = CommunityProfile.customerId AND o.status = 'completed' AND o.paid = 1) * 5
         ),
         updatedAt = ?
     WHERE customerId = ?`,
  ).run(nowLocal(), customerId)
  const scoreRow = d.prepare('SELECT contributionScore FROM CommunityProfile WHERE customerId = ?').get(customerId) as any
  const score = Number(scoreRow?.contributionScore || 0)
  d.prepare('UPDATE CommunityProfile SET level = ? WHERE customerId = ?').run(
    score >= 2000 ? 8 : score >= 1000 ? 7 : score >= 600 ? 6 : score >= 360 ? 5 : score >= 180 ? 4 : score >= 80 ? 3 : score >= 30 ? 2 : 1,
    customerId,
  )
}

export function getOrCreateCommunityProfile(customerId: string, nickname = '', avatarUrl = ''): CommunityProfile {
  const id = cleanCommunityText(customerId, 120)
  if (!id) throw new Error('缺少社区身份')
  const d = getDb()
  const existing = d.prepare('SELECT * FROM CommunityProfile WHERE customerId = ?').get(id) as any
  const now = nowLocal()
  if (existing) {
    const nextNickname = cleanCommunityText(nickname, 30) || existing.nickname || 'VOID指挥官'
    const nextAvatar = cleanCommunityText(avatarUrl, 500) || existing.avatarUrl || ''
    d.prepare('UPDATE CommunityProfile SET nickname = ?, avatarUrl = ?, updatedAt = ? WHERE customerId = ?').run(nextNickname, nextAvatar, now, id)
  } else {
    d.prepare(
      `INSERT INTO CommunityProfile (customerId, nickname, avatarUrl, bio, level, contributionScore, postCount, followerCount, followingCount, createdAt, updatedAt)
       VALUES (?,?,?,?,1,0,0,0,0,?,?)`,
    ).run(id, cleanCommunityText(nickname, 30) || 'VOID指挥官', cleanCommunityText(avatarUrl, 500), '', now, now)
  }
  refreshCommunityProfileStats(id, d)
  return communityProfileRow(d.prepare('SELECT * FROM CommunityProfile WHERE customerId = ?').get(id))
}

export function getCommunityProfile(customerId: string): CommunityProfile | null {
  const id = cleanCommunityText(customerId, 120)
  if (!id) return null
  const row = getDb().prepare('SELECT * FROM CommunityProfile WHERE customerId = ?').get(id) as any
  return row ? communityProfileRow(row) : null
}

export function updateCommunityProfile(customerId: string, patch: { nickname?: string; avatarUrl?: string; bio?: string }): CommunityProfile {
  const profile = getOrCreateCommunityProfile(customerId, patch.nickname || '', patch.avatarUrl || '')
  const nickname = patch.nickname === undefined ? profile.nickname : cleanCommunityText(patch.nickname, 30) || 'VOID指挥官'
  const avatarUrl = patch.avatarUrl === undefined ? profile.avatarUrl : cleanCommunityText(patch.avatarUrl, 500)
  const bio = patch.bio === undefined ? profile.bio : cleanCommunityText(patch.bio, 160)
  getDb().prepare('UPDATE CommunityProfile SET nickname = ?, avatarUrl = ?, bio = ?, updatedAt = ? WHERE customerId = ?').run(nickname, avatarUrl, bio, nowLocal(), customerId)
  return communityProfileRow(getDb().prepare('SELECT * FROM CommunityProfile WHERE customerId = ?').get(customerId))
}

export function listCommunityProfiles(input: { keyword?: string; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, Number(input.page) || 1)
  const pageSize = Math.min(Math.max(1, Number(input.pageSize) || 20), 50)
  const keyword = cleanCommunityText(input.keyword, 40)
  const where = keyword ? 'WHERE nickname LIKE ?' : ''
  const args = keyword ? [`%${keyword}%`] : []
  const total = Number((getDb().prepare(`SELECT COUNT(*) AS n FROM CommunityProfile ${where}`).get(...args) as any)?.n || 0)
  const rows = getDb().prepare(`SELECT * FROM CommunityProfile ${where} ORDER BY contributionScore DESC, updatedAt DESC LIMIT ? OFFSET ?`).all(...args, pageSize, (page - 1) * pageSize) as any[]
  return { users: rows.map(communityProfileRow), total, page, pageSize }
}

export function createCommunityPost(input: {
  authorId: string
  title: string
  content: string
  topic?: string
  serviceId?: string
  images?: string[]
  tags?: string[]
}) {
  const authorId = cleanCommunityText(input.authorId, 120)
  if (!authorId) throw new Error('请先登录后发帖')
  const title = cleanCommunityText(input.title, 80)
  const content = cleanCommunityText(input.content, 5000)
  if (title.length < 2) throw new Error('标题至少需要 2 个字')
  if (content.length < 5) throw new Error('正文至少需要 5 个字')
  const serviceId = cleanCommunityText(input.serviceId, 120)
  let serviceName = ''
  if (serviceId) {
    const companion = getCompanion(serviceId)
    if (!companion || companion.status !== 1) throw new Error('关联陪玩服务不可用')
    serviceName = companion.name
  }
  getOrCreateCommunityProfile(authorId)
  const id = genId()
  const now = nowLocal()
  const topic = cleanCommunityText(input.topic, 20) || COMMUNITY_TOPIC_FALLBACK
  getDb().prepare(
    `INSERT INTO CommunityPost (id, authorId, title, content, topic, status, featured, pinned, knowledge, serviceId, serviceName, images, tags, likeCount, favoriteCount, commentCount, viewCount, orderCount, createdAt, updatedAt, publishedAt)
     VALUES (?,?,?,?,?,'pending',0,0,0,?,?,?,?,0,0,0,0,0,?,?,'')`,
  ).run(id, authorId, title, content, topic, serviceId, serviceName, JSON.stringify(normalizeImages(input.images)), JSON.stringify(normalizeTags(input.tags)), now, now)
  return getCommunityPost(id, authorId, true)!
}

export function updateCommunityPost(id: string, authorId: string, patch: { title?: string; content?: string; topic?: string; serviceId?: string; images?: string[]; tags?: string[] }) {
  const d = getDb()
  const current = d.prepare('SELECT * FROM CommunityPost WHERE id = ?').get(id) as any
  if (!current) throw new Error('帖子不存在')
  if (current.authorId !== authorId) throw new Error('只能编辑自己的帖子')
  const title = patch.title === undefined ? current.title : cleanCommunityText(patch.title, 80)
  const content = patch.content === undefined ? current.content : cleanCommunityText(patch.content, 5000)
  if (title.length < 2 || content.length < 5) throw new Error('标题或正文太短')
  let serviceId = current.serviceId || ''
  let serviceName = current.serviceName || ''
  if (patch.serviceId !== undefined) {
    serviceId = cleanCommunityText(patch.serviceId, 120)
    serviceName = ''
    if (serviceId) {
      const companion = getCompanion(serviceId)
      if (!companion || companion.status !== 1) throw new Error('关联陪玩服务不可用')
      serviceName = companion.name
    }
  }
  d.prepare(
    `UPDATE CommunityPost SET title = ?, content = ?, topic = ?, serviceId = ?, serviceName = ?, images = ?, tags = ?, status = 'pending', updatedAt = ? WHERE id = ?`,
  ).run(
    title,
    content,
    patch.topic === undefined ? current.topic : cleanCommunityText(patch.topic, 20) || COMMUNITY_TOPIC_FALLBACK,
    serviceId,
    serviceName,
    patch.images === undefined ? current.images : JSON.stringify(normalizeImages(patch.images)),
    patch.tags === undefined ? current.tags : JSON.stringify(normalizeTags(patch.tags)),
    nowLocal(),
    id,
  )
  return getCommunityPost(id, authorId, true)
}

export function deleteCommunityPost(id: string, actorId: string): boolean {
  const d = getDb()
  const current = d.prepare('SELECT authorId FROM CommunityPost WHERE id = ?').get(id) as any
  if (!current) return false
  if (current.authorId !== actorId) throw new Error('只能删除自己的帖子')
  d.exec('BEGIN IMMEDIATE')
  try {
    d.prepare('DELETE FROM CommunityComment WHERE postId = ?').run(id)
    d.prepare('DELETE FROM CommunityPostLike WHERE postId = ?').run(id)
    d.prepare('DELETE FROM CommunityPostFavorite WHERE postId = ?').run(id)
    d.prepare('DELETE FROM CommunityNotification WHERE postId = ?').run(id)
    d.prepare('DELETE FROM CommunityPost WHERE id = ?').run(id)
    d.exec('COMMIT')
  } catch (error) {
    d.exec('ROLLBACK')
    throw error
  }
  refreshCommunityProfileStats(current.authorId, d)
  return true
}

export function reviewCommunityPost(id: string, status: CommunityPostStatus, flags: { featured?: boolean; pinned?: boolean; knowledge?: boolean } = {}) {
  if (!COMMUNITY_POST_STATUSES.includes(status)) throw new Error('无效的帖子状态')
  const d = getDb()
  const current = d.prepare('SELECT * FROM CommunityPost WHERE id = ?').get(id) as any
  if (!current) throw new Error('帖子不存在')
  const now = nowLocal()
  const publishedAt = status === 'published' && !current.publishedAt ? now : current.publishedAt || ''
  d.prepare(
    `UPDATE CommunityPost SET status = ?, featured = ?, pinned = ?, knowledge = ?, publishedAt = ?, updatedAt = ? WHERE id = ?`,
  ).run(
    status,
    flags.featured === undefined ? current.featured : flags.featured ? 1 : 0,
    flags.pinned === undefined ? current.pinned : flags.pinned ? 1 : 0,
    flags.knowledge === undefined ? current.knowledge : flags.knowledge ? 1 : 0,
    publishedAt,
    now,
    id,
  )
  if (status === 'published') {
    d.prepare(
      'INSERT INTO CommunityNotification (id, userId, actorId, type, postId, content, isRead, createdAt) VALUES (?,?,?,?,?,?,0,?)',
    ).run(genId(), current.authorId, 'system', 'moderation', id, '你的帖子已通过审核并发布', now)
  }
  refreshCommunityProfileStats(current.authorId, d)
  return getCommunityPost(id, '', true)
}

export function syncPostOrderCount(postId: string, database = getDb()): void {
  const id = cleanCommunityText(postId, 120)
  if (!id) return
  const row = database.prepare(`SELECT COUNT(*) AS n FROM "Order" WHERE sourcePostId = ? AND status != 'cancelled'`).get(id) as any
  database.prepare('UPDATE CommunityPost SET orderCount = ?, updatedAt = ? WHERE id = ?').run(Number(row?.n || 0), nowLocal(), id)
}
﻿
const COMMUNITY_POST_SELECT = `
  SELECT p.*,
    COALESCE(pr.nickname, 'VOID指挥官') AS authorName,
    COALESCE(pr.avatarUrl, '') AS authorAvatar,
    COALESCE(pr.level, 1) AS authorLevel,
    (SELECT COUNT(*) FROM CommunityPostLike l WHERE l.postId = p.id AND l.userId = ?) AS liked,
    (SELECT COUNT(*) FROM CommunityPostFavorite f WHERE f.postId = p.id AND f.userId = ?) AS favorited,
    (SELECT COUNT(*) FROM CommunityFollow cf WHERE cf.followerId = ? AND cf.followingId = p.authorId) AS followingAuthor,
    (SELECT COUNT(*) FROM "Order" o WHERE o.sourcePostId = p.id AND o.status != 'cancelled') AS liveOrderCount,
    (SELECT COUNT(*) FROM "Order" o WHERE o.sourcePostId = p.id AND o.status = 'completed' AND o.paid = 1) AS evidenceCount
  FROM CommunityPost p
  LEFT JOIN CommunityProfile pr ON pr.customerId = p.authorId
`

export function listCommunityPosts(opts: {
  channel?: 'recommend' | 'follow' | 'knowledge' | 'latest' | 'profile'
  topic?: string
  keyword?: string
  userId?: string
  followingId?: string
  status?: CommunityPostStatus | 'all'
  page?: number
  pageSize?: number
  viewerId?: string
} = {}): CommunityFeed {
  const d = getDb()
  const page = Math.max(1, Number(opts.page) || 1)
  const pageSize = Math.min(Math.max(1, Number(opts.pageSize) || 12), 50)
  const viewerId = cleanCommunityText(opts.viewerId, 120)
  const conds: string[] = []
  const args: any[] = []
  const status = opts.status || 'published'
  if (status !== 'all') {
    conds.push('p.status = ?')
    args.push(status)
  }
  const topic = cleanCommunityText(opts.topic, 20)
  if (topic) {
    conds.push('p.topic = ?')
    args.push(topic)
  }
  const keyword = cleanCommunityText(opts.keyword, 40)
  if (keyword) {
    conds.push('(p.title LIKE ? OR p.content LIKE ? OR p.topic LIKE ?)')
    args.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  if (opts.channel === 'knowledge') conds.push('p.knowledge = 1')
  if (opts.channel === 'follow' && opts.followingId) {
    const followingId = cleanCommunityText(opts.followingId, 120)
    conds.push('(p.authorId IN (SELECT followingId FROM CommunityFollow WHERE followerId = ?) OR p.authorId = ?)')
    args.push(followingId, followingId)
  }
  if (opts.channel === 'profile' && opts.userId) {
    conds.push('p.authorId = ?')
    args.push(cleanCommunityText(opts.userId, 120))
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const total = Number((d.prepare(`SELECT COUNT(*) AS n FROM CommunityPost p ${where}`).get(...args) as any)?.n || 0)
  const orderBy = opts.channel === 'recommend'
    ? 'p.pinned DESC, p.featured DESC, (p.likeCount + p.commentCount * 2 + p.orderCount * 3) DESC, p.createdAt DESC'
    : 'p.pinned DESC, p.createdAt DESC'
  const rows = d.prepare(`${COMMUNITY_POST_SELECT} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(viewerId, viewerId, viewerId, ...args, pageSize, (page - 1) * pageSize) as any[]
  const topics = d.prepare(`SELECT topic, COUNT(*) AS count FROM CommunityPost WHERE status = 'published' GROUP BY topic ORDER BY count DESC, topic ASC LIMIT 12`).all() as any[]
  const stats = d.prepare(`SELECT
    (SELECT COUNT(*) FROM CommunityPost WHERE status = 'published') AS posts,
    (SELECT COUNT(*) FROM CommunityComment WHERE status = 'published') AS comments,
    (SELECT COUNT(*) FROM "Order" WHERE status = 'completed' AND paid = 1) AS completedOrders,
    (SELECT COUNT(DISTINCT authorId) FROM CommunityPost WHERE status = 'published') AS contributors`).get() as any
  return {
    posts: rows.map(communityPostRow),
    total,
    page,
    pageSize,
    topics: topics.map((row) => ({ topic: row.topic || COMMUNITY_TOPIC_FALLBACK, count: Number(row.count || 0) })),
    stats: {
      posts: Number(stats?.posts || 0),
      comments: Number(stats?.comments || 0),
      completedOrders: Number(stats?.completedOrders || 0),
      contributors: Number(stats?.contributors || 0),
    },
  }
}

export function getCommunityPost(id: string, viewerId = '', includeUnpublished = false): CommunityPost | null {
  const postId = cleanCommunityText(id, 120)
  if (!postId) return null
  const d = getDb()
  const row = d.prepare(`${COMMUNITY_POST_SELECT} WHERE p.id = ?`).get(viewerId, viewerId, viewerId, postId) as any
  if (!row) return null
  if (!includeUnpublished && row.status !== 'published') return null
  if (row.status === 'published') {
    d.prepare('UPDATE CommunityPost SET viewCount = viewCount + 1 WHERE id = ?').run(postId)
    row.viewCount = Number(row.viewCount || 0) + 1
  }
  return communityPostRow(row)
}

export function toggleCommunityLike(postId: string, userId: string) {
  const d = getDb()
  const post = d.prepare('SELECT id, authorId, status FROM CommunityPost WHERE id = ?').get(postId) as any
  if (!post || post.status !== 'published') throw new Error('帖子不存在或不可见')
  const exists = !!d.prepare('SELECT 1 FROM CommunityPostLike WHERE postId = ? AND userId = ?').get(postId, userId)
  if (exists) {
    d.prepare('DELETE FROM CommunityPostLike WHERE postId = ? AND userId = ?').run(postId, userId)
    d.prepare('UPDATE CommunityPost SET likeCount = MAX(0, likeCount - 1), updatedAt = ? WHERE id = ?').run(nowLocal(), postId)
  } else {
    d.prepare('INSERT INTO CommunityPostLike (postId, userId, createdAt) VALUES (?,?,?)').run(postId, userId, nowLocal())
    d.prepare('UPDATE CommunityPost SET likeCount = likeCount + 1, updatedAt = ? WHERE id = ?').run(nowLocal(), postId)
    if (post.authorId !== userId) {
      d.prepare('INSERT INTO CommunityNotification (id, userId, actorId, type, postId, content, isRead, createdAt) VALUES (?,?,?,?,?,?,0,?)').run(genId(), post.authorId, userId, 'like', postId, '有人点赞了你的帖子', nowLocal())
    }
  }
  const count = Number((d.prepare('SELECT likeCount FROM CommunityPost WHERE id = ?').get(postId) as any)?.likeCount || 0)
  return { active: !exists, count }
}

export function toggleCommunityFavorite(postId: string, userId: string) {
  const d = getDb()
  const post = d.prepare('SELECT id, authorId, status FROM CommunityPost WHERE id = ?').get(postId) as any
  if (!post || post.status !== 'published') throw new Error('帖子不存在或不可见')
  const exists = !!d.prepare('SELECT 1 FROM CommunityPostFavorite WHERE postId = ? AND userId = ?').get(postId, userId)
  if (exists) {
    d.prepare('DELETE FROM CommunityPostFavorite WHERE postId = ? AND userId = ?').run(postId, userId)
    d.prepare('UPDATE CommunityPost SET favoriteCount = MAX(0, favoriteCount - 1), updatedAt = ? WHERE id = ?').run(nowLocal(), postId)
  } else {
    d.prepare('INSERT INTO CommunityPostFavorite (postId, userId, createdAt) VALUES (?,?,?)').run(postId, userId, nowLocal())
    d.prepare('UPDATE CommunityPost SET favoriteCount = favoriteCount + 1, updatedAt = ? WHERE id = ?').run(nowLocal(), postId)
    if (post.authorId !== userId) {
      d.prepare('INSERT INTO CommunityNotification (id, userId, actorId, type, postId, content, isRead, createdAt) VALUES (?,?,?,?,?,?,0,?)').run(genId(), post.authorId, userId, 'favorite', postId, '有人收藏了你的帖子', nowLocal())
    }
  }
  const count = Number((d.prepare('SELECT favoriteCount FROM CommunityPost WHERE id = ?').get(postId) as any)?.favoriteCount || 0)
  return { active: !exists, count }
}

export function listCommunityComments(postId: string, includeHidden = false): CommunityComment[] {
  const d = getDb()
  const where = includeHidden ? 'c.postId = ?' : "c.postId = ? AND c.status = 'published'"
  const rows = d.prepare(
    `SELECT c.*, COALESCE(pr.nickname, 'VOID指挥官') AS authorName, COALESCE(pr.avatarUrl, '') AS authorAvatar
     FROM CommunityComment c LEFT JOIN CommunityProfile pr ON pr.customerId = c.authorId
     WHERE ${where} ORDER BY c.createdAt ASC`,
  ).all(postId) as any[]
  return rows.map(communityCommentRow)
}

export function createCommunityComment(postId: string, authorId: string, content: string, parentId = ''): CommunityComment {
  const clean = cleanCommunityText(content, 500)
  if (clean.length < 2) throw new Error('评论至少需要 2 个字')
  const d = getDb()
  const post = d.prepare('SELECT id, authorId, status FROM CommunityPost WHERE id = ?').get(postId) as any
  if (!post || post.status !== 'published') throw new Error('帖子不存在或不可见')
  if (parentId) {
    const parent = d.prepare('SELECT id FROM CommunityComment WHERE id = ? AND postId = ?').get(parentId, postId) as any
    if (!parent) throw new Error('回复目标不存在')
  }
  getOrCreateCommunityProfile(authorId)
  const id = genId()
  const now = nowLocal()
  d.prepare('INSERT INTO CommunityComment (id, postId, authorId, parentId, content, status, likeCount, createdAt, updatedAt) VALUES (?,?,?,?,?,?,0,?,?)').run(id, postId, authorId, parentId || '', clean, 'published', now, now)
  d.prepare('UPDATE CommunityPost SET commentCount = (SELECT COUNT(*) FROM CommunityComment WHERE postId = ? AND status = \'published\'), updatedAt = ? WHERE id = ?').run(postId, now, postId)
  if (post.authorId !== authorId) {
    d.prepare('INSERT INTO CommunityNotification (id, userId, actorId, type, postId, content, isRead, createdAt) VALUES (?,?,?,?,?,?,0,?)').run(genId(), post.authorId, authorId, 'comment', postId, '有人评论了你的帖子', now)
  }
  return communityCommentRow(d.prepare('SELECT * FROM CommunityComment WHERE id = ?').get(id))
}

export function deleteCommunityComment(id: string, actorId: string): boolean {
  const d = getDb()
  const row = d.prepare('SELECT * FROM CommunityComment WHERE id = ?').get(id) as any
  if (!row) return false
  if (row.authorId !== actorId) throw new Error('只能删除自己的评论')
  d.prepare("UPDATE CommunityComment SET status = 'hidden', updatedAt = ? WHERE id = ?").run(nowLocal(), id)
  d.prepare("UPDATE CommunityPost SET commentCount = (SELECT COUNT(*) FROM CommunityComment WHERE postId = ? AND status = 'published'), updatedAt = ? WHERE id = ?").run(row.postId, nowLocal(), row.postId)
  return true
}

export function toggleFollow(followerId: string, followingId: string) {
  const follower = cleanCommunityText(followerId, 120)
  const following = cleanCommunityText(followingId, 120)
  if (!follower || !following) throw new Error('缺少关注对象')
  if (follower === following) throw new Error('不能关注自己')
  const d = getDb()
  getOrCreateCommunityProfile(follower)
  getOrCreateCommunityProfile(following)
  const exists = !!d.prepare('SELECT 1 FROM CommunityFollow WHERE followerId = ? AND followingId = ?').get(follower, following)
  d.exec('BEGIN IMMEDIATE')
  try {
    if (exists) {
      d.prepare('DELETE FROM CommunityFollow WHERE followerId = ? AND followingId = ?').run(follower, following)
    } else {
      d.prepare('INSERT INTO CommunityFollow (followerId, followingId, createdAt) VALUES (?,?,?)').run(follower, following, nowLocal())
      d.prepare(
        'INSERT INTO CommunityNotification (id, userId, actorId, type, postId, content, isRead, createdAt) VALUES (?,?,?,?,?,?,0,?)',
      ).run(genId(), following, follower, 'follow', '', '有人关注了你', nowLocal())
    }
    d.exec('COMMIT')
  } catch (error) {
    d.exec('ROLLBACK')
    throw error
  }
  refreshCommunityProfileStats(follower, d)
  refreshCommunityProfileStats(following, d)
  return { following: !exists, followerCount: Number((d.prepare('SELECT followerCount FROM CommunityProfile WHERE customerId = ?').get(following) as any)?.followerCount || 0) }
}

export function listFollowingIds(followerId: string): string[] {
  const id = cleanCommunityText(followerId, 120)
  if (!id) return []
  return (getDb().prepare('SELECT followingId FROM CommunityFollow WHERE followerId = ? ORDER BY createdAt DESC').all(id) as any[])
    .map((row) => String(row.followingId || ''))
    .filter(Boolean)
}

export function listFollowers(userId: string): CommunityProfile[] {
  const id = cleanCommunityText(userId, 120)
  if (!id) return []
  const rows = getDb().prepare(
    `SELECT p.* FROM CommunityFollow f JOIN CommunityProfile p ON p.customerId = f.followerId
     WHERE f.followingId = ? ORDER BY f.createdAt DESC LIMIT 100`,
  ).all(id) as any[]
  return rows.map(communityProfileRow)
}

export function listCommunityNotifications(userId: string, opts: { page?: number; pageSize?: number; unreadOnly?: boolean } = {}) {
  const id = cleanCommunityText(userId, 120)
  if (!id) return { items: [] as CommunityNotification[], total: 0, unread: 0, page: 1, pageSize: 20 }
  const page = Math.max(1, Number(opts.page) || 1)
  const pageSize = Math.min(Math.max(1, Number(opts.pageSize) || 20), 50)
  const where = opts.unreadOnly ? 'n.userId = ? AND n.isRead = 0' : 'n.userId = ?'
  const d = getDb()
  const total = Number((d.prepare(`SELECT COUNT(*) AS n FROM CommunityNotification n WHERE ${where}`).get(id) as any)?.n || 0)
  const unread = Number((d.prepare('SELECT COUNT(*) AS n FROM CommunityNotification WHERE userId = ? AND isRead = 0').get(id) as any)?.n || 0)
  const rows = d.prepare(
    `SELECT n.*, COALESCE(p.nickname, 'VOID System') AS actorName, COALESCE(p.avatarUrl, '') AS actorAvatar
     FROM CommunityNotification n LEFT JOIN CommunityProfile p ON p.customerId = n.actorId
     WHERE ${where} ORDER BY n.createdAt DESC LIMIT ? OFFSET ?`,
  ).all(id, pageSize, (page - 1) * pageSize) as any[]
  return { items: rows.map(communityNotificationRow), total, unread, page, pageSize }
}

export function markCommunityNotificationRead(id: string, userId: string): boolean {
  const notificationId = cleanCommunityText(id, 120)
  const ownerId = cleanCommunityText(userId, 120)
  if (!notificationId || !ownerId) return false
  const result = getDb().prepare('UPDATE CommunityNotification SET isRead = 1 WHERE id = ? AND userId = ?').run(notificationId, ownerId)
  return Number(result.changes || 0) > 0
}

export function markAllCommunityNotificationsRead(userId: string): number {
  const id = cleanCommunityText(userId, 120)
  if (!id) return 0
  const result = getDb().prepare('UPDATE CommunityNotification SET isRead = 1 WHERE userId = ? AND isRead = 0').run(id)
  return Number(result.changes || 0)
}

export function listCommunityEvidence(postId: string): CommunityEvidence[] {
  const id = cleanCommunityText(postId, 120)
  if (!id) return []
  const rows = getDb().prepare(
    `SELECT id, orderNo, companionName, serviceName, unitCount, amountCents, amount, updatedAt, createdAt
     FROM "Order"
     WHERE sourcePostId = ? AND status = 'completed' AND paid = 1
     ORDER BY updatedAt DESC, createdAt DESC LIMIT 50`,
  ).all(id) as any[]
  return rows.map(communityEvidenceRow)
}

export function listCommunityUsers(input: { keyword?: string; page?: number; pageSize?: number } = {}) {
  return listCommunityProfiles(input)
}

export function getCommunityProfileView(userId: string, viewerId = '', opts: { page?: number; pageSize?: number } = {}): CommunityProfileView | null {
  const id = cleanCommunityText(userId, 120)
  if (!id) return null
  const profile = getCommunityProfile(id)
  if (!profile) return null
  const feed = listCommunityPosts({ channel: 'profile', userId: id, viewerId, page: opts.page, pageSize: opts.pageSize })
  const isFollowing = viewerId && viewerId !== id
    ? !!getDb().prepare('SELECT 1 FROM CommunityFollow WHERE followerId = ? AND followingId = ?').get(viewerId, id)
    : false
  return { profile, posts: feed.posts, total: feed.total, page: feed.page, pageSize: feed.pageSize, isFollowing }
}

export function createCommunityNotification(input: { userId: string; actorId?: string; type?: CommunityNotification['type']; postId?: string; content: string }): CommunityNotification {
  const userId = cleanCommunityText(input.userId, 120)
  if (!userId) throw new Error('缺少通知接收人')
  const id = genId()
  const now = nowLocal()
  getDb().prepare(
    'INSERT INTO CommunityNotification (id, userId, actorId, type, postId, content, isRead, createdAt) VALUES (?,?,?,?,?,?,0,?)',
  ).run(id, userId, cleanCommunityText(input.actorId, 120), input.type || 'system', cleanCommunityText(input.postId, 120), cleanCommunityText(input.content, 160), now)
  return communityNotificationRow(getDb().prepare('SELECT * FROM CommunityNotification WHERE id = ?').get(id))
}
