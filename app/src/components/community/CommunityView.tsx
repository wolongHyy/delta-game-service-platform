"use client"

import { useCallback, useEffect, useState } from 'react'
import type { CommunityChannel, CommunityFeed, CommunityPost } from '@/lib/types'
import { api } from '@/lib/client'
import { EmptyState, HudPanel, IconBell, IconCommunity, IconPlus, Skeleton, cn } from '@/components/ui'
import PostCard from './PostCard'

const CHANNELS: { key: CommunityChannel; label: string; hint: string; code: string }[] = [
  { key: 'recommend', label: '推荐', hint: '情报推荐', code: 'SIGNAL' },
  { key: 'follow', label: '关注', hint: '关注动态', code: 'WATCH' },
  { key: 'knowledge', label: '知识', hint: '战术知识', code: 'INTEL' },
  { key: 'latest', label: '最新', hint: '实时发布', code: 'LIVE' },
]

function StatCell({ code, label, value, tone = 'default' }: { code: string; label: string; value: number; tone?: 'default' | 'ok' | 'gold' | 'info' }) {
  const color = tone === 'ok' ? 'text-ok' : tone === 'gold' ? 'text-gold' : tone === 'info' ? 'text-info' : 'text-ink'
  return (
    <div className="relative border border-line/80 bg-bg/45 p-3.5">
      <span className="absolute right-2.5 top-2.5 font-data text-[8px] tracking-[0.12em] text-ink-faint">{code}</span>
      <p className="text-[10px] text-ink-faint">{label}</p>
      <p className={cn('mt-2 font-data text-2xl font-semibold leading-none tabular', color)}>{String(value).padStart(2, '0')}</p>
    </div>
  )
}

export default function CommunityView({
  initialChannel = 'recommend',
  onOpenPost,
  onCompose,
  onUser,
  onNotifications,
  onKnowledge,
  onOrder,
  onNotice,
}: {
  initialChannel?: CommunityChannel
  onOpenPost: (id: string) => void
  onCompose: () => void
  onUser: (id: string) => void
  onNotifications: () => void
  onKnowledge: () => void
  onOrder: (serviceId: string, postId: string) => void
  onNotice: (message: string) => void
}) {
  const [channel, setChannel] = useState<CommunityChannel>(initialChannel)
  const [topic, setTopic] = useState('')
  const [keyword, setKeyword] = useState('')
  const [feed, setFeed] = useState<CommunityFeed | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ channel, page: '1', pageSize: '20' })
      if (topic) params.set('topic', topic)
      if (keyword.trim()) params.set('keyword', keyword.trim())
      setFeed(await api<CommunityFeed>(`/api/community/posts?${params.toString()}`))
    } catch (reason: any) {
      setError(reason.message || '社区加载失败')
    } finally {
      setLoading(false)
    }
  }, [channel, keyword, topic])

  useEffect(() => {
    void load()
  }, [load])

  const stats = feed?.stats || { posts: 0, comments: 0, completedOrders: 0, contributors: 0 }
  const activeChannel = CHANNELS.find((item) => item.key === channel) || CHANNELS[0]

  return (
    <div className="void-shell min-h-screen pb-24">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/88 backdrop-blur-2xl">
        <div className="mx-auto max-w-[1180px] px-4 pb-0 pt-4 lg:px-8 lg:pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="signal-dot signal-dot--danger" />
                <p className="font-data text-[9px] tracking-[0.2em] text-danger">VOID NETWORK / 04</p>
              </div>
              <h1 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-ink">社区情报站</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onNotifications}
                className="press-command relative flex h-11 w-11 items-center justify-center border border-line bg-surface/70 text-ink-dim hover:border-primary/45 hover:text-primary"
                aria-label="社区通知"
              >
                <IconBell size={18} />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-danger" />
              </button>
              <button
                type="button"
                onClick={onCompose}
                className="press-command flex h-11 items-center gap-2 border border-primary bg-primary px-3.5 text-sm font-semibold text-onPrimary shadow-glow hover:bg-primary-bright"
              >
                <IconPlus size={17} /> 发帖
              </button>
            </div>
          </div>

          <div className="no-scrollbar mt-4 flex overflow-x-auto">
            {CHANNELS.map((item) => {
              const on = channel === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setChannel(item.key)
                    setTopic('')
                  }}
                  className={cn(
                    'press-command relative min-h-touch shrink-0 px-4 text-left text-sm transition-command',
                    on ? 'text-primary' : 'text-ink-faint hover:text-ink',
                  )}
                >
                  <span className="block font-medium">{item.label}</span>
                  <span className="mt-0.5 block font-data text-[8px] tracking-[0.16em] opacity-60">{item.code}</span>
                  {on && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-primary shadow-[0_0_12px_rgb(var(--primary-rgb)/0.8)]" />}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pt-4 lg:px-8 lg:pt-7">
        <section className="community-hero panel-corner reveal-up relative overflow-hidden border border-line">
          <div className="hud-grid pointer-events-none absolute inset-0 opacity-55" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-primary/10" />
          <div className="relative grid gap-7 p-5 lg:grid-cols-[1.18fr_.82fr] lg:items-end lg:gap-10 lg:p-8">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="h-px w-8 bg-primary" />
                <span className="font-data text-[9px] tracking-[0.28em] text-primary">TACTICAL KNOWLEDGE NETWORK</span>
              </div>
              <h2 className="mt-5 max-w-3xl font-display text-[clamp(2.55rem,10vw,5.7rem)] font-bold leading-[0.88] tracking-[-0.07em] text-ink">
                把每一局
                <span className="block text-primary">变成情报。</span>
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-6 text-ink-dim">
                真实战绩、路线拆解、装备思路与陪玩成交凭证都在同一条情报链上。看到合适的战术，直达对应服务。
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button type="button" onClick={onCompose} className="press-command flex min-h-touch items-center gap-2 border border-primary bg-primary px-4 font-data text-xs font-semibold tracking-[0.08em] text-onPrimary shadow-glow">
                  <IconPlus size={15} /> 发布情报
                </button>
                <button type="button" onClick={onKnowledge} className="press-command flex min-h-touch items-center gap-2 border border-line px-4 font-data text-xs text-ink-dim hover:border-primary/45 hover:text-primary">
                  打开知识库 <IconCommunity size={15} />
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-data text-[9px] tracking-[0.2em] text-ink-faint">NETWORK TELEMETRY</span>
                <span className="flex items-center gap-2 font-data text-[9px] text-ok"><span className="signal-dot" /> LIVE</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatCell code="P.01" label="已发布情报" value={stats.posts} tone="ok" />
                <StatCell code="C.02" label="讨论总数" value={stats.comments} tone="info" />
                <StatCell code="O.03" label="成交凭证" value={stats.completedOrders} tone="gold" />
                <StatCell code="U.04" label="活跃贡献者" value={stats.contributors} />
              </div>
            </div>
          </div>
        </section>

        <div className="signal-strip mt-4 flex items-center gap-3 px-3 py-2.5">
          <span className="relative z-10 shrink-0 bg-danger px-2 py-1 font-data text-[9px] font-semibold tracking-[0.16em] text-white">LIVE FEED</span>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="ticker-track whitespace-nowrap font-data text-[10px] tracking-[0.17em] text-ink-faint">
              {activeChannel.hint.toUpperCase()} // 新情报持续接入 // 已核验成交自动回写 // 社区内容经审核后公开 // SIGNAL LOCKED
            </div>
          </div>
          <span className="relative z-10 hidden font-data text-[9px] text-ink-faint sm:block">{activeChannel.code}</span>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="min-w-0">
            <div className="border border-line bg-surface/72">
              <div className="flex items-center gap-3 px-3.5 py-3">
                <span className="font-data text-[9px] tracking-[0.18em] text-primary">SEARCH INDEX</span>
                <span className="h-px flex-1 bg-line" />
                <span className="font-data text-[9px] text-ink-faint">{feed?.posts.length || 0} RECORDS</span>
              </div>
              <div className="flex items-center gap-2 border-t border-line px-3">
                <span className="font-data text-xs text-ink-faint">/</span>
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void load()
                  }}
                  placeholder="搜索帖子、战术、关键词"
                  className="min-h-touch min-w-0 flex-1 bg-transparent px-1 text-sm text-ink outline-none placeholder:text-ink-faint"
                />
                <button
                  type="button"
                  onClick={() => void load()}
                  className="min-h-touch border-l border-line px-3 font-data text-[10px] tracking-[0.12em] text-primary hover:bg-primary/10"
                >
                  SEARCH
                </button>
              </div>
              {feed && feed.topics.length > 0 && (
                <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-t border-line px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => setTopic('')}
                    className={cn('shrink-0 border px-2.5 py-1.5 font-data text-[10px]', topic ? 'border-line text-ink-faint hover:text-ink' : 'border-primary/45 bg-primary/10 text-primary')}
                  >
                    ALL
                  </button>
                  {feed.topics.slice(0, 10).map((item) => (
                    <button
                      key={item.topic}
                      type="button"
                      onClick={() => setTopic(item.topic)}
                      className={cn('shrink-0 border px-2.5 py-1.5 font-data text-[10px]', topic === item.topic ? 'border-primary/45 bg-primary/10 text-primary' : 'border-line text-ink-faint hover:text-ink')}
                    >
                      #{item.topic} <span className="opacity-50">{item.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="border border-line bg-surface p-4">
                      <div className="flex items-center gap-3"><Skeleton className="h-11 w-11" /><div className="flex-1"><Skeleton className="h-4 w-28" /><Skeleton className="mt-2 h-3 w-40" /></div></div>
                      <Skeleton className="mt-5 h-6 w-4/5" />
                      <Skeleton className="mt-3 h-3 w-full" />
                      <Skeleton className="mt-2 h-3 w-3/5" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <HudPanel>
                  <EmptyState title="情报链路中断" text={error} action={<button type="button" onClick={() => void load()} className="min-h-touch border border-primary bg-primary px-4 text-sm text-onPrimary">重新加载</button>} />
                </HudPanel>
              ) : feed?.posts.length ? (
                <div className="stagger-list space-y-3">
                  {(feed.posts as CommunityPost[]).map((post, index) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onOpen={onOpenPost}
                      onUser={onUser}
                      onOrder={onOrder}
                      onNotice={onNotice}
                      compact={channel === 'knowledge'}
                      featured={channel === 'recommend' && index === 0}
                    />
                  ))}
                </div>
              ) : (
                <HudPanel>
                  <EmptyState
                    title={channel === 'follow' ? '还没有关注动态' : '暂无社区内容'}
                    text={channel === 'follow' ? '关注活跃指挥官后，他们的更新会出现在这里。' : '发布第一条战术情报，成为社区首位贡献者。'}
                    action={<button type="button" onClick={onCompose} className="min-h-touch border border-primary bg-primary px-4 text-sm text-onPrimary">发布帖子</button>}
                  />
                </HudPanel>
              )}
            </div>
          </div>

          <aside className="hidden space-y-4 lg:block">
            <HudPanel title="信号索引" meta="CHANNEL MATRIX">
              <div className="divide-y divide-line">
                {CHANNELS.map((item, index) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setChannel(item.key)
                      setTopic('')
                    }}
                    className={cn('press-command flex min-h-touch w-full items-center gap-3 px-4 py-3 text-left transition-command', channel === item.key ? 'bg-primary/[0.07]' : 'hover:bg-primary/[0.035]')}
                  >
                    <span className={cn('font-data text-[9px]', channel === item.key ? 'text-primary' : 'text-ink-faint')}>{String(index + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-sm font-medium', channel === item.key ? 'text-primary' : 'text-ink')}>{item.label}</span>
                      <span className="mt-0.5 block font-data text-[8px] tracking-[0.14em] text-ink-faint">{item.code} / {item.hint}</span>
                    </span>
                    <span className={cn('h-1.5 w-1.5 rounded-full', channel === item.key ? 'bg-primary shadow-[0_0_10px_rgb(var(--primary-rgb))]' : 'bg-lineStrong')} />
                  </button>
                ))}
              </div>
            </HudPanel>

            <HudPanel title="知识库入口" meta="FIELD MANUAL">
              <button type="button" onClick={onKnowledge} className="press-command group block w-full p-4 text-left hover:bg-primary/[0.04]">
                <span className="flex h-10 w-10 items-center justify-center border border-info/35 bg-info/10 text-info"><IconCommunity size={19} /></span>
                <span className="mt-3 block text-sm font-semibold text-ink group-hover:text-primary">完整战术知识库</span>
                <span className="mt-1 block text-xs leading-5 text-ink-faint">按主题检索路线、装备、任务与复杂对局处理方法。</span>
                <span className="mt-4 block font-data text-[9px] tracking-[0.16em] text-info">ENTER MANUAL -&gt;</span>
              </button>
            </HudPanel>

            <div className="border border-line bg-surface/55 p-4">
              <p className="font-data text-[9px] tracking-[0.18em] text-ink-faint">NETWORK HEALTH</p>
              <p className="mt-3 flex items-center gap-2 text-xs text-ok"><span className="signal-dot" /> 内容审核链路正常</p>
              <p className="mt-2 text-[11px] leading-5 text-ink-faint">成交凭证仅展示服务信息与金额，不公开手机号、订单联系方式等隐私数据。</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}