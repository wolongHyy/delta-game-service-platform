'use client'

import { useEffect, useState } from 'react'
import type { Companion, FighterAccount, ServiceType, TrialQuota } from '@/lib/types'
import { api } from '@/lib/client'
import { ActionDock, Btn, Field, HudPanel, IconArrowUpRight, IconBack, Money, Select, TextArea, TextInput, cn } from '@/components/ui'
import QrPaymentDialog from './QrPaymentDialog'

export default function CheckoutView({
  companionId,
  unitCount,
  price,
  spec,
  sourcePostId,
  onBack,
  onSubmitted,
}: {
  companionId: string
  unitCount: number
  price?: number
  spec?: string
  sourcePostId?: string
  onBack: () => void
  onSubmitted: (orderId: string, notice?: string) => void
}) {
  const [companion, setCompanion] = useState<Companion | null>(null)
  const [types, setTypes] = useState<ServiceType[]>([])
  const [fighters, setFighters] = useState<FighterAccount[]>([])
  const [gameField, setGameField] = useState('')
  const [gameMode, setGameMode] = useState('')
  const [mapName, setMapName] = useState('')
  const [inGameId, setInGameId] = useState('')
  const [objective, setObjective] = useState(OBJECTIVES[0])
  const [customObjective, setCustomObjective] = useState('')
  const [remark, setRemark] = useState('')
  const [fighterId, setFighterId] = useState('')
  const [isTrial, setIsTrial] = useState(false)
  const [trialQuota, setTrialQuota] = useState<TrialQuota | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [idempotencyKey] = useState(() => Math.random().toString(36).slice(2) + Date.now().toString(36))
  const [pendingPay, setPendingPay] = useState<{ id: string; orderNo: string; amount: number } | null>(null)

  const rank = objective === '自定义目标' ? customObjective : objective

  useEffect(() => {
    if (!MAPS[gameMode]?.includes(mapName)) setMapName('')
  }, [gameMode, mapName])

  useEffect(() => {
    api<Companion>(`/api/companions/${companionId}`).then(setCompanion).catch((e) => setError(e.message))
    api<ServiceType[]>('/api/service-types').then(setTypes).catch(() => setTypes([]))
    api<FighterAccount[]>('/api/fighters/available').then(setFighters).catch(() => setFighters([]))
    api<TrialQuota>('/api/customer/trial-quota').then(setTrialQuota).catch(() => setTrialQuota(null))
  }, [companionId])

  useEffect(() => {
    if (trialQuota && trialQuota.remaining <= 0 && isTrial) setIsTrial(false)
  }, [trialQuota, isTrial])

  async function submit() {
    if (!companion) return
    if (!gameField.trim()) { setError('请选择游戏区服'); return }
    if (!gameMode) { setError('请选择游戏模式'); return }
    if (objective === '自定义目标' && !customObjective.trim()) { setError('请填写具体目标要求'); return }
    setSubmitting(true)
    setError('')
    try {
      const order = await api<{ id: string; orderNo: string; amount: number }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          companionId: companion.id,
          unitCount,
          spec: spec || '',
          price,
          gameField: gameField.trim(),
          gameMode,
          mapName,
          inGameId: inGameId.trim(),
          rank: rank.trim(),
          remark: remark.trim(),
          customerName: '',
          fighterId,
          isTrial,
          idempotencyKey,
          sourcePostId: sourcePostId || '',
        }),
      })
      setPendingPay({ id: order.id, orderNo: order.orderNo, amount: order.amount })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!companion) {
    return (
      <div className="void-shell min-h-screen p-4">
        <button type="button" onClick={onBack} className="mb-4 flex min-h-touch items-center gap-1 text-sm text-ink-dim"><IconBack size={18} />返回</button>
        <HudPanel><p className="p-8 text-center text-sm text-ink-faint">{error || '加载中...'}</p></HudPanel>
      </div>
    )
  }

  const serviceName = types.find((t) => t.id === companion.serviceTypeId)?.name || '陪玩'
  const unitPrice = price !== undefined && Number.isFinite(price) ? price : companion.price
  const amount = unitPrice * unitCount

  return (
    <div className="void-shell min-h-screen pb-32">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/88 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-16 max-w-[1180px] items-center gap-2 px-4 lg:px-8">
          <button type="button" onClick={onBack} className="press-command flex h-11 w-11 items-center justify-center text-ink-dim hover:bg-surface hover:text-ink"><IconBack size={20} /></button>
          <div>
            <p className="font-data text-[9px] tracking-[0.2em] text-primary">MISSION BRIEF / 03</p>
            <h1 className="mt-0.5 text-sm font-semibold text-ink">确认订单</h1>
          </div>
          <span className="ml-auto hidden items-center gap-2 font-data text-[9px] text-ok sm:flex"><span className="signal-dot" /> FORM ONLINE</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pt-5 lg:px-8 lg:pt-7">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div className="border-l-2 border-primary pl-3">
            <p className="font-data text-[9px] tracking-[0.2em] text-primary">MISSION PARAMETERS</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-ink">补齐任务参数</h2>
          </div>
          <span className="hidden font-data text-[9px] tracking-[0.12em] text-ink-faint md:block">STEP 03 / PAYMENT REVIEW</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
          <div className="space-y-3">
            <HudPanel title="战术目标" meta="MISSION PROFILE">
              <div className="space-y-4 p-4 lg:p-5">
                <OptionRow label="游戏区服" value={gameField} onChange={setGameField} options={SERVERS} required />
                <OptionRow label="游戏模式" value={gameMode} onChange={setGameMode} options={MODES} required />
                <Field label="地图" hint="选填">
                  <Select value={mapName} onChange={(e) => setMapName(e.target.value)}>
                    <option value="">由打手根据当前活动选择</option>
                    {(MAPS[gameMode] || []).map((item) => <option key={item} value={item}>{item}</option>)}
                  </Select>
                </Field>
                <Field label="目标要求" hint="选填">
                  <Select value={objective} onChange={(e) => setObjective(e.target.value)}>{OBJECTIVES.map((item) => <option key={item} value={item}>{item}</option>)}</Select>
                </Field>
                {objective === '自定义目标' && <Field label="具体目标" hint="必填"><TextInput value={customObjective} onChange={(e) => setCustomObjective(e.target.value)} placeholder="例如：保底 888W 哈夫币" /></Field>}
                <Field label="游戏内 ID / 昵称" hint="选填，便于邀请进队"><TextInput value={inGameId} onChange={(e) => setInGameId(e.target.value)} placeholder="填写游戏内昵称或数字 ID" /></Field>
                <Field label="任务备注" hint="选填"><TextArea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="特殊要求、沟通偏好或其他说明" /></Field>
              </div>
            </HudPanel>

            <HudPanel title="派单与结算" meta="DISPATCH CONTROL">
              <div className="space-y-3 p-4 lg:p-5">
                <button
                  type="button"
                  onClick={() => trialQuota?.remaining !== 0 && setIsTrial((value) => !value)}
                  disabled={trialQuota?.remaining === 0}
                  className={cn('press-command flex min-h-touch w-full items-center justify-between gap-3 border px-3.5 py-3 text-left transition-command disabled:opacity-50', isTrial ? 'border-primary/55 bg-primary/10' : 'border-line bg-surface2/55')}
                >
                  <span>
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">体验单 <span className="border border-primary/30 px-1.5 py-0.5 font-data text-[8px] text-primary">TRIAL</span></span>
                    <span className="mt-1 block text-[11px] text-ink-faint">平台抽成 10% {trialQuota ? `· 本周剩余 ${trialQuota.remaining} 次` : ''}</span>
                  </span>
                  <span className={cn('flex h-5 w-5 items-center justify-center border font-data text-[10px]', isTrial ? 'border-primary bg-primary text-onPrimary' : 'border-line text-transparent')}>✓</span>
                </button>
                <Field label="派单方式" hint="不指定打手时进入公共抢单大厅">
                  <Select value={fighterId} onChange={(e) => setFighterId(e.target.value)}>
                    <option value="">公共抢单池</option>
                    {fighters.map((fighter) => <option key={fighter.id} value={fighter.id}>{fighter.displayName}</option>)}
                  </Select>
                </Field>
              </div>
            </HudPanel>

            {error && <div className="flex items-center gap-3 border border-danger/35 bg-danger/10 px-4 py-3 text-sm text-danger"><span className="font-data text-xs">ERR</span>{error}</div>}
          </div>

          <aside className="space-y-3 lg:sticky lg:top-24">
            <HudPanel title="订单快照" meta="ORDER RECEIPT">
              <div className="p-4">
                <div className="flex items-center gap-3 border-b border-line pb-4">
                  <span className="flex h-11 w-11 items-center justify-center border border-gold/35 bg-gold/10 font-display text-lg font-bold text-gold">{companion.name.slice(0, 1)}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{companion.name}</p>
                    <p className="mt-0.5 font-data text-[9px] text-ink-faint">{serviceName.toUpperCase()} / OPERATOR</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between gap-3"><span className="text-ink-faint">时长 / 局数</span><span className="text-right text-ink">{unitCount} {companion.unit}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-ink-faint">单价</span><span className="text-right text-ink"><Money value={unitPrice} />/{companion.unit}</span></div>
                  {spec && <div className="flex justify-between gap-3"><span className="text-ink-faint">服务规格</span><span className="max-w-[62%] text-right text-ink">{spec}</span></div>}
                  {sourcePostId && <div className="flex justify-between gap-3"><span className="text-ink-faint">来源情报</span><span className="font-data text-right text-primary">LINKED</span></div>}
                  <div className="flex items-end justify-between gap-3 border-t border-line pt-4"><span className="text-ink-faint">应付金额</span><span className="font-data text-2xl font-semibold text-gold"><Money value={amount} /></span></div>
                </div>
              </div>
            </HudPanel>

            <div className="border border-info/25 bg-info/[0.055] p-4">
              <div className="flex items-center gap-2 text-info"><IconArrowUpRight size={15} /><span className="font-data text-[9px] tracking-[0.16em]">PAYMENT FLOW</span></div>
              <p className="mt-3 text-[11px] leading-5 text-ink-dim">提交后进入待付款，扫码提交付款信息，管理员确认到账后才会进入抢单池。</p>
            </div>
          </aside>
        </div>
      </main>

      <ActionDock>
        <div className="min-w-0">
          <p className="font-data text-[10px] tracking-[0.12em] text-ink-faint">PAYABLE / {isTrial ? 'TRIAL' : 'STANDARD'}</p>
          <p className="mt-0.5 font-data text-xl font-semibold text-gold"><Money value={amount} /></p>
        </div>
        <Btn onClick={submit} disabled={submitting}>{submitting ? '提交中...' : '提交订单'}</Btn>
      </ActionDock>

      {pendingPay && (
        <QrPaymentDialog
          order={pendingPay}
          onSubmitted={() => onSubmitted(pendingPay.id, '付款信息已提交，等待管理员确认到账')}
          onLater={() => onSubmitted(pendingPay.id, '订单已保留，可稍后继续付款')}
        />
      )}
    </div>
  )
}

const SERVERS = ['QQ区', '微信区']
const MODES = ['烽火地带', '全面战场']
const OBJECTIVES = ['不限目标', '轻松娱乐', '上分/冲分', '保底哈夫币', '清图刷物资', '教学指导', '自定义目标']
const MAPS: Record<string, string[]> = {
  烽火地带: ['不指定地图', '零号大坝', '长弓溪谷', '航天基地', '巴克什'],
  全面战场: ['不指定地图'],
}

function OptionRow({ label, value, onChange, options, required = false }: { label: string; value: string; onChange: (value: string) => void; options: string[]; required?: boolean }) {
  return (
    <div>
      <p className="mb-2 flex items-center justify-between text-xs text-ink-dim"><span>{label}</span>{required && <span className="font-data text-[9px] text-danger">REQUIRED</span>}</p>
      <div className={cn('grid gap-2', options.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {options.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={cn(
              'press-command min-h-touch border px-2 text-sm transition-command',
              value === item ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-line bg-surface2/60 text-ink-dim hover:border-lineStrong hover:text-ink',
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}