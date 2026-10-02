'use client'

import { useEffect, useState } from 'react'
import type { Companion, ServiceType } from '@/lib/types'
import { apiCached } from '@/lib/client'
import { EmptyState, HudPanel, IconArrowUpRight, IconSearch, Skeleton, cn } from '@/components/ui'
import CompanionCard from './CompanionCard'

export default function CategoryView({
  initialServiceTypeId,
  onOpenCompanion,
}: {
  initialServiceTypeId?: string
  onOpenCompanion: (id: string) => void
}) {
  const [types, setTypes] = useState<ServiceType[]>([])
  const [activeId, setActiveId] = useState(initialServiceTypeId || '')
  const [list, setList] = useState<Companion[]>([])
  const [keyword, setKeyword] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    apiCached<ServiceType[]>('/api/service-types', 60_000)
      .then((t) => {
        setTypes(t)
        if (!initialServiceTypeId && t.length > 0) setActiveId(t[0].id)
      })
      .catch(() => setTypes([]))
  }, [initialServiceTypeId])

  useEffect(() => {
    setLoaded(false)
    const params = new URLSearchParams()
    if (activeId) params.set('serviceTypeId', activeId)
    if (keyword.trim()) params.set('keyword', keyword.trim())
    apiCached<Companion[]>(`/api/companions?${params.toString()}`, 20_000)
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoaded(true))
  }, [activeId, keyword])

  const navItems = [{ id: '', name: '全部', code: 'ALL' }, ...types.map((item, index) => ({ ...item, code: `M-${String(index + 1).padStart(2, '0')}` }))]
  const activeName = navItems.find((item) => item.id === activeId)?.name || '全部服务'

  return (
    <div className="void-shell min-h-screen pb-32 lg:pb-12">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/88 backdrop-blur-2xl">
        <div className="mx-auto max-w-[1180px] px-4 pb-4 pt-4 lg:px-8 lg:pb-5 lg:pt-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-px w-7 bg-primary" />
                <p className="font-data text-[9px] tracking-[0.22em] text-primary">SERVICE MATRIX / 02</p>
              </div>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.045em] text-ink lg:text-4xl">服务模块</h1>
              <p className="mt-1.5 text-xs text-ink-faint">按类型检索在线席位，进入详情后可配置陪玩模式与时长。</p>
            </div>
            <span className="hidden border border-line px-3 py-2 font-data text-[9px] tracking-[0.14em] text-ink-faint sm:block">{String(list.length).padStart(2, '0')} UNITS ONLINE</span>
          </div>

          <label className="group mt-4 flex min-h-touch items-center gap-3 border border-line bg-surface/72 px-3 transition-command focus-within:border-primary/60 focus-within:bg-surface">
            <IconSearch size={17} className="shrink-0 text-primary/80" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索打手、服务或关键词"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
            />
            <span className="hidden border-l border-line pl-3 font-data text-[9px] tracking-[0.14em] text-ink-faint sm:block">QUERY / SERVICE</span>
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pt-5 lg:px-8 lg:pt-7">
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6 lg:items-start">
          <aside className="lg:sticky lg:top-32">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-data text-[9px] tracking-[0.2em] text-ink-faint">MODULE INDEX</span>
              <span className="font-data text-[9px] text-primary">LIVE</span>
            </div>
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-y border-line py-2 lg:block lg:space-y-1 lg:border-0 lg:py-0">
              {navItems.map((item, index) => {
                const on = activeId === item.id
                return (
                  <button
                    key={item.id || 'all'}
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={cn(
                      'press-command group relative flex min-h-touch shrink-0 items-center gap-3 border px-3 text-left text-sm transition-command lg:w-full',
                      on
                        ? 'border-primary/45 bg-primary/[0.08] text-primary'
                        : 'border-line bg-surface/45 text-ink-dim hover:border-lineStrong hover:text-ink lg:border-transparent lg:bg-transparent',
                    )}
                  >
                    <span className="font-data text-[8px] tracking-[0.1em] opacity-60">{item.code || `M-${String(index).padStart(2, '0')}`}</span>
                    <span className="whitespace-nowrap font-medium">{item.name}</span>
                    {on && <span className="absolute inset-y-2 left-0 w-0.5 bg-primary" />}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 hidden border border-line bg-surface/45 p-3.5 lg:block">
              <p className="font-data text-[9px] tracking-[0.16em] text-ink-faint">SELECTION LOGIC</p>
              <p className="mt-2 text-[11px] leading-5 text-ink-dim">在线状态只代表当前可接单，实际排期以付款确认后的订单状态为准。</p>
            </div>
          </aside>

          <section className="mt-4 min-w-0 lg:mt-0">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div className="border-l-2 border-primary pl-3">
                <p className="font-data text-[9px] tracking-[0.2em] text-primary">ACTIVE MODULE</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">{activeName}</h2>
              </div>
              <span className="font-data text-[9px] tracking-[0.12em] text-ink-faint">SORT / DEFAULT</span>
            </div>

            {!loaded ? (
              <div className="grid gap-2.5 md:grid-cols-2">
                <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
              </div>
            ) : list.length === 0 ? (
              <HudPanel>
                <EmptyState title="当前模块没有在线席位" text={keyword ? '尝试减少关键词或切换服务模块。' : '运营上架后会立即出现在这里。'} action={<button type="button" onClick={() => setKeyword('')} className="min-h-touch border border-primary bg-primary px-4 text-sm text-onPrimary">清除搜索</button>} />
              </HudPanel>
            ) : (
              <div className="stagger-list grid gap-2.5 md:grid-cols-2">
                {list.map((c) => <CompanionCard key={c.id} companion={c} onClick={() => onOpenCompanion(c.id)} />)}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}