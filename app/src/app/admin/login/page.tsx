'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/client'
import { Btn, Field, TextInput } from '@/components/ui'

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api('/api/admin/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
      const next = new URLSearchParams(window.location.search).get('next') || '/admin'
      router.replace(next)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="void-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 hud-grid opacity-35" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 bg-primary/[0.045] blur-3xl" />
      <div className="relative z-10 grid w-full max-w-4xl overflow-hidden border border-line bg-surface shadow-card lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-[560px] overflow-hidden border-r border-line bg-bg p-8 lg:flex lg:flex-col">
          <div className="absolute inset-0 hud-grid opacity-50" />
          <div className="absolute -right-24 top-20 h-64 w-64 rounded-full border border-primary/15" />
          <div className="absolute -right-10 top-36 h-40 w-40 rounded-full border border-line" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center border border-primary/35 bg-primary/[0.07]"><img src="/logo.svg" alt="VOID" className="h-7 w-7" /></span>
            <div><p className="font-display text-lg font-bold tracking-[0.12em] text-ink">VOID COMMAND</p><p className="mt-0.5 font-data text-[8px] tracking-[0.2em] text-primary">ADMIN CONTROL PLANE</p></div>
          </div>
          <div className="relative mt-auto">
            <p className="font-data text-[9px] tracking-[0.18em] text-primary">SECURE ACCESS / LEVEL 01</p>
            <h1 className="mt-3 max-w-sm font-display text-4xl font-semibold leading-tight text-ink">交易、供给与社区，统一进入战术指挥台。</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-ink-dim">订单流转、打手审核、提现结算与社区治理集中在一个可审计的操作平面。</p>
            <div className="mt-8 grid grid-cols-3 gap-2">
              {['ORDER FLOW', 'PAYOUT', 'COMMUNITY'].map((item) => <div key={item} className="border border-line bg-surface2/50 p-2 font-data text-[8px] tracking-[0.1em] text-ink-faint">{item}</div>)}
            </div>
          </div>
        </section>

        <section className="relative bg-surface p-6 sm:p-10 lg:flex lg:flex-col lg:justify-center">
          <div className="flex items-center gap-3 lg:hidden">
            <img src="/logo.svg" alt="VOID" className="h-8 w-8" />
            <div><p className="font-display font-bold tracking-[0.12em] text-ink">VOID COMMAND</p><p className="font-data text-[8px] tracking-[0.18em] text-primary">ADMIN CONSOLE</p></div>
          </div>
          <div className="mt-8 lg:mt-0">
            <p className="font-data text-[9px] tracking-[0.18em] text-primary">AUTHENTICATION REQUIRED</p>
            <h2 className="mt-3 text-2xl font-semibold text-ink">管理后台登录</h2>
            <p className="mt-2 text-xs leading-5 text-ink-faint">仅限授权管理员访问。所有关键操作均记录在平台审计链路中。</p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={submit}>
            <Field label="账号"><TextInput value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></Field>
            <Field label="密码"><TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="请输入管理密码" /></Field>
            {error && <p className="border border-danger/25 bg-danger/[0.06] px-3 py-2 text-xs text-danger" role="alert">{error}</p>}
            <Btn type="submit" disabled={loading} className="w-full">{loading ? '验证中…' : '进入指挥台'}</Btn>
          </form>

          <div className="mt-6 flex items-center justify-between border-t border-line pt-4 font-data text-[9px] tracking-[0.1em] text-ink-faint">
            <span>SESSION / SECURE</span>
            <Link href="/" className="transition-colors hover:text-primary">返回用户端</Link>
          </div>
        </section>
      </div>
    </main>
  )
}