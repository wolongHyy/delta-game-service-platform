'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Withdrawal } from '@/lib/types'
import { api } from '@/lib/client'
import { Btn, Empty, Money, StatusBadge } from '@/components/ui'
import { AdminCode, AdminMetric, AdminNotice, AdminPageHeader, AdminSkeleton } from '@/components/admin/AdminUI'

export default function AdminWithdrawals() {
  const [items, setItems] = useState<Withdrawal[]>([])
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setItems(await api<Withdrawal[]>('/api/admin/withdrawals'))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { const timer = setInterval(load, 10000); return () => clearInterval(timer) }, [load])

  async function review(id: string, status: 'approved' | 'rejected') {
    try {
      await api(`/api/admin/withdrawals/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setNotice(status === 'approved' ? '提现已通过，打手余额已同步更新' : '提现已驳回')
      await load()
    } catch (e: any) {
      setNotice(e.message)
    }
  }

  const pending = items.filter((item) => item.status === 'pending')
  const approved = items.filter((item) => item.status === 'approved')
  const pendingAmount = pending.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="page-enter space-y-4">
      <AdminPageHeader
        eyebrow="PAYOUT CONTROL / WITHDRAWAL REVIEW"
        title="提现审核"
        description="打手提交申请后自动进入队列。请核对收款信息与可提现余额，通过后系统将计入已提现金额。"
        meta={<><span>自动刷新 10 SEC</span><span>申请记录 {items.length.toString().padStart(2, '0')} 条</span></>}
        actions={<Btn size="sm" variant="outline" onClick={load}>刷新队列</Btn>}
      />

      <section className="grid grid-cols-3 gap-2">
        <AdminMetric code="W / PENDING" label="待审核申请" value={pending.length} tone="warn" />
        <AdminMetric code="W / AMOUNT" label="待处理金额" value={<Money value={pendingAmount} />} tone="gold" />
        <AdminMetric code="W / PAID" label="已通过申请" value={approved.length} tone="ok" />
      </section>

      <section className="command-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div><p className="font-data text-[8px] tracking-[0.18em] text-primary">PAYOUT QUEUE</p><p className="mt-1 text-xs text-ink-faint">按申请时间倒序同步</p></div>
          {pending.length > 0 && <AdminCode tone="gold">{pending.length} PENDING</AdminCode>}
        </div>
        {notice && <div className="p-3 pb-0"><AdminNotice>{notice}</AdminNotice></div>}
        <div className="p-3 md:p-4">
          {loading ? <AdminSkeleton rows={3} /> : !items.length ? <Empty text="暂无提现申请" /> : (
            <div className="stagger-list space-y-2">
              {items.map((item) => (
                <article key={item.id} className="command-panel command-panel-interactive grid gap-4 p-4 lg:grid-cols-[170px_minmax(0,1fr)_170px]">
                  <div className="border-b border-line pb-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
                    <AdminCode tone={item.status === 'pending' ? 'gold' : item.status === 'approved' ? 'primary' : 'default'}>{item.status === 'pending' ? 'REVIEW' : item.status === 'approved' ? 'CLEARED' : 'REJECTED'}</AdminCode>
                    <p className="mt-3 font-data text-xl font-semibold tabular-nums text-gold"><Money value={item.amount} /></p>
                    <div className="mt-2"><StatusBadge status={item.status} /></div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{item.fighterName}</p>
                    <p className="mt-2 break-all border border-line bg-surface2 px-3 py-2 text-xs leading-5 text-ink-dim"><span className="mr-2 font-data text-[9px] tracking-[0.1em] text-ink-faint">PAYEE</span>{item.accountInfo}</p>
                    <p className="mt-2 font-data text-[10px] text-ink-faint">申请时间 {item.createdAt}</p>
                  </div>
                  <div className="flex flex-col justify-center gap-2 border-t border-line pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                    {item.status === 'pending' ? (
                      <>
                        <Btn size="sm" variant="soft" onClick={() => review(item.id, 'approved')}>通过并结算</Btn>
                        <Btn size="sm" variant="danger" onClick={() => review(item.id, 'rejected')}>驳回申请</Btn>
                      </>
                    ) : <p className="text-center text-[11px] text-ink-faint">该申请已处理</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}