"use client"

import { useState } from "react"
import type { CommunityPost } from "@/lib/types"
import { api } from "@/lib/client"
import { Avatar, IconBookmark, IconChat, IconHeart, IconPackage, Tag, cn } from "@/components/ui"

function timeLabel(value: string) {
  return value ? value.slice(5, 16) : ""
}

export default function PostCard({
  post,
  onOpen,
  onUser,
  onNotice,
  onOrder,
  compact = false,
  featured = false,
}: {
  post: CommunityPost
  onOpen: (id: string) => void
  onUser?: (id: string) => void
  onNotice?: (message: string) => void
  onOrder?: (serviceId: string, postId: string) => void
  compact?: boolean
  featured?: boolean
}) {
  const [state, setState] = useState(post)
  const [busy, setBusy] = useState(false)

  async function toggle(kind: "like" | "favorite") {
    if (busy) return
    setBusy(true)
    try {
      const result = await api<{ active: boolean; count: number }>(`/api/community/posts/${state.id}/${kind}`, { method: "POST" })
      setState((current) => kind === "like"
        ? { ...current, liked: result.active, likeCount: result.count }
        : { ...current, favorited: result.active, favoriteCount: result.count })
    } catch (error: any) {
      onNotice?.(error.message)
    } finally {
      setBusy(false)
    }
  }

  const recordCode = `INTEL-${state.id.slice(-5).toUpperCase()}`

  return (
    <article className={cn(
      'group relative overflow-hidden border border-line bg-surface/82 transition-command hover:border-lineStrong hover:bg-surface',
      featured && 'tactical-panel border-primary/25 bg-surface2/80',
    )}>
      {featured && <div className="hud-grid pointer-events-none absolute inset-0 opacity-35" />}
      {featured && (
        <div className="relative flex items-center gap-3 border-b border-primary/25 bg-primary/[0.055] px-4 py-2.5">
          <span className="bg-primary px-2 py-0.5 font-data text-[9px] font-semibold tracking-[0.16em] text-onPrimary">TOP SIGNAL</span>
          <span className="font-data text-[9px] tracking-[0.14em] text-primary/75">RECOMMENDED INTELLIGENCE / {recordCode}</span>
        </div>
      )}

      <div className={cn('relative', featured && 'lg:p-1')}>
        <div className={cn('p-4', featured && 'lg:p-5')}>
          <div className="flex items-start gap-3">
            <button type="button" onClick={() => onUser?.(state.authorId)} className="shrink-0 focus-visible:outline-none">
              <Avatar name={state.authorName} src={state.authorAvatar} size={featured ? 46 : 40} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <button type="button" onClick={() => onUser?.(state.authorId)} className="truncate text-left text-sm font-semibold text-ink hover:text-primary">
                  {state.authorName}
                </button>
                <span className="font-data text-[9px] tracking-[0.08em] text-gold">LV.{state.authorLevel}</span>
                {state.followingAuthor && <span className="border border-primary/25 px-1.5 py-0.5 font-data text-[8px] text-primary">FOLLOWING</span>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 font-data text-[9px] tracking-[0.08em] text-ink-faint">
                <span>{timeLabel(state.createdAt)}</span>
                <span className="h-3 w-px bg-line" />
                <span>#{state.topic || 'GENERAL'}</span>
                {!featured && <span className="hidden text-ink-faint/70 sm:inline">{recordCode}</span>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {state.pinned && <span className="border border-primary/30 bg-primary/10 px-1.5 py-1 font-data text-[8px] text-primary">PIN</span>}
              {state.knowledge && <span className="border border-info/30 bg-info/10 px-1.5 py-1 font-data text-[8px] text-info">INTEL</span>}
            </div>
          </div>

          <button type="button" onClick={() => onOpen(state.id)} className="mt-4 block w-full text-left">
            <h2 className={cn('font-semibold leading-tight text-ink transition-colors group-hover:text-primary', featured ? 'text-[clamp(1.25rem,5vw,2rem)] tracking-[-0.035em]' : 'line-clamp-2 text-[15px] leading-6')}>
              {state.title}
            </h2>
            <p className={cn('mt-2 text-xs leading-5 text-ink-dim', compact ? 'line-clamp-2' : featured ? 'line-clamp-3 max-w-3xl' : 'line-clamp-3')}>{state.content}</p>
          </button>

          {state.images.length > 0 && !compact && (
            <div className={cn('mt-4 grid gap-2', state.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
              {state.images.slice(0, featured ? 3 : 2).map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => onOpen(state.id)}
                  className={cn(
                    'image-frame group/image border border-line bg-surface2',
                    featured && index === 0 && state.images.length > 1 && 'col-span-2',
                  )}
                >
                  <img
                    src={image}
                    alt=""
                    className={cn('w-full object-cover transition-transform duration-500 group-hover/image:scale-[1.025]', featured ? 'aspect-[16/8.5]' : 'aspect-[16/10]')}
                    loading="lazy"
                  />
                  <span className="absolute bottom-2 left-2 z-10 bg-black/60 px-1.5 py-0.5 font-data text-[8px] text-white/85">FRAME {String(index + 1).padStart(2, '0')}</span>
                </button>
              ))}
            </div>
          )}

          {state.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {state.tags.slice(0, 4).map((tag) => <Tag key={tag}>#{tag}</Tag>)}
            </div>
          )}

          {state.serviceId && state.serviceName && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onOrder?.(state.serviceId, state.id)
              }}
              className="press-command mt-4 flex w-full items-center gap-3 border border-gold/30 bg-gold/[0.045] p-3 text-left transition-command hover:border-gold/55 hover:bg-gold/[0.09]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-gold/35 bg-gold/10 text-gold"><IconPackage size={17} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-ink">关联服务 / {state.serviceName}</span>
                <span className="mt-0.5 block font-data text-[9px] tracking-[0.08em] text-gold">{state.orderCount > 0 ? `VERIFIED ${state.orderCount} ORDERS` : 'FROM INTEL TO DEPLOYMENT'}</span>
              </span>
              <span className="shrink-0 font-data text-[9px] tracking-[0.1em] text-gold">DEPLOY -&gt;</span>
            </button>
          )}
        </div>

        <div className="flex items-center border-t border-line bg-bg/25 px-2 py-1">
          <button type="button" disabled={busy} onClick={() => toggle("like")} className={cn("press-command flex min-h-touch flex-1 items-center justify-center gap-1.5 text-[11px]", state.liked ? "text-danger" : "text-ink-faint hover:text-ink")}>
            <IconHeart size={16} /> <span className="font-data">{state.likeCount}</span>
          </button>
          <button type="button" onClick={() => onOpen(state.id)} className="press-command flex min-h-touch flex-1 items-center justify-center gap-1.5 text-[11px] text-ink-faint hover:text-ink">
            <IconChat size={16} /> <span className="font-data">{state.commentCount}</span>
          </button>
          <button type="button" disabled={busy} onClick={() => toggle("favorite")} className={cn("press-command flex min-h-touch flex-1 items-center justify-center gap-1.5 text-[11px]", state.favorited ? "text-gold" : "text-ink-faint hover:text-ink")}>
            <IconBookmark size={16} /> <span className="font-data">{state.favoriteCount}</span>
          </button>
          <span className="flex min-h-touch flex-1 items-center justify-center font-data text-[9px] tracking-[0.08em] text-ink-faint">{state.viewCount} VIEW</span>
        </div>
      </div>
    </article>
  )
}