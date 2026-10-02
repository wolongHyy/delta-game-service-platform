'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Companion, ServiceType } from '@/lib/types'
import { api } from '@/lib/client'
import {
  Avatar,
  Btn,
  Empty,
  Field,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
  Modal,
  Money,
  Select,
  Tag,
  TextArea,
  TextInput,
} from '@/components/ui'
import { AdminCode, AdminMetric, AdminPageHeader, AdminPanelTitle, AdminSkeleton } from '@/components/admin/AdminUI'

const EMPTY_FORM = {
  id: '',
  name: '',
  gender: '',
  serviceTypeId: '',
  price: '',
  unit: '小时',
  rank: '',
  tags: '',
  description: '',
  sort: '0',
  status: 1,
}

export default function AdminCompanions() {
  const [list, setList] = useState<Companion[]>([])
  const [types, setTypes] = useState<ServiceType[]>([])
  const [keyword, setKeyword] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    const params = new URLSearchParams({ all: '1' })
    if (keyword.trim()) params.set('keyword', keyword.trim())
    setLoading(true)
    api<Companion[]>(`/api/admin/companions?${params.toString()}`)
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [keyword])

  useEffect(() => {
    load()
    api<ServiceType[]>('/api/admin/service-types').then(setTypes).catch(() => setTypes([]))
  }, [load])

  function openCreate() {
    setForm({ ...EMPTY_FORM, serviceTypeId: types.find((t) => t.enabled && !t.reserved)?.id || '' })
    setOpen(true)
  }

  function openEdit(c: Companion) {
    setForm({
      id: c.id,
      name: c.name,
      gender: c.gender,
      serviceTypeId: c.serviceTypeId,
      price: String(c.price),
      unit: c.unit,
      rank: c.rank,
      tags: c.tags.join('，'),
      description: c.description,
      sort: String(c.sort),
      status: c.status,
    })
    setOpen(true)
  }

  async function save() {
    const name = form.name.trim()
    const price = Number(form.price)
    if (!name || !form.serviceTypeId || !Number.isFinite(price) || price < 0) return
    setSaving(true)
    const body = {
      name,
      gender: form.gender.trim(),
      serviceTypeId: form.serviceTypeId,
      price,
      unit: form.unit,
      rank: form.rank.trim(),
      tags: form.tags
        .split(/[，,、\s]+/)
        .map((t) => t.trim())
        .filter(Boolean),
      description: form.description.trim(),
      sort: Number(form.sort) || 0,
      status: form.status,
    }
    try {
      if (form.id) {
        await api(`/api/admin/companions/${form.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        await api('/api/admin/companions', { method: 'POST', body: JSON.stringify(body) })
      }
      setOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(c: Companion) {
    await api(`/api/admin/companions/${c.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: c.status === 1 ? 0 : 1 }),
    })
    load()
  }

  async function remove(c: Companion) {
    if (!window.confirm(`确认删除「${c.name}」？删除后不可恢复`)) return
    await api(`/api/admin/companions/${c.id}`, { method: 'DELETE' })
    load()
  }

  const typeName = (id: string) => types.find((t) => t.id === id)?.name || '未分类'
  const active = list.filter((item) => item.status === 1).length
  const fighters = list.filter((item) => item.kind === 'fighter').length
  const sales = list.reduce((sum, item) => sum + item.sales, 0)

  return (
    <div className="page-enter space-y-4">
      <AdminPageHeader
        eyebrow="SUPPLY ROSTER / COMPANION CONTROL"
        title="陪玩管理"
        description="维护平台陪玩与打手商品，管理上下架状态、定价、服务类型和展示信息。"
        meta={<><span>当前记录 {list.length}</span><span>在售 {active}</span><span>服务类型 {types.length}</span></>}
        actions={<Btn onClick={openCreate}><IconPlus size={16} /> 新增陪玩</Btn>}
      />

      <section className="grid grid-cols-3 gap-2">
        <AdminMetric code="C / ROSTER" label="陪玩总数" value={list.length} />
        <AdminMetric code="C / ACTIVE" label="当前在售" value={active} tone="ok" />
        <AdminMetric code="C / SALES" label="累计销量" value={sales} tone="gold" hint={`${fighters} 名打手身份供给`} />
      </section>

      <section className="command-panel overflow-hidden">
        <AdminPanelTitle code="ROSTER INDEX / FILTER" title="陪玩名册" description="按昵称或标签搜索，所有编辑操作即时保存。" action={<div className="flex min-h-touch w-full min-w-56 items-center gap-2 border border-line bg-surface2/60 px-3 sm:w-64"><IconSearch size={15} className="text-ink-faint" /><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索昵称 / 标签" className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-ink-faint" /></div>} />
        <div className="p-3 md:p-4">
          {loading ? <AdminSkeleton rows={4} /> : !list.length ? <Empty text="暂无陪玩" /> : (
            <div className="stagger-list grid gap-2 xl:grid-cols-2">
              {list.map((c, index) => (
                <article key={c.id} className="command-panel command-panel-interactive relative overflow-hidden p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <Avatar name={c.name} size={48} />
                      <span className={c.status === 1 ? 'absolute -bottom-0.5 -right-0.5 h-3 w-3 border-2 border-surface bg-ok' : 'absolute -bottom-0.5 -right-0.5 h-3 w-3 border-2 border-surface bg-ink-faint'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-data text-[9px] text-ink-faint">SUP-{String(index + 1).padStart(3, '0')}</span>
                        <h2 className="text-sm font-semibold text-ink">{c.name}</h2>
                        {c.gender && <span className="text-[11px] text-primary">{c.gender}</span>}
                        {c.kind === 'fighter' && <Tag className="border-primary/40 bg-primary/10 text-primary">打手</Tag>}
                        <AdminCode tone={c.status === 1 ? 'primary' : 'default'}>{c.status === 1 ? 'ONLINE' : 'OFFLINE'}</AdminCode>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Tag>{typeName(c.serviceTypeId)}</Tag>
                        <Tag className="border-gold/25 text-gold"><Money value={c.price} />/{c.unit}</Tag>
                        <span className="text-[10px] text-ink-faint">销量 {c.sales}</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 min-h-8 text-xs leading-4 text-ink-faint">{c.rank || '未设段位'} · {c.description || '暂无简介'}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                    <Btn size="sm" variant="outline" onClick={() => toggleStatus(c)}>{c.status === 1 ? '下架' : '上架'}</Btn>
                    <Btn size="sm" variant="soft" onClick={() => openEdit(c)}><IconEdit size={14} /> 编辑</Btn>
                    <Btn size="sm" variant="danger" onClick={() => remove(c)}><IconTrash size={14} /> 删除</Btn>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <Modal open={open} title={form.id ? '编辑陪玩' : '新增陪玩'} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <div className="border border-line bg-surface2 px-3 py-2 font-data text-[9px] tracking-[0.12em] text-ink-faint">SUPPLY RECORD / {form.id ? `EDIT ${form.id}` : 'NEW ENTRY'}</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="昵称 *"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="展示昵称" /></Field>
            <Field label="性别"><Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">不区分</option><option value="女陪">女陪</option><option value="男陪">男陪</option></Select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="服务类型 *"><Select value={form.serviceTypeId} onChange={(e) => setForm({ ...form, serviceTypeId: e.target.value })}>{types.map((t) => <option key={t.id} value={t.id}>{t.name}{t.reserved ? '（预留）' : ''}</option>)}</Select></Field>
            <Field label="计费单位"><Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}><option value="小时">小时</option><option value="局">局</option></Select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="单价（元）*"><TextInput type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="如 66" /></Field>
            <Field label="段位"><TextInput value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} placeholder="如 高星" /></Field>
          </div>
          <Field label="标签" hint="用逗号分隔"><TextInput value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="技术，颜值，娱乐" /></Field>
          <Field label="简介"><TextArea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="排序"><TextInput type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })} /></Field>
            <label className="flex min-h-touch items-center gap-2 self-end border border-line bg-surface2 px-3 text-sm text-ink-dim"><input type="checkbox" checked={form.status === 1} onChange={(e) => setForm({ ...form, status: e.target.checked ? 1 : 0 })} className="h-4 w-4 accent-[rgb(var(--primary-rgb))]" />立即上架</label>
          </div>
          <Btn block onClick={save} disabled={saving}>{saving ? '保存中…' : '保存陪玩资料'}</Btn>
        </div>
      </Modal>
    </div>
  )
}