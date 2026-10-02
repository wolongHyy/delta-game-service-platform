"use client"

import { useCallback, useEffect, useState } from "react"
import type { CommunityFeed, CommunityPost, CommunityPostStatus } from "@/lib/types"
import { api } from "@/lib/client"
import { Btn, EmptyState, HudPanel, IconSearch, Money, Skeleton, cn } from "@/components/ui"

const FILTERS: Array<{ key: CommunityPostStatus | "all"; label: string }> = [
  { key: "pending", label: "待审核" },
  { key: "published", label: "已发布" },
  { key: "rejected", label: "已驳回" },
  { key: "hidden", label: "已下架" },
  { key: "all", label: "全部" },
]

const STATUS_LABELS: Record<CommunityPostStatus, string> = {
  draft: "草稿",
  pending: "待审核",
  published: "已发布",
  rejected: "已驳回",
  hidden: "已下架",
}

const STATUS_TONES: Record<CommunityPostStatus, string> = {
  draft: "border-line bg-surface2 text-ink-dim",
  pending: "border-warn/30 bg-warn/10 text-warn",
  published: "border-ok/30 bg-ok/10 text-ok",
  rejected: "border-danger/30 bg-danger/10 text-danger",
  hidden: "border-line bg-surface2 text-ink-faint",
}

export default function AdminCommunityPage() {
  const [feed, setFeed] = useState<CommunityFeed | null>(null)
  const [status, setStatus] = useState<CommunityPostStatus | "all">("pending")
  const [keyword, setKeyword] = useState("")
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status, pageSize: "50" })
      if (keyword.trim()) params.set("keyword", keyword.trim())
      setFeed(await api<CommunityFeed>(`/api/admin/community?${params.toString()}`))
    } catch (error: any) {
      setNotice(error.message || "社区数据加载失败")
      setFeed(null)
    } finally {
      setLoading(false)
    }
  }, [keyword, status])

  useEffect(() => {
    void load()
  }, [load])

  async function review(post: CommunityPost, patch: { status?: CommunityPostStatus; featured?: boolean; pinned?: boolean; knowledge?: boolean }) {
    try {
      await api(`/api/admin/community/${post.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: patch.status || post.status, ...patch }),
      })
      setNotice(`《${post.title}》状态已更新`)
      await load()
    } catch (error: any) {
      setNotice(error.message || "操作失败")
    }
  }

  const posts = feed?.posts || []
  const stats = feed?.stats || { posts: 0, comments: 0, completedOrders: 0, contributors: 0 }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-data text-[10px] tracking-[0.16em] text-primary">COMMUNITY GOVERNANCE / MODERATION</p>
          <h1 className="mt-1 text-xl font-semibold text-ink">社区治理台</h1>
          <p className="mt-1 text-xs leading-5 text-ink-dim">审核内容、维护精选与知识库，并查看帖子带来的订单和成交凭证。</p>
        </div>
        <Btn variant="outline" onClick={load}>刷新数据</Btn>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        {[
          { label: "社区帖子", value: stats.posts },
          { label: "评论互动", value: stats.comments },
          { label: "成交订单", value: stats.completedOrders, gold: true },
          { label: "贡献用户", value: stats.contributors },
        ].map((item) => (
          <div key={item.label} className="admin-surface rounded-card border border-line bg-surface p-4">
            <p className="text-[11px] text-ink-faint">{item.label}</p>
            <p className={cn("mt-1.5 font-data text-2xl font-semibold", item.gold ? "text-gold" : "text-ink")}>{item.value}</p>
          </div>
        ))}
      </div>

      <HudPanel title="内容队列" meta="REVIEW QUEUE">
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setStatus(item.key)}
                className={cn(
                  "press-command min-h-touch rounded-btn border px-3 text-xs transition-command",
                  status === item.key ? "border-primary/40 bg-primary/10 text-primary" : "border-line text-ink-dim hover:text-ink",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex min-h-touch items-center gap-2 rounded-card border border-line bg-surface2/70 px-3">
            <IconSearch size={16} className="shrink-0 text-ink-faint" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") void load() }}
              placeholder="搜索标题、正文或作者"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
            />
            <button type="button" onClick={load} className="min-h-touch text-xs font-medium text-primary">搜索</button>
          </div>
        </div>

        {notice && <p className="border-b border-line px-4 py-3 text-sm text-primary">{notice}</p>}

        {loading ? (
          <div className="space-y-2 p-4"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        ) : posts.length === 0 ? (
          <EmptyState title="当前队列为空" text="没有符合筛选条件的社区帖子" />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-surface2/45 text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                    <th className="px-4 py-3 font-medium">帖子</th>
                    <th className="px-3 py-3 font-medium">作者</th>
                    <th className="px-3 py-3 font-medium">状态</th>
                    <th className="px-3 py-3 font-medium">成交</th>
                    <th className="px-3 py-3 font-medium">时间</th>
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id} className="border-b border-line last:border-0 hover:bg-primary/[0.025]">
                      <td className="max-w-[300px] px-4 py-3 align-top">
                        <p className="truncate text-sm font-medium text-ink">{post.title}</p>
                        <p className="mt-1 line-clamp-1 text-xs text-ink-faint">{post.topic} · {post.content}</p>
                        {post.serviceName && <p className="mt-1 text-[11px] text-gold">关联服务：{post.serviceName}</p>}
                      </td>
                      <td className="px-3 py-3 align-top text-xs text-ink-dim">{post.authorName}</td>
                      <td className="px-3 py-3 align-top"><StatusPill status={post.status} /></td>
                      <td className="px-3 py-3 align-top font-data text-xs text-ink-dim">
                        <p>{post.orderCount} 单</p>
                        <p className="mt-1 text-gold">{post.evidenceCount} 凭证</p>
                      </td>
                      <td className="px-3 py-3 align-top font-data text-[11px] text-ink-faint">{post.createdAt?.slice(0, 16)}</td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {post.status === "pending" && <Btn size="sm" onClick={() => review(post, { status: "published" })}>通过</Btn>}
                          {post.status === "pending" && <Btn size="sm" variant="danger" onClick={() => review(post, { status: "rejected" })}>驳回</Btn>}
                          {post.status === "published" && (
                            <>
                              <Btn size="sm" variant="soft" onClick={() => review(post, { pinned: !post.pinned })}>{post.pinned ? "取消置顶" : "置顶"}</Btn>
                              <Btn size="sm" variant="soft" onClick={() => review(post, { featured: !post.featured })}>{post.featured ? "取消精选" : "精选"}</Btn>
                              <Btn size="sm" variant="soft" onClick={() => review(post, { knowledge: !post.knowledge })}>{post.knowledge ? "移出知识库" : "收录知识库"}</Btn>
                            </>
                          )}
                          {post.status === "published" && <Btn size="sm" variant="danger" onClick={() => review(post, { status: "hidden" })}>下架</Btn>}
                          {(post.status === "rejected" || post.status === "hidden") && <Btn size="sm" variant="outline" onClick={() => review(post, { status: "published" })}>重新发布</Btn>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-line md:hidden">
              {posts.map((post) => (
                <article key={post.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-ink">{post.title}</h2>
                      <p className="mt-1 text-xs text-ink-faint">{post.authorName} · {post.createdAt?.slice(0, 16)}</p>
                    </div>
                    <StatusPill status={post.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-dim">{post.content}</p>
                  <div className="mt-3 flex flex-wrap gap-2 font-data text-[10px] text-ink-faint">
                    <span>{post.orderCount} ORDERS</span>
                    <span className="text-gold">{post.evidenceCount} COMPLETED</span>
                    {post.pinned && <span className="text-primary">PINNED</span>}
                    {post.featured && <span className="text-gold">FEATURED</span>}
                    {post.knowledge && <span className="text-info">KNOWLEDGE</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {post.status === "pending" && <Btn size="sm" onClick={() => review(post, { status: "published" })}>通过</Btn>}
                    {post.status === "pending" && <Btn size="sm" variant="danger" onClick={() => review(post, { status: "rejected" })}>驳回</Btn>}
                    {post.status === "published" && <Btn size="sm" variant="soft" onClick={() => review(post, { pinned: !post.pinned })}>{post.pinned ? "取消置顶" : "置顶"}</Btn>}
                    {post.status === "published" && <Btn size="sm" variant="soft" onClick={() => review(post, { featured: !post.featured })}>{post.featured ? "取消精选" : "精选"}</Btn>}
                    {post.status === "published" && <Btn size="sm" variant="soft" onClick={() => review(post, { knowledge: !post.knowledge })}>{post.knowledge ? "移出知识库" : "收录知识库"}</Btn>}
                    {post.status === "published" && <Btn size="sm" variant="danger" onClick={() => review(post, { status: "hidden" })}>下架</Btn>}
                    {(post.status === "rejected" || post.status === "hidden") && <Btn size="sm" variant="outline" onClick={() => review(post, { status: "published" })}>重新发布</Btn>}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </HudPanel>

      <p className="text-[11px] text-ink-faint">成交凭证只使用已完成且已付款的订单；社区公开展示不会回传手机号或 OpenID。</p>
    </div>
  )
}

function StatusPill({ status }: { status: CommunityPostStatus }) {
  return <span className={cn("inline-flex rounded-btn border px-2 py-1 text-[10px]", STATUS_TONES[status])}>{STATUS_LABELS[status]}</span>
}
