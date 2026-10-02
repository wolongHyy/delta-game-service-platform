'use client'

import { useEffect, useState } from 'react'
import type { Message } from '@/lib/types'
import { api } from '@/lib/client'
import { EmptyState, HudPanel, IconBack, Skeleton, Tag } from '@/components/ui'

export default function MessageDetailView({
  messageId,
  onBack,
}: {
  messageId: string
  onBack: () => void
}) {
  const [msg, setMsg] = useState<Message | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    api<Message[]>('/api/messages')
      .then((list) => setMsg(list.find((m) => m.id === messageId) || null))
      .catch(() => setMsg(null))
      .finally(() => setLoaded(true))
  }, [messageId])

  return (
    <div className="void-shell min-h-screen pb-28">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/86 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-16 max-w-[1180px] items-center gap-3 px-4 lg:px-8">
          <button type="button" onClick={onBack} className="press-command flex h-11 w-11 items-center justify-center border border-transparent text-ink-dim hover:border-line hover:bg-surface hover:text-ink" aria-label="返回"><IconBack size={20} /></button>
          <div>
            <p className="font-data text-[9px] tracking-[0.18em] text-primary">SIGNAL ARCHIVE / DETAIL</p>
            <h1 className="mt-0.5 text-sm font-semibold text-ink">消息档案</h1>
          </div>
          {msg && <Tag className={msg.type === 'official' ? 'ml-auto border-warn/35 text-warn' : 'ml-auto border-primary/35 text-primary'}>{msg.type === 'official' ? '官方广播' : '客服通道'}</Tag>}
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-4 pt-6 lg:px-8 lg:pt-10">
        {!loaded ? (
          <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-72" /></div>
        ) : !msg ? (
          <HudPanel><EmptyState title="未找到这条消息" text="它可能已被撤回，或者链接已经过期。" action={<button type="button" onClick={onBack} className="press-command min-h-touch border border-primary/40 bg-primary/10 px-4 text-sm text-primary">返回消息列表</button>} /></HudPanel>
        ) : (
          <article className="command-panel relative overflow-hidden">
            <div className="hud-grid pointer-events-none absolute inset-0 opacity-30" />
            <div className="relative border-b border-line p-5 lg:p-8">
              <div className="flex items-center justify-between gap-4">
                <span className="font-data text-[9px] tracking-[0.16em] text-ink-faint">RECEIVED / {msg.createdAt?.slice(0, 16) || 'UNKNOWN'}</span>
                <span className={msg.type === 'official' ? 'signal-node signal-node--warn' : 'signal-node'} />
              </div>
              <h2 className="mt-7 max-w-3xl text-3xl font-semibold leading-tight text-ink lg:text-5xl">{msg.title}</h2>
            </div>
            <div className="relative grid gap-8 p-5 lg:grid-cols-[1fr_220px] lg:p-8">
              <div className="whitespace-pre-wrap text-[15px] leading-8 text-ink-dim">{msg.content}</div>
              <aside className="space-y-3">
                <div className="border border-line bg-bg/45 p-4">
                  <p className="font-data text-[9px] tracking-[0.14em] text-ink-faint">CHANNEL</p>
                  <p className="mt-2 text-sm text-ink">{msg.type === 'official' ? '官方广播' : '客服消息'}</p>
                </div>
                <div className="border border-line bg-bg/45 p-4">
                  <p className="font-data text-[9px] tracking-[0.14em] text-ink-faint">MESSAGE ID</p>
                  <p className="mt-2 break-all font-data text-[11px] leading-5 text-ink-dim">{msg.id}</p>
                </div>
                <div className="border border-primary/25 bg-primary/[0.05] p-4">
                  <p className="font-data text-[9px] tracking-[0.14em] text-primary">ARCHIVE STATUS</p>
                  <p className="mt-2 text-xs leading-5 text-ink-dim">该记录已写入本次会话档案，可随时返回复核。</p>
                </div>
              </aside>
            </div>
          </article>
        )}
      </main>
    </div>
  )
}