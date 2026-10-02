import { useEffect, useId, useRef } from 'react'
import type { CommunityEvidence } from '@/lib/types'
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

type IconProps = { size?: number; className?: string }

function Svg({ size = 20, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </Svg>
)

export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Svg>
)

export const IconChat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 12a8 8 0 0 1-8 8H4l2.2-2.6A8 8 0 1 1 21 12Z" />
    <path d="M8.5 11h7M8.5 15h4" />
  </Svg>
)

export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
  </Svg>
)

export const IconUserPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M19 8v6M16 11h6" />
  </Svg>
)

export const IconBack = (p: IconProps) => (
  <Svg {...p}>
    <path d="m14 5-7 7 7 7" />
  </Svg>
)

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
)

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12 5 5 9-10" />
  </Svg>
)

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
)

export const IconEdit = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
  </Svg>
)

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Svg>
)

export const IconSend = (p: IconProps) => (
  <Svg {...p}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </Svg>
)

export const IconList = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <path d="M3 6h.01M3 12h.01M3 18h.01" />
  </Svg>
)

export const IconChart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
  </Svg>
)

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </Svg>
)

export const IconTag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12.6 2.6 21 11a2 2 0 0 1 0 2.8l-7.2 7.2a2 2 0 0 1-2.8 0L2.6 12.6A2 2 0 0 1 2 11.2V4a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6Z" />
    <circle cx="7.5" cy="7.5" r="1.2" />
  </Svg>
)

export const IconPackage = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8Z" />
    <path d="M3.3 7 12 12l8.7-5M12 22V12" />
  </Svg>
)


export const IconCommunity = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="2.2" />
    <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.6 4.6a10.5 10.5 0 0 0 0 14.8M19.4 4.6a10.5 10.5 0 0 1 0 14.8" />
  </Svg>
)

export const IconHeart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
  </Svg>
)

export const IconBookmark = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
  </Svg>
)

export const IconBell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
  </Svg>
)

export const IconBook = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
  </Svg>
)

export const IconImage = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9" r="1.5" />
    <path d="m21 15-5-5L5 20" />
  </Svg>
)

export const IconMore = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
  </Svg>
)

export const IconFilter = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Svg>
)

export const IconSun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
)

export const IconMoon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.7 14.1A8.5 8.5 0 0 1 9.9 3.3 8.5 8.5 0 1 0 20.7 14.1Z" />
  </Svg>
)

export const IconArrowUpRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 17 17 7M8 7h9v9" />
  </Svg>
)

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'soft'
  size?: 'sm' | 'md'
  block?: boolean
}

export function Btn({ variant = 'primary', size = 'md', block, className, ...rest }: BtnProps) {
  const base = 'command-button press-command relative inline-flex min-h-touch items-center justify-center gap-1.5 overflow-hidden rounded-btn border border-transparent font-medium transition-colors disabled:pointer-events-none disabled:opacity-35 cursor-pointer'
  const sizes = { sm: 'h-11 px-3 text-xs', md: 'h-11 px-4 text-sm' }
  const variants = {
    primary: 'border-primary bg-primary text-onPrimary shadow-glow hover:bg-primary-bright',
    outline: 'border-primary/55 bg-primary/[0.035] text-primary hover:bg-primary/10',
    ghost: 'text-ink-dim hover:text-ink hover:bg-primary/5',
    danger: 'border-danger/40 bg-danger/10 text-danger hover:bg-danger/20',
    soft: 'border-primary/20 bg-primary/10 text-primary hover:bg-primary/20',
  }
  return <button className={cn(base, sizes[size], variants[variant], block && 'w-full', className)} {...rest} />
}

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div {...props} className={cn('command-panel shadow-card', className)}>{children}</div>
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[3px] border border-line bg-surface2/80 px-2 py-0.5 text-[11px] leading-4 text-ink-dim',
        className,
      )}
    >
      {children}
    </span>
  )
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  unpaid: { label: '待付款', cls: 'text-warn bg-warn/10 border-warn/30' },
  payment_review: { label: '待确认到账', cls: 'text-warn bg-warn/10 border-warn/30' },
  assigned: { label: '待服务', cls: 'text-primary bg-primary/10 border-primary/30' },
  completion_pending: { label: '待确认完成', cls: 'text-warn bg-warn/10 border-warn/30' },
  pending: { label: '待接单', cls: 'text-warn bg-warn/10 border-warn/30' },
  in_progress: { label: '进行中', cls: 'text-ok bg-ok/10 border-ok/30' },
  completed: { label: '已完成', cls: 'text-primary bg-primary/10 border-primary/30' },
  cancelled: { label: '已取消', cls: 'text-ink-faint bg-surface2 border-line' },
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status, cls: 'text-ink-dim bg-surface2 border-line' }
  return (
    <span className={cn('inline-flex items-center rounded-[3px] border px-2 py-0.5 text-[11px] leading-4 font-data tracking-wide', s.cls)}>
      {s.label}
    </span>
  )
}

const FIGHTER_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: '待审核', cls: 'text-warn bg-warn/10 border-warn/30' },
  approved: { label: '已通过', cls: 'text-ok bg-ok/10 border-ok/30' },
  rejected: { label: '已拒绝', cls: 'text-danger bg-danger/10 border-danger/30' },
}

export function FighterStatusBadge({ status }: { status: string }) {
  const s = FIGHTER_STATUS_MAP[status] || { label: status, cls: 'text-ink-dim bg-surface2 border-line' }
  return (
    <span className={cn('inline-flex items-center rounded-[3px] border px-2 py-0.5 text-[11px] leading-4 font-data tracking-wide', s.cls)}>
      {s.label}
    </span>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-xs text-ink-dim">
        <span>{label}</span>
        {hint && <span className="text-[11px] text-ink-faint">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-btn border border-line bg-surface2/80 px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-primary/65 focus:bg-surface2 focus:shadow-glow'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputCls, 'min-h-20 resize-y', props.className)} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputCls, 'appearance-none', props.className)} />
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', handleKeyDown)
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previous?.focus()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="command-panel max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[18px] p-4 shadow-card outline-none sm:rounded-[5px_18px_5px_18px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 id={titleId} className="text-base font-semibold text-ink">{title}</h3>
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full text-ink-dim hover:bg-primary/5 hover:text-ink" aria-label="关闭弹窗">
            <IconClose size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
export function Empty({ text = '暂无数据' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <IconSearch size={24} />
      </div>
      <p className="text-sm text-ink-faint">{text}</p>
    </div>
  )
}

export function Avatar({ name, src, size = 48 }: { name: string; src?: string; size?: number }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-[4px_50%_50%_4px] border border-primary/30 object-cover shadow-[0_0_0_1px_rgb(var(--primary-rgb)/0.08),0_10px_24px_rgb(0_0_0/0.22)]"
      />
    )
  }
  const ch = name.trim().slice(0, 1) || '?'
  return (
    <div
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className="flex shrink-0 items-center justify-center rounded-[4px_50%_50%_4px] border border-primary/25 bg-primary/10 font-semibold text-primary shadow-[0_0_0_1px_rgb(var(--primary-rgb)/0.06),0_0_22px_rgb(var(--primary-rgb)/0.08)_inset]"
    >
      {ch}
    </div>
  )
}

export function Money({ value }: { value: number }) {
  const v = Math.round(value * 100) / 100
  return <span>¥{v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)}</span>
}

export function HudPanel({
  id,
  title,
  meta,
  action,
  className,
  children,
  scan = false,
}: {
  id?: string
  title?: string
  meta?: string
  action?: ReactNode
  className?: string
  children: ReactNode
  scan?: boolean
}) {
  return (
    <section id={id} className={cn('command-panel panel-corner relative overflow-hidden', scan && 'hud-scan', className)}>
      {(title || action) && (
        <div className="relative flex min-h-12 items-center justify-between gap-3 border-b border-line/80 px-4 py-3">
          <span className="absolute inset-y-0 left-0 w-px bg-primary/70" />
          <div className="min-w-0">
            {title && <h2 className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">{title}</h2>}
            {meta && <p className="mt-0.5 font-data text-[9px] uppercase tracking-[0.18em] text-ink-faint">{meta}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function ActionDock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-primary/25 bg-surface/95 shadow-dock backdrop-blur-xl', className)}>
      <div className="mx-auto flex min-h-[68px] max-w-md items-center justify-between gap-3 px-4 py-2 lg:max-w-5xl">{children}</div>
    </div>
  )
}

export function MetricCard({
  label,
  value,
  hint,
  tone = 'default',
  className,
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'default' | 'ok' | 'warn' | 'danger' | 'gold' | 'info'
  className?: string
}) {
  const tones = {
    default: 'text-ink',
    ok: 'text-ok',
    warn: 'text-warn',
    danger: 'text-danger',
    gold: 'text-gold',
    info: 'text-info',
  }
  return (
    <div className={cn('command-panel min-h-[92px] p-3.5', className)}>
      <div className="mb-3 flex items-center justify-between gap-2"><p className="text-[11px] text-ink-faint">{label}</p><span className="h-px w-8 bg-line" /></div>
      <p className={cn('mt-1.5 font-data text-xl font-semibold tabular', tones[tone])}>{value}</p>
      {hint && <p className="mt-1 text-[10px] leading-4 text-ink-faint">{hint}</p>}
    </div>
  )
}

export function IdentityBadge({
  name,
  src,
  level = 1,
  role = 'VOID COMMANDER',
  className,
}: {
  name: string
  src?: string
  level?: number
  role?: string
  className?: string
}) {
  return (
    <div className={cn('tactical-panel flex items-center gap-3 p-3', className)}>
      <Avatar name={name} src={src} size={46} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{name}</p>
        <p className="mt-0.5 font-data text-[10px] tracking-[0.12em] text-ink-faint">{role}</p>
      </div>
      <span className="rounded-btn border border-gold/35 bg-gold/10 px-2 py-1 font-data text-[10px] text-gold">LV.{level}</span>
    </div>
  )
}

export function EvidenceCard({ evidence, className }: { evidence: CommunityEvidence; className?: string }) {
  return (
    <article className={cn('command-panel border-gold/35 bg-gold/[0.055] p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-data text-[10px] uppercase tracking-[0.14em] text-gold">TRADE VERIFIED</p>
          <p className="mt-1 text-sm font-semibold text-ink">{evidence.serviceName || evidence.companionName || '陪玩服务'}</p>
        </div>
        <span className="rounded-btn border border-gold/30 px-2 py-1 font-data text-[10px] text-gold">已成交</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gold/15 pt-3">
        <div>
          <p className="text-[10px] text-ink-faint">成交金额</p>
          <p className="mt-0.5 font-data text-sm font-semibold text-gold"><Money value={evidence.amount} /></p>
        </div>
        <div>
          <p className="text-[10px] text-ink-faint">完成时间</p>
          <p className="mt-0.5 font-data text-xs text-ink-dim">{evidence.completedAt?.slice(0, 16) || '已完成'}</p>
        </div>
      </div>
    </article>
  )
}

export function CommandInput({
  value,
  onChange,
  placeholder,
  onSearch,
  className,
  inputClassName,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onSearch?: () => void
  className?: string
  inputClassName?: string
}) {
  return (
    <div className={cn('flex min-h-touch items-center gap-2 rounded-card border border-line bg-surface2/80 px-3 focus-within:border-primary/60', className)}>
      <IconSearch size={16} className="shrink-0 text-ink-faint" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && onSearch) onSearch()
        }}
        placeholder={placeholder}
        className={cn('min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint', inputClassName)}
      />
    </div>
  )
}

export function EmptyState({
  title = '暂无数据',
  text,
  action,
  icon,
  className,
}: {
  id?: string
  title?: string
  text?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-card border border-line bg-surface2 text-ink-faint">
        {icon || <IconSearch size={21} />}
      </div>
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-xs text-xs leading-5 text-ink-faint">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-btn bg-surface2', className)} />
}
