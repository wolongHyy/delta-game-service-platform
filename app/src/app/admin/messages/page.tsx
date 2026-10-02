'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Message } from '@/lib/types'
import { api } from '@/lib/client'
import { Btn, Empty, Field, IconSend, Tag, TextArea, TextInput } from '@/components/ui'
import { AdminCode, AdminMetric, AdminPageHeader, AdminPanelTitle } from '@/components/admin/AdminUI'

export default function AdminMessages() {
  const [list, setList] = useState<Message[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(() => {
    api<Message[]>('/api/messages').then(setList).catch(() => setList([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function publish() {
    if (!title.trim() || !content.trim()) return
    setSending(true)
    try {
      await api('/api/admin/messages', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      })
      setTitle('')
      setContent('')
      load()
    } finally {
      setSending(false)
    }
  }

  const official = list.filter((message) => message.type === 'official').length
  const service = list.length - official

  return (
    <div className="page-enter space-y-4">
      <AdminPageHeader
        eyebrow="SIGNAL BROADCAST / MESSAGE CONTROL"
        title="消息管理"
        description="编辑并发布官方公告，内容会同步进入用户端消息中心；发布前请在预览区确认标题和正文。"
        meta={<><span>已发布 {list.length} 条</span><span>官方公告 {official}</span><span>客服消息 {service}</span></>}
        actions={<AdminCode tone="primary">BROADCAST CHANNEL</AdminCode>}
      />

      <section className="grid grid-cols-3 gap-2">
        <AdminMetric code="M / TOTAL" label="消息总量" value={list.length} />
        <AdminMetric code="M / OFFICIAL" label="官方公告" value={official} tone="info" />
        <AdminMetric code="M / SERVICE" label="客服记录" value={service} tone="warn" />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="command-panel overflow-hidden">
          <AdminPanelTitle code="COMPOSE / NEW BROADCAST" title="撰写公告" description="发布后不可撤回，请确认内容准确。" />
          <div className="space-y-3 p-4">
            <div className="border border-line bg-surface2/60 p-3">
              <p className="font-data text-[8px] tracking-[0.16em] text-primary">LIVE PREVIEW</p>
              <div className="mt-3 flex items-center gap-2"><Tag className="border-primary/40 text-primary">官方公告</Tag><span className="text-sm font-medium text-ink">{title || '公告标题预览'}</span></div>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-ink-dim">{content || '公告正文将在这里实时呈现。'}</p>
            </div>
            <Field label="公告标题 *">
              <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：平台更新通知" />
            </Field>
            <Field label="公告内容 *">
              <TextArea rows={7} value={content} onChange={(e) => setContent(e.target.value)} placeholder="公告正文" />
            </Field>
            <Btn block onClick={publish} disabled={sending || !title.trim() || !content.trim()}>
              <IconSend size={16} /> {sending ? '发布中…' : '发布公告'}
            </Btn>
          </div>
        </section>

        <section className="command-panel overflow-hidden">
          <AdminPanelTitle code="ARCHIVE / PUBLISHED SIGNALS" title="已发布消息" description="按发布时间倒序展示当前消息记录。" action={<span className="font-data text-[9px] text-ink-faint">{list.length.toString().padStart(2, '0')} RECORDS</span>} />
          {list.length === 0 ? (
            <Empty text="暂无消息" />
          ) : (
            <div className="stagger-list divide-y divide-line">
              {list.map((m, index) => (
                <article key={m.id} className="group p-4 transition-colors hover:bg-primary/[0.025]">
                  <div className="flex items-start gap-3">
                    <span className="font-data text-lg text-ink-faint/50">{String(index + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Tag className={m.type === 'official' ? 'border-primary/40 text-primary' : 'border-warn/40 text-warn'}>{m.type === 'official' ? '官方公告' : '客服'}</Tag>
                        <h3 className="text-sm font-medium text-ink">{m.title}</h3>
                        <span className="ml-auto shrink-0 font-data text-[10px] text-ink-faint">{m.createdAt?.slice(0, 16)}</span>
                      </div>
                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-ink-dim">{m.content}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}