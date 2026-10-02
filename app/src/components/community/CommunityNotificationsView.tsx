"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CommunityNotification } from '@/lib/types'
import { api } from '@/lib/client'
import { Avatar, EmptyState, HudPanel, IconBack, IconBell, Skeleton, cn } from '@/components/ui'

const TYPE_LABEL: Record<CommunityNotification['type'], string> = {
  like: '点赞',
  favorite: '收藏',
  comment: '评论',
  follow: '关注',
  order: '成交',
  moderation: '审核',
  system: '系统',
}

const TYPE_CODE: Record<CommunityNotification['type'], string> = {
  like: 'LIKE',
  favorite: 'SAVE',
  comment: 'REPLY',
  follow: 'FOLLOW',
  order: 'ORDER',
  moderation: 'REVIEW',
  system: 'SYSTEM',
}

type FilterKey = 'all' | 'unread' | 'interaction' | 'trade' | 'system'
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未读' },
  { key: 'interaction', label: '互动' },
  { key: 'trade', label: '交易' },
  { key: 'system', label: '系统' },
]

function timeLabel(value: string) {
  return value ? value.slice(5, 16) : ''
}

function matchesFilter(item: CommunityNotification, filter: FilterKey) {
  if (filter === 'all') return true
  if (filter === 'unread') return !item.isRead
  if (filter === 'interaction') return ['like', 'favorite', 'comment', 'follow'].includes(item.type)
  if (filter === 'trade') return item.type === 'order'
  return ['moderation', 'system'].includes(item.type)
}

export default function CommunityNotificationsView({
  onBack,
  onOpenPost,
  onUser,
  onNotice,
}: {
  onBack: () => void
  onOpenPost: (id: string) => void
  onUser: (id: string) => void
  onNotice: (message: string) => void
}) {
  const [items, setItems] = useState<CommunityNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api<{ items: CommunityNotification[]; unread: number }>('/api/community/notifications')
      setItems(result.items || [])
      setUnread(result.unread || 0)
    } catch (reason: any) {
      onNotice(reason.message || '通知加载失败')
    } finally {
      setLoading(false)
    }
  }, [onNotice])

  useEffect(() => {
    void load()
  }, [load])

  async function read(item: CommunityNotification) {
    if (!item.isRead) {
      try {
        await api('/api/community/notifications/read', { method: 'POST', body: JSON.stringify({ id: item.id }) })
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry))
        setUnread((current) => Math.max(0, current - 1))
      } catch {
        // 阅读状态失败不阻塞跳转。
      }
    }
    if (item.postId) onOpenPost(item.postId)
    else if (item.actorId) onUser(item.actorId)
  }

  async function readAll() {
    if (busy || unread === 0) return
    setBusy(true)
    try {
      await api('/api/community/notifications/read', { method: 'POST', body: JSON.stringify({ all: true }) })
      setItems((current) => current.map((item) => ({ ...item, isRead: true })))
      setUnread(0)
    } catch (reason: any) {
      onNotice(reason.message || '操作失败')
    } finally {
      setBusy(false)
    }
  }

  const visibleItems = useMemo(() => items.filter((item) => matchesFilter(item, filter)), [filter, items])

  return (
    <div className="void-shell min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/90 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-14 max-w-4xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={onBack} className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-dim hover:bg-surface hover:text-ink" aria-label="返回"><IconBack size={20} /></button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-ink">社区通知</h1>
              <p className="truncate font-data text-[9px] tracking-[0.16em] text-ink-faint">SIGNAL INBOX / CHANNEL 07</p>
            </div>
          </div>
          <button type="button" onClick={() => void readAll()} disabled={busy || unread === 0} className={cn('press-command min-h-touch border px-3 text-xs transition-command', unread ? 'border-primary/35 bg-primary/[0.06] text-primary' : 'cursor-not-allowed border-line text-ink-faint')}>全部已读{unread ? ` · ${unread}` : ''}</button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-4 sm:py-6">
        <section className="command-panel page-enter relative overflow-hidden">
          <div className="hud-grid absolute inset-0 opacity-35" />
          <div className="relative grid gap-5 p-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-end sm:p-6">
            <div>
              <p className="font-data text-[9px] tracking-[0.18em] text-ink-faint">UNREAD SIGNALS</p>
              <p className="editorial-number mt-2 text-[5.5rem] text-primary sm:text-[6.5rem]">{String(unread).padStart(2, '0')}</p>
            </div>
            <div className="border-t border-line pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-ink">来自社区链路的新信号</h2>
              <p className="mt-2 max-w-xl text-xs leading-6 text-ink-dim">互动、审核结果与成交进度会汇总到这里。点击一条通知即可标记已读并跳转到对应帖子或用户主页。</p>
              <div className="mt-4 flex flex-wrap items-center gap-4 font-data text-[9px] tracking-[0.12em] text-ink-faint">
                <span><span className="text-ink">{items.length}</span> TOTAL</span>
                <span><span className="text-primary">{unread}</span> UNREAD</span>
                <span className="flex items-center gap-1.5 text-ok"><span className="h-1.5 w-1.5 rounded-full bg-ok" /> CHANNEL ONLINE</span>
              </div>
            </div>
          </div>
        </section>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((item) => (
            <button key={item.key} type="button" onClick={() => setFilter(item.key)} className={cn('press-command min-h-touch shrink-0 border px-3.5 text-xs transition-command', filter === item.key ? 'border-primary bg-primary text-onPrimary' : 'border-line bg-surface/65 text-ink-dim hover:border-primary/40 hover:text-ink')}>
              {item.label}{item.key === 'unread' && unread > 0 ? ` ${unread}` : ''}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="space-y-2">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-24 w-full" />)}</div>
          ) : items.length === 0 ? (
            <HudPanel><EmptyState icon={<IconBell size={22} />} title="暂无新通知" text="帖子收到互动、审核结果和成交进展时会出现在这里。" /></HudPanel>
          ) : visibleItems.length === 0 ? (
            <HudPanel><EmptyState icon={<IconBell size={22} />} title="该分类暂无信号" text="切换到其他筛选条件查看。" /></HudPanel>
          ) : (
            <div className="stagger-list space-y-2">
              {visibleItems.map((item, index) => (
                <button key={item.id} type="button" onClick={() => void read(item)} className={cn('group relative flex w-full items-start gap-3 overflow-hidden border p-4 text-left transition-command hover:border-lineStrong sm:gap-4 sm:p-5', item.isRead ? 'border-line bg-surface/62' : 'border-primary/25 bg-primary/[0.045]')}>
                  <span className={cn('absolute inset-y-0 left-0 w-0.5', item.isRead ? 'bg-line' : 'bg-primary')} />
                  <span className="hidden w-14 shrink-0 pt-0.5 font-data text-[8px] tracking-[0.12em] text-ink-faint sm:block">
                    <span className={cn('block', !item.isRead && 'text-primary')}>{TYPE_CODE[item.type]}</span>
                    <span className="mt-1 block">{String(index + 1).padStart(2, '0')}</span>
                  </span>
                  <Avatar name={item.actorName || 'VOID'} src={item.actorAvatar} size={38} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-ink group-hover:text-primary">{item.actorName || 'VOID System'}</span>
                      <span className="shrink-0 font-data text-[9px] text-ink-faint">{timeLabel(item.createdAt)}</span>
                    </span>
                    <span className="mt-1.5 block text-xs leading-5 text-ink-dim">{item.content}</span>
                    <span className="mt-3 flex items-center gap-2">
                      <span className="border border-line px-2 py-0.5 font-data text-[9px] tracking-[0.1em] text-ink-faint">{TYPE_LABEL[item.type]}</span>
                      {!item.isRead && <span className="flex items-center gap-1.5 font-data text-[9px] tracking-[0.1em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> NEW</span>}
                    </span>
                  </span>
                  <span className="hidden self-center font-data text-[9px] tracking-[0.1em] text-ink-faint transition-colors group-hover:text-primary sm:block">OPEN -&gt;</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}