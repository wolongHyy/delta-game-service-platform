"use client"

import { useCallback, useEffect, useState } from 'react'
import type { CommunityComment, CommunityEvidence, CommunityPost, CommunityProfile } from '@/lib/types'
import { api } from '@/lib/client'
import {
  ActionDock,
  Avatar,
  Btn,
  EvidenceCard,
  HudPanel,
  IconBack,
  IconBookmark,
  IconChat,
  IconEdit,
  IconHeart,
  IconPackage,
  IconSend,
  IconTrash,
  Money,
  Skeleton,
  Tag,
  cn,
} from '@/components/ui'

function timeLabel(value: string) {
  return value ? value.slice(0, 16) : ''
}

function shortDate(value: string) {
  return value ? value.slice(0, 10) : '—'
}

export default function PostDetailView({
  postId,
  onBack,
  onUser,
  onOrder,
  onEdit,
  onDeleted,
  onNotice,
}: {
  postId: string
  onBack: () => void
  onUser: (id: string) => void
  onOrder: (serviceId: string, postId: string) => void
  onEdit: (postId: string) => void
  onDeleted: () => void
  onNotice: (message: string) => void
}) {
  const [post, setPost] = useState<CommunityPost | null>(null)
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [evidence, setEvidence] = useState<CommunityEvidence[]>([])
  const [me, setMe] = useState<CommunityProfile | null>(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [nextPost, commentResult, evidenceResult, profile] = await Promise.all([
        api<CommunityPost>(`/api/community/posts/${postId}`),
        api<{ comments: CommunityComment[] }>(`/api/community/posts/${postId}/comments`),
        api<{ evidence: CommunityEvidence[] }>(`/api/community/posts/${postId}/evidence`),
        api<CommunityProfile>('/api/community/me').catch(() => null),
      ])
      setPost(nextPost)
      setComments(commentResult.comments || [])
      setEvidence(evidenceResult.evidence || [])
      setMe(profile)
    } catch (reason: any) {
      setError(reason.message || '帖子加载失败')
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    void load()
  }, [load])

  async function toggle(kind: 'like' | 'favorite') {
    if (!post || busy) return
    setBusy(true)
    try {
      const result = await api<{ active: boolean; count: number }>(`/api/community/posts/${post.id}/${kind}`, { method: 'POST' })
      setPost((current) => current && (kind === 'like'
        ? { ...current, liked: result.active, likeCount: result.count }
        : { ...current, favorited: result.active, favoriteCount: result.count }))
    } catch (reason: any) {
      onNotice(reason.message || '操作失败')
    } finally {
      setBusy(false)
    }
  }

  async function follow() {
    if (!post || busy) return
    setBusy(true)
    try {
      const result = await api<{ following: boolean; followerCount: number }>(`/api/community/users/${post.authorId}/follow`, { method: 'POST' })
      setPost((current) => current && { ...current, followingAuthor: result.following })
    } catch (reason: any) {
      onNotice(reason.message || '关注失败')
    } finally {
      setBusy(false)
    }
  }

  async function submitComment() {
    if (!comment.trim() || busy) return
    setBusy(true)
    try {
      const next = await api<CommunityComment>(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: comment.trim() }),
      })
      setComments((current) => [...current, next])
      setPost((current) => current && { ...current, commentCount: current.commentCount + 1 })
      setComment('')
    } catch (reason: any) {
      onNotice(reason.message || '评论失败')
    } finally {
      setBusy(false)
    }
  }

  async function removePost() {
    if (!post || !window.confirm('确认删除这条帖子？删除后无法恢复。')) return
    setBusy(true)
    try {
      await api(`/api/community/posts/${post.id}`, { method: 'DELETE' })
      onNotice('帖子已删除')
      onDeleted()
    } catch (reason: any) {
      onNotice(reason.message || '删除失败')
    } finally {
      setBusy(false)
    }
  }

  const ownPost = Boolean(me && post && me.customerId === post.authorId)

  if (loading) {
    return (
      <div className="void-shell min-h-screen pb-28">
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-line bg-bg/95 px-4 backdrop-blur-xl">
          <button type="button" onClick={onBack} className="flex h-11 w-11 items-center justify-center text-ink-dim hover:bg-surface hover:text-ink" aria-label="返回"><IconBack size={20} /></button>
          <span className="text-sm font-medium text-ink">帖子详情</span>
        </header>
        <div className="mx-auto max-w-[1180px] p-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-1 lg:p-8">
          <div className="space-y-3"><Skeleton className="h-80 w-full" /><Skeleton className="h-8 w-4/5" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
          <div className="mt-4 hidden space-y-3 lg:mt-0 lg:block"><Skeleton className="h-44 w-full" /><Skeleton className="h-56 w-full" /></div>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="void-shell min-h-screen">
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-line bg-bg/95 px-4 backdrop-blur-xl">
          <button type="button" onClick={onBack} className="flex h-11 w-11 items-center justify-center text-ink-dim hover:bg-surface hover:text-ink" aria-label="返回"><IconBack size={20} /></button>
          <span className="text-sm font-medium text-ink">帖子详情</span>
        </header>
        <HudPanel className="mx-4 mt-4 max-w-2xl lg:mx-auto"><div className="p-8 text-center"><p className="text-sm font-medium text-ink">{error || '帖子不存在'}</p><button type="button" onClick={() => void load()} className="mt-4 min-h-touch border border-primary bg-primary px-4 text-sm text-onPrimary">重新加载</button></div></HudPanel>
      </div>
    )
  }

  const recordCode = `FIELD-${post.id.slice(-6).toUpperCase()}`
  const heroImage = post.images[0] || ''
  const gallery = heroImage ? post.images.slice(1) : post.images
  const readingMinutes = Math.max(1, Math.ceil((post.content.length + post.title.length) / 420))
  const statusTone = post.status === 'published' ? 'text-ok' : post.status === 'rejected' ? 'text-danger' : 'text-warn'
  const statusText = post.status === 'published' ? 'PUBLISHED' : post.status === 'pending' ? 'UNDER REVIEW' : post.status === 'rejected' ? 'REJECTED' : 'ARCHIVED'

  return (
    <div className="void-shell min-h-screen pb-28">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/90 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-14 max-w-[1180px] items-center justify-between gap-3 px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={onBack} className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-dim hover:bg-surface hover:text-ink" aria-label="返回"><IconBack size={20} /></button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">情报全文</p>
              <p className="truncate font-data text-[9px] tracking-[0.16em] text-ink-faint">{recordCode} / {statusText}</p>
            </div>
          </div>
          {ownPost && (
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => onEdit(post.id)} className="flex h-11 w-11 items-center justify-center text-ink-dim hover:bg-surface hover:text-ink" aria-label="编辑帖子"><IconEdit size={18} /></button>
              <button type="button" onClick={() => void removePost()} disabled={busy} className="flex h-11 w-11 items-center justify-center text-ink-dim hover:bg-danger/10 hover:text-danger" aria-label="删除帖子"><IconTrash size={18} /></button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pt-4 lg:px-8 lg:pt-7">
        {post.status !== 'published' && (
          <div className={cn('mb-4 border px-4 py-3 text-xs leading-5', post.status === 'rejected' ? 'border-danger/30 bg-danger/[0.06] text-danger' : 'border-warn/25 bg-warn/[0.05] text-warn')}>
            {post.status === 'pending' ? '这条情报正在审核队列中，通过后才会进入公共信息流。' : post.status === 'rejected' ? '审核未通过，编辑后可以再次提交。' : '该情报已下架，目前仅自己可见。'}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_370px]">
          <div className="min-w-0 space-y-5">
            <article className="page-enter overflow-hidden border border-line bg-surface/72">
              <div className="relative min-h-[280px] overflow-hidden bg-surface2 sm:min-h-[360px]">
                {heroImage ? (
                  <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="hud-grid absolute inset-0 bg-[radial-gradient(circle_at_72%_35%,rgb(var(--primary-rgb)/0.12),transparent_18rem)]">
                    <span className="editorial-number number-outline absolute -right-2 bottom-0 text-[10rem] opacity-45 sm:text-[14rem]">{post.id.slice(-2).toUpperCase()}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[rgb(5_8_11)] via-[rgb(5_8_11)]/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 sm:p-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-primary px-2 py-1 font-data text-[9px] font-semibold tracking-[0.16em] text-onPrimary">{post.topic || 'GENERAL'}</span>
                      {post.featured && <span className="border border-gold/45 bg-bg/65 px-2 py-1 font-data text-[9px] tracking-[0.14em] text-gold">FEATURED</span>}
                      {post.knowledge && <span className="border border-info/45 bg-bg/65 px-2 py-1 font-data text-[9px] tracking-[0.14em] text-info">KNOWLEDGE</span>}
                    </div>
                    <p className="mt-3 font-data text-[9px] tracking-[0.18em] text-white/55">{recordCode} / {shortDate(post.publishedAt || post.createdAt)}</p>
                  </div>
                  <span className={cn('shrink-0 bg-bg/75 px-2.5 py-1.5 font-data text-[9px] tracking-[0.14em] backdrop-blur', statusTone)}>{statusText}</span>
                </div>
              </div>

              <div className="p-4 sm:p-6 lg:p-8">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => onUser(post.authorId)} className="shrink-0"><Avatar name={post.authorName} src={post.authorAvatar} size={46} /></button>
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => onUser(post.authorId)} className="block max-w-full truncate text-left text-sm font-semibold text-ink hover:text-primary">{post.authorName}</button>
                    <p className="mt-0.5 font-data text-[9px] tracking-[0.12em] text-ink-faint">LV.{post.authorLevel} / OPERATOR {post.authorId.slice(0, 6).toUpperCase()}</p>
                  </div>
                  {me?.customerId !== post.authorId && (
                    <button type="button" onClick={() => void follow()} disabled={busy} className={cn('press-command min-h-touch shrink-0 border px-3 text-xs transition-command', post.followingAuthor ? 'border-line text-ink-dim' : 'border-primary/45 bg-primary/10 text-primary')}>
                      {post.followingAuthor ? '已关注' : '关注'}
                    </button>
                  )}
                </div>

                <h1 className="mt-6 max-w-[18ch] text-[clamp(1.85rem,5.5vw,3.35rem)] font-semibold leading-[1.06] tracking-[-0.045em] text-ink">{post.title}</h1>

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line py-3 font-data text-[10px] tracking-[0.1em] text-ink-faint">
                  <span>{timeLabel(post.createdAt)}</span>
                  <span>{readingMinutes} MIN READ</span>
                  <span>{post.viewCount} VIEWS</span>
                  <span className="text-gold">{post.orderCount} ORDERS</span>
                </div>

                <div className="mt-6 whitespace-pre-wrap text-[15px] leading-8 text-ink-dim">{post.content}</div>

                {gallery.length > 0 && (
                  <div className={cn('stagger-list mt-7 grid gap-2', gallery.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
                    {gallery.map((image, index) => (
                      <div key={image} className="image-frame media-zoom group relative border border-line bg-surface2">
                        <img src={image} alt="" className={cn('w-full object-cover', gallery.length === 1 ? 'max-h-[520px]' : 'aspect-[4/3]')} loading="lazy" />
                        <span className="absolute bottom-2 left-2 z-10 bg-black/60 px-1.5 py-0.5 font-data text-[8px] text-white/85">FRAME {String(index + 2).padStart(2, '0')}</span>
                      </div>
                    ))}
                  </div>
                )}

                {post.tags.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
                    {post.tags.map((tag) => <Tag key={tag}>#{tag}</Tag>)}
                  </div>
                )}
              </div>
            </article>

            {post.serviceId && post.serviceName && (
              <section className="command-panel relative overflow-hidden border-gold/30 lg:hidden">
                <span className="absolute inset-y-0 left-0 w-0.5 bg-gold" />
                <div className="flex items-center gap-3 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-gold/35 bg-gold/[0.07] text-gold"><IconPackage size={20} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-data text-[9px] tracking-[0.14em] text-gold">CONNECTED SERVICE</p>
                    <p className="mt-1 truncate text-sm font-semibold text-ink">{post.serviceName}</p>
                    <p className="mt-0.5 text-[11px] text-ink-faint">{post.orderCount > 0 ? `已验证 ${post.orderCount} 笔成交` : '从这条情报直接进入标准下单流程'}</p>
                  </div>
                  <button type="button" onClick={() => onOrder(post.serviceId, post.id)} className="press-command min-h-touch shrink-0 bg-gold px-4 text-sm font-semibold text-bg">下单</button>
                </div>
              </section>
            )}

            {evidence.length > 0 && (
              <section className="space-y-3 lg:hidden">
                <div className="flex items-end justify-between"><h2 className="text-base font-semibold text-ink">成交凭证</h2><span className="font-data text-[10px] tracking-[0.14em] text-gold">{evidence.length} VERIFIED</span></div>
                <div className="grid gap-3 sm:grid-cols-2">{evidence.map((item) => <EvidenceCard key={item.orderId} evidence={item} />)}</div>
              </section>
            )}

            <HudPanel id="post-comments" title="评论区" meta={`${post.commentCount} RESPONSES / SIGNAL THREAD`}>
              <div className="divide-y divide-line">
                {comments.length === 0 ? (
                  <div className="px-4 py-12 text-center"><p className="text-sm text-ink">这条情报还没有回复。</p><p className="mt-1 text-xs text-ink-faint">补充路线、战绩或不同判断，帮助后来者。</p></div>
                ) : comments.map((item, index) => (
                  <div key={item.id} className="relative flex gap-3 px-4 py-4">
                    <span className="absolute left-[31px] top-12 h-[calc(100%-3rem)] w-px bg-line/65 last:hidden" />
                    <button type="button" onClick={() => onUser(item.authorId)} className="relative z-10 shrink-0"><Avatar name={item.authorName} src={item.authorAvatar} size={34} /></button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <button type="button" onClick={() => onUser(item.authorId)} className="truncate text-xs font-semibold text-ink hover:text-primary">{item.authorName}</button>
                        <span className="shrink-0 font-data text-[9px] text-ink-faint">#{String(index + 1).padStart(2, '0')} / {timeLabel(item.createdAt)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-dim">{item.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-line bg-bg/25 p-3">
                <div className="flex items-end gap-2 border border-line bg-surface2/75 p-2 transition-colors focus-within:border-primary/45">
                  <span className="mb-2 hidden font-data text-[9px] tracking-[0.12em] text-ink-faint sm:block">REPLY</span>
                  <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={2} maxLength={500} placeholder="写下你的判断、补充或实战结果…" className="min-h-touch min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-sm text-ink outline-none placeholder:text-ink-faint" />
                  <Btn size="sm" disabled={busy || !comment.trim()} onClick={() => void submitComment()} aria-label="发送评论"><IconSend size={16} /></Btn>
                </div>
              </div>
            </HudPanel>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-[76px] lg:self-start">
            <div className="command-panel trace-scan">
              <div className="border-b border-line px-4 py-3">
                <p className="font-data text-[9px] tracking-[0.18em] text-ink-faint">OPERATOR DOSSIER</p>
              </div>
              <button type="button" onClick={() => onUser(post.authorId)} className="group flex w-full items-center gap-3 p-4 text-left">
                <Avatar name={post.authorName} src={post.authorAvatar} size={52} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink group-hover:text-primary">{post.authorName}</span>
                  <span className="mt-1 block font-data text-[9px] tracking-[0.12em] text-gold">LEVEL {post.authorLevel} / VOID OPERATOR</span>
                </span>
              </button>
              <div className="grid grid-cols-3 border-t border-line">
                {[
                  { label: '浏览', value: post.viewCount },
                  { label: '点赞', value: post.likeCount },
                  { label: '收藏', value: post.favoriteCount },
                ].map((item) => (
                  <div key={item.label} className="border-r border-line px-3 py-3 text-center last:border-r-0">
                    <p className="font-data text-lg font-semibold text-ink">{item.value}</p>
                    <p className="mt-0.5 text-[10px] text-ink-faint">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {post.serviceId && post.serviceName && (
              <div className="command-panel overflow-hidden border-gold/30">
                <div className="flex items-center justify-between border-b border-gold/20 bg-gold/[0.055] px-4 py-3">
                  <div className="flex items-center gap-2 text-gold"><IconPackage size={16} /><span className="font-data text-[9px] tracking-[0.16em]">DEPLOYMENT LINK</span></div>
                  <span className="font-data text-[9px] text-gold/70">{post.orderCount} ORDERS</span>
                </div>
                <div className="p-4">
                  <p className="text-base font-semibold text-ink">{post.serviceName}</p>
                  <p className="mt-1.5 text-xs leading-5 text-ink-faint">关联服务已接入标准订单状态机，付款、接单、完工和凭证回写均沿用交易系统。</p>
                  <button type="button" onClick={() => onOrder(post.serviceId, post.id)} className="press-command mt-4 flex min-h-touch w-full items-center justify-center gap-2 bg-gold text-sm font-semibold text-bg">
                    <IconPackage size={17} /> 从这条情报下单
                  </button>
                </div>
              </div>
            )}

            {evidence.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-end justify-between px-1"><h2 className="text-sm font-semibold text-ink">成交记录</h2><span className="font-data text-[9px] tracking-[0.14em] text-gold">VERIFIED</span></div>
                {evidence.map((item) => <EvidenceCard key={item.orderId} evidence={item} />)}
              </div>
            )}

            <div className="border border-line bg-surface/45 p-4">
              <p className="font-data text-[9px] tracking-[0.18em] text-ink-faint">SIGNAL INDEX</p>
              <dl className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-3"><dt className="text-ink-faint">情报编号</dt><dd className="font-data text-ink-dim">{recordCode}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-ink-faint">发布时间</dt><dd className="font-data text-ink-dim">{shortDate(post.publishedAt || post.createdAt)}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-ink-faint">成交金额</dt><dd className="font-data text-gold"><Money value={evidence.reduce((sum, item) => sum + item.amount, 0)} /></dd></div>
              </dl>
            </div>
          </aside>
        </div>
      </main>

      <ActionDock>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <button type="button" disabled={busy} onClick={() => void toggle('like')} className={cn('press-command flex min-h-touch min-w-16 items-center justify-center gap-1.5 px-2 text-xs', post.liked ? 'text-danger' : 'text-ink-dim hover:bg-surface2')}><IconHeart size={18} /> <span className="font-data">{post.likeCount}</span></button>
          <button type="button" disabled={busy} onClick={() => void toggle('favorite')} className={cn('press-command flex min-h-touch min-w-16 items-center justify-center gap-1.5 px-2 text-xs', post.favorited ? 'text-gold' : 'text-ink-dim hover:bg-surface2')}><IconBookmark size={18} /> <span className="font-data">{post.favoriteCount}</span></button>
          <button type="button" onClick={() => document.getElementById('post-comments')?.scrollIntoView({ behavior: 'smooth' })} className="press-command flex min-h-touch min-w-16 items-center justify-center gap-1.5 px-2 text-xs text-ink-dim hover:bg-surface2"><IconChat size={18} /> <span className="font-data">{post.commentCount}</span></button>
        </div>
        {post.serviceId && <Btn onClick={() => onOrder(post.serviceId, post.id)}>从帖子下单</Btn>}
      </ActionDock>
    </div>
  )
}