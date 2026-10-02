'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { FighterAccount, FighterEarnings, Order, Withdrawal } from '@/lib/types'
import { api } from '@/lib/client'
import { Avatar, Btn, Card, Empty, Field, Modal, Money, MetricCard, StatusBadge, TextArea, TextInput, cn } from '@/components/ui'

const TABS = ['home', 'pool', 'orders', 'earnings'] as const
type Tab = typeof TABS[number]
type PoolOrder = Order & { slider?: { sliderId: string } }

function localDateStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

async function apiForm(path: string, form: FormData) {
  const res = await fetch(path, { method: 'PATCH', body: form })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data && typeof data.error === 'string' ? data.error : '请求失败，请重试') as string)
  return data
}

export default function FighterPage() {
  const [fighter, setFighter] = useState<FighterAccount | null>(null)
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'home'
    const q = new URLSearchParams(window.location.search).get('tab')
    return (TABS as readonly string[]).includes(q || '') ? (q as Tab) : 'home'
  })
  const [orders, setOrders] = useState<Order[]>([])
  const [pool, setPool] = useState<PoolOrder[]>([])
  const [earnings, setEarnings] = useState<FighterEarnings | null>(null)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [keyword, setKeyword] = useState('')
  const [notice, setNotice] = useState('')
  const [wechat, setWechat] = useState<{ enabled: boolean; openid: string } | null>(null)
  const [claimOrderItem, setClaimOrderItem] = useState<PoolOrder | null>(null)
  const [claimToken, setClaimToken] = useState('')
  const [sliderError, setSliderError] = useState('')
  const [completeOrder, setCompleteOrder] = useState<Order | null>(null)
  const [completeNote, setCompleteNote] = useState('')
  const [completeFiles, setCompleteFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawAccount, setWithdrawAccount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')
  const [poolCount, setPoolCount] = useState(0)

  async function load() {
    try {
      const f = await api<FighterAccount>('/api/fighter/me')
      setFighter(f)
      const [myOrders, openOrders, income, withdrawalList] = await Promise.all([
        api<Order[]>('/api/fighter/orders'),
        api<PoolOrder[]>('/api/fighter/orders?pool=1'),
        api<FighterEarnings>('/api/fighter/earnings'),
        api<Withdrawal[]>('/api/fighter/withdrawals'),
      ])
      setOrders(myOrders)
      setPoolCount(openOrders.length)
      setPool(openOrders)
      setEarnings(income)
      setWithdrawals(withdrawalList)
    } catch {
      setFighter(null)
    }
  }

  async function checkWechat() {
    try {
      const w = await api<{ enabled: boolean; openid: string }>('/api/wechat/status')
      setWechat(w)
      if (w.enabled && w.openid) {
        try {
          await api('/api/fighter/auth/wechat', { method: 'POST' })
          setNotice('微信登录成功')
          await load()
        } catch (e: any) {
          setNotice(e.message)
        }
      }
    } catch {
      setWechat({ enabled: false, openid: '' })
    }
  }

  useEffect(() => {
    load()
    checkWechat()
  }, [])

  useEffect(() => {
    if (!fighter) return
    const timer = setInterval(async () => {
      try {
        const [myOrders, income] = await Promise.all([
          api<Order[]>('/api/fighter/orders'),
          api<FighterEarnings>('/api/fighter/earnings'),
        ])
        setOrders(myOrders)
        setEarnings(income)
      } catch {}
    }, 10000)
    return () => clearInterval(timer)
  }, [fighter])

  useEffect(() => {
    if (tab !== 'pool') return
    const timer = setInterval(async () => {
      try {
        const fresh = await api<PoolOrder[]>('/api/fighter/orders?pool=1')
        setPool((prev) => {
          if (fresh.length > prev.length) setNotice(`公共池新增 ${fresh.length - prev.length} 个新订单`)
          return fresh
        })
        setPoolCount(fresh.length)
      } catch {}
    }, 8000)
    return () => clearInterval(timer)
  }, [tab])

  async function login() {
    try {
      await api('/api/fighter/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
      setNotice('登录成功')
      await load()
    } catch (e: any) { setNotice(e.message) }
  }

  async function doClaim() {
    if (!claimOrderItem) return
    if (!claimToken) { setNotice('请先拖动滑块完成验证'); return }
    try {
      await api(`/api/fighter/orders/${claimOrderItem.id}/claim`, { method: 'POST', body: JSON.stringify({ claimToken }) })
      setNotice('抢单成功，请尽快开始服务')
      setClaimOrderItem(null)
      setClaimToken('')
      await load()
    } catch (e: any) {
      setNotice(e.message)
      await load()
    }
  }

  async function startService(order: Order) {
    try {
      await api(`/api/fighter/orders/${order.id}/start`, { method: 'PATCH' })
      setNotice('已开始服务')
      await load()
    } catch (e: any) { setNotice(e.message) }
  }

  function openComplete(order: Order) {
    setCompleteOrder(order)
    setCompleteNote('')
    setCompleteFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function pickFiles(files: FileList | null) {
    if (!files) return
    const picked = Array.from(files).slice(0, 5)
    setCompleteFiles((prev) => [...prev, ...picked].slice(0, 5))
  }

  async function submitComplete() {
    if (!completeOrder) return
    if (completeFiles.length === 0) { setNotice('申请结单必须至少上传 1 张截图证明'); return }
    setSubmitting(true)
    try {
      const form = new FormData()
      form.append('note', completeNote.trim())
      for (const file of completeFiles) form.append('files', file)
      await apiForm(`/api/fighter/orders/${completeOrder.id}/request-complete`, form)
      setNotice('完工申请已提交，等待管理员确认，收益将进入待结算')
      setCompleteOrder(null)
      await load()
    } catch (e: any) {
      setNotice(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  function openWithdraw() {
    setWithdrawAmount('')
    setWithdrawAccount('')
    setWithdrawError('')
    setWithdrawOpen(true)
  }

  async function submitWithdrawal() {
    const amount = Number(withdrawAmount)
    if (!Number.isFinite(amount) || amount <= 0) { setWithdrawError('请输入正确的提现金额'); return }
    if (amount > (earnings?.available || 0)) { setWithdrawError(`提现金额不能超过可提现余额 ${earnings?.available || 0} 元`); return }
    if (!withdrawAccount.trim()) { setWithdrawError('请填写收款信息（如支付宝/微信/银行卡号）'); return }
    setWithdrawing(true)
    setWithdrawError('')
    try {
      await api('/api/fighter/withdrawals', { method: 'POST', body: JSON.stringify({ amount, accountInfo: withdrawAccount.trim() }) })
      setWithdrawOpen(false)
      setNotice('提现申请已提交，后台审核后到账')
      await load()
    } catch (e: any) {
      setWithdrawError(e.message)
    } finally {
      setWithdrawing(false)
    }
  }

  async function logout() {
    try { await api('/api/fighter/auth/logout', { method: 'POST' }) } catch {}
    setFighter(null)
  }

  if (!fighter) return (
    <Login
      username={username}
      password={password}
      notice={notice}
      onUsername={setUsername}
      onPassword={setPassword}
      onLogin={login}
      wechatEnabled={wechat?.enabled === true}
      onWechatLogin={() => { window.location.href = '/api/wechat/oauth?state=/fighter' }}
    />
  )
  const filteredPool = pool.filter((order) => `${order.orderNo}${order.serviceName}${order.companionName}`.toLowerCase().includes(keyword.toLowerCase()))
  const today = localDateStr(new Date())
  const todayOrders = orders.filter((order) => order.createdAt.slice(0, 10) === today).length
  const todayCompleted = orders.filter((order) => order.completedAt.slice(0, 10) === today).length
  const waiting = orders.filter((o) => o.status === 'assigned').length
  const inProgress = orders.filter((o) => o.status === 'in_progress').length
  const pendingComplete = orders.filter((o) => o.status === 'completion_pending').length

  return (
    <main className="void-shell mx-auto min-h-screen max-w-5xl bg-bg pb-28">
      <header className="relative overflow-hidden border-b border-line bg-surface/90 px-4 pb-4 pt-5 sm:px-6">
        <div className="pointer-events-none absolute inset-0 hud-grid opacity-25" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <Avatar name={fighter.displayName} src={fighter.avatarUrl || undefined} size={52} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="signal-dot" />
                <p className="font-data text-[10px] tracking-[0.18em] text-ok">OPERATOR ONLINE</p>
              </div>
              <h1 className="mt-1 truncate font-display text-xl font-semibold text-ink">{fighter.displayName}</h1>
              <p className="mt-0.5 text-[11px] text-ink-faint">账号 {fighter.username}{fighter.tier ? ` · ${fighter.tier}档` : ''}</p>
            </div>
            <button type="button" className="press-command min-h-touch border border-line bg-surface2 px-3 font-data text-[10px] tracking-wider text-ink-dim hover:border-danger/40 hover:text-danger" onClick={logout}>退出</button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Metric code="01" label="今日接单" value={todayOrders} tone="ok" />
            <Metric code="02" label="今日完成" value={todayCompleted} tone="default" />
            <Metric code="03" label="公共池" value={poolCount} tone="warn" />
          </div>
        </div>
      </header>

      <div className="space-y-4 px-4 py-4 sm:px-6">
        {tab === 'home' && (
          <div className="page-enter space-y-4">
            <section className="command-panel relative overflow-hidden p-4 sm:p-5">
              <div className="pointer-events-none absolute -right-8 -top-12 font-display text-[112px] font-black leading-none text-primary/[0.045]">V</div>
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="font-data text-[10px] tracking-[0.18em] text-primary">MISSION CONTROL / 01</p>
                  <h2 className="mt-2 font-display text-lg font-semibold text-ink">今日作战概览</h2>
                  <p className="mt-1 max-w-md text-xs leading-5 text-ink-dim">订单、服务和收益状态集中在这里。保持会话在线，公共池有新单会即时提示。</p>
                </div>
                <span className="hidden border border-line px-2 py-1 font-data text-[9px] tracking-wider text-ink-faint sm:block">SYNC 10S</span>
              </div>
              <div className="relative mt-5 grid gap-2 sm:grid-cols-3">
                <QueueStat label="待服务" value={waiting} code="QUEUE" tone="warn" />
                <QueueStat label="服务中" value={inProgress} code="ACTIVE" tone="ok" />
                <QueueStat label="待确认完工" value={pendingComplete} code="VERIFY" tone="info" />
              </div>
              <div className="relative mt-4 flex flex-wrap gap-2">
                <Btn onClick={() => setTab('pool')}>进入抢单大厅</Btn>
                <Btn variant="outline" onClick={() => setTab('orders')}>查看我的订单</Btn>
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
              <Card className="overflow-hidden p-4 sm:p-5">
                <SectionHeading code="FINANCE" title="收益中心" />
                <p className="mt-4 font-data text-3xl font-semibold tracking-tight text-ok"><Money value={earnings?.available || 0} /></p>
                <p className="mt-1 text-xs text-ink-faint">可提现余额（已确认完成）</p>
                {!!earnings?.pendingSettlement && (
                  <p className="mt-3 border-l-2 border-warn/60 bg-warn/[0.06] px-3 py-2 text-xs text-warn">待结算 <Money value={earnings.pendingSettlement} />：管理员确认后进入可用余额</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Btn size="sm" onClick={() => setTab('earnings')}>收益明细</Btn>
                  <Btn size="sm" variant="outline" onClick={openWithdraw}>申请提现</Btn>
                </div>
              </Card>

              <Card className="p-4 sm:p-5">
                <SectionHeading code="SIGNAL" title="服务信号" />
                <div className="mt-4 space-y-3">
                  <SignalRow label="接单资格" value={fighter.tier ? `${fighter.tier}档` : '已审核'} ok />
                  <SignalRow label="账号状态" value="正常运行" ok />
                  <SignalRow label="公共池刷新" value="8 秒轮询" />
                  <SignalRow label="数据同步" value="10 秒轮询" />
                </div>
              </Card>
            </div>
          </div>
        )}
        {tab === 'pool' && (
          <div className="page-enter space-y-4">
            <SectionHeading code="OPEN CONTRACTS" title="抢单大厅" action={<button type="button" onClick={load} className="press-command min-h-touch border border-line px-3 font-data text-[10px] text-primary">刷新 SIGNAL</button>} />
            <p className="text-xs leading-5 text-ink-dim">抢单需拖动滑块到最右侧完成验证，防止一键脚本；娱乐档次打手不能抢公共池订单。</p>
            <div className="flex min-h-touch items-center gap-2 border border-line bg-surface2/70 px-3 focus-within:border-primary/60">
              <span className="font-data text-xs text-primary">⌕</span>
              <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索订单号或服务关键词" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint" />
            </div>
            <PoolList list={filteredPool} onClaim={(order) => { setClaimOrderItem(order); setClaimToken(''); setSliderError('') }} />
          </div>
        )}

        {tab === 'orders' && (
          <div className="page-enter space-y-4">
            <SectionHeading code="MY CONTRACTS" title="我的订单" action={<button type="button" onClick={load} className="press-command min-h-touch border border-line px-3 font-data text-[10px] text-primary">刷新 SIGNAL</button>} />
            <OrderList list={orders} onStart={startService} onComplete={openComplete} />
          </div>
        )}

        {tab === 'earnings' && (
          <div className="page-enter space-y-4">
            <SectionHeading code="PAYOUT LEDGER" title="收益明细" action={<button type="button" onClick={load} className="press-command min-h-touch border border-line px-3 font-data text-[10px] text-primary">刷新 SIGNAL</button>} />
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="可提现余额" value={<Money value={earnings?.available || 0} />} hint="已确认完成的订单收益" tone="ok" />
              <MetricCard label="待结算" value={<Money value={earnings?.pendingSettlement || 0} />} hint="完工申请等待管理员确认" tone="warn" />
            </div>
            <Card className="p-4 sm:p-5">
              <SectionHeading code="PAYOUT PROTOCOL" title="收益规则" />
              <p className="mt-4 text-sm text-ink-dim">普通订单平台抽成 20%，体验单平台抽成 10%。</p>
              {!!earnings?.pendingSettlement && <p className="mt-3 border-l-2 border-warn/60 bg-warn/[0.06] px-3 py-2 text-xs text-warn">待结算 <Money value={earnings.pendingSettlement} />：已提交完工申请，管理员确认后进入可提现余额</p>}
              <Btn className="mt-4" onClick={openWithdraw}>申请提现</Btn>
            </Card>
            <Card className="p-4 sm:p-5">
              <SectionHeading code="WITHDRAWAL LOG" title="提现记录" />
              <div className="mt-4">
                {withdrawals.length ? withdrawals.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b border-line py-3 text-sm last:border-0">
                    <span className="font-data text-ink"><Money value={item.amount} /></span>
                    <StatusBadge status={item.status} />
                  </div>
                )) : <Empty text="暂无提现记录" />}
              </div>
            </Card>
          </div>
        )}
      </div>
      <Modal open={!!claimOrderItem} title="确认抢单" onClose={() => setClaimOrderItem(null)}>
        {claimOrderItem && (
          <div>
            <div className="border border-line bg-surface2/70 p-3">
              <p className="font-data text-[10px] tracking-wider text-primary">{claimOrderItem.orderNo}</p>
              <p className="mt-1 text-sm font-semibold text-ink">{claimOrderItem.companionName} · {claimOrderItem.serviceName}</p>
              <p className="mt-2 text-xs text-ink-dim">订单金额 <span className="font-data text-sm font-semibold text-gold"><Money value={claimOrderItem.amount} /></span></p>
            </div>
            <div className="mt-4">
              <SliderVerify
                sliderId={claimOrderItem.slider?.sliderId || ''}
                orderId={claimOrderItem.id}
                onVerified={(token) => { setClaimToken(token); setSliderError('') }}
                onError={(msg) => setSliderError(msg)}
              />
              {sliderError && <p className="mt-2 text-center text-xs text-danger">{sliderError}</p>}
              {claimToken && <p className="mt-2 text-center text-xs text-ok">✓ 滑块验证通过，可确认抢单</p>}
            </div>
            <div className="mt-4 flex gap-2">
              <Btn block onClick={doClaim}>确认抢单</Btn>
              <Btn block variant="outline" onClick={() => setClaimOrderItem(null)}>取消</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!completeOrder} title="申请结单" onClose={() => setCompleteOrder(null)}>
        {completeOrder && (
          <div>
            <p className="text-xs text-ink-dim">{completeOrder.orderNo} · {completeOrder.companionName} · 预计到手 <span className="font-data text-gold"><Money value={completeOrder.fighterIncome} /></span></p>
            <p className="mt-3 border-l-2 border-warn/60 bg-warn/[0.06] px-3 py-2 text-xs text-warn">必须至少上传 1 张游戏结算/截图证明，管理员确认后才算完成并结算。</p>
            <div className="mt-4">
              <Field label="完成说明" hint="选填">
                <TextArea value={completeNote} onChange={(e) => setCompleteNote(e.target.value)} placeholder="例如：已完成保底 888W，带出截图见附件" />
              </Field>
            </div>
            <div className="mt-4">
              <p className="mb-1.5 text-xs text-ink-dim">截图证明（最多 5 张）*</p>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => pickFiles(e.target.files)} className="hidden" />
              {completeFiles.length === 0 && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="min-h-touch w-full border border-dashed border-line bg-surface2 py-6 text-center text-xs text-ink-dim hover:border-primary">
                  点击选择截图（jpg/png/webp/gif）
                </button>
              )}
              {completeFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {completeFiles.map((file, index) => (
                      <img key={`${file.name}-${index}`} src={URL.createObjectURL(file)} alt={file.name} className="aspect-square w-full border border-line object-cover" />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Btn size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>继续添加</Btn>
                    <Btn size="sm" variant="danger" onClick={() => setCompleteFiles([])}>清空</Btn>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <Btn block disabled={submitting} onClick={submitComplete}>{submitting ? '提交中...' : '提交结单申请'}</Btn>
              <Btn block variant="outline" onClick={() => setCompleteOrder(null)}>取消</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={withdrawOpen} title="申请提现" onClose={() => setWithdrawOpen(false)}>
        <p className="text-xs leading-5 text-ink-dim">可提现余额 <span className="font-data text-ok"><Money value={earnings?.available || 0} /></span>，提交后后台审核，通过后打款到你的收款账户。</p>
        <div className="mt-4 space-y-3">
          <Field label="提现金额（元）*"><TextInput type="number" inputMode="decimal" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="0.00" /></Field>
          <Field label="收款信息 *" hint="支付宝账号 / 微信 / 银行卡号等"><TextInput value={withdrawAccount} onChange={(e) => setWithdrawAccount(e.target.value)} placeholder="如：支付宝 138****0000" /></Field>
        </div>
        {withdrawError && <p className="mt-3 text-center text-xs text-danger">{withdrawError}</p>}
        <div className="mt-4 flex gap-2">
          <Btn block disabled={withdrawing} onClick={submitWithdrawal}>{withdrawing ? '提交中...' : '提交提现申请'}</Btn>
          <Btn block variant="outline" disabled={withdrawing} onClick={() => setWithdrawOpen(false)}>取消</Btn>
        </div>
      </Modal>

      {notice && (
        <button type="button" onClick={() => setNotice('')} className="fixed left-1/2 top-4 z-[60] max-w-[calc(100vw-2rem)] -translate-x-1/2 border border-primary/35 bg-surface px-4 py-2.5 text-center text-sm text-ink shadow-card">
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
          {notice}
        </button>
      )}

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto grid max-w-5xl grid-cols-4 border-t border-primary/25 bg-surface/95 py-1.5 shadow-dock backdrop-blur-xl">
        {TABS.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={cn('press-command flex min-h-touch flex-col items-center justify-center gap-1 font-data text-[9px] tracking-wider', tab === item ? 'text-primary' : 'text-ink-faint')}>
            <span className={cn('h-1 w-5', tab === item ? 'bg-primary' : 'bg-line')} />
            {({ home: '总览', pool: '抢单', orders: '订单', earnings: '收益' } as Record<Tab, string>)[item]}
          </button>
        ))}
      </nav>
    </main>
  )
}
function Metric({ code, label, value, tone = 'default' }: { code: string; label: string; value: number; tone?: 'default' | 'ok' | 'warn' }) {
  const color = tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : 'text-ink'
  return (
    <div className="border border-line bg-surface2/55 px-3 py-3">
      <div className="flex items-center justify-between"><span className="font-data text-[9px] text-ink-faint">{code}</span><span className="h-px w-5 bg-line" /></div>
      <p className={cn('mt-2 font-data text-2xl font-semibold', color)}>{value}</p>
      <p className="mt-1 text-[10px] text-ink-faint">{label}</p>
    </div>
  )
}

function QueueStat({ label, value, code, tone }: { label: string; value: number; code: string; tone: 'warn' | 'ok' | 'info' }) {
  const colors = { warn: 'text-warn', ok: 'text-ok', info: 'text-info' }
  return (
    <div className="border border-line bg-surface2/45 p-3">
      <p className="font-data text-[9px] tracking-wider text-ink-faint">{code}</p>
      <p className={cn('mt-2 font-data text-2xl font-semibold', colors[tone])}>{value}<span className="ml-1 text-xs text-ink-faint">单</span></p>
      <p className="mt-1 text-xs text-ink-dim">{label}</p>
    </div>
  )
}

function SectionHeading({ code, title, action }: { code: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="font-data text-[9px] tracking-[0.2em] text-primary">{code}</p>
        <h2 className="mt-1 font-display text-lg font-semibold text-ink">{title}</h2>
      </div>
      {action}
    </div>
  )
}

function SignalRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2 text-xs last:border-0">
      <span className="text-ink-faint">{label}</span>
      <span className={cn('font-data', ok ? 'text-ok' : 'text-ink-dim')}>{value}</span>
    </div>
  )
}

function Login({ username, password, notice, onUsername, onPassword, onLogin, wechatEnabled, onWechatLogin }: { username: string; password: string; notice: string; onUsername: (value: string) => void; onPassword: (value: string) => void; onLogin: () => void; wechatEnabled: boolean; onWechatLogin: () => void }) {
  return (
    <main className="void-shell flex min-h-screen items-center justify-center overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-0 hud-grid opacity-30" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center border border-primary/30 bg-primary/[0.07]"><img src="/logo.svg" alt="VOID" className="h-9 w-9" /></span>
          <p className="mt-4 font-data text-[9px] tracking-[0.2em] text-primary">DELTA GAME SERVICE / FIGHTER</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink">打手工作台</h1>
          <p className="mt-2 text-sm text-ink-dim">登录后管理接单、服务和收益</p>
        </div>
        <Card className="mt-8 space-y-4 p-5">
          <div className="border border-line bg-surface2 px-3 py-2 font-data text-[9px] tracking-[0.14em] text-ink-faint">SECURE OPERATOR ACCESS</div>
          <TextInput value={username} onChange={(e) => onUsername(e.target.value)} placeholder="登录账号" />
          <TextInput type="password" value={password} onChange={(e) => onPassword(e.target.value)} placeholder="登录密码" />
          <Btn block onClick={onLogin}>登录打手端</Btn>
          {wechatEnabled && <><div className="flex items-center gap-3 text-[11px] text-ink-faint"><span className="h-px flex-1 bg-line" /><span>或</span><span className="h-px flex-1 bg-line" /></div><Btn block variant="soft" onClick={onWechatLogin}>微信一键登录</Btn></>}
        </Card>
        {notice && <p className="mt-4 border border-danger/25 bg-danger/[0.06] px-3 py-2 text-center text-sm text-danger">{notice}</p>}
        <p className="mt-4 text-center text-xs text-ink-faint">账号需先通过管理员审核</p>
      </div>
    </main>
  )
}
function SliderVerify({ sliderId, orderId, onVerified, onError }: { sliderId: string; orderId: string; onVerified: (token: string) => void; onError: (msg: string) => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [checking, setChecking] = useState(false)
  const [success, setSuccess] = useState(false)

  function posFromClientX(clientX: number) {
    const track = trackRef.current
    if (!track) return 0
    const rect = track.getBoundingClientRect()
    const pct = ((clientX - rect.left) / rect.width) * 100
    return Math.min(100, Math.max(0, Math.round(pct)))
  }

  async function finish(clientX: number) {
    if (checking || success) return
    const pct = posFromClientX(clientX)
    setDragging(false)
    if (!sliderId) { onError('验证信息缺失，请刷新抢单大厅'); return }
    if (pct < 95) { setPosition(0); onError('请把滑块拖到最右侧'); return }
    setChecking(true)
    try {
      const res = await fetch(`/api/fighter/orders/${orderId}/slider-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sliderId, position: pct }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data || !data.claimToken) {
        setPosition(0)
        onError((data && data.error) || '验证失败，请重试')
        return
      }
      setPosition(100)
      setSuccess(true)
      onVerified(String(data.claimToken))
    } catch {
      setPosition(0)
      onError('网络异常，请重试')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div>
      <p className="mb-2 text-center text-xs text-ink-dim">按住滑块，拖动到最右侧完成验证</p>
      <div
        ref={trackRef}
        className={cn('relative h-11 select-none overflow-hidden border transition-colors', success ? 'border-ok/50 bg-ok/10' : 'border-line bg-surface2')}
        onPointerMove={(e) => { if (dragging) { const p = posFromClientX(e.clientX); setPosition(p); if (p >= 98) finish(e.clientX) } }}
        onPointerUp={(e) => { if (dragging) finish(e.clientX) }}
        onPointerLeave={(e) => { if (dragging) finish(e.clientX) }}
      >
        <div className={cn('pointer-events-none absolute inset-y-0 left-0 transition-colors', success ? 'bg-ok/30' : 'bg-primary/20')} style={{ width: `${position}%` }} />
        <div
          className={cn('absolute inset-y-0 flex w-11 items-center justify-center border text-onPrimary shadow transition-colors', success ? 'border-ok bg-ok' : 'border-primary/40 bg-primary')}
          style={{ left: `calc(${position}% - 22px)` }}
          onPointerDown={(e) => { if (success) return; (e.target as HTMLElement).setPointerCapture(e.pointerId); setDragging(true) }}
        >
          {success ? <span className="text-sm">✓</span> : checking ? <span className="text-xs">…</span> : <span className="text-sm">→</span>}
        </div>
        {!success && <span className="pointer-events-none absolute inset-y-0 left-14 flex items-center text-xs text-ink-faint">向右拖动滑块</span>}
      </div>
    </div>
  )
}
function PoolList({ list, onClaim }: { list: PoolOrder[]; onClaim: (order: PoolOrder) => void }) {
  if (!list.length) return <Empty text="公共池暂无订单" />
  return (
    <div className="stagger-list space-y-3">
      {list.map((order) => (
        <Card key={order.id} className="group p-4 transition-colors hover:border-primary/35">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-data text-[10px] tracking-wider text-primary">{order.orderNo}</p>
              <p className="mt-1 truncate text-sm font-semibold text-ink">{order.companionName}</p>
              <p className="mt-1 text-xs text-ink-dim">{order.serviceName} · {order.unitCount} 单位</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-y border-line py-2 text-xs">
            <p className="text-ink-faint">区服 <span className="ml-1 text-ink-dim">{order.gameField || '待沟通'}</span></p>
            <p className="text-right text-ink-faint">段位 <span className="ml-1 text-ink-dim">{order.rank || '不限'}</span></p>
          </div>
          {order.remark && <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-faint">备注：{order.remark}</p>}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="font-data text-base font-semibold text-gold"><Money value={order.amount} /></span>
            <Btn size="sm" onClick={() => onClaim(order)}>抢单</Btn>
          </div>
        </Card>
      ))}
    </div>
  )
}

function OrderList({ list, onStart, onComplete }: { list: Order[]; onStart: (order: Order) => void; onComplete: (order: Order) => void }) {
  if (!list.length) return <Empty text="暂无订单" />
  return (
    <div className="stagger-list space-y-3">
      {list.map((order) => (
        <Card key={order.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-data text-[10px] tracking-wider text-primary">{order.orderNo}</p>
              <p className="mt-1 truncate text-sm font-semibold text-ink">{order.companionName}</p>
              <p className="mt-1 text-xs text-ink-dim">{order.serviceName} · {order.unitCount} 单位</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <div className="mt-3 grid gap-2 border-y border-line py-2 text-xs sm:grid-cols-2">
            <p className="text-ink-faint">区服 <span className="ml-1 text-ink-dim">{order.gameField || '待沟通'}</span></p>
            <p className="text-ink-faint sm:text-right">段位 <span className="ml-1 text-ink-dim">{order.rank || '不限'}</span></p>
          </div>
          {order.customerPhone && <p className="mt-2 text-xs text-ink-dim">老板手机：<span className="font-data text-ink">{order.customerPhone}</span></p>}
          {order.remark && <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-faint">备注：{order.remark}</p>}
          {order.status === 'completion_pending' && <p className="mt-2 border-l-2 border-warn/60 bg-warn/[0.05] px-2 py-1.5 text-xs text-warn">已申请完工，等待管理员确认</p>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="font-data text-base font-semibold text-gold"><Money value={order.amount} /></span>
            <span className="text-xs text-ink-faint">{order.status === 'completed' ? `到手 ${order.fighterIncome}` : ['in_progress', 'completion_pending'].includes(order.status) ? `预计到手 ${order.fighterIncome}` : ''}</span>
            {order.status === 'assigned' ? <Btn size="sm" onClick={() => onStart(order)}>开始服务</Btn> : order.status === 'in_progress' ? <Btn size="sm" onClick={() => onComplete(order)}>申请完成</Btn> : null}
          </div>
        </Card>
      ))}
    </div>
  )
}