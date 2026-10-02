'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ServiceType } from '@/lib/types'
import { api } from '@/lib/client'
import { Btn, Empty, Field, IconEdit, IconPlus, Modal, Tag, TextInput } from '@/components/ui'
import { AdminCode, AdminMetric, AdminPageHeader } from '@/components/admin/AdminUI'

export default function AdminServiceTypes() {
  const [list, setList] = useState<ServiceType[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceType | null>(null)
  const [form, setForm] = useState({ name: '', icon: 'gamepad-2', sort: '0', enabled: true })

  const load = useCallback(() => {
    api<ServiceType[]>('/api/admin/service-types').then(setList).catch(() => setList([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', icon: 'gamepad-2', sort: String(list.length), enabled: true })
    setOpen(true)
  }

  function openEdit(t: ServiceType) {
    setEditing(t)
    setForm({ name: t.name, icon: t.icon, sort: String(t.sort), enabled: t.enabled })
    setOpen(true)
  }

  async function save() {
    if (!form.name.trim()) return
    if (editing) {
      await api(`/api/admin/service-types/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: form.name.trim(), icon: form.icon.trim(), sort: Number(form.sort) || 0, enabled: form.enabled }),
      })
    } else {
      await api('/api/admin/service-types', {
        method: 'POST',
        body: JSON.stringify({ name: form.name.trim(), icon: form.icon.trim(), sort: Number(form.sort) || 0 }),
      })
    }
    setOpen(false)
    load()
  }

  async function toggle(t: ServiceType) {
    await api(`/api/admin/service-types/${t.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !t.enabled }),
    })
    load()
  }

  const enabled = list.filter((item) => item.enabled).length
  const reserved = list.filter((item) => item.reserved).length

  return (
    <div className="page-enter space-y-4">
      <AdminPageHeader
        eyebrow="SUPPLY TAXONOMY / SERVICE TYPES"
        title="服务类型"
        description="维护陪玩、护航、趣味单等业务分类，为未来交易场景预留可扩展的分类位。"
        meta={<><span>分类总数 {list.length}</span><span>启用 {enabled}</span><span>系统预留 {reserved}</span></>}
        actions={<Btn onClick={openCreate}><IconPlus size={16} /> 新增类型</Btn>}
      />

      <section className="grid grid-cols-3 gap-2">
        <AdminMetric code="T / TOTAL" label="分类总数" value={list.length} />
        <AdminMetric code="T / LIVE" label="已启用" value={enabled} tone="ok" />
        <AdminMetric code="T / RESERVED" label="预留分类" value={reserved} tone="warn" />
      </section>

      {list.length === 0 ? (
        <div className="command-panel"><Empty text="暂无服务类型" /></div>
      ) : (
        <section className="command-panel overflow-hidden">
          <div className="border-b border-line px-4 py-3"><p className="font-data text-[8px] tracking-[0.18em] text-primary">TAXONOMY MATRIX</p><p className="mt-1 text-xs text-ink-faint">排序值越小越靠前，系统预留项不建议关闭。</p></div>
          <div className="stagger-list divide-y divide-line">
            {list.map((t, index) => (
              <article key={t.id} className="group grid gap-3 p-4 transition-colors hover:bg-primary/[0.025] md:grid-cols-[90px_minmax(0,1fr)_180px] md:items-center">
                <div className="flex items-center gap-3">
                  <span className="font-data text-2xl font-semibold text-ink-faint/50">{String(index + 1).padStart(2, '0')}</span>
                  <span className={t.enabled ? 'h-2 w-2 rounded-full bg-ok' : 'h-2 w-2 rounded-full bg-ink-faint'} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-ink">{t.name}</h2>
                    <AdminCode tone={t.enabled ? 'primary' : 'default'}>{t.enabled ? 'ACTIVE' : 'OFFLINE'}</AdminCode>
                    {t.reserved && <Tag className="border-warn/40 text-warn">系统预留</Tag>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-data text-[10px] text-ink-faint"><span>ICON / {t.icon || 'gamepad-2'}</span><span>SORT / {t.sort}</span><span>RESERVED / {t.reserved ? 'YES' : 'NO'}</span></div>
                </div>
                <div className="flex gap-1.5 md:justify-end">
                  <Btn size="sm" variant="outline" onClick={() => toggle(t)} disabled={t.reserved}>{t.enabled ? '停用' : '启用'}</Btn>
                  <Btn size="sm" variant="soft" onClick={() => openEdit(t)}><IconEdit size={14} /> 编辑</Btn>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <Modal open={open} title={editing ? '编辑服务类型' : '新增服务类型'} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <div className="border border-line bg-surface2 px-3 py-2 font-data text-[9px] tracking-[0.12em] text-ink-faint">TAXONOMY EDITOR / CHANGE CONTROL</div>
          <Field label="名称 *">
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：陪玩" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="图标标识">
              <TextInput value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="gamepad-2" />
            </Field>
            <Field label="排序">
              <TextInput type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })} />
            </Field>
          </div>
          <label className="flex min-h-touch items-center gap-2 border border-line bg-surface2 px-3 text-sm text-ink-dim">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="h-4 w-4 accent-[rgb(var(--primary-rgb))]" />
            启用该类型
          </label>
          <Btn block onClick={save}>保存分类配置</Btn>
        </div>
      </Modal>
    </div>
  )
}