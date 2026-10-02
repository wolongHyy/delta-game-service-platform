'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FighterApplication } from '@/lib/types'
import { api } from '@/lib/client'
import {
  Avatar,
  Btn,
  EmptyState,
  Field,
  FighterStatusBadge,
  HudPanel,
  IconBack,
  IconUserPlus,
  Select,
  TextArea,
  TextInput,
  cn,
} from '@/components/ui'

const MODES = ['单陪', '双陪', '护航', '趣味单']
const TIERS = ['娱乐', '干事', '部长', '副主席', '主席']

export default function FighterApplyView({
  onBack,
  onNotice,
}: {
  onBack: () => void
  onNotice: (msg: string) => void
}) {
  const [gameName, setGameName] = useState('')
  const [contact, setContact] = useState('')
  const [rank, setRank] = useState('')
  const [tier, setTier] = useState('干事')
  const [modes, setModes] = useState<string[]>([])
  const [intro, setIntro] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [list, setList] = useState<FighterApplication[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [wechat, setWechat] = useState<{ enabled: boolean; authenticated: boolean; openid: string; nickname: string; avatarUrl: string } | null>(null)

  const load = useCallback(() => {
    api<FighterApplication[]>('/api/fighter-applications')
      .then(setList)
      .catch(() => setList([]))
  }, [])

  useEffect(() => {
    load()
    api<{ enabled: boolean; authenticated: boolean; openid: string; nickname: string; avatarUrl: string }>('/api/wechat/status')
      .then(setWechat)
      .catch(() => setWechat({ enabled: false, authenticated: false, openid: '', nickname: '', avatarUrl: '' }))
  }, [load])

  function toggleMode(m: string) {
    setModes((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  async function submit() {
    if (wechat?.enabled && !wechat.openid) {
      setError('请先点击上方按钮完成微信授权，审核通过后才能用同一微信登录打手端')
      return
    }
    if (!gameName.trim()) {
      setError('请填写游戏昵称')
      return
    }
    if (!contact.trim()) {
      setError('请填写微信号或QQ，方便俱乐部联系')
      return
    }
    if (!rank.trim()) {
      setError('请填写段位')
      return
    }
    if (!username.trim() || password.length < 6) {
      setError('请设置账号，并填写至少6位密码')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await api('/api/fighter-applications', {
        method: 'POST',
        body: JSON.stringify({
          gameName: gameName.trim(),
          contact: contact.trim(),
          rank: rank.trim(),
          tier: tier.trim(),
          modes,
          intro: intro.trim(),
          username: username.trim(),
          password,
        }),
      })
      onNotice('入驻申请已提交，等待审核')
      setGameName('')
      setContact('')
      setRank('')
      setTier('干事')
      setModes([])
      setIntro('')
      setUsername('')
      setPassword('')
      load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="void-shell min-h-screen pb-36">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/90 px-4 py-3 backdrop-blur-2xl lg:px-8">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3">
          <button type="button" onClick={onBack} className="press-command flex h-11 w-11 items-center justify-center border border-line bg-surface/60 text-ink-dim hover:border-primary/40 hover:text-primary" aria-label="返回">
            <IconBack size={20} />
          </button>
          <div>
            <p className="font-data text-[9px] tracking-[0.2em] text-primary">CLUB ENLISTMENT / FORM 01</p>
            <h1 className="mt-1 text-lg font-semibold text-ink">打手入驻档案</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1180px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-8 lg:py-6">
        <div className="space-y-4">
          <section className="command-panel trace-scan relative overflow-hidden p-5 lg:p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-primary/40 bg-primary/10 text-primary"><IconUserPlus size={23} /></span>
              <div>
                <p className="font-data text-[9px] tracking-[0.18em] text-primary">READY FOR EVALUATION</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink">把你的战绩接入派单网络</h2>
                <p className="mt-2 max-w-xl text-xs leading-5 text-ink-dim">审核通过后自动登记到打手名单，可接入公共抢单池、管理员派单和服务完单流程。</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 border-y border-line/70 py-3 text-center">
              {[['IDENTITY', 'WECHAT'], ['ACCESS', 'REVIEW'], ['MODE', 'MULTI']].map(([label, value]) => (
                <div key={label} className="border-r border-line/65 last:border-r-0">
                  <p className="font-data text-[8px] tracking-[0.14em] text-ink-faint">{label}</p>
                  <p className="mt-1 font-data text-[11px] text-primary">{value}</p>
                </div>
              ))}
            </div>
          </section>

          {wechat?.enabled && (
            <section className={cn('command-panel flex items-center gap-3 p-4', wechat.openid ? 'border-ok/35' : 'border-warn/40')}>
              <Avatar name={wechat.nickname || '微信用户'} src={wechat.avatarUrl || undefined} size={44} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{wechat.openid ? `微信已绑定：${wechat.nickname || '已授权用户'}` : '身份链路待授权'}</p>
                <p className="mt-0.5 text-xs leading-5 text-ink-dim">
                  {wechat.openid
                    ? '审核通过后可直接使用该微信登录打手端'
                    : '授权后申请会自动绑定微信，审核通过即可登录打手端'}
                </p>
              </div>
              {!wechat.openid && (
                <Btn
                  size="sm"
                  onClick={() => {
                    sessionStorage.setItem('delta_return_view', 'fighter-apply')
                    window.location.href = '/api/wechat/oauth?state=/'
                  }}
                >
                  微信授权
                </Btn>
              )}
            </section>
          )}

          <HudPanel title="基础档案" meta="IDENTITY / CONTACT">
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <Field label="游戏昵称 *" hint="展示名，通过后自动登记">
                <TextInput value={gameName} onChange={(e) => setGameName(e.target.value)} placeholder="如：三角洲战神" />
              </Field>
              <Field label="微信号 / QQ *" hint="俱乐部联系你使用">
                <TextInput value={contact} onChange={(e) => setContact(e.target.value)} placeholder="微信号或QQ号" />
              </Field>
              <Field label="登录账号 *">
                <TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="设置打手端账号" />
              </Field>
              <Field label="登录密码 *" hint="至少6位">
                <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="设置登录密码" />
              </Field>
            </div>
          </HudPanel>

          <HudPanel title="战术能力" meta="RANK / SPECIALTY">
            <div className="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="段位 *" hint="如 高星、顶尖">
                  <TextInput value={rank} onChange={(e) => setRank(e.target.value)} placeholder="如：顶尖" />
                </Field>
                <Field label="打手档次 *" hint="娱乐档不能抢公共池订单">
                  <Select value={tier} onChange={(e) => setTier(e.target.value)}>
                    {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </Field>
              </div>
              <Field label="擅长模式" hint="可多选">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {MODES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMode(m)}
                      className={cn(
                        'press-command min-h-touch border text-xs transition-command',
                        modes.includes(m)
                          ? 'border-primary bg-primary text-onPrimary'
                          : 'border-line bg-surface2/65 text-ink-dim hover:border-primary/45 hover:text-primary',
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="自我介绍 / 战绩" hint="选填">
                <TextArea
                  value={intro}
                  onChange={(e) => setIntro(e.target.value)}
                  rows={5}
                  placeholder="简单介绍自己：段位战绩、可接时段、擅长地图等"
                />
              </Field>
              {error && <p className="border border-danger/25 bg-danger/[0.06] px-3 py-2 text-sm text-danger">{error}</p>}
              <Btn block onClick={submit} disabled={submitting}>{submitting ? '正在提交档案…' : '提交入驻申请'}</Btn>
            </div>
          </HudPanel>
        </div>

        <aside className="space-y-4">
          <HudPanel title="审核链路" meta="REVIEW FLOW">
            <div className="signal-chain space-y-4 p-4 pl-11">
              {[
                ['提交档案', '已准备'],
                ['管理员审核', '等待中'],
                ['开通打手端', '审核后'],
              ].map(([title, status], index) => (
                <div key={title} className="relative">
                  <span className={cn('absolute -left-[30px] top-1 h-3 w-3 rotate-45 border', index === 0 ? 'border-primary bg-primary' : 'border-line bg-surface')} />
                  <p className="text-xs font-semibold text-ink">{title}</p>
                  <p className="mt-1 font-data text-[9px] tracking-[0.13em] text-ink-faint">{status}</p>
                </div>
              ))}
            </div>
          </HudPanel>

          <section className="command-panel p-4">
            <p className="font-data text-[9px] tracking-[0.18em] text-ink-faint">MY APPLICATIONS / {String(list.length).padStart(2, '0')}</p>
            {list.length === 0 ? (
              <EmptyState title="还没有申请记录" text="提交后在这里查看审核进度。" className="px-2 py-8" />
            ) : (
              <div className="mt-3 space-y-2">
                {list.map((a) => (
                  <div key={a.id} className="border border-line/75 bg-bg/35 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{a.gameName}</span>
                      <FighterStatusBadge status={a.status} />
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-ink-faint">段位：{a.rank || '未填'} · 擅长：{a.modes.length ? a.modes.join(' / ') : '未选'}</p>
                    {a.intro && <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-ink-dim">{a.intro}</p>}
                    <p className="mt-1 font-data text-[9px] text-ink-faint">{a.createdAt}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </main>
    </div>
  )
}