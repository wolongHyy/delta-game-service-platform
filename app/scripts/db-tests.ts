import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const tempDir = mkdtempSync(join(tmpdir(), 'delta-db-test-'))
process.env.DB_PATH = join(tempDir, 'test.db')
process.env.CLAIM_COOLDOWN_MS = '0'

const {
  assignOrder,
  getAnalytics,
  cancelExpiredOrders,
  claimOrder,
  closeDatabase,
  countUsedTrialThisWeek,
  listOpenOrders,
  createCompanion,
  createFighterApplication,
  createOrder,
  createServiceType,
  getOrder,
  getDb,
  listOrderEvents,
  listCompanions,
  listOrders,
  payOrder,
  rejectPaymentProof,
  submitPaymentProof,
  issueSliderChallenge,
  verifySliderChallenge,
  issueClaimToken,
  requestOrderCompletion,
  getFighterEarnings,
  reviewFighterApplication,
  updateCompanion,
  fighterStartOrder,
  confirmOrderCompletion,
  createCommunityComment,
  createCommunityPost,
  getCommunityPost,
  getOrCreateCommunityProfile,
  listCommunityComments,
  listCommunityEvidence,
  listCommunityNotifications,
  listCommunityPosts,
  listFollowers,
  markCommunityNotificationRead,
  reviewCommunityPost,
  toggleCommunityFavorite,
  toggleCommunityLike,
  toggleFollow,
} = await import('../src/lib/db.ts')

async function createFighter(username: string, tier = ''): Promise<string> {
  const application = await createFighterApplication({
    customerId: 'test-customer',
    gameName: username,
    contact: 'test',
    username,
    tier,
    passwordHash: 'test:test',
  })
  const approved = await reviewFighterApplication(application.id, 'approved')
  assert.equal(approved?.status, 'approved')
  const account = await import('../src/lib/db.ts')
  const fighters = (account as any).listAvailableFighters()
  return fighters.find((fighter: any) => fighter.username === username).id
}

// 创建订单并完成付款（进入公共池），返回订单
function paidOrder(companionId: string, customerId = 'test-customer', extra: Record<string, unknown> = {}) {
  const order = createOrder({ companionId, unitCount: 1, customerId, ...(extra as any) })
  assert.equal(order.status, 'unpaid')
  const paid = payOrder(order.id, { type: 'admin' }, 'offline')
  assert.equal(paid?.paid, true)
  return paid as NonNullable<typeof paid>
}

// 滑块验证通过后服务端发放的一次性抢单令牌（单元测试直接发放）
function tokenFor(orderId: string, fighterId: string): string {
  return issueClaimToken(orderId, fighterId)
}

describe('order database guards', () => {
  let companionId = ''

  before(async () => {
    const serviceType = await createServiceType({ name: '测试类型' })
    const companion = await createCompanion({
      serviceTypeId: serviceType.id,
      name: '测试陪玩',
      price: 10,
      unit: '小时',
    })
    companionId = companion.id
  })

  after(() => {
    closeDatabase()
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('rejects an impossible quantity', () => {
    assert.throws(
      () => createOrder({ companionId, unitCount: 25, customerId: 'test-customer' }),
      /数量必须/,
    )
  })

  it('rejects a fractional quantity', () => {
    assert.throws(
      () => createOrder({ companionId, unitCount: 1.5, customerId: 'test-customer' }),
      /数量必须/,
    )
  })

  it('stores money in cents to avoid floating point drift', async () => {
    const cheapCompanion = await createCompanion({
      serviceTypeId: (await createServiceType({ name: '分账测试' })).id,
      name: '分账陪玩',
      price: 0.1,
      unit: '小时',
    })
    const order = await createOrder({ companionId: cheapCompanion.id, unitCount: 3, customerId: 'test-customer' })
    assert.equal(order.amount, 0.3)
  })

  it('returns the same order for the same idempotency key', async () => {
    const first = await createOrder({
      companionId,
      unitCount: 1,
      customerId: 'test-customer',
      idempotencyKey: 'idempotent-test-key',
    })
    const retry = await createOrder({
      companionId,
      unitCount: 8,
      customerId: 'test-customer',
      idempotencyKey: 'idempotent-test-key',
    })
    assert.equal(retry.id, first.id)
    assert.equal(retry.amount, first.amount)

    const attacker = await createOrder({
      companionId,
      unitCount: 8,
      customerId: 'attacker',
      idempotencyKey: 'idempotent-test-key',
    })
    assert.notEqual(attacker.id, first.id)
    assert.equal(attacker.amount, 80)
  })

  it('recalculates price from server data, not client input', async () => {
    const order = await createOrder({
      companionId,
      unitCount: 2,
      spec: '单陪 · 教学单',
      customerId: 'test-customer',
    })
    assert.equal(order.price, 30)
    assert.equal(order.amount, 60)
  })

  // ===== 付款流程：下单先进待付款，付款后才进公共池 =====
  it('creates order as unpaid and only enters the pool after payment', async () => {
    const order = await createOrder({ companionId, unitCount: 1, customerId: 'pay-flow-customer' })
    assert.equal(order.status, 'unpaid')
    assert.equal(order.paid, false)
    assert.ok(!listOpenOrders().some((item) => item.id === order.id))

    const paid = payOrder(order.id, { type: 'admin' }, 'offline')
    assert.equal(paid?.status, 'pending')
    assert.equal(paid?.paid, true)
    assert.ok(listOpenOrders().some((item) => item.id === order.id))
  })

  it('keeps the specified fighter on the order after payment', async () => {
    const fighterId = await createFighter('specified-fighter')
    const order = await createOrder({ companionId, unitCount: 1, customerId: 'specified-customer', fighterId })
    assert.equal(order.status, 'unpaid')
    const paid = payOrder(order.id, { type: 'admin' }, 'offline')
    assert.equal(paid?.status, 'assigned')
    assert.equal(paid?.fighterId, fighterId)
    assert.equal(paid?.assignedBy, 'customer')
    assert.ok(!listOpenOrders().some((item) => item.id === order.id))
  })

  it('customer can cancel an unpaid order', async () => {
    const order = await createOrder({ companionId, unitCount: 1, customerId: 'cancel-unpaid-customer' })
    const { updateOrderStatus } = await import('../src/lib/db.ts')
    const cancelled = updateOrderStatus(order.id, 'cancelled', { type: 'customer' })
    assert.equal(cancelled?.status, 'cancelled')
  })

  it('admin can mark an unpaid order as offline-paid', async () => {
    const order = await createOrder({ companionId, unitCount: 1, customerId: 'offline-customer' })
    const paid = payOrder(order.id, { type: 'admin' }, 'offline')
    assert.equal(paid?.status, 'pending')
    assert.equal(paid?.paymentMethod, 'offline')
  })

  it('keeps QR payment pending until an admin confirms receipt', async () => {
    const order = await createOrder({ companionId, unitCount: 1, customerId: 'qr-review-customer' })
    const review = submitPaymentProof(order.id, 'qr-review-customer', '微信昵称：测试付款人', '测试顾客')
    assert.equal(review?.status, 'payment_review')
    assert.equal(review?.paid, false)
    assert.equal(review?.paymentNote, '微信昵称：测试付款人')
    assert.ok(!listOpenOrders().some((item) => item.id === order.id))

    const paid = payOrder(order.id, { type: 'admin' }, 'qr_manual')
    assert.equal(paid?.status, 'pending')
    assert.equal(paid?.paid, true)
    assert.equal(paid?.paymentMethod, 'qr_manual')
  })

  it('keeps QR payment pending after database reinitialization', async () => {
    const order = await createOrder({ companionId, unitCount: 1, customerId: 'qr-reload-customer' })
    const review = submitPaymentProof(order.id, 'qr-reload-customer', '微信昵称：重载验证')
    assert.equal(review?.status, 'payment_review')
    assert.equal(review?.paid, false)

    closeDatabase()
    getDb()
    const reloaded = getOrder(order.id)
    assert.equal(reloaded?.status, 'payment_review')
    assert.equal(reloaded?.paid, false)
  })
  it('returns a rejected QR payment to unpaid', async () => {
    const order = await createOrder({ companionId, unitCount: 1, customerId: 'qr-reject-customer' })
    submitPaymentProof(order.id, 'qr-reject-customer', '支付宝：尾号1234')
    const rejected = rejectPaymentProof(order.id)
    assert.equal(rejected?.status, 'unpaid')
    assert.equal(rejected?.paid, false)
    assert.equal(rejected?.paymentNote, '')
  })

  // ===== 抢单验证码与防脚本 =====
  it('requires slider verification token to grab an order', async () => {
    const fighter = await createFighter('slider-fighter')
    const order = paidOrder(companionId, 'slider-customer')
    assert.throws(() => claimOrder(order.id, fighter), /滑块验证/)
    const claimed = claimOrder(order.id, fighter, tokenFor(order.id, fighter))
    assert.equal(claimed?.status, 'assigned')
    assert.equal(claimed?.fighterId, fighter)
  })

  it('rejects a claim token bound to another fighter', async () => {
    const a = await createFighter('token-fighter-a')
    const b = await createFighter('token-fighter-b')
    const order = paidOrder(companionId, 'token-customer')
    assert.throws(() => claimOrder(order.id, b, tokenFor(order.id, a)), /滑块验证/)
  })

  it('slider verifies only when dragged to the right end', async () => {
    const order = paidOrder(companionId, 'slider-verify-customer')
    const { sliderId } = issueSliderChallenge(order.id)
    assert.ok(sliderId.length >= 8)
    assert.equal(verifySliderChallenge(sliderId, order.id, 50), false) // 拖到中间不通过
    assert.equal(verifySliderChallenge(sliderId, order.id, 96), true)  // 拖到最右侧通过
    assert.equal(verifySliderChallenge('bad-id', order.id, 100), false)
  })

  it('rejects claiming an unpaid order', async () => {
    const fighter = await createFighter('unpaid-claim-fighter')
    const order = await createOrder({ companionId, unitCount: 1, customerId: 'unpaid-claim-customer' })
    assert.throws(() => claimOrder(order.id, fighter, tokenFor(order.id, fighter)), /尚未付款/)
  })

  it('entertainment-tier fighters cannot claim from the public pool', async () => {
    const funFighter = await createFighter('entertainment-fighter', '娱乐')
    const order = paidOrder(companionId, 'tier-customer')
    assert.throws(() => claimOrder(order.id, funFighter, tokenFor(order.id, funFighter)), /娱乐档次打手不能抢公共池/)
    // 但管理员仍可以指定娱乐档次打手
    const assigned = assignOrder(order.id, funFighter)
    assert.equal(assigned?.fighterId, funFighter)
  })

  it('keeps only one fighter winning a paid pending order', async () => {
    const firstFighter = await createFighter('fighter-a')
    const secondFighter = await createFighter('fighter-b')
    const order = paidOrder(companionId, 'one-winner-customer')
    const winner = await claimOrder(order.id, firstFighter, tokenFor(order.id, firstFighter))
    assert.equal(winner?.fighterId, firstFighter)
    assert.throws(() => claimOrder(order.id, secondFighter, tokenFor(order.id, secondFighter)), /已被其他打手抢走/)
  })

  it('moves an order between admin assignment and the public claim pool', async () => {
    const fighter = await createFighter('pool-cycle-fighter')
    const order = paidOrder(companionId, 'pool-cycle-customer')
    assert.ok(listOpenOrders().some((item) => item.id === order.id))

    const assigned = await assignOrder(order.id, fighter)
    assert.equal(assigned?.status, 'assigned')
    assert.equal(assigned?.assignedBy, 'admin')
    assert.ok(!listOpenOrders().some((item) => item.id === order.id))

    const returned = await assignOrder(order.id, '')
    assert.equal(returned?.status, 'pending')
    assert.equal(returned?.fighterId, '')
    assert.ok(listOpenOrders().some((item) => item.id === order.id))

    const claimed = await claimOrder(order.id, fighter, tokenFor(order.id, fighter))
    assert.equal(claimed?.status, 'assigned')
    assert.equal(claimed?.fighterId, fighter)
    assert.ok(!listOpenOrders().some((item) => item.id === order.id))
  })

  it('cannot force-assign an order that has already been claimed', async () => {
    const firstFighter = await createFighter('claimed-by')
    const otherFighter = await createFighter('would-be-admin-target')
    const order = paidOrder(companionId, 'claimed-order-customer')
    await claimOrder(order.id, firstFighter, tokenFor(order.id, firstFighter))
    assert.throws(() => assignOrder(order.id, otherFighter), /不能强行指派/)
    const updated = getOrder(order.id)
    assert.equal(updated?.fighterId, firstFighter)
  })

  it('cannot assign an unpaid order', async () => {
    const fighter = await createFighter('assign-unpaid-fighter')
    const order = await createOrder({ companionId, unitCount: 1, customerId: 'assign-unpaid-customer' })
    assert.throws(() => assignOrder(order.id, fighter), /尚未付款/)
  })

  it('rejects a completion application without proof screenshots', async () => {
    const fighter = await createFighter('proof-fighter')
    const order = paidOrder(companionId, 'proof-customer')
    await claimOrder(order.id, fighter, tokenFor(order.id, fighter))
    await fighterStartOrder(order.id, fighter)
    assert.throws(() => requestOrderCompletion(order.id, fighter, { note: '完成' }), /至少上传 1 张截图/)
  })

  it('accepts a completion application with proof and syncs pending settlement', async () => {
    const fighter = await createFighter('settlement-fighter')
    const order = paidOrder(companionId, 'settlement-customer')
    await claimOrder(order.id, fighter, tokenFor(order.id, fighter))
    await fighterStartOrder(order.id, fighter)

    // 提交申请前：待结算为 0
    let earnings = getFighterEarnings(fighter)
    assert.equal(earnings.pendingSettlement, 0)

    const requested = requestOrderCompletion(order.id, fighter, { note: '已按单子要求完成', proof: ['/api/uploads/a.png'] })
    assert.equal(requested?.status, 'completion_pending')
    assert.deepEqual(requested?.completionProof, ['/api/uploads/a.png'])
    assert.equal(requested?.completionNote, '已按单子要求完成')

    // 提交申请后：抽成金额进入“待结算”
    earnings = getFighterEarnings(fighter)
    assert.ok(earnings.pendingSettlement > 0)
    assert.equal(earnings.settled, 0)

    // 管理员确认完成后：进入“已结算”
    const completed = confirmOrderCompletion(order.id)
    assert.equal(completed?.status, 'completed')
    earnings = getFighterEarnings(fighter)
    assert.equal(earnings.pendingSettlement, 0)
    assert.ok(earnings.settled > 0)
  })

  it('does not consume the weekly trial quota when the order is cancelled', async () => {
    const order = await createOrder({ companionId, unitCount: 1, customerId: 'trial-cancel-customer', isTrial: true })
    getDb().prepare(`UPDATE "Order" SET status = 'cancelled' WHERE id = ?`).run(order.id)
    assert.equal(countUsedTrialThisWeek('trial-cancel-customer'), 0)
    const retry = await createOrder({ companionId, unitCount: 1, customerId: 'trial-cancel-customer', isTrial: true })
    assert.equal(retry.isTrial, true)
  })

  it('keeps only one winner when ten fighters rush the same order', async () => {
    const fighters = [] as string[]
    for (let i = 0; i < 10; i += 1) {
      const fighter = await createFighter(`rush-fighter-${i}`)
      fighters.push(fighter)
    }
    const order = paidOrder(companionId, 'rush-customer')
    const attempts = await Promise.all(
      fighters.map(async (fighterId) => {
        try {
          await claimOrder(order.id, fighterId, tokenFor(order.id, fighterId))
          return true
        } catch {
          return false
        }
      }),
    )
    const winners = attempts.filter(Boolean)
    const claimed = await getOrder(order.id)
    assert.equal(winners.length, 1)
    assert.ok(fighters.includes(claimed?.fighterId || ''))
  })

  it('creates only one order when ten retries share an idempotency key', async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        createOrder({
          companionId,
          unitCount: 1,
          customerId: 'idempotent-rush-customer',
          idempotencyKey: 'ten-way-rush',
        }),
      ),
    )
    assert.equal(new Set(results.map((order) => order.id)).size, 1)
  })

  it('refreshes cached catalog data after a companion update', async () => {
    const priceCompanion = await createCompanion({
      serviceTypeId: (await createServiceType({ name: '缓存测试' })).id,
      name: '缓存陪玩',
      price: 10,
      unit: '小时',
    })
    const before = listCompanions().find((item) => item.id === priceCompanion.id)
    await updateCompanion(priceCompanion.id, { price: 20 })
    const after = listCompanions().find((item) => item.id === priceCompanion.id)
    assert.equal(before?.price, 10)
    assert.equal(after?.price, 20)
  })

  it('seeds the daily order sequence from pre-existing order numbers once', async () => {
    const now = new Date()
    const p = (value: number) => String(value).padStart(2, '0')
    const dateKey = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}`
    const legacyNumber = `${dateKey}-900000`
    getDb().prepare('DELETE FROM OrderSequence WHERE dateKey = ?').run(dateKey)
    getDb()
      .prepare(`INSERT INTO "Order" (id, orderNo, companionName, serviceName, unitCount, price, amount, status) VALUES (?,?,?,?,?,?,?,'cancelled')`)
      .run('legacy-sequence-order', legacyNumber, '旧库订单', '陪玩', 1, 0, 0)

    const order = await createOrder({ companionId, unitCount: 1, customerId: 'sequence-seed-customer' })
    assert.equal(order.orderNo, `${dateKey}-900001`)
  })

  it('supports optional shared database rate limiting', async () => {
    process.env.RATE_LIMIT_SHARED = 'db'
    const { rateLimit } = await import('../src/lib/rate-limit.ts')
    assert.equal(rateLimit('shared-db-rate-test', 2, 60_000), true)
    assert.equal(rateLimit('shared-db-rate-test', 2, 60_000), true)
    assert.equal(rateLimit('shared-db-rate-test', 2, 60_000), false)
    process.env.RATE_LIMIT_SHARED = ''
  })

  it('paginates order lists', async () => {
    const customerId = 'pagination-customer'
    await createOrder({ companionId, unitCount: 1, customerId })
    await createOrder({ companionId, unitCount: 1, customerId })
    await createOrder({ companionId, unitCount: 1, customerId })
    const pageOne = await listOrders({ customerId, page: 1, pageSize: 2 })
    const pageTwo = await listOrders({ customerId, page: 2, pageSize: 2 })
    assert.equal(pageOne.length, 2)
    assert.equal(pageTwo.length, 1)
  })

  it('cancels expired unpaid orders and writes an event', async () => {
    const order = await createOrder({ companionId, unitCount: 1, customerId: 'expired-unpaid-customer' })
    const dbModule = await import('../src/lib/db.ts')
    const db = (dbModule as any).getDb()
    db.prepare(`UPDATE "Order" SET createdAt = datetime('now', '-60 minutes') WHERE id = ?`).run(order.id)
    const cancelled = await cancelExpiredOrders(30)
    assert.ok(cancelled >= 1)
    const updated = await getOrder(order.id)
    assert.equal(updated?.status, 'cancelled')
    const events = await listOrderEvents(order.id)
    assert.equal(events[0].action, 'auto_cancel')
  })

  it('analytics still work with unpaid status', async () => {
    await createOrder({ companionId, unitCount: 1, customerId: 'analytics-unpaid-customer' })
    const stats = getAnalytics()
    assert.ok(stats.totals.orders >= 1)
    assert.ok(Array.isArray(stats.statusBreakdown))
  })
  // ===== 社区与交易闭环 =====
  it('keeps community posts pending until moderation publishes them', async () => {
    const authorId = 'community-author'
    getOrCreateCommunityProfile(authorId, '战术记录员', '')
    const post = createCommunityPost({
      authorId,
      title: '零号大坝撤离路线复盘',
      content: '记录三条常用撤离路线，以及遭遇战时的转点原则。',
      topic: '战术攻略',
      serviceId: companionId,
      tags: ['路线', '撤离'],
    })
    assert.equal(post.status, 'pending')
    assert.equal(getCommunityPost(post.id), null)

    const pendingFeed = listCommunityPosts({ status: 'pending', pageSize: 50 })
    assert.ok(pendingFeed.posts.some((item) => item.id === post.id))

    const published = reviewCommunityPost(post.id, 'published', { featured: true, pinned: true, knowledge: true })
    assert.equal(published?.status, 'published')
    assert.equal(published?.featured, true)
    assert.equal(published?.pinned, true)
    assert.equal(published?.knowledge, true)
    assert.ok(published?.publishedAt)

    const knowledgeFeed = listCommunityPosts({ channel: 'knowledge', viewerId: authorId, pageSize: 50 })
    assert.ok(knowledgeFeed.posts.some((item) => item.id === post.id && item.knowledge))
  })

  it('supports likes, favorites, comments, follows and notifications', async () => {
    const authorId = 'community-interaction-author'
    const readerId = 'community-interaction-reader'
    getOrCreateCommunityProfile(authorId, '发布者', '')
    getOrCreateCommunityProfile(readerId, '读者', '')
    const post = createCommunityPost({
      authorId,
      title: '近距离架枪常见误区',
      content: '讨论掩体、身位和听声辨位，欢迎补充不同打法。',
      topic: '战术讨论',
    })
    reviewCommunityPost(post.id, 'published')

    const liked = toggleCommunityLike(post.id, readerId)
    assert.deepEqual(liked, { active: true, count: 1 })
    assert.equal(toggleCommunityLike(post.id, readerId).active, false)

    const favorited = toggleCommunityFavorite(post.id, readerId)
    assert.deepEqual(favorited, { active: true, count: 1 })

    const comment = createCommunityComment(post.id, readerId, '补充：先确认队友火力线再拉身位。')
    assert.equal(comment.content, '补充：先确认队友火力线再拉身位。')
    assert.ok(listCommunityComments(post.id).some((item) => item.id === comment.id))

    const followed = toggleFollow(readerId, authorId)
    assert.equal(followed.following, true)
    assert.equal(followed.followerCount, 1)
    assert.ok(listFollowers(authorId).some((item) => item.customerId === readerId))

    const notifications = listCommunityNotifications(authorId, { pageSize: 50 })
    const types = new Set(notifications.items.map((item) => item.type))
    assert.ok(types.has('comment'))
    assert.ok(types.has('favorite'))
    assert.ok(types.has('follow'))
    assert.ok(notifications.unread >= 3)
    const firstUnread = notifications.items.find((item) => !item.isRead)
    assert.ok(firstUnread)
    assert.equal(markCommunityNotificationRead(firstUnread!.id, authorId), true)
    assert.equal(listCommunityNotifications(authorId).items.find((item) => item.id === firstUnread!.id)?.isRead, true)
  })

  it('links a post order to completed evidence without leaking private fields', async () => {
    const authorId = 'community-order-author'
    const customerId = 'community-order-buyer'
    getOrCreateCommunityProfile(authorId, '服务复盘员', '')
    const post = createCommunityPost({
      authorId,
      title: '陪玩复盘与固定队沟通',
      content: '从这条帖子进入下单，用于验证订单和成交凭证回写。',
      topic: '服务体验',
      serviceId: companionId,
    })
    reviewCommunityPost(post.id, 'published')

    const order = paidOrder(companionId, customerId, {
      sourcePostId: post.id,
      customerName: '社区买家',
      customerPhone: '13800000000',
    })
    assert.equal(order.sourcePostId, post.id)
    assert.equal(listCommunityEvidence(post.id).length, 0)
    const paidNotifications = listCommunityNotifications(authorId)
    assert.ok(paidNotifications.items.some((item) => item.type === 'order' && item.content.includes('已付款')))

    const fighter = await createFighter('community-order-fighter')
    await claimOrder(order.id, fighter, tokenFor(order.id, fighter))
    await fighterStartOrder(order.id, fighter)
    requestOrderCompletion(order.id, fighter, { note: '社区闭环验证', proof: ['/api/uploads/community-proof.png'] })
    const completed = confirmOrderCompletion(order.id)
    assert.equal(completed?.status, 'completed')

    const evidence = listCommunityEvidence(post.id)
    assert.equal(evidence.length, 1)
    assert.equal(evidence[0].orderId, order.id)
    assert.equal(evidence[0].status, 'completed')
    assert.equal(Object.prototype.hasOwnProperty.call(evidence[0], 'phone'), false)
    assert.equal(Object.prototype.hasOwnProperty.call(evidence[0], 'openid'), false)

    const refreshedPost = getCommunityPost(post.id, authorId, true)
    assert.equal(refreshedPost?.evidenceCount, 1)
    const completedNotifications = listCommunityNotifications(authorId)
    assert.ok(completedNotifications.items.some((item) => item.type === 'order' && item.content.includes('成交凭证')))
  })

  it('rejects a post order when the selected service does not match', async () => {
    const authorId = 'community-mismatch-author'
    const post = createCommunityPost({
      authorId,
      title: '关联服务一致性测试',
      content: '帖子关联的必须是当前下单的同一项服务。',
      topic: '规则说明',
      serviceId: companionId,
    })
    reviewCommunityPost(post.id, 'published')
    const otherServiceType = await createServiceType({ name: '社区不匹配类型' })
    const otherCompanion = await createCompanion({
      serviceTypeId: otherServiceType.id,
      name: '社区不匹配服务',
      price: 10,
      unit: '小时',
    })
    assert.throws(
      () => createOrder({ companionId: otherCompanion.id, sourcePostId: post.id, unitCount: 1, customerId: 'mismatch-buyer' }),
      /服务与当前选择不一致/,
    )
  })

})
