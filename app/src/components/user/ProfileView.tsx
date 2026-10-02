"use client"

import { useEffect, useState } from "react"
import type { CommunityProfile } from "@/lib/types"
import { api } from "@/lib/client"
import {
  Avatar,
  HudPanel,
  IconChevronRight,
  IconCommunity,
  IconEdit,
  IconList,
  IconUser,
  IconUserPlus,
  cn,
} from "@/components/ui"

type WechatStatus = {
  enabled: boolean
  authenticated: boolean
  openid: string
  nickname: string
  avatarUrl: string
  phone: string
}

const MODULES = [
  { key: "orders", code: "OPS-01", title: "我的订单", text: "查看任务进度、付款核验与交付状态" },
  { key: "community", code: "NET-04", title: "社区主页", text: "关注动态、收藏情报与公开档案" },
  { key: "compose", code: "INT-07", title: "发布战术情报", text: "关联陪玩服务，沉淀真实成交凭证" },
] as const

export default function ProfileView({
  onOrders,
  onCommunity,
  onCompose,
  onFighterApply,
}: {
  onOrders: () => void
  onCommunity: () => void
  onCompose: () => void
  onFighterApply: () => void
}) {
  const [wechat, setWechat] = useState<WechatStatus | null>(null)
  const [profile, setProfile] = useState<CommunityProfile | null>(null)

  useEffect(() => {
    Promise.allSettled([
      api<WechatStatus>("/api/wechat/status"),
      api<CommunityProfile>("/api/community/me"),
    ]).then(([wechatResult, profileResult]) => {
      if (wechatResult.status === "fulfilled") setWechat(wechatResult.value)
      if (profileResult.status === "fulfilled") setProfile(profileResult.value)
    })
  }, [])

  const displayName = wechat?.nickname || profile?.nickname || (wechat?.openid ? "微信已授权" : "VOID 指挥官")
  const avatar = wechat?.avatarUrl || profile?.avatarUrl || undefined
  const identity = wechat?.openid ? `WX •••• ${wechat.openid.slice(-6)}` : "LOCAL OPERATOR"
  const level = profile?.level || 1
  const actions = {
    orders: onOrders,
    community: onCommunity,
    compose: onCompose,
  }

  return (
    <div className="void-shell min-h-screen pb-36">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/88 px-4 pb-3 pt-4 backdrop-blur-2xl lg:px-8">
        <div className="mx-auto flex max-w-[1180px] items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="signal-dot" />
              <p className="font-data text-[9px] tracking-[0.2em] text-primary">VOID IDENTITY / ONLINE</p>
            </div>
            <h1 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-ink">操作员档案</h1>
          </div>
          <span className="hidden font-data text-[9px] tracking-[0.16em] text-ink-faint sm:block">LOCAL SESSION / SECURE</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] space-y-4 p-4 lg:px-8 lg:py-6">
        <section className="command-panel trace-scan data-matrix relative overflow-hidden">
          <div className="relative z-10 grid gap-0 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
            <div className="p-5 lg:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-data text-[9px] tracking-[0.22em] text-primary">OPERATOR DOSSIER / LV.{level}</p>
                  <h2 className="mt-3 truncate text-3xl font-semibold tracking-[-0.05em] text-ink sm:text-4xl">{displayName}</h2>
                  <p className="mt-2 font-data text-[10px] tracking-[0.14em] text-ink-faint">{identity}</p>
                </div>
                <span className="editorial-number hidden text-[72px] text-primary/15 sm:block">{String(level).padStart(2, "0")}</span>
              </div>

              <div className="mt-6 flex items-center gap-3 border-y border-line/75 py-4">
                {avatar ? (
                  <Avatar name={displayName} src={avatar} size={58} />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center border border-primary/30 bg-primary/10 text-primary">
                    <IconUser size={27} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-5 text-ink-dim">{profile?.bio || "还没有设置签名，去社区留下你的战术名片。"}</p>
                  <p className="mt-2 font-data text-[9px] tracking-[0.13em] text-ok">IDENTITY VERIFIED // READY FOR DEPLOYMENT</p>
                </div>
              </div>

              {wechat?.enabled && (
                <button
                  type="button"
                  onClick={() => { window.location.href = "/api/wechat/oauth?state=/" }}
                  className="press-command terminal-line mt-4 inline-flex min-h-touch items-center gap-2 text-xs text-primary"
                >
                  <span className="h-1.5 w-1.5 bg-primary" />
                  {wechat.openid ? "重新同步微信身份" : "授权微信身份"} <IconChevronRight size={15} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 border-t border-line/80 bg-bg/35 lg:grid-cols-1 lg:border-l lg:border-t-0">
              {[
                { label: "贡献值", value: profile?.contributionScore || 0, tone: "text-gold" },
                { label: "发布情报", value: profile?.postCount || 0, tone: "text-ink" },
                { label: "关注者", value: profile?.followerCount || 0, tone: "text-ok" },
              ].map((item, index) => (
                <div key={item.label} className={cn("flex min-h-[92px] flex-col justify-between border-line/70 p-4", index < 2 && "border-r lg:border-b lg:border-r-0")}>
                  <span className="font-data text-[9px] tracking-[0.15em] text-ink-faint">{item.label}</span>
                  <span className={cn("font-data text-2xl font-semibold tabular", item.tone)}>{String(item.value).padStart(2, "0")}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.42fr)]">
          <HudPanel title="指挥模块" meta="OPERATOR MODULES / 03">
            <div className="divide-y divide-line/75">
              {MODULES.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={actions[item.key]}
                  className="press-command terminal-line group flex min-h-[82px] w-full items-center gap-4 px-4 py-3 text-left hover:bg-primary/[0.035]"
                >
                  <span className="font-data text-[9px] text-ink-faint">{String(index + 1).padStart(2, "0")}</span>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-line bg-bg/40 text-primary group-hover:border-primary/45">
                    {item.key === "orders" ? <IconList size={18} /> : item.key === "community" ? <IconCommunity size={18} /> : <IconEdit size={18} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2"><span className="text-sm font-semibold text-ink group-hover:text-primary">{item.title}</span><span className="font-data text-[8px] tracking-[0.13em] text-ink-faint">{item.code}</span></span>
                    <span className="mt-1 block text-[11px] text-ink-faint">{item.text}</span>
                  </span>
                  <IconChevronRight size={17} className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              ))}
            </div>
          </HudPanel>

          <div className="space-y-4">
            <section className="command-panel relative overflow-hidden border-gold/30 p-4">
              <span className="absolute right-3 top-3 font-data text-[8px] tracking-[0.15em] text-gold/70">CLUB ACCESS</span>
              <span className="flex h-11 w-11 items-center justify-center border border-gold/35 bg-gold/10 text-gold"><IconUserPlus size={21} /></span>
              <h2 className="mt-4 text-lg font-semibold text-ink">成为俱乐部打手</h2>
              <p className="mt-2 text-xs leading-5 text-ink-dim">提交战术档案，审核通过后接入派单、抢单与完单凭证链路。</p>
              <button type="button" onClick={onFighterApply} className="command-button press-command relative mt-5 flex min-h-touch w-full items-center justify-between overflow-hidden border border-gold/35 bg-gold/10 px-4 text-sm text-gold hover:bg-gold/15">
                <span>提交入驻申请</span>
                <span className="font-data text-[9px] tracking-[0.14em]">OPEN FILE -&gt;</span>
              </button>
            </section>

            <div className="border border-line/80 bg-surface/45 p-4">
              <p className="font-data text-[9px] tracking-[0.18em] text-ink-faint">ACCOUNT TELEMETRY</p>
              <div className="mt-3 space-y-2">
                {[
                  ["身份链路", wechat?.openid ? "WECHAT SYNCED" : "LOCAL ONLY", wechat?.openid ? "text-ok" : "text-warn"],
                  ["社区等级", `LV.${level}`, "text-gold"],
                  ["隐私策略", "MASKED", "text-info"],
                ].map(([label, value, tone]) => (
                  <div key={label} className="flex items-center justify-between border-b border-line/55 pb-2 text-[11px] last:border-0 last:pb-0">
                    <span className="text-ink-faint">{label}</span>
                    <span className={cn("font-data text-[9px] tracking-[0.13em]", tone)}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}