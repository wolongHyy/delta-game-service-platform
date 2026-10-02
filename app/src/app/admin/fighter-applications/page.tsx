'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FighterApplication } from '@/lib/types'
import { api } from '@/lib/client'
import { Btn, Empty, FighterStatusBadge, Tag } from '@/components/ui'
import { AdminCode, AdminFilterButton, AdminMetric, AdminPageHeader, AdminSkeleton } from '@/components/admin/AdminUI'

const FILTERS = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已拒绝' },
]

export default function AdminFighterApplications() {
  const [list, setList] = useState<FighterApplication[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (filter) params.set('status', filter)
    api<FighterApplication[]>(`/api/admin/fighter-applications?${params.toString()}`)
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  async function review(id: string, status: 'approved' | 'rejected') {
    await api(`/api/admin/fighter-applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
    load()
  }

  const pending = list.filter((item) => item.status === 'pending').length
  const approved = list.filter((item) => item.status === 'approved').length
  const rejected = list.filter((item) => item.status === 'rejected').length

  return (
    <div className="page-enter space-y-4">
      <AdminPageHeader
        eyebrow="OPERATOR RECRUITMENT / APPLICATION REVIEW"
        title="打手申请"
        description="审核打手入驻申请，查看擅长模式、段位与联系方式；通过后自动登记为平台服务商品。"
        meta={<><span>当前批次 {list.length} 条</span><span>待审核 {pending}</span></>}
        actions={<AdminCode tone="primary">RECRUIT CHANNEL</AdminCode>}
      />

      <section className="grid grid-cols-3 gap-2">
        <AdminMetric code="R / PENDING" label="待审核" value={pending} tone="warn" />
        <AdminMetric code="R / PASSED" label="已通过" value={approved} tone="ok" />
        <AdminMetric code="R / DENIED" label="已拒绝" value={rejected} tone="danger" />
      </section>

      <section className="command-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-3 md:flex-row md:items-center md:justify-between">
          <div><p className="font-data text-[8px] tracking-[0.18em] text-primary">REVIEW FILTER</p><p className="mt-1 text-xs text-ink-faint">处理结果会即时同步到申请记录</p></div>
          <div className="flex flex-wrap gap-1.5">{FILTERS.map((item) => <AdminFilterButton key={item.key} active={filter === item.key} onClick={() => setFilter(item.key)}>{item.label}</AdminFilterButton>)}</div>
        </div>

        <div className="p-3 md:p-4">
          {loading ? <AdminSkeleton rows={3} /> : !list.length ? <Empty text="当前筛选下暂无申请" /> : (
            <div className="stagger-list space-y-2">
              {list.map((a) => (
                <article key={a.id} className="command-panel command-panel-interactive grid gap-4 p-4 lg:grid-cols-[190px_minmax(0,1fr)_150px]">
                  <div className="border-b border-line pb-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
                    <AdminCode tone={a.status === 'pending' ? 'gold' : a.status === 'approved' ? 'primary' : 'default'}>{a.status === 'pending' ? 'REVIEW' : a.status === 'approved' ? 'PASSED' : 'REJECTED'}</AdminCode>
                    <p className="mt-3 text-base font-semibold text-ink">{a.gameName}</p>
                    <p className="mt-1 text-xs text-ink-faint">{a.rank || '未填写段位'}{a.tier ? ` / ${a.tier}` : ''}</p>
                    <div className="mt-2"><FighterStatusBadge status={a.status} /></div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      {a.modes.length === 0 ? <span className="text-[11px] text-ink-faint">未选择擅长模式</span> : a.modes.map((mode) => <Tag key={mode} className="border-primary/30 text-primary">{mode}</Tag>)}
                    </div>
                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                      <div><p className="font-data text-[8px] tracking-[0.12em] text-ink-faint">CONTACT</p><p className="mt-1 break-all text-ink-dim">{a.contact}</p></div>
                      <div><p className="font-data text-[8px] tracking-[0.12em] text-ink-faint">SUBMITTED</p><p className="mt-1 font-data text-ink-dim">{a.createdAt}</p></div>
                    </div>
                    {a.intro && <p className="mt-3 border-l-2 border-line pl-3 text-xs leading-5 text-ink-dim">{a.intro}</p>}
                  </div>
                  <div className="flex flex-col justify-center gap-2 border-t border-line pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                    {a.status === 'pending' ? (
                      <>
                        <Btn size="sm" variant="soft" onClick={() => review(a.id, 'approved')}>通过申请</Btn>
                        <Btn size="sm" variant="danger" onClick={() => review(a.id, 'rejected')}>拒绝申请</Btn>
                      </>
                    ) : <p className="text-center text-[11px] text-ink-faint">已完成审核</p>}
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