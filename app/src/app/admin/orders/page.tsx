'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FighterAccount, Order } from '@/lib/types'
import { api } from '@/lib/client'
import { Btn, Empty, Money, StatusBadge, cn } from '@/components/ui'
import {
  AdminCode,
  AdminFilterButton,
  AdminMetric,
  AdminNotice,
  AdminPageHeader,
  AdminSkeleton,
} from '@/components/admin/AdminUI'

const FILTERS = [
  { key: '', label: '全部' },
  { key: 'unpaid', label: '待付款' },
  { key: 'payment_review', label: '待确认到账' },
  { key: 'pending', label: '待接单' },
  { key: 'assigned', label: '待服务' },
  { key: 'in_progress', label: '服务中' },
  { key: 'completion_pending', label: '待确认' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
]

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [fighters, setFighters] = useState<FighterAccount[]>([])
  const [filter, setFilter] = useState(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('status') || ''
  })
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const lastCount = useRef(0)

  const load = useCallback(async () => {
    const params = new URLSearchParams({ pageSize: '100' })
    if (filter) params.set('status', filter)
    try {
      const [orderList, fighterList] = await Promise.all([
        api<Order[]>(`/api/admin/orders?${params}`),
        api<FighterAccount[]>('/api/fighters/available'),
      ])
      if (lastCount.current > 0 && orderList.length > lastCount.current) setNotice('有新订单，列表已刷新')
      lastCount.current = orderList.length
      setOrders(orderList)
      setFighters(fighterList)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const timer = setInterval(() => { load() }, 15000)
    return () => clearInterval(timer)
  }, [load])

  async function markPaid(id: string) {
    try {
      await api(`/api/admin/orders/${id}/pay`, { method: 'PATCH' })
      setNotice('已确认到账，订单进入待接单')
      await load()
    } catch (e: any) {
      setNotice(e.message)
    }
  }

  async function rejectPayment(id: string) {
    try {
      await api(`/api/admin/orders/${id}/reject-payment`, { method: 'PATCH' })
      setNotice('已退回待付款，请让顾客重新核对付款信息')
      await load()
    } catch (e: any) {
      setNotice(e.message)
    }
  }

  async function assign(id: string, fighterId: string) {
    try {
      await api(`/api/admin/orders/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ fighterId }) })
      setNotice('派单已更新')
      await load()
    } catch (e: any) {
      setNotice(e.message)
    }
  }

  async function complete(id: string) {
    try {
      await api(`/api/admin/orders/${id}/complete`, { method: 'PATCH' })
      setNotice('订单已确认完成，收益已结算给打手')
      await load()
    } catch (e: any) {
      setNotice(e.message)
    }
  }

  async function cancel(id: string) {
    try {
      await api(`/api/admin/orders/${id}/cancel`, { method: 'PATCH' })
      setNotice('订单已取消')
      await load()
    } catch (e: any) {
      setNotice(e.message)
    }
  }

  const metrics = {
    total: orders.length,
    payment: orders.filter((order) => ['unpaid', 'payment_review'].includes(order.status)).length,
    active: orders.filter((order) => ['pending', 'assigned', 'in_progress', 'completion_pending'].includes(order.status)).length,
    complete: orders.filter((order) => order.status === 'completed').length,
  }

  return (
    <div className="page-enter space-y-4">
      <AdminPageHeader
        eyebrow="TRANSACTION CONTROL / ORDER ROUTING"
        title="订单调度"
        description="二维码收款后先进入待确认到账；核对支付凭证后再派单，已被打手抢走或顾客指定的订单不可强行改派。"
        meta={<><span>自动刷新 15 SEC</span><span>数据范围 {orders.length.toString().padStart(2, '0')} 条</span><span>公共池打手 {fighters.length.toString().padStart(2, '0')} 人</span></>}
        actions={<AdminCode tone="primary">LIVE QUEUE</AdminCode>}
      />

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <AdminMetric code="O / TOTAL" label="当前筛选订单" value={metrics.total} />
        <AdminMetric code="O / PAY" label="待付款与核对" value={metrics.payment} tone="warn" />
        <AdminMetric code="O / ACTIVE" label="履约进行中" value={metrics.active} tone="info" />
        <AdminMetric code="O / DONE" label="已完成" value={metrics.complete} tone="ok" />
      </section>

      <section className="command-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-data text-[8px] tracking-[0.18em] text-primary">QUEUE FILTER</p>
            <p className="mt-1 text-xs text-ink-faint">按订单状态切换工作队列</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <AdminFilterButton key={item.key} active={filter === item.key} onClick={() => setFilter(item.key)}>
                {item.label}
              </AdminFilterButton>
            ))}
          </div>
        </div>
        {notice && <div className="p-3 pb-0"><AdminNotice tone={notice.includes('失败') || notice.includes('错误') ? 'danger' : 'info'}>{notice}</AdminNotice></div>}
        <div className="p-3 md:p-4">
          {loading ? <AdminSkeleton rows={4} /> : !orders.length ? <Empty text="当前队列暂无订单" /> : (
            <div className="stagger-list space-y-2">
              {orders.map((order, index) => {
                const source = ({ customer: '顾客指定', fighter: '打手抢单', admin: '管理员派单' } as Record<string, string>)[order.assignedBy] || '公共抢单池'
                const actionable = ['unpaid', 'payment_review', 'pending', 'assigned', 'in_progress', 'completion_pending'].includes(order.status)
                return (
                  <article key={order.id} className="command-panel command-panel-interactive relative overflow-hidden">
                    <div className="grid gap-4 p-4 xl:grid-cols-[180px_minmax(0,1fr)_190px]">
                      <div className="border-b border-line pb-3 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-4">
                        <div className="flex items-center justify-between gap-2">
                          <AdminCode tone={order.status === 'payment_review' ? 'gold' : 'default'}>ORD-{String(index + 1).padStart(3, '0')}</AdminCode>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="mt-3 break-all font-data text-[10px] leading-4 text-ink-faint">{order.orderNo}</p>
                        <p className="mt-2 font-data text-xl font-semibold tabular-nums text-gold"><Money value={order.amount} /></p>
                        <p className="mt-1 font-data text-[9px] tracking-[0.1em] text-ink-faint">{order.unitCount} UNIT / {order.isTrial ? 'TRIAL' : 'STANDARD'}</p>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold text-ink">{order.companionName}</h2>
                          <span className="text-xs text-ink-faint">{order.serviceName}</span>
                          {order.isTrial && <AdminCode tone="primary">体验单</AdminCode>}
                          {!order.paid && order.status === 'unpaid' && <AdminCode tone="danger">待付款</AdminCode>}
                        </div>
                        <div className="mt-3 grid gap-x-5 gap-y-2 text-xs sm:grid-cols-2 xl:grid-cols-3">
                          <OrderDatum label="顾客" value={`${order.customerName || '匿名顾客'}${order.customerPhone ? ` / ${order.customerPhone}` : ''}`} />
                          <OrderDatum label="游戏区服" value={order.gameField || '未填写'} />
                          <OrderDatum label="段位" value={order.rank || '未填写'} />
                          <OrderDatum label="服务打手" value={order.fighterName || '尚未分配'} />
                          <OrderDatum label="订单来源" value={source} />
                          <OrderDatum label="下单时间" value={order.createdAt?.slice(0, 16) || '--'} />
                        </div>
                        {order.paymentNote && <div className="mt-3 border-l-2 border-warn/60 bg-warn/[0.05] px-3 py-2 text-xs leading-5 text-warn">付款信息：{order.paymentNote}{order.paymentSubmittedAt ? ` · ${order.paymentSubmittedAt}` : ''}</div>}
                        {order.completionRequestedAt && <p className="mt-2 text-xs text-warn">申请完工：{order.completionRequestedAt}</p>}
                        {order.completionNote && <p className="mt-2 text-xs leading-5 text-ink-dim">结单说明：{order.completionNote}</p>}
                        {order.completionProof.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {order.completionProof.map((url) => (
                              <a key={url} href={url} target="_blank" rel="noreferrer" className="image-frame media-zoom block h-16 w-16 border border-line bg-surface2">
                                <img src={url} alt="结单截图" className="h-full w-full object-cover" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 border-t border-line pt-3 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
                        <p className="font-data text-[8px] tracking-[0.16em] text-ink-faint">CONTROL ACTIONS</p>
                        {order.status === 'unpaid' && <Btn size="sm" variant="soft" onClick={() => markPaid(order.id)}>标记线下已收款</Btn>}
                        {order.status === 'payment_review' && (
                          <>
                            <Btn size="sm" variant="soft" onClick={() => markPaid(order.id)}>确认已到账</Btn>
                            <Btn size="sm" variant="danger" onClick={() => rejectPayment(order.id)}>未收到，退回</Btn>
                          </>
                        )}
                        {order.status === 'pending' && (
                          <select value={order.fighterId} onChange={(e) => assign(order.id, e.target.value)} className="min-h-touch w-full border border-line bg-surface2 px-2 text-xs text-ink">
                            <option value="">公共抢单池</option>
                            {fighters.map((fighter) => <option key={fighter.id} value={fighter.id}>{fighter.displayName}{fighter.tier === '娱乐' ? '（娱乐）' : ''}</option>)}
                          </select>
                        )}
                        {order.status === 'assigned' && order.assignedBy === 'admin' && (
                          <select value={order.fighterId} onChange={(e) => assign(order.id, e.target.value)} className="min-h-touch w-full border border-line bg-surface2 px-2 text-xs text-ink">
                            <option value="">放回公共抢单池</option>
                            {fighters.map((fighter) => <option key={fighter.id} value={fighter.id}>{fighter.displayName}</option>)}
                          </select>
                        )}
                        {order.status === 'assigned' && order.assignedBy !== 'admin' && <p className="border border-line bg-surface2 px-3 py-2 text-[11px] leading-4 text-ink-faint">已被{order.assignedBy === 'fighter' ? '打手抢单' : '顾客指定'}，不可强行改派</p>}
                        {order.status === 'completion_pending' && <Btn size="sm" variant="soft" onClick={() => complete(order.id)}>确认完成并结算</Btn>}
                        {actionable && <Btn size="sm" variant="danger" onClick={() => cancel(order.id)}>取消订单</Btn>}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function OrderDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-data text-[8px] tracking-[0.12em] text-ink-faint">{label}</p>
      <p className={cn('mt-1 truncate text-xs text-ink-dim', label === '顾客' && 'text-ink')}>{value}</p>
    </div>
  )
}