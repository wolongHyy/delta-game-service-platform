"use client"

import { useEffect, useState } from "react"
import type { Message } from "@/lib/types"
import { apiCached } from "@/lib/client"
import {
  EmptyState,
  HudPanel,
  IconArrowUpRight,
  IconBell,
  IconChat,
  IconChevronRight,
  Skeleton,
  cn,
} from "@/components/ui"

function fmtTime(s: string) {
  return s ? s.slice(5, 16).replace("T", " / ") : ""
}

export default function MessagesView({
  onOpen,
  onOpenChat,
}: {
  onOpen: (id: string) => void
  onOpenChat: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    apiCached<Message[]>("/api/messages", 30_000)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoaded(true))
  }, [])

  const official = messages.filter((m) => m.type === "official")
  const cs = messages.filter((m) => m.type === "customer_service")

  const renderItem = (message: Message, index: number, channel: "OFFICIAL" | "SERVICE") => (
    <button
      key={message.id}
      type="button"
      onClick={() => onOpen(message.id)}
      className="terminal-line press-command group relative flex min-h-touch w-full items-start gap-3 px-4 py-4 text-left hover:bg-primary/[0.035]"
    >
      <span className="mt-1 flex w-8 shrink-0 flex-col items-center gap-2">
        <span className={cn("signal-node", channel === "OFFICIAL" ? "signal-node--warn" : "")} />
        <span className="font-data text-[8px] text-ink-faint">{String(index + 1).padStart(2, "0")}</span>
      </span>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-line bg-bg/60 text-ink-dim transition-colors group-hover:border-primary/35 group-hover:text-primary">
        {channel === "OFFICIAL" ? <IconBell size={17} /> : <IconChat size={17} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block font-data text-[8px] tracking-[0.15em] text-ink-faint">{channel} / {message.type.toUpperCase()}</span>
            <span className="mt-1 block truncate text-sm font-medium text-ink">{message.title}</span>
          </span>
          <span className="shrink-0 font-data text-[9px] text-ink-faint">{fmtTime(message.createdAt)}</span>
        </span>
        <span className="mt-1.5 block truncate text-xs leading-5 text-ink-dim">{message.content}</span>
      </span>
      <IconChevronRight size={16} className="mt-3 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </button>
  )

  return (
    <div className="void-shell min-h-screen pb-32">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/86 px-4 py-4 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1180px] items-end justify-between gap-4">
          <div>
            <p className="font-data text-[9px] tracking-[0.2em] text-primary">SECURE COMMS / 04</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">消息中继站</h1>
          </div>
          <div className="hidden items-center gap-2 border border-ok/25 bg-ok/[0.06] px-3 py-2 sm:flex">
            <span className="signal-dot" />
            <span className="font-data text-[9px] tracking-[0.12em] text-ok">CHANNEL ONLINE</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] space-y-4 px-4 pt-5 lg:px-8 lg:pt-7">
        <section className="command-panel relative overflow-hidden">
          <div className="hud-grid pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative grid gap-5 p-5 lg:grid-cols-[1.25fr_0.75fr] lg:items-center lg:p-6">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <span className="signal-node" />
                <span className="font-data text-[9px] tracking-[0.16em]">VOID AI DESK / 24H</span>
              </div>
              <h2 className="mt-4 max-w-lg text-3xl font-semibold leading-[1.02] text-ink sm:text-4xl">
                不确定怎么下单？
                <span className="block text-primary">先和值班 AI 对一下。</span>
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-ink-dim">价格、保底、趣味单规则和订单进度，都可以从同一个入口问清楚。</p>
            </div>
            <button
              type="button"
              onClick={onOpenChat}
              className="press-command group flex min-h-[118px] w-full items-center justify-between border border-primary/30 bg-primary/[0.06] p-4 text-left transition-colors hover:border-primary/60 hover:bg-primary/10"
            >
              <span>
                <span className="block font-data text-[9px] tracking-[0.15em] text-primary">OPEN DIRECT LINE</span>
                <span className="mt-2 block text-lg font-semibold text-ink">进入智能客服</span>
                <span className="mt-1 block text-xs text-ink-faint">平均响应 &lt; 3 秒</span>
              </span>
              <span className="flex h-12 w-12 items-center justify-center border border-primary/40 bg-bg/40 text-primary transition-transform group-hover:translate-x-1">
                <IconArrowUpRight size={22} />
              </span>
            </button>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.82fr]">
          <HudPanel title="官方广播" meta={`${official.length} OFFICIAL SIGNALS`} className="min-h-[280px]">
            {official.length === 0 && !loaded ? (
              <div className="space-y-2 p-4"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
            ) : official.length === 0 ? (
              <EmptyState icon={<IconBell size={22} />} title="暂无广播" text="官方公告会在这里留下可追溯记录。" />
            ) : (
              <div className="divide-y divide-line">{official.map((message, index) => renderItem(message, index, "OFFICIAL"))}</div>
            )}
          </HudPanel>

          <HudPanel title="客服通道" meta={`${cs.length} SERVICE REPLIES`} className="min-h-[280px]">
            {cs.length === 0 ? (
              <EmptyState icon={<IconChat size={22} />} title="暂无客服回复" text="人工客服回复后会写入这条通道。" />
            ) : (
              <div className="divide-y divide-line">{cs.map((message, index) => renderItem(message, index, "SERVICE"))}</div>
            )}
          </HudPanel>
        </section>
      </main>
    </div>
  )
}