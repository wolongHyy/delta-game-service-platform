'use client'

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { Companion, HomeData } from '@/lib/types'
import { apiCached } from '@/lib/client'
import { EmptyState, HudPanel, IconArrowUpRight, IconCommunity, IconSearch, Skeleton, cn } from '@/components/ui'
import CompanionCard from './CompanionCard'

const SERVICE_ICONS: Record<string, string> = { 'gamepad-2': '⌁', shield: '◇', dices: '▦', plus: '＋' }
const SERVICE_CODES: Record<string, string> = { 'gamepad-2': 'D-01', shield: 'S-02', dices: 'F-03', plus: 'X-04' }

const SORTS = [
  { key: 'default', label: '综合' },
  { key: 'sales', label: '热度' },
  { key: 'price', label: '价格' },
]

function SectionHeading({ eyebrow, title, meta }: { eyebrow: string; title: string; meta?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div className="border-l-2 border-primary pl-3">
        <p className="font-data text-[9px] uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold leading-none text-ink">{title}</h2>
      </div>
      {meta && <span className="font-data text-[9px] uppercase tracking-[0.13em] text-ink-faint">{meta}</span>}
    </div>
  )
}

export default function HomeView({
  onOpenCompanion,
  onOpenCategory,
  onCommunity,
}: {
  onOpenCompanion: (id: string) => void
  onOpenCategory: (serviceTypeId?: string) => void
  onCommunity?: () => void
}) {
  const [data, setData] = useState<HomeData | null>(null)
  const [list, setList] = useState<Companion[]>([])
  const [sort, setSort] = useState('default')
  const [keyword, setKeyword] = useState('')
  const [loaded, setLoaded] = useState(false)

  const hotRef = useRef<HTMLDivElement>(null)
  const hotDrag = useRef({ down: false, moved: false, startX: 0, scrollLeft: 0, companionId: '' })

  const onHotPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    const el = hotRef.current
    if (!el) return
    const cardEl = (e.target as HTMLElement).closest('[data-companion-id]')
    hotDrag.current = {
      down: true,
      moved: false,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      companionId: cardEl instanceof HTMLElement ? cardEl.dataset.companionId ?? '' : '',
    }
    el.setPointerCapture(e.pointerId)
  }

  const onHotPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const st = hotDrag.current
    const el = hotRef.current
    if (!st.down || !el) return
    const dx = e.clientX - st.startX
    if (!st.moved && Math.abs(dx) > 5) st.moved = true
    if (st.moved) el.scrollLeft = st.scrollLeft - dx
  }

  const onHotPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!hotDrag.current.down) return
    hotDrag.current.down = false
    const el = hotRef.current
    if (el && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
  }

  const onHotClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (hotDrag.current.moved) {
      e.preventDefault()
      e.stopPropagation()
      hotDrag.current.moved = false
      return
    }
    const cardEl = (e.target as HTMLElement).closest('[data-companion-id]')
    const companionId = cardEl instanceof HTMLElement ? cardEl.dataset.companionId ?? '' : hotDrag.current.companionId
    if (companionId) {
      onOpenCompanion(companionId)
      e.stopPropagation()
    }
  }

  useEffect(() => {
    apiCached<HomeData>('/api/home', 30_000).then(setData).catch(() => setData(null)).finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (sort !== 'default') params.set('sort', sort)
    if (keyword.trim()) params.set('keyword', keyword.trim())
    apiCached<Companion[]>(`/api/companions?${params.toString()}`, 20_000).then(setList).catch(() => setList([]))
  }, [sort, keyword])

  const banner = data?.banners?.[0] || { title: '三角洲行动 · 专业陪玩', subtitle: '高分段陪玩 上分无忧' }
  const operatorCount = data?.serviceTypes.length || 0

  return (
    <div className="void-shell min-h-screen pb-36 lg:pb-24">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/82 backdrop-blur-2xl">
        <div className="mx-auto max-w-[1180px] px-4 pb-3 pt-3 lg:px-8 lg:pb-4 lg:pt-4">
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => onOpenCategory()} className="group flex min-h-touch items-center gap-2.5 text-left">
              <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[4px_12px_4px_12px] border border-primary/35 bg-primary/10">
                <img src="/logo.svg" alt="VOID" className="h-6 w-6 object-contain" />
                <span className="absolute inset-x-1 bottom-0 h-px bg-primary/70" />
              </span>
              <span className="leading-none">
                <span className="block font-display text-[17px] font-bold tracking-[0.18em] text-ink">VOID</span>
                <span className="mt-1 block font-data text-[8px] uppercase tracking-[0.24em] text-primary">Delta Command Deck</span>
              </span>
            </button>

            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 border border-line bg-surface/70 px-3 py-2 font-data text-[9px] tracking-[0.16em] text-ink-faint sm:flex">
                <span className="signal-dot" />
                SYSTEM ONLINE
              </span>
              <button
                type="button"
                onClick={onCommunity}
                className="press-command flex min-h-touch items-center gap-2 border border-line bg-surface2/70 px-3 text-xs text-ink-dim hover:border-primary/45 hover:text-primary"
              >
                <IconCommunity size={16} />
                <span className="hidden sm:inline">战术社区</span>
                <IconArrowUpRight size={13} />
              </button>
            </div>
          </div>

          <label className="group mt-3 flex min-h-touch items-center gap-3 border border-line bg-surface/75 px-3 backdrop-blur-xl transition-command focus-within:border-primary/60 focus-within:bg-surface">
            <IconSearch size={17} className="shrink-0 text-primary/80" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索陪玩、护航或趣味单..."
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
            />
            <span className="hidden border-l border-line pl-3 font-data text-[9px] tracking-[0.14em] text-ink-faint sm:block">SEARCH / 01</span>
          </label>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-4 pt-4 lg:px-8 lg:pt-7">
        <div className="space-y-7">
          <section className="hero-command panel-corner relative overflow-hidden border border-line bg-surface reveal-up">
            <div className="hud-grid pointer-events-none absolute inset-0 opacity-60" />
            <div className="pointer-events-none absolute inset-y-0 left-[44%] hidden w-px bg-gradient-to-b from-transparent via-primary/25 to-transparent lg:block" />
            <div className="relative grid gap-6 p-5 lg:grid-cols-[1.12fr_.88fr] lg:items-center lg:gap-10 lg:p-8">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="signal-dot signal-dot--danger" />
                  <span className="font-data text-[10px] tracking-[0.2em] text-danger">MISSION 001 / READY</span>
                  <span className="h-px w-8 bg-danger/60" />
                </div>
                <p className="mt-5 font-data text-[10px] uppercase tracking-[0.34em] text-ink-faint">VOID / ACTIVE THEATER</p>
                <h1 className="mt-2 font-display text-[clamp(3.65rem,17vw,6.8rem)] font-bold leading-[0.82] tracking-[-0.075em] text-ink">
                  DROP
                  <span className="block text-primary">IN.</span>
                </h1>
                <p className="mt-5 max-w-lg text-sm leading-6 text-ink-dim">
                  {banner.title}
                  <span className="mx-2 text-lineStrong">/</span>
                  <span className="text-ink-faint">{banner.subtitle}</span>
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenCategory()}
                    className="press-command flex min-h-touch items-center gap-2 border border-primary bg-primary px-4 font-data text-xs font-semibold tracking-[0.08em] text-onPrimary shadow-glow hover:bg-primary-bright"
                  >
                    浏览在线席位
                    <IconArrowUpRight size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={onCommunity}
                    className="press-command flex min-h-touch items-center gap-2 border border-line px-4 font-data text-xs tracking-[0.08em] text-ink-dim hover:border-primary/45 hover:text-primary"
                  >
                    进入情报站
                  </button>
                </div>
              </div>

              <div className="relative hidden min-h-[265px] items-center justify-center lg:flex">
                <div className="absolute h-[245px] w-[245px] rounded-full border border-primary/10" />
                <div className="radar-orbit absolute h-[185px] w-[185px] rounded-full border border-dashed border-primary/30" />
                <div className="absolute h-[124px] w-[124px] rounded-full border border-primary/30 bg-primary/[0.025]" />
                <div className="absolute left-1/2 top-4 h-px w-24 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
                <span className="relative font-display text-[94px] font-bold leading-none tracking-[-0.1em] text-primary">24</span>
                <span className="absolute bottom-8 right-3 font-data text-[9px] tracking-[0.2em] text-ink-faint">RESPONSE / HOUR</span>
                <span className="absolute left-2 top-10 h-2 w-2 bg-danger shadow-[0_0_16px_rgb(var(--danger-rgb))]" />
              </div>
            </div>

            <div className="relative grid grid-cols-3 border-t border-line bg-bg/35">
              {[
                ['在线模块', String(operatorCount).padStart(2, '0'), 'ok'],
                ['推荐席位', String(data?.hot.length || 0).padStart(2, '0'), 'default'],
                ['响应时限', '24H', 'info'],
              ].map(([label, value, tone], index) => (
                <div key={label} className={cn('border-r border-line/70 px-4 py-3 last:border-r-0', index === 0 && 'pl-5 lg:pl-8')}>
                  <p className="font-data text-[9px] uppercase tracking-[0.14em] text-ink-faint">{label}</p>
                  <p className={cn('mt-1 font-data text-xl font-semibold', tone === 'ok' && 'text-ok', tone === 'info' && 'text-info')}>{value}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="signal-strip flex items-center gap-3 px-3 py-2.5">
            <span className="relative z-10 shrink-0 bg-danger px-2 py-1 font-data text-[9px] font-semibold tracking-[0.16em] text-white">LIVE</span>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="ticker-track whitespace-nowrap font-data text-[10px] tracking-[0.17em] text-ink-faint">
                VOID COMMAND DECK // 当前在线席位 {String(list.length).padStart(2, '0')} // 推荐服务 {String(data?.hot.length || 0).padStart(2, '0')} // 社区情报实时更新 // 下单后进入人工核验
              </div>
            </div>
            <span className="relative z-10 hidden font-data text-[9px] text-ink-faint sm:block">SIGNAL 04</span>
          </div>

          <section className="reveal-up reveal-up-delay-1">
            <SectionHeading eyebrow="SELECT MODULE" title="服务入口" meta="04 MODULES" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {data?.serviceTypes.map((t, index) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onOpenCategory(t.id)}
                  className="tactical-panel press-command group relative flex min-h-[112px] flex-col justify-between overflow-hidden p-3.5 text-left hover:border-primary/45"
                >
                  <span className="absolute right-3 top-3 font-data text-[9px] tracking-[0.12em] text-ink-faint">{SERVICE_CODES[t.icon] || `M-0${index + 1}`}</span>
                  <span className="flex h-9 w-9 items-center justify-center border border-primary/25 bg-primary/10 font-data text-xl text-primary">{SERVICE_ICONS[t.icon] || '⌁'}</span>
                  <span className="mt-5 block text-sm font-semibold text-ink">{t.name}</span>
                  <span className="mt-1 block font-data text-[9px] tracking-[0.14em] text-ink-faint group-hover:text-primary">OPEN MODULE →</span>
                </button>
              ))}
              <button
                type="button"
                onClick={onCommunity}
                className="tactical-panel press-command group relative flex min-h-[112px] flex-col justify-between overflow-hidden p-3.5 text-left hover:border-primary/45"
              >
                <span className="absolute right-3 top-3 font-data text-[9px] tracking-[0.12em] text-ink-faint">C-05</span>
                <span className="flex h-9 w-9 items-center justify-center border border-primary/25 bg-primary/10 text-primary"><IconCommunity size={18} /></span>
                <span className="mt-5 block text-sm font-semibold text-ink">战术社区</span>
                <span className="mt-1 block font-data text-[9px] tracking-[0.14em] text-ink-faint group-hover:text-primary">ENTER NETWORK →</span>
              </button>
            </div>
          </section>

          {!loaded && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          )}

          {data && data.hot.length > 0 && (
            <section className="reveal-up reveal-up-delay-2">
              <SectionHeading eyebrow="TRENDING UNITS" title="热门推荐" meta="DRAG TO EXPLORE" />
              <div
                ref={hotRef}
                onPointerDown={onHotPointerDown}
                onPointerMove={onHotPointerMove}
                onPointerUp={onHotPointerEnd}
                onPointerCancel={onHotPointerEnd}
                onClickCapture={onHotClickCapture}
                className="no-scrollbar -mx-4 flex cursor-grab select-none gap-3 overflow-x-auto px-4 pb-2 active:cursor-grabbing lg:-mx-0 lg:px-0"
              >
                {data.hot.map((c, index) => (
                  <div key={c.id} data-companion-id={c.id} className="w-[278px] shrink-0">
                    <CompanionCard companion={c} onClick={() => onOpenCompanion(c.id)} featured index={index + 1} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="reveal-up reveal-up-delay-3">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <SectionHeading eyebrow="ALL OPERATORS" title="全部服务" meta={`${list.length} ONLINE`} />
              <div className="flex items-center gap-1 border border-line bg-surface/70 p-1">
                {SORTS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSort(s.key)}
                    className={cn(
                      'press-command min-h-touch px-3 font-data text-[10px] transition-command',
                      sort === s.key ? 'bg-primary text-onPrimary' : 'text-ink-faint hover:bg-surface2 hover:text-ink',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {!loaded ? (
              <div className="grid gap-2 md:grid-cols-2">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
              </div>
            ) : list.length === 0 ? (
              <HudPanel>
                <EmptyState title={keyword ? '未找到匹配服务' : '暂无在线服务'} text={keyword ? '尝试更换关键词或从服务入口浏览。' : '运营上架后会自动出现在这里。'} />
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