const core = require('./lib-core')
const store = require('./lib-store')

function postView (post) {
  const item = core.withId(post)
  if (!item) return null
  item.tags = Array.isArray(item.tags) ? item.tags : []
  item.images = Array.isArray(item.images) ? item.images : []
  item.likeCount = Number(item.likeCount || 0)
  item.commentCount = Number(item.commentCount || 0)
  item.favoriteCount = Number(item.favoriteCount || 0)
  item.evidenceCount = Number(item.evidenceCount || 0)
  item.authorLevel = Number(item.authorLevel || 1)
  return item
}

async function decorateForViewer (posts, openid) {
  const list = (posts || []).map(postView)
  const follows = await core.queryAll(core.C.follows, { userId: openid }, { limit: 100 })
  const following = {}
  follows.forEach(function (row) { following[String(row.targetId)] = true })
  const likes = await core.queryAll(core.C.likes, { userId: openid }, { limit: 100 })
  const liked = {}
  likes.forEach(function (row) { liked[String(row.postId)] = true })
  const favorites = await core.queryAll(core.C.favorites, { userId: openid }, { limit: 100 })
  const favorited = {}
  favorites.forEach(function (row) { favorited[String(row.postId)] = true })
  list.forEach(function (item) {
    item.liked = !!liked[String(item.id)]
    item.favorited = !!favorited[String(item.id)]
    item.followingAuthor = !!following[String(item.authorId)]
  })
  return list
}

async function list (ctx) {
  const payload = ctx.payload || {}
  const channel = String(payload.channel || 'recommend')
  const pageSize = Math.max(1, Math.min(40, Number(payload.pageSize || 20)))
  let rows = []

  if (channel === 'knowledge') {
    rows = await core.queryAll(core.C.posts, { status: 'published', knowledge: true }, { orderBy: { field: 'createdAt', type: 'desc' }, limit: pageSize })
  } else if (channel === 'follow') {
    const follows = await core.queryAll(core.C.follows, { userId: ctx.openid }, { limit: 100 })
    const ids = follows.map(function (row) { return String(row.targetId) })
    if (!ids.length) rows = []
    else rows = await core.queryAll(core.C.posts, { status: 'published', authorId: core._.in(ids) }, { orderBy: { field: 'createdAt', type: 'desc' }, limit: pageSize })
  } else if (channel === 'latest') {
    rows = await core.queryAll(core.C.posts, { status: 'published' }, { orderBy: { field: 'createdAt', type: 'desc' }, limit: pageSize })
  } else {
    const all = await core.queryAll(core.C.posts, { status: 'published' }, { orderBy: { field: 'createdAt', type: 'desc' }, limit: 60 })
    const featured = all.filter(function (item) { return item.featured === true })
    const normal = all.filter(function (item) { return item.featured !== true })
    rows = featured.concat(normal).slice(0, pageSize)
  }

  const posts = await decorateForViewer(rows, ctx.openid)
  const contributors = await core.countWhere(core.C.users, { postCount: core._.gt(0) })
  const totalPublished = await core.countWhere(core.C.posts, { status: 'published' })

  const topicMap = {}
  posts.forEach(function (item) {
    const key = String(item.topic || '战术交流')
    topicMap[key] = (topicMap[key] || 0) + 1
  })
  const topics = Object.keys(topicMap).map(function (key) { return { name: key, count: topicMap[key] } })

  return {
    posts: posts,
    topics: topics,
    stats: {
      contributors: contributors || totalPublished,
      published: totalPublished
    }
  }
}

async function detail (ctx) {
  const id = core.requireText(ctx.payload.id, 1, '帖子编号')
  const post = await core.getDoc(core.C.posts, id)
  if (!post) throw new Error('帖子不存在或已被删除')
  if (post.status !== 'published') {
    const admin = await core.isAdmin(ctx.openid)
    if (!admin && String(post.authorId || '') !== ctx.openid) throw new Error('帖子尚未通过审核')
  }
  const view = (await decorateForViewer([post], ctx.openid))[0]

  if (!view.serviceName && view.serviceId) {
    const companion = await core.getDoc(core.C.companions, view.serviceId)
    if (companion) view.serviceName = String(companion.name || '')
  }

  const comments = await core.queryAll(core.C.comments, { postId: String(id), status: 'visible' }, { orderBy: { field: 'createdAt', type: 'asc' }, limit: 80 })
  const commentList = comments.map(function (row) {
    const item = core.withId(row) || {}
    const name = String(item.authorName || 'VOID 玩家')
    item.authorInitial = name.slice(0, 1).toUpperCase()
    item.createdAt = String(item.createdAt || '')
    return item
  })

  view.evidence = await store.listEvidence(String(id))
  return { post: view, comments: commentList }
}

async function create (ctx) {
  const openid = ctx.openid
  const payload = ctx.payload || {}
  const user = await core.ensureUser(openid)
  const title = core.requireText(payload.title, 4, '标题').slice(0, 60)
  const content = core.requireText(payload.content, 10, '正文').slice(0, 2000)
  const topic = String(payload.topic || '战术交流').slice(0, 20)
  const tags = (Array.isArray(payload.tags) ? payload.tags : []).map(function (tag) {
    return String(tag || '').trim().slice(0, 12)
  }).filter(Boolean).slice(0, 5)
  const images = (Array.isArray(payload.images) ? payload.images : []).map(function (file) {
    return String(file || '').slice(0, 512)
  }).filter(Boolean).slice(0, 9)

  let serviceId = String(payload.serviceId || '').trim()
  let serviceName = ''
  if (serviceId) {
    const companion = await core.getDoc(core.C.companions, serviceId)
    if (companion) serviceName = String(companion.name || '')
    else serviceId = ''
  }

  const now = core.nowLocal()
  const doc = {
    authorId: openid,
    authorName: String(user.nickname || 'VOID 玩家'),
    authorLevel: Number(user.level || 1),
    title: title,
    content: content,
    topic: topic,
    tags: tags,
    images: images,
    serviceId: serviceId,
    serviceName: serviceName,
    status: 'pending',
    featured: false,
    knowledge: false,
    likeCount: 0,
    commentCount: 0,
    favoriteCount: 0,
    evidenceCount: 0,
    createdAt: now,
    updatedAt: now
  }
  const created = await core.addDoc(core.C.posts, doc)
  await store.notifyAdmins('待审核', '社区有 1 条新帖等待审核：' + title, created._id)
  return { id: created._id, status: 'pending' }
}

async function like (ctx) {
  const openid = ctx.openid
  const id = core.requireText(ctx.payload.id, 1, '帖子编号')
  const post = await core.getDoc(core.C.posts, id)
  if (!post) throw new Error('帖子不存在')
  const docId = String(id) + '_' + openid
  const existing = await core.getDoc(core.C.likes, docId)
  const now = core.nowLocal()
  if (existing) {
    await core.removeDoc(core.C.likes, docId)
    await core.updateDoc(core.C.posts, id, { likeCount: core._.inc(-1), updatedAt: now })
    return { liked: false }
  }
  await core.setDoc(core.C.likes, docId, { _id: docId, postId: String(id), userId: openid, createdAt: now })
  await core.updateDoc(core.C.posts, id, { likeCount: core._.inc(1), updatedAt: now })
  if (post.authorId && String(post.authorId) !== openid) {
    await store.notify(post.authorId, '点赞', '有人点赞了你的帖子：' + String(post.title || ''), String(id))
  }
  return { liked: true }
}

async function favorite (ctx) {
  const openid = ctx.openid
  const id = core.requireText(ctx.payload.id, 1, '帖子编号')
  const post = await core.getDoc(core.C.posts, id)
  if (!post) throw new Error('帖子不存在')
  const docId = String(id) + '_' + openid
  const existing = await core.getDoc(core.C.favorites, docId)
  const now = core.nowLocal()
  if (existing) {
    await core.removeDoc(core.C.favorites, docId)
    await core.updateDoc(core.C.posts, id, { favoriteCount: core._.inc(-1), updatedAt: now })
    return { favorited: false }
  }
  await core.setDoc(core.C.favorites, docId, { _id: docId, postId: String(id), userId: openid, createdAt: now })
  await core.updateDoc(core.C.posts, id, { favoriteCount: core._.inc(1), updatedAt: now })
  return { favorited: true }
}

async function follow (ctx) {
  const openid = ctx.openid
  const targetId = core.requireText(ctx.payload.userId, 1, '关注对象')
  if (targetId === openid) throw new Error('不能关注自己')
  const following = ctx.payload.following === undefined ? true : !!ctx.payload.following
  const docId = String(openid) + '_' + String(targetId)
  const existing = await core.getDoc(core.C.follows, docId)
  const now = core.nowLocal()
  if (!following) {
    if (existing) await core.removeDoc(core.C.follows, docId)
    return { following: false }
  }
  if (!existing) {
    await core.setDoc(core.C.follows, docId, { _id: docId, userId: openid, targetId: String(targetId), createdAt: now })
    await store.notify(targetId, '关注', '有玩家关注了你。', '')
  }
  return { following: true, followingAuthor: true }
}

async function comment (ctx) {
  const openid = ctx.openid
  const id = core.requireText(ctx.payload.id, 1, '帖子编号')
  const content = core.requireText(ctx.payload.content, 2, '评论内容').slice(0, 500)
  const post = await core.getDoc(core.C.posts, id)
  if (!post) throw new Error('帖子不存在')
  const user = await core.ensureUser(openid)
  const now = core.nowLocal()
  const name = String(user.nickname || 'VOID 玩家')
  const created = await core.addDoc(core.C.comments, {
    postId: String(id),
    authorId: openid,
    authorName: name,
    authorInitial: name.slice(0, 1).toUpperCase(),
    content: content,
    status: 'visible',
    createdAt: now
  })
  await core.updateDoc(core.C.posts, id, { commentCount: core._.inc(1), updatedAt: now })
  if (post.authorId && String(post.authorId) !== openid) {
    await store.notify(post.authorId, '评论', name + ' 评论了你的帖子：' + content.slice(0, 30), String(id))
  }
  return { id: created._id }
}

async function notificationsList (ctx) {
  const rows = await core.queryAll(core.C.notifications, { userId: ctx.openid }, { orderBy: { field: 'createdAt', type: 'desc' }, limit: 50 })
  const items = rows.map(function (row) {
    const item = core.withId(row) || {}
    item.isRead = !!item.isRead
    item.type = String(item.type || '系统')
    item.content = String(item.content || '')
    item.createdAt = String(item.createdAt || '')
    item.postId = String(item.postId || '')
    return item
  })
  const unread = items.filter(function (item) { return !item.isRead }).length
  return { items: items, unread: unread }
}

async function notificationsReadAll (ctx) {
  const rows = await core.queryAll(core.C.notifications, { userId: ctx.openid, isRead: false }, { limit: 100 })
  for (let i = 0; i < rows.length; i += 1) {
    await core.updateDoc(core.C.notifications, rows[i]._id, { isRead: true, readAt: core.nowLocal() })
  }
  return { updated: rows.length }
}

async function evidence (ctx) {
  const id = core.requireText(ctx.payload.id, 1, '帖子编号')
  return { items: await store.listEvidence(String(id)) }
}

module.exports = {
  list: list,
  detail: detail,
  create: create,
  like: like,
  favorite: favorite,
  follow: follow,
  comment: comment,
  notificationsList: notificationsList,
  notificationsReadAll: notificationsReadAll,
  evidence: evidence
}