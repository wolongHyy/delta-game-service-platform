import { IconArrowUpRight, IconChat, IconCommunity, IconGrid, IconHome, IconUser, cn } from '@/components/ui'

export type TabKey = 'home' | 'category' | 'community' | 'messages' | 'profile'

const TABS: { key: TabKey; label: string; code: string; Icon: typeof IconHome }[] = [
  { key: 'home', label: '首页', code: 'H-01', Icon: IconHome },
  { key: 'category', label: '服务', code: 'S-02', Icon: IconGrid },
  { key: 'community', label: '社区', code: 'C-03', Icon: IconCommunity },
  { key: 'messages', label: '消息', code: 'M-04', Icon: IconChat },
  { key: 'profile', label: '我的', code: 'P-05', Icon: IconUser },
]

export default function TabBar({ active, onTab }: { active: TabKey; onTab: (k: TabKey) => void }) {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-2 z-40 px-3 safe-bottom lg:hidden">
      <div className="pointer-events-auto mx-auto grid max-w-[540px] grid-cols-5 overflow-hidden rounded-[5px_18px_5px_18px] border border-line/90 bg-surface/94 shadow-dock backdrop-blur-2xl">
        {TABS.map(({ key, label, code, Icon }) => {
          const on = active === key
          const primary = key === 'community'
          return (
            <button
              key={key}
              type="button"
              onClick={() => onTab(key)}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'group relative flex min-h-[62px] flex-col items-center justify-center gap-1 px-1 py-2 font-data text-[9px] tracking-[0.05em] transition-command',
                on ? 'bg-primary/[0.08] text-primary' : 'text-ink-faint hover:bg-surface2/70 hover:text-ink-dim',
                primary && !on && 'text-ink-dim',
              )}
            >
              {on && <span className="absolute inset-x-2 top-0 h-px bg-primary shadow-[0_0_12px_rgb(var(--primary-rgb))]" />}
              <span className={cn('relative flex h-6 w-6 items-center justify-center', on && 'text-primary')}>
                <Icon size={19} />
                {primary && <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-danger" />}
              </span>
              <span>{label}</span>
              <span className={cn('absolute bottom-1 font-data text-[7px] tracking-[0.1em] opacity-0', on && 'opacity-60')}>{code}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function DesktopNav({ active, onTab, onChat }: { active: TabKey; onTab: (k: TabKey) => void; onChat: () => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line/80 bg-surface/78 px-4 py-5 backdrop-blur-2xl lg:flex">
      <div className="flex items-center gap-3 px-2">
        <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[4px_12px_4px_12px] border border-primary/35 bg-primary/10">
          <img src="/logo.svg" alt="VOID" className="h-6 w-6 object-contain" />
        </span>
        <div>
          <p className="font-display text-xl font-bold tracking-[0.18em] text-ink">VOID</p>
          <p className="mt-0.5 font-data text-[8px] tracking-[0.18em] text-primary">DELTA COMMAND DECK</p>
        </div>
      </div>

      <div className="mt-9 flex items-center justify-between px-2">
        <span className="font-data text-[9px] tracking-[0.2em] text-ink-faint">NAVIGATION</span>
        <span className="signal-dot" />
      </div>
      <nav className="mt-2 space-y-1">
        {TABS.map(({ key, label, code, Icon }) => {
          const on = active === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onTab(key)}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'press-command group relative flex min-h-touch w-full items-center gap-3 overflow-hidden border px-3 text-left text-sm transition-command',
                on
                  ? 'border-primary/35 bg-primary/[0.09] text-primary'
                  : 'border-transparent text-ink-dim hover:border-line hover:bg-surface2/65 hover:text-ink',
              )}
            >
              {on && <span className="absolute inset-y-1 left-0 w-0.5 bg-primary shadow-[0_0_10px_rgb(var(--primary-rgb))]" />}
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              <span className="font-data text-[8px] tracking-[0.12em] text-ink-faint">{code}</span>
              {on && <IconArrowUpRight size={14} />}
            </button>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={onChat}
        className="press-command mt-5 flex min-h-touch items-center justify-center gap-2 border border-primary/35 bg-primary/[0.08] font-data text-[11px] tracking-[0.08em] text-primary hover:bg-primary/15"
      >
        <IconChat size={17} />
        智能客服 / AI
      </button>

      <div className="relative mt-auto overflow-hidden border border-line bg-bg/35 p-3.5">
        <div className="hud-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative">
          <p className="font-data text-[9px] tracking-[0.18em] text-ink-faint">SYSTEM STATUS</p>
          <p className="mt-3 flex items-center gap-2 font-data text-[11px] text-ok"><span className="signal-dot" /> COMMAND ONLINE</p>
          <p className="mt-2 font-data text-[9px] text-ink-faint">AUTH / LOCAL SESSION</p>
        </div>
      </div>
    </aside>
  )
}