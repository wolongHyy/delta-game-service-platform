'use client'

import { useEffect, useState } from 'react'
import type { Companion, ServiceType } from '@/lib/types'
import { apiCached } from '@/lib/client'
import { ActionDock, Avatar, Btn, HudPanel, IconArrowUpRight, IconBack, Money, Skeleton, Tag, cn } from '@/components/ui'

export type PlayMode = '单陪' | '双陪'
export type AddonKey = '教学单' | '甜蜜单'

export type OrderOptions = {
  mode?: PlayMode
  addons: AddonKey[]
  effectivePrice: number
  spec: string
}

const ADDON_PRICE = 20

export default function CompanionDetail({
  companionId,
  onBack,
  onCheckout,
}: {
  companionId: string
  onBack: () => void
  onCheckout: (companion: Companion, unitCount: number, opts: OrderOptions) => void
}) {
  const [companion, setCompanion] = useState<Companion | null>(null)
  const [types, setTypes] = useState<ServiceType[]>([])
  const [unitCount, setUnitCount] = useState(1)
  const [mode, setMode] = useState<PlayMode>('单陪')
  const [addons, setAddons] = useState<AddonKey[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiCached<Companion>(`/api/companions/${companionId}`, 30_000).then(setCompanion).catch((e) => setError(e.message))
    apiCached<ServiceType[]>('/api/service-types', 60_000).then(setTypes).catch(() => setTypes([]))
  }, [companionId])

  if (error) {
    return (
      <div className="min-h-screen p-4">
        <BackButton onBack={onBack} />
        <HudPanel><p className="p-6 text-center text-sm text-danger">{error}</p></HudPanel>
      </div>
    )
  }

  if (!companion) {
    return (
      <div className="min-h-screen p-4">
        <BackButton onBack={onBack} />
        <div className="space-y-3"><Skeleton className="h-48" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
      </div>
    )
  }

  const serviceName = types.find((t) => t.id === companion.serviceTypeId)?.name || '陪玩'
  const isHourly = companion.unit === '小时'
  const isFixedUnit = !isHourly
  const modePrice = isHourly ? companion.price * (mode === '双陪' ? 2 : 1) : companion.price
  const effectivePrice = modePrice + addons.length * ADDON_PRICE
  const spec = isHourly ? [mode, ...addons].join(' · ') : ''
  const total = effectivePrice * unitCount
  const online = companion.status === 1
  const unitLabel = isFixedUnit ? '1 单' : `${unitCount} 小时`

  function toggleAddon(key: AddonKey) {
    setAddons((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  return (
    <div className="void-shell min-h-screen pb-32">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/88 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-16 max-w-[1180px] items-center gap-2 px-4 lg:px-8">
          <button type="button" onClick={onBack} className="press-command flex h-11 w-11 items-center justify-center border border-transparent text-ink-dim hover:border-line hover:bg-surface hover:text-ink" aria-label="返回">
            <IconBack size={20} />
          </button>
          <div>
            <p className="font-data text-[9px] tracking-[0.2em] text-primary">OPERATOR DOSSIER / 01</p>
            <h1 className="mt-0.5 text-sm font-semibold text-ink">服务详情</h1>
          </div>
          <span className="ml-auto hidden font-data text-[9px] tracking-[0.14em] text-ink-faint sm:block">ID / {companion.id.slice(-8).toUpperCase()}</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pt-5 lg:px-8 lg:pt-7">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)] lg:items-start">
          <section className="space-y-3">
            <div className="hero-command panel-corner relative overflow-hidden border border-line p-5 lg:p-6">
              <div className="hud-grid pointer-events-none absolute inset-0 opacity-45" />
              <div className="relative">
                <div className="flex items-start gap-4">
                  <Avatar name={companion.name} size={84} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-2xl font-semibold tracking-[-0.04em] text-ink">{companion.name}</span>
                      <span className={cn('inline-flex items-center gap-1.5 border px-2 py-1 font-data text-[9px] tracking-[0.1em]', online ? 'border-ok/35 bg-ok/10 text-ok' : 'border-line text-ink-faint')}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', online ? 'bg-ok shadow-[0_0_10px_rgb(var(--ok-rgb))]' : 'bg-ink-faint')} />
                        {online ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </div>
                    <p className="mt-2 font-data text-[10px] tracking-[0.14em] text-ink-faint">{serviceName.toUpperCase()} / {companion.rank || 'UNRANKED'}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Tag className="border-info/35 text-info">{serviceName}</Tag>
                      {companion.rank && <Tag>{companion.rank}</Tag>}
                      {companion.gender && <Tag>{companion.gender}</Tag>}
                    </div>
                  </div>
                </div>
                <div className="mt-7 flex items-end justify-between gap-4 border-t border-line pt-4">
                  <div>
                    <p className="font-data text-[9px] tracking-[0.16em] text-ink-faint">BASE RATE / {companion.unit}</p>
                    <p className="mt-1 font-data text-3xl font-semibold leading-none text-gold">
                      <Money value={effectivePrice} />
                      {isHourly && mode === '双陪' ? <span className="ml-2 font-data text-[10px] text-ink-faint">DUO</span> : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-data text-[9px] tracking-[0.16em] text-ink-faint">VERIFIED COMPLETED</p>
                    <p className="mt-1 text-sm font-semibold text-ink">{companion.sales} 单</p>
                  </div>
                </div>
              </div>
            </div>

            <HudPanel title="任务简报" meta="SERVICE BRIEF">
              <div className="p-4 lg:p-5">
                {companion.tags.length > 0 && <div className="mb-4 flex flex-wrap gap-1.5">{companion.tags.map((t) => <Tag key={t}>#{t}</Tag>)}</div>}
                <p className="max-w-2xl text-sm leading-6 text-ink-dim">{companion.description || '服务介绍待补充。下单前可在备注中说明具体需求。'}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3">
                  <div><p className="font-data text-[9px] text-ink-faint">RESPONSE</p><p className="mt-1 font-data text-sm text-ok">24H / ONLINE</p></div>
                  <div><p className="font-data text-[9px] text-ink-faint">CERTIFICATION</p><p className="mt-1 font-data text-sm text-primary">VOID VERIFIED</p></div>
                </div>
              </div>
            </HudPanel>
          </section>

          <aside className="space-y-3">
            {isHourly && (
              <HudPanel title="陪玩模式" meta="SQUAD CONFIGURATION">
                <div className="grid grid-cols-2 gap-2 p-4">
                  {(['单陪', '双陪'] as PlayMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={cn(
                        'press-command min-h-[76px] border p-3 text-left transition-command',
                        mode === m ? 'border-primary/60 bg-primary/10 text-primary' : 'border-line bg-surface2/60 text-ink-dim hover:border-lineStrong hover:text-ink',
                      )}
                    >
                      <span className="block text-sm font-semibold">{m}</span>
                      <span className="mt-1 block font-data text-[10px]">
                        <Money value={companion.price * (m === '双陪' ? 2 : 1)} /> / 小时
                      </span>
                    </button>
                  ))}
                </div>
              </HudPanel>
            )}

            {isHourly && (
              <HudPanel title="战术加购" meta="OPTIONAL MODULES">
                <div className="space-y-2 p-4">
                  {([
                    { key: '教学单' as AddonKey, desc: '同步讲解走位与资源决策' },
                    { key: '甜蜜单' as AddonKey, desc: '轻松语音陪伴与气氛组' },
                  ] as const).map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => toggleAddon(a.key)}
                      className={cn(
                        'press-command flex min-h-touch w-full items-center justify-between gap-3 border px-3 py-2.5 text-left text-sm transition-command',
                        addons.includes(a.key) ? 'border-primary/50 bg-primary/10 text-ink' : 'border-line bg-surface2/60 text-ink-dim hover:border-lineStrong hover:text-ink',
                      )}
                    >
                      <span className="min-w-0">
                        <span className="font-medium">{a.key}</span>
                        <span className="ml-2 text-[11px] text-ink-faint">{a.desc}</span>
                      </span>
                      <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center border font-data text-[10px]', addons.includes(a.key) ? 'border-primary bg-primary text-onPrimary' : 'border-line text-transparent')}>✓</span>
                    </button>
                  ))}
                </div>
              </HudPanel>
            )}

            <HudPanel title={isFixedUnit ? '购买数量' : '服务时长'} meta={isFixedUnit ? 'FIXED ONE RUN' : `UNIT / ${companion.unit}`}>
              {isFixedUnit ? (
                <p className="p-4 text-sm text-ink-dim">该服务按固定 1 单结算。</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 p-4">
                  {[1, 2, 3, 4, 6, 8].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnitCount(u)}
                      className={cn(
                        'press-command min-h-touch border px-2 font-data text-sm transition-command',
                        unitCount === u ? 'border-primary/60 bg-primary/10 text-primary' : 'border-line bg-surface2/60 text-ink-dim hover:border-lineStrong hover:text-ink',
                      )}
                    >
                      {u}H
                    </button>
                  ))}
                </div>
              )}
            </HudPanel>

            <div className="border border-line bg-surface/55 p-4">
              <div className="flex items-center justify-between">
                <p className="font-data text-[9px] tracking-[0.16em] text-ink-faint">ORDER SUMMARY</p>
                <IconArrowUpRight size={15} className="text-primary" />
              </div>
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between gap-3"><span className="text-ink-faint">服务规格</span><span className="text-right text-ink">{spec || '固定服务'}</span></div>
                <div className="flex justify-between gap-3"><span className="text-ink-faint">时长 / 局数</span><span className="text-right text-ink">{unitLabel}</span></div>
                <div className="flex justify-between gap-3 border-t border-line pt-3"><span className="text-ink-faint">预计总额</span><span className="font-data text-lg font-semibold text-gold"><Money value={total} /></span></div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <ActionDock>
        <div className="min-w-0">
          <p className="font-data text-[10px] tracking-[0.12em] text-ink-faint">TOTAL COST / {spec || 'STANDARD'}</p>
          <p className="mt-0.5 font-data text-xl font-semibold text-gold"><Money value={total} /></p>
        </div>
        <Btn disabled={!online} onClick={() => onCheckout(companion, unitCount, { mode: isHourly ? mode : undefined, addons, effectivePrice, spec })}>
          {online ? '立即下单' : '暂不可下单'}
        </Btn>
      </ActionDock>
    </div>
  )
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} className="mb-4 flex min-h-touch items-center gap-1 text-sm text-ink-dim hover:text-ink">
      <IconBack size={18} /> 返回
    </button>
  )
}