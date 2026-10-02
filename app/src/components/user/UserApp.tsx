"use client"

import { useCallback, useEffect, useState } from "react"
import { bootstrapCustomer } from "@/lib/client"
import type { CommunityPost } from "@/lib/types"
import TabBar, { DesktopNav, type TabKey } from "./TabBar"
import HomeView from "./HomeView"
import CategoryView from "./CategoryView"
import MessagesView from "./MessagesView"
import ProfileView from "./ProfileView"
import CompanionDetail from "./CompanionDetail"
import CheckoutView from "./CheckoutView"
import OrdersView from "./OrdersView"
import OrderDetailView from "./OrderDetailView"
import MessageDetailView from "./MessageDetailView"
import FighterApplyView from "./FighterApplyView"
import CustomerServiceView from "./CustomerServiceView"
import CommunityView from "@/components/community/CommunityView"
import PostDetailView from "@/components/community/PostDetailView"
import PostComposer from "@/components/community/PostComposer"
import CommunityNotificationsView from "@/components/community/CommunityNotificationsView"
import CommunityUserView from "@/components/community/CommunityUserView"
import CommunityKnowledgeView from "@/components/community/CommunityKnowledgeView"

export type ViewState =
  | { name: "home" }
  | { name: "category"; serviceTypeId?: string }
  | { name: "community" }
  | { name: "messages" }
  | { name: "profile" }
  | { name: "detail"; companionId: string; sourcePostId?: string }
  | { name: "checkout"; companionId: string; unitCount: number; price?: number; spec?: string; sourcePostId?: string }
  | { name: "orders" }
  | { name: "order"; orderId: string }
  | { name: "message"; messageId: string }
  | { name: "fighter-apply" }
  | { name: "cs" }
  | { name: "post"; postId: string }
  | { name: "compose"; postId?: string }
  | { name: "community-user"; userId: string }
  | { name: "community-notifications" }
  | { name: "community-knowledge" }

const TAB_VIEWS = ["home", "category", "community", "messages", "profile"] as const

export default function UserApp() {
  const [tab, setTab] = useState<TabKey>("home")
  const [view, setView] = useState<ViewState>({ name: "home" })
  const [notice, setNotice] = useState<string | null>(null)
  const [ordersKey, setOrdersKey] = useState(0)

  useEffect(() => {
    bootstrapCustomer().catch(() => undefined)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const token = params.get("mini_bind")
    if (!token) return
    params.delete("mini_bind")
    const next = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname
    window.history.replaceState(null, "", next)
    ;(async () => {
      try {
        const result = await fetch("/api/wechat/mini/bind", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }).then((res) => res.json().catch(() => null))
        if (result && result.phone) setNotice(`已通过小程序登录，手机号 ${result.phone}`)
        else if (result && result.openid) setNotice("已通过小程序登录")
      } catch {
        setNotice("小程序绑定失败，请重新登录")
      }
    })()
  }, [])

  const go = useCallback((next: ViewState) => {
    const nextTab = next.name === "category" ? "category" : next.name
    if (TAB_VIEWS.includes(nextTab as (typeof TAB_VIEWS)[number])) setTab(nextTab as TabKey)
    setView(next)
    if (typeof window !== "undefined") window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const target = sessionStorage.getItem("delta_return_view")
    if (target === "fighter-apply") {
      sessionStorage.removeItem("delta_return_view")
      go({ name: "fighter-apply" })
    }
  }, [go])

  const notify = useCallback((msg: string) => {
    setNotice(msg)
    window.setTimeout(() => setNotice(null), 2800)
  }, [])

  const refreshOrders = useCallback(() => setOrdersKey((key) => key + 1), [])

  const back = useCallback(() => {
    if (view.name === "detail") {
      if (view.sourcePostId) go({ name: "post", postId: view.sourcePostId })
      else go({ name: tab === "category" ? "category" : "home" })
    } else if (view.name === "checkout") go({ name: "detail", companionId: view.companionId, sourcePostId: view.sourcePostId })
    else if (view.name === "order") go({ name: "orders" })
    else if (view.name === "message") go({ name: "messages" })
    else if (view.name === "cs") go({ name: "messages" })
    else if (view.name === "orders") go({ name: "profile" })
    else if (view.name === "fighter-apply") go({ name: "profile" })
    else if (view.name === "post") go({ name: "community" })
    else if (view.name === "compose") view.postId ? go({ name: "post", postId: view.postId }) : go({ name: "community" })
    else if (view.name === "community-user") go({ name: "community" })
    else if (view.name === "community-notifications") go({ name: "community" })
    else if (view.name === "community-knowledge") go({ name: "community" })
  }, [go, tab, view])

  const showTabBar = TAB_VIEWS.includes(view.name as (typeof TAB_VIEWS)[number]) || view.name === "orders"
  const showFloatingChat = showTabBar && view.name !== "cs" && view.name !== "message"

  return (
    <div className="void-shell min-h-screen overflow-x-hidden">
      <DesktopNav active={tab} onTab={(key) => go({ name: key } as ViewState)} onChat={() => go({ name: "cs" })} />

      <div className="mx-auto min-h-screen w-full max-w-[520px] pb-20 lg:max-w-[1480px] lg:pb-0 lg:pl-60">
        <div key={`${view.name}-${view.name === "detail" ? view.companionId : view.name === "post" ? view.postId : ""}`} className="page-enter mx-auto min-h-screen w-full max-w-[1180px]">
          {view.name === "home" && (
            <HomeView
              onOpenCompanion={(id) => go({ name: "detail", companionId: id })}
              onOpenCategory={(serviceTypeId) => go({ name: "category", serviceTypeId })}
              onCommunity={() => go({ name: "community" })}
            />
          )}
          {view.name === "category" && (
            <CategoryView initialServiceTypeId={view.serviceTypeId} onOpenCompanion={(id) => go({ name: "detail", companionId: id })} />
          )}
          {view.name === "community" && (
            <CommunityView
              onOpenPost={(postId) => go({ name: "post", postId })}
              onCompose={() => go({ name: "compose" })}
              onUser={(userId) => go({ name: "community-user", userId })}
              onNotifications={() => go({ name: "community-notifications" })}
              onKnowledge={() => go({ name: "community-knowledge" })}
              onOrder={(companionId, sourcePostId) => go({ name: "detail", companionId, sourcePostId })}
              onNotice={notify}
            />
          )}
          {view.name === "post" && (
            <PostDetailView
              postId={view.postId}
              onBack={back}
              onUser={(userId) => go({ name: "community-user", userId })}
              onOrder={(companionId, postId) => go({ name: "detail", companionId, sourcePostId: postId })}
              onEdit={(postId) => go({ name: "compose", postId })}
              onDeleted={() => go({ name: "community" })}
              onNotice={notify}
            />
          )}
          {view.name === "compose" && (
            <PostComposer
              postId={view.postId}
              onCancel={back}
              onSaved={(post: CommunityPost) => go({ name: "post", postId: post.id })}
              onNotice={notify}
            />
          )}
          {view.name === "community-user" && (
            <CommunityUserView
              userId={view.userId}
              onBack={back}
              onOpenPost={(postId) => go({ name: "post", postId })}
              onOrder={(companionId, postId) => go({ name: "detail", companionId, sourcePostId: postId })}
              onNotice={notify}
            />
          )}
          {view.name === "community-notifications" && (
            <CommunityNotificationsView
              onBack={back}
              onOpenPost={(postId) => go({ name: "post", postId })}
              onUser={(userId) => go({ name: "community-user", userId })}
              onNotice={notify}
            />
          )}
          {view.name === "community-knowledge" && (
            <CommunityKnowledgeView
              onBack={back}
              onOpenPost={(postId) => go({ name: "post", postId })}
              onUser={(userId) => go({ name: "community-user", userId })}
              onOrder={(companionId, postId) => go({ name: "detail", companionId, sourcePostId: postId })}
              onNotice={notify}
            />
          )}
          {view.name === "messages" && <MessagesView onOpen={(messageId) => go({ name: "message", messageId })} onOpenChat={() => go({ name: "cs" })} />}
          {view.name === "cs" && <CustomerServiceView onBack={back} />}
          {view.name === "profile" && (
            <ProfileView
              onOrders={() => go({ name: "orders" })}
              onCommunity={() => go({ name: "community" })}
              onCompose={() => go({ name: "compose" })}
              onFighterApply={() => go({ name: "fighter-apply" })}
            />
          )}
          {view.name === "detail" && (
            <CompanionDetail
              companionId={view.companionId}
              onBack={back}
              onCheckout={(companion, unitCount, opts) =>
                go({ name: "checkout", companionId: companion.id, unitCount, price: opts.effectivePrice, spec: opts.spec, sourcePostId: view.sourcePostId })
              }
            />
          )}
          {view.name === "checkout" && (
            <CheckoutView
              companionId={view.companionId}
              unitCount={view.unitCount}
              price={view.price}
              spec={view.spec}
              sourcePostId={view.sourcePostId}
              onBack={back}
              onSubmitted={(orderId, message) => {
                notify(message || "订单已提交，等待接单")
                refreshOrders()
                go({ name: "order", orderId })
              }}
            />
          )}
          {view.name === "orders" && (
            <OrdersView refreshKey={ordersKey} onOpenOrder={(orderId) => go({ name: "order", orderId })} onNotice={notify} />
          )}
          {view.name === "order" && (
            <OrderDetailView orderId={view.orderId} onBack={back} onCancelled={refreshOrders} onNotice={notify} />
          )}
          {view.name === "message" && <MessageDetailView messageId={view.messageId} onBack={back} />}
          {view.name === "fighter-apply" && <FighterApplyView onBack={back} onNotice={notify} />}
        </div>
      </div>

      {notice && (
        <div className="fixed left-1/2 top-4 z-[70] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-stretch border border-primary/40 bg-surface/95 shadow-card backdrop-blur-2xl">
          <span className="flex w-11 shrink-0 items-center justify-center bg-primary text-onPrimary"><span className="font-data text-xs font-bold">!</span></span>
          <span className="min-w-0 flex-1 px-4 py-3">
            <span className="block font-data text-[8px] tracking-[0.18em] text-primary">COMMAND NOTICE</span>
            <span className="mt-1 block text-sm text-ink">
          {notice}</span>
          </span>
        </div>
      )}

      {showFloatingChat && (
        <button
          type="button"
          onClick={() => go({ name: "cs" })}
          aria-label="打开智能客服"
          className="press-command fixed bottom-20 right-4 z-40 flex items-center gap-2 border border-primary/50 bg-surface/94 px-3 py-2 text-primary shadow-glow backdrop-blur-xl lg:bottom-6 lg:right-6"
        >
          <span className="relative flex h-8 w-8 items-center justify-center border border-primary/40 bg-primary/10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 bg-ok shadow-[0_0_8px_rgb(var(--ok-rgb))]" />
          </span>
          <span className="hidden font-data text-[9px] tracking-[0.12em] sm:block">VOID AI / ONLINE</span>
        </button>
      )}

      {showTabBar && (
        <TabBar
          active={tab}
          onTab={(key) => go({ name: key } as ViewState)}
        />
      )}
    </div>
  )
}