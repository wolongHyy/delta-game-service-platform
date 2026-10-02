import type { ReactNode } from 'react'
import { cn } from '@/components/ui'

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  className,
}: {
  eyebrow: string
  title: string
  description?: string
  meta?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('command-panel trace-scan relative overflow-hidden p-4 md:p-5', className)}>
      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-data text-[9px] tracking-[0.18em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {eyebrow}
          </div>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink md:text-[28px]">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-xs leading-5 text-ink-dim md:text-sm">{description}</p>}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-ink-faint">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 border border-primary/10" />
      <span className="pointer-events-none absolute -bottom-16 right-20 h-28 w-28 rounded-full border border-line/70" />
    </header>
  )
}

export function AdminPanelTitle({
  code,
  title,
  description,
  action,
  className,
}: {
  code: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3', className)}>
      <div>
        <p className="font-data text-[8px] tracking-[0.18em] text-primary">{code}</p>
        <h2 className="mt-1 text-sm font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 text-[11px] leading-4 text-ink-faint">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function AdminMetric({
  code,
  label,
  value,
  hint,
  tone = 'default',
}: {
  code: string
  label: string
  value: ReactNode
  hint?: string
  tone?: 'default' | 'ok' | 'warn' | 'danger' | 'gold' | 'info'
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
    <div className="command-panel relative overflow-hidden p-3.5">
      <div className="flex items-center justify-between">
        <span className="font-data text-[8px] tracking-[0.16em] text-ink-faint">{code}</span>
        <span className="h-px w-7 bg-primary/50" />
      </div>
      <p className={cn('mt-3 font-data text-xl font-semibold tabular-nums', tones[tone])}>{value}</p>
      <p className="mt-1 text-[11px] font-medium text-ink-dim">{label}</p>
      {hint && <p className="mt-1 text-[9px] leading-4 text-ink-faint">{hint}</p>}
    </div>
  )
}

export function AdminNotice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'ok' | 'warn' | 'danger' }) {
  const tones = {
    info: 'border-info/25 bg-info/[0.06] text-info',
    ok: 'border-ok/25 bg-ok/[0.06] text-ok',
    warn: 'border-warn/25 bg-warn/[0.06] text-warn',
    danger: 'border-danger/25 bg-danger/[0.06] text-danger',
  }
  return <div role="status" className={cn('border px-3 py-2 text-xs', tones[tone])}>{children}</div>
}

export function AdminFilterButton({
  active,
  children,
  count,
  onClick,
}: {
  active: boolean
  children: ReactNode
  count?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'press-command flex min-h-touch items-center gap-2 border px-3 text-xs transition-command',
        active ? 'border-primary/40 bg-primary/[0.08] text-primary' : 'border-line bg-surface text-ink-dim hover:border-line-strong hover:text-ink',
      )}
    >
      <span>{children}</span>
      {typeof count === 'number' && <span className={cn('font-data text-[9px]', active ? 'text-primary/70' : 'text-ink-faint')}>{String(count).padStart(2, '0')}</span>}
    </button>
  )
}

export function AdminCode({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'primary' | 'gold' | 'danger' }) {
  const tones = {
    default: 'border-line bg-surface2 text-ink-faint',
    primary: 'border-primary/25 bg-primary/[0.06] text-primary',
    gold: 'border-gold/25 bg-gold/[0.06] text-gold',
    danger: 'border-danger/25 bg-danger/[0.06] text-danger',
  }
  return <span className={cn('inline-flex min-h-6 items-center border px-2 font-data text-[9px] tracking-[0.1em]', tones[tone])}>{children}</span>
}

export function AdminSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="command-panel flex items-center gap-4 p-4">
          <div className="h-10 w-10 animate-pulse bg-surface2" />
          <div className="flex-1 space-y-2"><div className="h-3 w-1/3 animate-pulse bg-surface2" /><div className="h-2 w-2/3 animate-pulse bg-surface2" /></div>
        </div>
      ))}
    </div>
  )
}