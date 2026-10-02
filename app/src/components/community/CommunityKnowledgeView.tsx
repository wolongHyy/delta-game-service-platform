"use client"

import { useCallback, useEffect, useState } from 'react'
import type { CommunityFeed } from '@/lib/types'
import { api } from '@/lib/client'
import { CommandInput, EmptyState, HudPanel, IconBack, IconBook, Skeleton, cn } from '@/components/ui'
import PostCard from './PostCard'

function Stat({ label, value, code, tone = 'default' }: { label: string; value: number; code: string; tone?: 'default' | 'ok' | 'info' | 'gold' }) {
  const color = tone === 'ok' ? 'text-ok' : tone === 'info' ? 'text-info' : tone === 'gold' ? 'text-gold' : 'text-ink'
  return (
    <div className="relative border border-line bg-bg/40 p-3.5">
      <span className="absolute right-2.5 top-2.5 font-data text-[8px] tracking-[0.12em] text-ink-faint">{code}</span>
      <p className={cn('font-data text-2xl font-semibold leading-none tabular', color)}>{value}</p>
      <p className="mt-2 text-[10px] text-ink-faint">{label}</p>
    </div>
  )
}

export default function CommunityKnowledgeView({
  onBack,
  onOpenPost,
  onUser,
  onOrder,
  onNotice,
}: {
  onBack: () => void
  onOpenPost: (id: string) => void
  onUser: (id: string) => void
  onOrder: (serviceId: string, postId: string) => void
  onNotice: (message: string) => void
}) {
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState('')
  const [feed, setFeed] = useState<CommunityFeed | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ pageSize: '30' })
      if (search.trim()) params.set('keyword', search.trim())
      setFeed(await api<CommunityFeed>(`/api/community/knowledge?${params.toString()}`))
    } catch (reason: any) {
      setError(reason.message || '知识库加载失败')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    void load()
  }, [load])

  const posts = feed?.posts.filter((post) => !topic || post.topic === topic) || []
  const stats = feed?.stats || { posts: 0, comments: 0, completedOrders: 0, contributors: 0 }

  return (
    <div className="void-shell min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/90 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-14 max-w-[1180px] items-center gap-2 px-4 lg:px-8">
          <button type="button" onClick={onBack} className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-dim hover:bg-surface hover:text-ink" aria-label="返回"><IconBack size={20} /></button>
          <div className="min-w-0"><h1 className="truncate text-sm font-semibold text-ink">战术知识库</h1><p className="truncate font-data text-[9px] tracking-[0.16em] text-ink-faint">VOID FIELD MANUAL / ARCHIVE ONLINE</p></div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 py-4 lg:px-8 lg:py-7">
        <section className="command-panel page-enter overflow-hidden">
          <div className="hud-grid absolute inset-0 opacity-35" />
          <div className="relative grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:p-7">
            <div>
              <div className="flex items-center gap-2 text-info"><IconBook size={17} /><span className="font-data text-[9px] tracking-[0.18em]">ARCHIVE / VERIFIED FIELD NOTES</span></div>
              <h2 className="mt-4 max-w-[16ch] text-[clamp(1.8rem,5vw,3rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-ink">把零散经验，沉淀成可复用战术。</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-ink-dim">这里收录管理员确认过的路线、干员、装备和对局处理方法。可以按关键词检索，也可以从关联服务直接进入下单流程。</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
              <Stat label="知识条目" value={stats.posts} code="INDEX" tone="info" />
              <Stat label="贡献者" value={stats.contributors} code="AUTHORS" tone="ok" />
              <Stat label="讨论回复" value={stats.comments} code="REPLIES" />
              <Stat label="关联成交" value={stats.completedOrders} code="ORDERS" tone="gold" />
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-[76px] lg:self-start">
            <div className="command-panel p-4">
              <p className="font-data text-[9px] tracking-[0.18em] text-ink-faint">SEARCH ARCHIVE</p>
              <div className="mt-3"><CommandInput value={keyword} onChange={setKeyword} onSearch={() => setSearch(keyword)} placeholder="干员、地图、路线或装备" /></div>
              {search && <button type="button" onClick={() => { setSearch(''); setKeyword('') }} className="mt-2 min-h-touch text-xs text-ink-faint hover:text-ink">清除搜索「{search}」</button>}
            </div>

            {feed && feed.topics.length > 0 && (
              <div className="command-panel overflow-hidden">
                <div className="border-b border-line px-4 py-3"><p className="text-sm font-semibold text-ink">索引频道</p><p className="mt-0.5 font-data text-[9px] tracking-[0.16em] text-ink-faint">TOPIC MATRIX</p></div>
                <div className="divide-y divide-line">
                  <button type="button" onClick={() => setTopic('')} className={cn('press-command flex min-h-touch w-full items-center justify-between gap-3 px-4 py-3 text-left text-xs transition-command', !topic ? 'bg-info/[0.06] text-info' : 'text-ink-dim hover:bg-surface2 hover:text-ink')}><span>全部条目</span><span className="font-data text-[9px]">{String(feed.posts.length).padStart(2, '0')}</span></button>
                  {feed.topics.slice(0, 14).map((item) => (
                    <button key={item.topic} type="button" onClick={() => setTopic(item.topic)} className={cn('press-command flex min-h-touch w-full items-center justify-between gap-3 px-4 py-3 text-left text-xs transition-command', topic === item.topic ? 'bg-info/[0.06] text-info' : 'text-ink-dim hover:bg-surface2 hover:text-ink')}><span className="truncate">{item.topic}</span><span className="font-data text-[9px]">{String(item.count).padStart(2, '0')}</span></button>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-line bg-surface/45 p-4">
              <p className="font-data text-[9px] tracking-[0.18em] text-ink-faint">ARCHIVE POLICY</p>
              <p className="mt-3 text-xs leading-6 text-ink-dim">只有管理员确认具备参考价值的内容会进入知识库。成交凭证仅展示服务、金额与完成时间，不公开用户隐私。</p>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
              <div><h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">{topic || '全部知识条目'}</h2><p className="mt-1 text-xs text-ink-faint">{search ? `关键词「${search}」的匹配结果` : '按收录时间与成交表现综合排序'}</p></div>
              <span className="font-data text-[10px] tracking-[0.14em] text-ink-faint">{String(posts.length).padStart(2, '0')} ENTRIES</span>
            </div>

            {loading ? (
              <div className="space-y-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-48 w-full" />)}</div>
            ) : error ? (
              <HudPanel><EmptyState title="知识库离线" text={error} action={<button type="button" onClick={() => void load()} className="min-h-touch border border-primary bg-primary px-4 text-sm text-onPrimary">重新加载</button>} /></HudPanel>
            ) : posts.length === 0 ? (
              <HudPanel><EmptyState icon={<IconBook size={22} />} title="没有匹配的知识条目" text="换一个关键词，或浏览社区中的最新优质帖子。" /></HudPanel>
            ) : (
              <div className="stagger-list space-y-3">
                {posts.map((post) => <PostCard key={post.id} post={post} onOpen={onOpenPost} onUser={onUser} onOrder={onOrder} onNotice={onNotice} compact />)}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}