"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { AiChatMessage, AiConversation } from "@/lib/types"
import { IconBack, IconSend, cn } from "@/components/ui"

type ChatBubble = {
  role: "user" | "assistant"
  content: string
  error?: boolean
}

export default function CustomerServiceView({
  onBack,
}: {
  onBack: () => void
}) {
  const [assistantName, setAssistantName] = useState("小V")
  const [welcome, setWelcome] = useState("")
  const [quickQuestions, setQuickQuestions] = useState<string[]>([])
  const [wechat, setWechat] = useState("")
  const [enabled, setEnabled] = useState(true)
  const [convId, setConvId] = useState("")
  const [messages, setMessages] = useState<ChatBubble[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [])

  // 初始化：读取状态 + 打开最近会话
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const status = await fetch("/api/ai/status").then((r) => r.json().catch(() => ({})))
        if (cancelled) return
        setAssistantName(status.assistantName || "小V")
        setWelcome(status.welcomeMessage || "")
        setQuickQuestions(Array.isArray(status.quickQuestions) ? status.quickQuestions : [])
        setWechat(status.customerServiceWechat || "")
        setEnabled(status.enabled !== false)
        if (status.enabled === false) return
        const list = await fetch("/api/ai/conversations").then((r) => r.json().catch(() => []))
        if (cancelled) return
        if (Array.isArray(list) && list.length > 0) {
          const latest = list[0] as AiConversation
          setConvId(latest.id)
          const detail = await fetch("/api/ai/conversations/" + latest.id).then((r) => r.json().catch(() => null))
          if (detail && Array.isArray(detail.messages)) {
            const bubbles: ChatBubble[] = detail.messages.map((m: AiChatMessage) => ({
              role: m.role,
              content: m.content,
            }))
            setMessages(bubbles)
            if (bubbles.length === 0) setMessages([{ role: "assistant", content: status.welcomeMessage || "" }])
          }
        } else {
          setMessages([{ role: "assistant", content: status.welcomeMessage || "嗨，有什么可以帮你的吗？" }])
        }
      } catch {
        if (!cancelled) setMessages([{ role: "assistant", content: "智能客服暂时连不上，你可以联系人工客服哦。" }])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  async function ensureConversation(): Promise<string> {
    if (convId) return convId
    const res = await fetch("/api/ai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: input.slice(0, 20) || "智能客服咨询" }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.id) throw new Error(data.error || "创建会话失败")
    setConvId(data.id)
    return data.id as string
  }

  async function send(text: string) {
    const content = text.trim()
    if (!content || sending) return
    if (!enabled) return
    setSending(true)
    setMessages((prev) => [
      ...prev,
      { role: "user", content },
      { role: "assistant", content: "" },
    ])
    setInput("")
    try {
      const id = await ensureConversation()
      const res = await fetch("/api/ai/conversations/" + id + "/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "请求失败" }))
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: "assistant", content: err.error || "请求失败，请稍后再试", error: true }
          return copy
        })
        return
      }
      if (!res.body) throw new Error("无响应")
      const reader = res.body.getReader()
      const decoder = new TextDecoder("utf-8")
      let acc = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        const snapshot = acc
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: "assistant", content: snapshot }
          return copy
        })
      }
      if (!acc.trim()) {
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: "assistant", content: "抱歉，我暂时没答上来，你可以换个问法，或者直接联系人工客服哦。", error: true }
          return copy
        })
      }
    } catch (error) {
      setMessages((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: "assistant", content: "网络开小差了，稍等一下再试？也可以直接加人工客服微信处理。", error: true }
        return copy
      })
    } finally {
      setSending(false)
    }
  }

  const userMessages = messages.filter((message) => message.role === "user").length

  return (
    <div className="void-shell flex min-h-screen flex-col bg-bg lg:h-screen">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/90 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-[72px] max-w-[1180px] items-center gap-3 px-4 py-3 lg:px-8">
          <button type="button" onClick={onBack} className="press-command flex h-11 w-11 shrink-0 items-center justify-center border border-line bg-surface/65 text-ink-dim hover:border-primary/45 hover:text-primary" aria-label="返回">
            <IconBack size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={cn("signal-node", !enabled && "signal-node--warn")} />
              <p className="font-data text-[9px] tracking-[0.2em] text-primary">SECURE COMMS / DIRECT LINE</p>
            </div>
            <h1 className="mt-1 truncate text-lg font-semibold tracking-[-0.02em] text-ink">{assistantName} · 值班频道</h1>
          </div>
          <div className="hidden items-center gap-4 border-l border-line/80 pl-4 md:flex">
            <div>
              <p className="font-data text-[8px] tracking-[0.14em] text-ink-faint">CHANNEL</p>
              <p className={cn("mt-1 font-data text-[10px]", enabled ? "text-ok" : "text-warn")}>{enabled ? "ONLINE" : "OFFLINE"}</p>
            </div>
            <div>
              <p className="font-data text-[8px] tracking-[0.14em] text-ink-faint">EXCHANGES</p>
              <p className="mt-1 font-data text-[10px] text-ink">{String(userMessages).padStart(2, "0")}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[1180px] flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="trace-scan flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-line/75" />
              <span className="font-data text-[8px] tracking-[0.2em] text-ink-faint">TRANSMISSION LOG</span>
              <span className="h-px flex-1 bg-line/75" />
            </div>

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="relative max-w-[84%] border border-primary/35 bg-primary/[0.09] px-4 py-3 text-sm leading-6 text-ink">
                    <span className="absolute -right-px top-0 h-4 w-px bg-primary" />
                    <span className="mb-1 block font-data text-[8px] tracking-[0.16em] text-primary/80">OPERATOR / {String(i + 1).padStart(2, "0")}</span>
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-start gap-3">
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center border border-primary/35 bg-primary/10 text-sm font-semibold text-primary">
                    {assistantName.slice(0, 1)}
                    <span className="absolute -bottom-1 -right-1 h-2 w-2 bg-primary shadow-[0_0_10px_rgb(var(--primary-rgb)/0.7)]" />
                  </div>
                  <div className={cn("max-w-[84%] border border-line/80 bg-surface/55 px-4 py-3", m.error && "border-warn/55 bg-warn/[0.06]")}>
                    <span className="mb-1 block font-data text-[8px] tracking-[0.16em] text-ink-faint">{assistantName.toUpperCase()} / VOID AI</span>
                    <div className={cn("whitespace-pre-wrap text-sm leading-6 text-ink-dim", m.error && "text-warn")}>
                      {m.content || (sending ? <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 animate-pulse bg-primary" />正在分析链路…</span> : "")}
                      {m.content === "" && !sending && <span className="text-ink-faint">…</span>}
                    </div>
                  </div>
                </div>
              ),
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-line/80 bg-bg/95 p-3 backdrop-blur-2xl lg:px-8 lg:py-4">
            {!enabled ? (
              <div className="flex min-h-11 items-center justify-between gap-3 border border-warn/25 bg-warn/[0.05] px-3 text-xs text-warn">
                <span>智能客服暂时关闭，请切换人工客服。</span>
                {wechat && <span className="font-data text-[10px] text-ink-dim">WECHAT: {wechat}</span>}
              </div>
            ) : (
              <div className="mx-auto max-w-3xl">
                {quickQuestions.length > 0 && userMessages === 0 && (
                  <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
                    {quickQuestions.map((q, index) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => send(q)}
                        className="press-command terminal-line min-h-touch shrink-0 border border-line bg-surface/55 px-3 text-left text-[11px] text-ink-dim hover:border-primary/40 hover:text-primary"
                      >
                        <span className="mr-2 font-data text-[8px] text-primary">Q{index + 1}</span>{q}
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative flex items-end gap-2 border border-line bg-surface/70 p-2 focus-within:border-primary/55">
                  <span className="absolute left-0 top-0 h-full w-px bg-primary/75" />
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        send(input)
                      }
                    }}
                    rows={1}
                    placeholder="输入问题，或描述你需要的战术服务…"
                    className="max-h-28 min-h-touch min-w-0 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint"
                  />
                  <button
                    type="button"
                    onClick={() => send(input)}
                    disabled={sending || !input.trim()}
                    className="command-button press-command relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border border-primary bg-primary text-onPrimary disabled:opacity-35"
                    aria-label="发送消息"
                  >
                    <IconSend size={18} />
                  </button>
                </div>
                <p className="mt-2 text-center font-data text-[8px] tracking-[0.14em] text-ink-faint">ENTER TO SEND / SHIFT + ENTER FOR NEW LINE / AI OUTPUT MAY REQUIRE REVIEW</p>
              </div>
            )}
          </div>
        </section>

        <aside className="hidden border-l border-line/80 bg-surface/25 p-5 lg:block">
          <p className="font-data text-[9px] tracking-[0.2em] text-ink-faint">CHANNEL STATUS</p>
          <div className="mt-4 space-y-3">
            {[
              ["AI SUPPORT", enabled ? "ONLINE" : "OFFLINE", enabled ? "text-ok" : "text-warn"],
              ["HUMAN RELAY", wechat ? "READY" : "PENDING", wechat ? "text-info" : "text-ink-faint"],
              ["DATA POLICY", "PRIVATE", "text-gold"],
            ].map(([label, value, tone]) => (
              <div key={label} className="border border-line/75 bg-bg/35 p-3">
                <p className="font-data text-[8px] tracking-[0.14em] text-ink-faint">{label}</p>
                <p className={cn("mt-2 font-data text-[11px]", tone)}>{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-line/75 pt-4">
            <p className="text-xs leading-5 text-ink-faint">智能客服适合咨询价格、流程和规则；涉及订单状态与收款核验时，请以管理端确认为准。</p>
          </div>
        </aside>
      </main>
    </div>
  )
}