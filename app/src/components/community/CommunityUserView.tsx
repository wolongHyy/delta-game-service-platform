"use client"

import { useCallback, useEffect, useState } from 'react'
import type { CommunityProfile, CommunityProfileView } from '@/lib/types'
import { api } from '@/lib/client'
import { Avatar, EmptyState, HudPanel, IconBack, IconUserPlus, Skeleton, cn } from '@/components/ui'
import PostCard from './PostCard'

function Metric({ label, value, code, tone = 'default' }: { label: string; value: number; code: string; tone?: 'default' | 'primary' | 'gold' | 'ok' }) {
  return (
    <div className="relative border border-line bg-bg/45 p-3.5">
      <span className="absolute right-2.5 top-2.5 font-data text-[8px] tracking-[0.12em] text-ink-faint">{code}</span>
      <p className="font-data text-2xl font-semibold leading-none tabular text-ink">{value}</p>
      <p className="mt-2 text-[10px] text-ink-faint">{label}</p>
      <span className={cn('mt-2 block h-px w-8', tone === 'primary' ? 'bg-primary' : tone === 'gold' ? 'bg-gold' : tone === 'ok' ? 'bg-ok' : 'bg-line')} />
    </div>
  )
}

export default function CommunityUserView({
  userId,
  onBack,
  onOpenPost,
  onOrder,
  onNotice,
}: {
  userId: string
  onBack: () => void
  onOpenPost: (id: string) => void
  onOrder: (serviceId: string, postId: string) => void
  onNotice: (message: string) => void
}) {
  const [view, setView] = useState<CommunityProfileView | null>(null)
  const [me, setMe] = useState<CommunityProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [profileView, current] = await Promise.all([
        api<CommunityProfileView>(`/api/community/users/${userId}`),
        api<CommunityProfile>('/api/community/me').catch(() => null),
      ])
      setView(profileView)
      setMe(current)
    } catch (reason: any) {
      setError(reason.message || '用户资料加载失败')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  async function follow() {
    if (!view || busy) return
    setBusy(true)
    try {
      const result = await api<{ following: boolean; followerCount: number }>(`/api/community/users/${userId}/follow`, { method: 'POST' })
      setView((current) => current && {
        ...current,
        isFollowing: result.following,
        profile: { ...current.profile, followerCount: result.followerCount },
      })
    } catch (reason: any) {
      onNotice(reason.message || '关注失败')
    } finally {
      setBusy(false)
    }
  }

  const isSelf = Boolean(me && view && me.customerId === view.profile.customerId)

  return (
    <div className="void-shell min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/90 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-14 max-w-[1180px] items-center gap-2 px-4 lg:px-8">
          <button type="button" onClick={onBack} className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-dim hover:bg-surface hover:text-ink" aria-label="返回"><IconBack size={20} /></button>
          <div className="min-w-0"><h1 className="truncate text-sm font-semibold text-ink">指挥官档案</h1><p className="truncate font-data text-[9px] tracking-[0.16em] text-ink-faint">PUBLIC OPERATOR DOSSIER</p></div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 py-4 lg:px-8 lg:py-7">
        {loading ? (
          <div className="grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]"><div className="space-y-3"><Skeleton className="h-80 w-full" /><Skeleton className="h-40 w-full" /></div><div className="space-y-3"><Skeleton className="h-28 w-full" /><Skeleton className="h-64 w-full" /></div></div>
        ) : error || !view ? (
          <HudPanel><EmptyState title="无法读取档案" text={error || '该用户不存在'} action={<button type="button" onClick={() => void load()} className="min-h-touch border border-primary bg-primary px-4 text-sm text-onPrimary">重新加载</button>} /></HudPanel>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="space-y-4 lg:sticky lg:top-[76px] lg:self-start">
              <section className="command-panel trace-scan page-enter overflow-hidden">
                <div className="hud-grid absolute inset-0 opacity-35" />
                <div className="relative p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-data text-[9px] tracking-[0.18em] text-ink-faint">OPERATOR / {view.profile.customerId.slice(0, 8).toUpperCase()}</p>
                    <span className="flex items-center gap-1.5 font-data text-[9px] tracking-[0.12em] text-ok"><span className="h-1.5 w-1.5 rounded-full bg-ok" /> ACTIVE</span>
                  </div>
                  <div className="mt-5 flex items-center gap-4">
                    <Avatar name={view.profile.nickname} src={view.profile.avatarUrl} size={72} />
                    <div className="min-w-0">
                      <p className="font-data text-[9px] tracking-[0.16em] text-gold">VOID COMMANDER</p>
                      <h2 className="mt-1 truncate text-xl font-semibold tracking-[-0.03em] text-ink">{view.profile.nickname}</h2>
                      <p className="mt-1 font-data text-[10px] text-ink-faint">LEVEL {String(view.profile.level).padStart(2, '0')} / SINCE {view.profile.createdAt?.slice(0, 10) || '—'}</p>
                    </div>
                  </div>
                  <p className="mt-5 min-h-12 text-sm leading-6 text-ink-dim">{view.profile.bio || '这位指挥官暂未留下公开简介。'}</p>
                  {!isSelf && (
                    <button type="button" disabled={busy} onClick={() => void follow()} className={cn('press-command mt-5 flex min-h-touch w-full items-center justify-center gap-2 border text-sm font-semibold transition-command', view.isFollowing ? 'border-line bg-surface2 text-ink-dim' : 'border-primary bg-primary text-onPrimary hover:bg-primary-bright')}>
                      <IconUserPlus size={17} /> {view.isFollowing ? '已关注，点击取消' : '关注这位指挥官'}
                    </button>
                  )}
                </div>
              </section>

              <section className="grid grid-cols-2 gap-2">
                <Metric label="社区贡献值" value={view.profile.contributionScore} code="SCORE" tone="gold" />
                <Metric label="公开情报" value={view.profile.postCount} code="POSTS" tone="primary" />
                <Metric label="关注者" value={view.profile.followerCount} code="FANS" tone="ok" />
                <Metric label="正在关注" value={view.profile.followingCount} code="LINKS" />
              </section>

              <div className="border border-line bg-surface/45 p-4">
                <p className="font-data text-[9px] tracking-[0.18em] text-ink-faint">DOSSIER NOTES</p>
                <p className="mt-3 text-xs leading-6 text-ink-dim">公开档案仅展示社区贡献和已通过审核的情报，不包含订单联系方式、手机号或微信 OpenID。</p>
              </div>
            </aside>

            <section className="min-w-0">
              <div className="mb-4 flex items-end justify-between gap-4 border-b border-line pb-3">
                <div><h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">公开情报</h2><p className="mt-1 text-xs text-ink-faint">按发布时间排列的已审核内容</p></div>
                <span className="font-data text-[10px] tracking-[0.14em] text-ink-faint">{String(view.total).padStart(2, '0')} REPORTS</span>
              </div>
              {view.posts.length === 0 ? (
                <HudPanel><EmptyState title="暂无公开帖子" text="该指挥官暂未发布已通过的社区情报。" /></HudPanel>
              ) : (
                <div className="stagger-list space-y-3">{view.posts.map((post) => <PostCard key={post.id} post={post} onOpen={onOpenPost} onUser={() => undefined} onOrder={onOrder} onNotice={onNotice} />)}</div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}