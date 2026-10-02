"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  IconChart,
  IconChat,
  IconCommunity,
  IconHome,
  IconList,
  IconMoon,
  IconPackage,
  IconSend,
  IconSettings,
  IconSun,
  IconTag,
  IconUserPlus,
  cn,
} from "@/components/ui"

const NAV_GROUPS = [
  {
    label: "指挥中心",
    items: [
      { href: "/admin", label: "仪表盘", code: "OVERVIEW", Icon: IconHome },
      { href: "/admin/stats", label: "数据分析", code: "ANALYTICS", Icon: IconChart },
    ],
  },
  {
    label: "交易链路",
    items: [
      { href: "/admin/orders", label: "订单调度", code: "ORDERS", Icon: IconList },
      { href: "/admin/withdrawals", label: "提现审核", code: "PAYOUTS", Icon: IconChat },
    ],
  },
  {
    label: "内容与供给",
    items: [
      { href: "/admin/community", label: "社区治理", code: "COMMUNITY", Icon: IconCommunity },
      { href: "/admin/companions", label: "陪玩管理", code: "SERVICES", Icon: IconPackage },
      { href: "/admin/fighter-applications", label: "打手申请", code: "RECRUIT", Icon: IconUserPlus },
      { href: "/admin/service-types", label: "服务类型", code: "TAXONOMY", Icon: IconTag },
    ],
  },
  {
    label: "系统",
    items: [
      { href: "/admin/ai", label: "智能客服", code: "AI DESK", Icon: IconChat },
      { href: "/admin/messages", label: "消息管理", code: "MESSAGES", Icon: IconSend },
      { href: "/admin/settings", label: "平台设置", code: "SETTINGS", Icon: IconSettings },
    ],
  },
]

const NAV = NAV_GROUPS.flatMap((group) => group.items)
const THEME_KEY = "void-admin-theme"

function currentSection(pathname: string) {
  return NAV.find((item) => item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)) || NAV[0]
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [dark, setDark] = useState(false)
  const [clock, setClock] = useState("")

  useEffect(() => {
    setDark(window.localStorage.getItem(THEME_KEY) === "dark")
    const update = () => setClock(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }))
    update()
    const timer = window.setInterval(update, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  function toggleTheme() {
    setDark((value) => {
      const next = !value
      window.localStorage.setItem(THEME_KEY, next ? "dark" : "light")
      return next
    })
  }

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" })
    router.replace("/admin/login")
  }

  const section = currentSection(pathname)

  if (pathname === '/admin/login') return <>{children}</>

  return (
    <div className={cn("admin-theme flex min-h-screen bg-bg text-ink", dark && "dark")}>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface/72 backdrop-blur-2xl md:flex">
        <div className="border-b border-line px-4 py-5">
          <Link href="/admin" className="flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center border border-primary/30 bg-primary/[0.07]">
              <img src="/logo.svg" alt="VOID" className="h-6 w-6 object-contain" />
              <span className="absolute -right-px -top-px h-2 w-2 border-r border-t border-primary" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-base font-bold tracking-[0.1em] text-ink">VOID COMMAND</span>
              <span className="mt-0.5 block font-data text-[8px] tracking-[0.16em] text-primary">ADMIN CONSOLE / V1</span>
            </span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-4 flex items-center justify-between border border-line bg-bg/35 px-3 py-2.5">
            <div className="flex items-center gap-2 text-[10px] text-ok"><span className="h-1.5 w-1.5 rounded-full bg-ok" /> SECURE SESSION</div>
            <span className="font-data text-[9px] text-ink-faint">{clock}</span>
          </div>
          <nav className="space-y-5">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-2 font-data text-[8px] tracking-[0.18em] text-ink-faint">{group.label}</p>
                <div className="space-y-1">
                  {group.items.map(({ href, label, code, Icon }) => {
                    const on = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href)
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={cn(
                          "press-command group relative flex min-h-touch items-center gap-3 overflow-hidden border px-3 text-sm transition-command",
                          on ? "border-primary/25 bg-primary/[0.075] text-primary" : "border-transparent text-ink-dim hover:border-line hover:bg-surface2/75 hover:text-ink",
                        )}
                      >
                        {on && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" />}
                        <Icon size={17} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{label}</span>
                          <span className={cn("mt-0.5 block font-data text-[8px] tracking-[0.12em]", on ? "text-primary/65" : "text-ink-faint/70")}>{code}</span>
                        </span>
                        {on && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="border-t border-line p-3">
          <div className="border border-line bg-bg/35 p-3">
            <div className="flex items-center justify-between"><p className="font-data text-[8px] tracking-[0.16em] text-ink-faint">ADMIN SESSION</p><span className="text-ok">●</span></div>
            <p className="mt-2 text-xs font-medium text-ink">管理员控制台</p>
            <p className="mt-1 text-[10px] leading-4 text-ink-faint">登录与关键操作审计已启用。</p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/88 backdrop-blur-2xl">
          <div className="flex min-h-[64px] items-center justify-between gap-3 px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden h-10 w-10 items-center justify-center border border-line bg-surface2 text-primary md:flex"><section.Icon size={18} /></span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{section.label}</p>
                <p className="mt-0.5 truncate font-data text-[9px] tracking-[0.14em] text-ink-faint">{section.code} / DELTA GAME SERVICE PLATFORM</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 border border-line bg-surface2/70 px-3 py-2 font-data text-[9px] tracking-[0.1em] text-ink-faint lg:flex"><span className="h-1.5 w-1.5 rounded-full bg-ok" /> SYSTEM ONLINE</span>
              <button
                type="button"
                onClick={toggleTheme}
                aria-pressed={dark}
                aria-label={dark ? "切换为浅色主题" : "切换为暗色主题"}
                className="press-command flex h-11 w-11 items-center justify-center border border-line bg-surface text-ink-dim hover:border-primary/35 hover:text-primary"
              >
                {dark ? <IconSun size={17} /> : <IconMoon size={17} />}
              </button>
              <button
                type="button"
                onClick={logout}
                className="press-command min-h-touch border border-line bg-surface px-3 text-xs text-ink-dim hover:border-danger/35 hover:text-danger"
              >
                退出登录
              </button>
            </div>
          </div>
        </header>
        <main className="admin-workspace flex-1 p-4 md:p-6">{children}</main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-line bg-surface/96 backdrop-blur md:hidden">
        {NAV.map(({ href, label, Icon }) => {
          const on = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex min-w-16 flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[10px]",
                on ? "text-primary" : "text-ink-faint",
              )}
            >
              {on && <span className="absolute inset-x-3 top-0 h-0.5 bg-primary" />}
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}