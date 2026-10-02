import type { Companion } from '@/lib/types'
import { Avatar, Money, Tag, cn } from '@/components/ui'

export default function CompanionCard({
  companion,
  onClick,
  featured = false,
  index,
}: {
  companion: Companion
  onClick: () => void
  featured?: boolean
  index?: number
}) {
  const off = companion.status !== 1
  const code = String(index ?? companion.sort + 1).padStart(2, '0')

  return (
    <article className={cn('operator-card group', off && 'opacity-50')}>
      <button type="button" onClick={onClick} className="flex w-full items-stretch text-left">
        <div className={cn('relative flex shrink-0 flex-col items-center justify-start border-r border-line bg-bg/35 px-3 pt-4', featured ? 'w-[84px]' : 'w-[76px]')}>
          <span className="absolute left-2 top-2 font-data text-[9px] tracking-[0.12em] text-ink-faint">{code}</span>
          <span className="mt-5 block">
            <Avatar name={companion.name} src={companion.avatar} size={featured ? 64 : 56} />
          </span>
          <span className={cn('mt-2 inline-flex items-center gap-1 font-data text-[9px] tracking-[0.12em]', off ? 'text-ink-faint' : 'text-ok')}>
            <span className={cn('h-1.5 w-1.5 rounded-full', off ? 'bg-ink-faint' : 'bg-ok')} />
            {off ? 'OFFLINE' : 'ONLINE'}
          </span>
        </div>

        <div className="min-w-0 flex-1 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold leading-5 text-ink group-hover:text-primary">{companion.name}</h3>
              <p className="mt-1 font-data text-[9px] tracking-[0.12em] text-ink-faint">
                {companion.rank || 'UNRANKED'} // {companion.gender || 'ANY'}
              </p>
            </div>
            <span className="shrink-0 border border-line px-1.5 py-1 font-data text-[9px] text-ink-faint">UNIT {code}</span>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {companion.tags.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>)}
          </div>

          <p className="mt-2.5 line-clamp-1 text-[11px] leading-4 text-ink-faint">{companion.description || 'VOID 认证服务，专业陪玩与护航。'}</p>

          <div className="mt-3 flex items-end justify-between gap-3 border-t border-line/70 pt-2.5">
            <span className="font-data text-xl font-semibold leading-none text-gold">
              <Money value={companion.price} />
              <span className="ml-1 text-[9px] font-normal tracking-[0.08em] text-ink-faint">/{companion.unit}</span>
            </span>
            <span className="font-data text-[10px] text-ink-faint">成交 {companion.sales}</span>
          </div>
        </div>
      </button>
      <div className="flex items-center justify-between border-t border-line/70 px-3.5 py-2">
        <span className="font-data text-[9px] tracking-[0.13em] text-ink-faint">RATE {companion.rating?.toFixed(1) || '5.0'} / VOID VERIFIED</span>
        <span className="font-data text-[9px] tracking-[0.12em] text-primary opacity-0 transition-opacity group-hover:opacity-100">DEPLOY →</span>
      </div>
    </article>
  )
}