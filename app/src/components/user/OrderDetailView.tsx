'use client'

import { useEffect, useState, type ReactNode } from 'react'
import type { Order } from '@/lib/types'
import { api } from '@/lib/client'
import { ActionDock, Btn, HudPanel, IconArrowUpRight, IconBack, IconCheck, IconList, Money, Skeleton, StatusBadge, cn } from '@/components/ui'
import QrPaymentDialog from './QrPaymentDialog'

const STEPS = [
  { key: 'unpaid', label: '订单建立', hint: '等待完成付款', code: 'INIT' },
  { key: 'payment_review', label: '付款核验', hint: '管理员确认到账', code: 'PAY' },
  { key: 'pending', label: '进入派单池', hint: '等待打手响应', code: 'POOL' },
  { key: 'assigned', label: '打手就位', hint: '已锁定服务人员', code: 'LOCK' },
  { key: 'in_progress', label: '任务执行', hint: '服务进行中', code: 'LIVE' },
  { key: 'completion_pending', label: '完工确认', hint: '管理员核验结果', code: 'CHECK' },
  { key: 'completed', label: '任务闭环', hint: '凭证已归档', code: 'DONE' },
]

const STEP_INDEX: Record<string, number> = STEPS.reduce((map, step, index) => ({ ...map, [step.key]: index }), {})

export default function OrderDetailView({
  orderId,
  onBack,
  onCancelled,
  onNotice,
}: {
  orderId: string
  onBack: () => void
  onCancelled: () => void
  onNotice: (msg: string) => void
}) {
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [showPay, setShowPay] = useState(false)

  async function reload() {
    setOrder(await api<Order>(`/api/orders/${orderId}`))
  }

  useEffect(() => {
    api<Order>(`/api/orders/${orderId}`).then(setOrder).catch((e) => setError(e.message))
  }, [orderId])

  async function cancel() {
    try {
      await api(`/api/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) })
      onNotice('订单已取消')
      onCancelled()
      await reload()
    } catch (e: any) {
      onNotice(e.message)
    }
  }

  async function paymentSubmitted() {
    setShowPay(false)
    onNotice('付款信息已提交，等待管理员确认到账')
    await reload()
  }

  if (!order) {
    return (
      <div className="void-shell min-h-screen p-4 lg:p-8">
        <button type="button" onClick={onBack} className="mb-5 flex min-h-touch items-center gap-2 font-data text-[11px] tracking-[0.12em] text-ink-dim hover:text-primary"><IconBack size={18} />RETURN</button>
        {error ? <HudPanel><p className="p-8 text-center text-sm text-danger">{error}</p></HudPanel> : <div className="mx-auto grid max-w-5xl gap-3 lg:grid-cols-[1fr_340px]"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>}
      </div>
    )
  }

  const source = ({ customer: '顾客指定', fighter: '打手抢单', admin: '管理员派单' } as Record<string, string>)[order.assignedBy] || '公共抢单池'
  const payStatus = order.paid
    ? `已收款${order.paymentMethod === 'qr_manual' ? ' / 扫码人工确认' : order.paymentMethod === 'offline' ? ' / 线下确认' : ''}`
    : order.status === 'payment_review'
      ? '管理员核验中'
      : '等待付款'
  const stepIndex = order.status === 'cancelled' ? -1 : STEP_INDEX[order.status] ?? 0
  const progress = order.status === 'cancelled' ? 0 : ((stepIndex + 1) / STEPS.length) * 100
  const canCancel = ['unpaid', 'payment_review', 'pending'].includes(order.status)
  const needsPay = order.status === 'unpaid'

  return (
    <div className="void-shell min-h-screen pb-36">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/86 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-16 max-w-[1180px] items-center gap-2 px-4 lg:px-8">
          <button type="button" onClick={onBack} className="press-command flex h-11 w-11 items-center justify-center border border-transparent text-ink-dim hover:border-line hover:bg-surface hover:text-ink" aria-label="返回"><IconBack size={20} /></button>
          <div className="min-w-0">
            <p className="font-data text-[9px] tracking-[0.2em] text-primary">MISSION TRACE / 06</p>
            <h1 className="mt-0.5 truncate text-sm font-semibold text-ink">订单任务追踪</h1>
          </div>
          <div className="ml-auto hidden items-center gap-3 sm:flex">
            <span className="font-data text-[9px] tracking-[0.12em] text-ink-faint">{order.orderNo}</span>
            <StatusBadge status={order.status} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pt-5 lg:px-8 lg:pt-7">
        <section className={cn('mission-banner panel-corner relative overflow-hidden border p-5 lg:p-6', order.status === 'cancelled' ? 'border-danger/35' : 'border-line')}>
          <div className="hud-grid pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('signal-dot', order.status === 'cancelled' && 'signal-dot--danger')} />
                <span className="font-data text-[9px] tracking-[0.2em] text-ink-faint">MISSION STATUS</span>
                <span className={cn('font-data text-[9px] tracking-[0.14em]', order.status === 'cancelled' ? 'text-danger' : 'text-primary')}>{order.status === 'cancelled' ? 'VOIDED' : 'ACTIVE TRACE'}</span>
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink lg:text-4xl">{order.companionName}</h2>
              <p className="mt-2 text-sm text-ink-dim">{order.serviceName} <span className="mx-2 text-lineStrong">/</span> {order.unitCount} {order.serviceName.includes('小时') ? '小时' : '单位'}</p>
            </div>
            <div className="md:text-right">
              <p className="font-data text-[9px] tracking-[0.18em] text-ink-faint">CONTRACT VALUE</p>
              <p className="mt-1 font-data text-3xl font-semibold text-gold"><Money value={order.amount} /></p>
            </div>
          </div>
          <div className="relative mt-5 border-t border-line/80 pt-4">
            <div className="flex items-center justify-between gap-3 font-data text-[9px] tracking-[0.12em] text-ink-faint">
              <span>{order.status === 'cancelled' ? 'CANCELLED' : `PROGRESS ${String(stepIndex + 1).padStart(2, '0')} / ${STEPS.length}`}</span>
              <span>{order.createdAt?.slice(0, 16)}</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden bg-surface2">
              <div className={cn('h-full transition-all duration-500', order.status === 'cancelled' ? 'bg-danger' : 'bg-primary')} style={{ width: `${progress}%` }} />
            </div>
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_350px] lg:items-start">
          <section className="space-y-4">
            <HudPanel scan title="任务时间轴" meta={order.status === 'cancelled' ? 'VOIDED' : `STEP ${Math.max(1, stepIndex + 1)} / ${STEPS.length}`}>
              {order.status === 'cancelled' ? (
                <div className="p-5">
                  <div className="border border-danger/30 bg-danger/[0.07] p-4">
                    <p className="font-data text-[10px] tracking-[0.16em] text-danger">MISSION VOIDED</p>
                    <p className="mt-2 text-sm text-danger">该订单已取消，不再进入接单和服务流程。</p>
                  </div>
                </div>
              ) : (
                <ol className="p-4 lg:p-5">
                  {STEPS.map((step, index) => {
                    const done = index < stepIndex
                    const active = index === stepIndex
                    return (
                      <li key={step.key} className="relative grid grid-cols-[34px_1fr_auto] gap-3 pb-6 last:pb-0">
                        {index < STEPS.length - 1 && <span className={cn('absolute left-[16px] top-8 h-[calc(100%-1.5rem)] w-px', done ? 'bg-primary/60' : 'bg-line')} />}
                        <span className={cn('relative z-10 mt-0.5 flex h-[34px] w-[34px] shrink-0 items-center justify-center border font-data text-[9px]', done ? 'border-primary/60 bg-primary/12 text-primary' : active ? 'border-primary bg-primary text-onPrimary shadow-glow' : 'border-line bg-surface text-ink-faint')}>
                          {done ? <IconCheck size={15} /> : active && <span className="absolute inset-0 animate-ping border border-primary/35" />}
                          {!done && !active && String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0 border-b border-line/65 pb-5 last:border-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={cn('text-sm font-medium', active ? 'text-primary' : done ? 'text-ink' : 'text-ink-faint')}>{step.label}</p>
                            {active && <span className="border border-primary/35 bg-primary/8 px-2 py-0.5 font-data text-[8px] tracking-[0.12em] text-primary">CURRENT</span>}
                          </div>
                          <p className="mt-1 text-[11px] text-ink-faint">{step.hint}</p>
                        </div>
                        <span className={cn('pt-1 font-data text-[8px] tracking-[0.12em]', active ? 'text-primary' : 'text-ink-faint')}>{step.code}</span>
                      </li>
                    )
                  })}
                </ol>
              )}
            </HudPanel>

            <HudPanel title="任务参数" meta="MISSION DATA">
              <div className="grid gap-px bg-line/70 sm:grid-cols-2">
                <InfoCell label="订单类型" value={order.isTrial ? '体验单 / TRIAL' : '标准订单 / STANDARD'} />
                <InfoCell label="支付状态" value={payStatus} tone={order.paid ? 'ok' : order.status === 'payment_review' ? 'warn' : 'default'} />
                <InfoCell label="当前打手" value={order.fighterName || '等待接单'} />
                <InfoCell label="订单归属" value={source} />
                <InfoCell label="游戏区服" value={order.gameField || '未填写'} />
                <InfoCell label="段位要求" value={order.rank || '未填写'} />
                <InfoCell label="游戏模式" value={order.gameMode || '未填写'} />
                <InfoCell label="目标地图" value={order.mapName || '未填写'} />
                {order.paymentNote && <InfoCell label="付款信息" value={order.paymentNote} />}
                {order.paymentSubmittedAt && <InfoCell label="付款提交" value={order.paymentSubmittedAt} />}
                {order.customerPhone && <InfoCell label="联系电话" value={order.customerPhone} />}
                {order.completionRequestedAt && <InfoCell label="完工申请" value="等待管理员确认" />}
                <InfoCell className="sm:col-span-2" label="任务备注" value={order.remark || '无'} />
              </div>
            </HudPanel>
          </section>

          <aside className="space-y-3 lg:sticky lg:top-24">
            <HudPanel title="任务清单" meta="FIELD RECEIPT">
              <div className="p-4">
                <div className="flex items-center gap-3 border-b border-line pb-4">
                  <span className="flex h-12 w-12 items-center justify-center border border-gold/35 bg-gold/10 font-display text-xl font-bold text-gold">{order.companionName.slice(0, 1)}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{order.companionName}</p>
                    <p className="mt-1 font-data text-[9px] tracking-[0.12em] text-ink-faint">{order.orderNo}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3 text-xs">
                  <Manifest label="服务模块" value={order.serviceName} />
                  <Manifest label="服务规格" value={order.spec || '标准服务'} />
                  <Manifest label="结算金额" value={<Money value={order.amount} />} valueClass="font-data text-base font-semibold text-gold" />
                  <Manifest label="付款方式" value={order.paymentMethod || '待选择'} />
                </div>
                <div className="mt-4 border border-line bg-bg/40 p-3">
                  <p className="font-data text-[9px] tracking-[0.15em] text-ink-faint">CHAIN OF CUSTODY</p>
                  <p className="mt-2 text-[11px] leading-5 text-ink-dim">订单记录与状态变更会保留在后台审计链路中。</p>
                </div>
              </div>
            </HudPanel>

            <div className={cn('border p-4', order.status === 'cancelled' ? 'border-danger/30 bg-danger/[0.06]' : 'border-primary/25 bg-primary/[0.055]')}>
              <div className={cn('flex items-center gap-2', order.status === 'cancelled' ? 'text-danger' : 'text-primary')}>
                <IconArrowUpRight size={15} />
                <span className="font-data text-[9px] tracking-[0.16em]">NEXT ACTION</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-ink-dim">
                {needsPay ? '完成扫码付款并提交付款信息，管理员确认后进入派单池。' : order.status === 'payment_review' ? '管理员正在核验付款，无需重复提交。' : order.status === 'pending' ? '订单已进入抢单池，可等待打手接单。' : order.status === 'completed' ? '任务已完成，成交凭证会同步到关联社区帖子。' : order.status === 'cancelled' ? '任务已终止，无需继续操作。' : '任务已进入执行链路，请保持沟通。'}
              </p>
            </div>
          </aside>
        </div>
      </main>

      {(needsPay || canCancel) && (
        <ActionDock>
          <div className="min-w-0">
            <p className="font-data text-[9px] tracking-[0.14em] text-ink-faint">ORDER VALUE</p>
            <p className="mt-0.5 font-data text-xl font-semibold text-gold"><Money value={order.amount} /></p>
          </div>
          <div className="flex items-center gap-2">
            {canCancel && <Btn variant="outline" onClick={() => void cancel()}>取消订单</Btn>}
            {needsPay && <Btn onClick={() => setShowPay(true)}>扫码付款 <IconArrowUpRight size={14} /></Btn>}
          </div>
        </ActionDock>
      )}

      {showPay && <QrPaymentDialog order={{ id: order.id, orderNo: order.orderNo, amount: order.amount }} onSubmitted={paymentSubmitted} onLater={() => setShowPay(false)} />}
    </div>
  )
}

function InfoCell({ label, value, tone = 'default', className }: { label: string; value: ReactNode; tone?: 'default' | 'ok' | 'warn'; className?: string }) {
  return (
    <div className={cn('bg-surface p-4', className)}>
      <p className="font-data text-[9px] tracking-[0.12em] text-ink-faint">{label}</p>
      <p className={cn('mt-2 break-words text-sm', tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : 'text-ink')}>{value}</p>
    </div>
  )
}

function Manifest({ label, value, valueClass }: { label: string; value: ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-ink-faint">{label}</span>
      <span className={cn('max-w-[62%] text-right text-ink', valueClass)}>{value}</span>
    </div>
  )
}