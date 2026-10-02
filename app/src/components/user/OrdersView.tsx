'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Order } from '@/lib/types'
import { api } from '@/lib/client'
import { Btn, EmptyState, HudPanel, IconArrowUpRight, Money, Skeleton, StatusBadge, cn } from '@/components/ui'

const FILTERS = [
  { key: '', label: '全部', code: 'ALL' },
  { key: 'unpaid', label: '待付款', code: 'PAY' },
  { key: 'payment_review', label: '待确认到账', code: 'REVIEW' },
  { key: 'pending', label: '待接单', code: 'POOL' },
  { key: 'assigned', label: '待服务', code: 'READY' },
  { key: 'in_progress', label: '服务中', code: 'LIVE' },
  { key: 'completion_pending', label: '待确认', code: 'CHECK' },
  { key: 'completed', label: '已完成', code: 'DONE' },
  { key: 'cancelled', label: '已取消', code: 'VOID' },
]

const PROGRESS: Record<string, number> = {
  unpaid: 1,
  payment_review: 2,
  pending: 3,
  assigned: 4,
  in_progress: 5,
  completion_pending: 6,
  completed: 7,
  cancelled: 0,
}

export default function OrdersView({
  refreshKey,
  onOpenOrder,
  onNotice,
}: {
  refreshKey: number
  onOpenOrder: (id: string) => void
  onNotice: (msg: string) => void
}) {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState('')
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(() => {
    setLoaded(false)
    const params = new URLSearchParams({ pageSize: '50' })
    if (filter) params.set('status', filter)
    api<Order[]>(`/api/orders?${params}`)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoaded(true))
  }, [filter])

  useEffect(() => { load() }, [load, refreshKey])

  async function cancel(id: string) {
    try {
      await api(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) })
      onNotice('订单已取消')
      load()
    } catch (e: any) {
      onNotice(e.message)
    }
  }

  return (
    <div className="void-shell min-h-screen pb-24">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/88 backdrop-blur-2xl">
        <div className="mx-auto max-w-[1180px] px-4 pb-0 pt-4 lg:px-8 lg:pt-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-data text-[9px] tracking-[0.22em] text-primary">MISSION ARCHIVE / 05</p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.04em] text-ink">我的订单</h1>
            </div>
            <span className="hidden border border-line px-3 py-2 font-data text-[9px] text-ink-faint sm:block">{String(orders.length).padStart(2, '0')} RECORDS</span>
          </div>
          <div className="no-scrollbar mt-4 flex overflow-x-auto">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={cn(
                  'press-command relative min-h-touch shrink-0 px-3 text-left text-xs transition-command',
                  filter === item.key ? 'text-primary' : 'text-ink-faint hover:text-ink',
                )}
              >
                <span className="block font-medium">{item.label}</span>
                <span className="mt-0.5 block font-data text-[7px] tracking-[0.13em] opacity-60">{item.code}</span>
                {filter === item.key && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-primary" />}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pt-5 lg:px-8 lg:pt-7">
        {!loaded ? (
          <div className="grid gap-3 md:grid-cols-2"><Skeleton className="h-44" /><Skeleton className="h-44" /><Skeleton className="h-44" /><Skeleton className="h-44" /></div>
        ) : orders.length === 0 ? (
          <HudPanel><EmptyState title="暂无任务记录" text="下单后可在这里追踪付款、接单、服务和完工进度。" /></HudPanel>
        ) : (
          <div className="stagger-list grid gap-3 lg:grid-cols-2">
            {orders.map((order, index) => {
              const progress = PROGRESS[order.status] ?? 0
              const cancelled = order.status === 'cancelled'
              return (
                <article key={order.id} className={cn('tactical-panel group relative overflow-hidden', cancelled && 'opacity-65')}>
                  <div className="hud-grid pointer-events-none absolute inset-0 opacity-20" />
                  <button type="button" onClick={() => onOpenOrder(order.id)} className="relative block w-full p-4 text-left lg:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-data text-[9px] tracking-[0.14em] text-ink-faint">M-{String(index + 1).padStart(2, '0')}</span>
                          <span className="h-3 w-px bg-line" />
                          <span className="truncate font-data text-[9px] tracking-[0.06em] text-ink-faint">{order.orderNo}</span>
                        </div>
                        <p className="mt-2 truncate text-base font-semibold text-ink group-hover:text-primary">{order.companionName || '待分配服务'}</p>
                        <p className="mt-1 text-xs text-ink-dim">{order.serviceName} · {order.unitCount} 单位</p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between font-data text-[8px] tracking-[0.12em] text-ink-faint">
                        <span>PAYMENT</span><span>DISPATCH</span><span>COMPLETE</span>
                      </div>
                      <div className="mt-2 flex gap-1">
                        {[1, 2, 3, 4, 5, 6, 7].map((step) => (
                          <span key={step} className={cn('h-1 flex-1', cancelled ? 'bg-danger/35' : step <= progress ? 'bg-primary shadow-[0_0_8px_rgb(var(--primary-rgb)/0.35)]' : 'bg-line')} />
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 flex items-end justify-between gap-4 border-t border-line pt-4">
                      <div>
                        <p className="text-[10px] text-ink-faint">{order.fighterName ? `当前打手 / ${order.fighterName}` : '当前状态 / 等待后续流转'}</p>
                        <p className="mt-1 font-data text-[9px] text-ink-faint">{order.isTrial ? 'TRIAL ORDER' : 'STANDARD ORDER'} · {order.createdAt?.slice(0, 16) || '--'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-data text-[8px] tracking-[0.14em] text-ink-faint">VALUE</p>
                        <p className="mt-1 font-data text-xl font-semibold text-gold"><Money value={order.amount} /></p>
                      </div>
                    </div>
                    <span className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-primary opacity-0 transition-opacity group-hover:opacity-100"><IconArrowUpRight size={16} /></span>
                  </button>
                  {['unpaid', 'payment_review', 'pending'].includes(order.status) && (
                    <div className="relative flex justify-end border-t border-line bg-bg/20 px-4 py-2">
                      <Btn size="sm" variant="danger" onClick={() => void cancel(order.id)}>取消订单</Btn>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}