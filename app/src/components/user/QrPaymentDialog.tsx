'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { PaymentConfig, PaymentQrChannel, PaymentQrOption } from '@/lib/types'
import { api } from '@/lib/client'
import { Btn, Field, IconClose, Money, TextInput, cn } from '@/components/ui'

export default function QrPaymentDialog({
  order,
  onSubmitted,
  onLater,
}: {
  order: { id: string; orderNo: string; amount: number }
  onSubmitted: () => void
  onLater?: () => void
}) {
  const [config, setConfig] = useState<PaymentConfig | null>(null)
  const [paymentNote, setPaymentNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [activeChannel, setActiveChannel] = useState<PaymentQrChannel>('wechat')
  const titleId = useId()
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef(onLater)
  closeRef.current = onLater

  useEffect(() => {
    api<PaymentConfig>('/api/payment/config')
      .then(setConfig)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeRef.current) closeRef.current()
    }
    document.addEventListener('keydown', handleKeyDown)
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previous?.focus()
    }
  }, [])

  const legacyQrCodes: PaymentQrOption[] = config?.qrUrl
    ? [{ channel: 'wechat', label: '微信支付', qrUrl: config.qrUrl }]
    : []
  const qrCodes = config?.qrCodes?.length ? config.qrCodes : legacyQrCodes
  const activeQr = qrCodes.find((item) => item.channel === activeChannel) || qrCodes[0]

  async function submit() {
    if (paymentNote.trim().length < 2) {
      setError('请填写付款人昵称、转账备注或后四位，至少 2 个字')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await api(`/api/orders/${order.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ paymentNote: paymentNote.trim() }),
      })
      onSubmitted()
    } catch (e: any) {
      setError(e.message || '提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4" onClick={onLater}>
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="command-panel relative max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-[18px] outline-none sm:rounded-[5px_18px_5px_18px]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line/80 bg-surface/95 px-5 py-4 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2"><span className="signal-node signal-node--warn" /><span className="font-data text-[9px] tracking-[0.2em] text-warn">SECURE PAYMENT / 03</span></div>
            <h2 id={titleId} className="mt-2 text-xl font-semibold tracking-[-0.03em] text-ink">{config?.title || '扫码付款'}</h2>
            <p className="mt-1 text-[11px] leading-5 text-ink-faint">付款后提交核验信息，管理员确认到账后进入接单池。</p>
          </div>
          {onLater && (
            <button type="button" onClick={onLater} className="press-command flex h-11 w-11 shrink-0 items-center justify-center border border-line text-ink-faint hover:border-primary/40 hover:text-primary" aria-label="稍后支付">
              <IconClose size={17} />
            </button>
          )}
        </header>

        <div className="space-y-5 p-5">
          <div className="relative border border-line/80 bg-bg/45 p-4">
            <span className="absolute right-3 top-3 font-data text-[8px] tracking-[0.16em] text-ink-faint">ORDER RECEIPT</span>
            <div className="grid grid-cols-[1fr_auto] gap-4">
              <div>
                <p className="text-[10px] text-ink-faint">订单编号</p>
                <p className="mt-1 font-data text-xs tracking-[0.06em] text-ink">{order.orderNo}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-ink-faint">应付金额</p>
                <p className="mt-0.5 font-data text-3xl font-semibold text-gold"><Money value={order.amount} /></p>
              </div>
            </div>
          </div>

          {qrCodes.length > 1 && (
            <div className="grid grid-cols-2 border border-line/80 p-1">
              {qrCodes.map((item) => (
                <button
                  key={item.channel}
                  type="button"
                  onClick={() => setActiveChannel(item.channel)}
                  className={cn('press-command min-h-touch text-xs transition-command', activeQr?.channel === item.channel ? 'bg-primary text-onPrimary' : 'text-ink-dim hover:bg-primary/[0.06]')}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-data text-[9px] tracking-[0.16em] text-ink-faint">PAYMENT CHANNEL / QR SCAN</span>
              {activeQr && <span className="font-data text-[9px] text-ok">● READY</span>}
            </div>
            <div className="relative flex min-h-56 items-center justify-center overflow-hidden border border-line bg-surface2/55 p-4">
              <span className="absolute left-3 top-3 h-5 w-5 border-l border-t border-primary/65" />
              <span className="absolute right-3 top-3 h-5 w-5 border-r border-t border-primary/65" />
              <span className="absolute bottom-3 left-3 h-5 w-5 border-b border-l border-primary/65" />
              <span className="absolute bottom-3 right-3 h-5 w-5 border-b border-r border-primary/65" />
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-ink-faint"><span className="h-2 w-2 animate-pulse bg-primary" />正在读取收款链路…</div>
              ) : activeQr ? (
                <img src={activeQr.qrUrl} alt={activeQr.label} className="max-h-64 w-full object-contain" />
              ) : (
                <div className="px-4 text-center">
                  <p className="text-sm font-medium text-warn">商家尚未配置收款码</p>
                  <p className="mt-2 text-xs leading-5 text-ink-faint">请稍后支付或联系人工客服，不要直接点击已付款。</p>
                </div>
              )}
            </div>
          </div>

          {config?.instructions && <p className="border-l border-info/60 bg-info/[0.055] px-4 py-3 text-xs leading-5 text-ink-dim">{config.instructions}</p>}

          <Field label="付款信息 *" hint={activeQr ? `用于核对${activeQr.label}到账` : '用于核对到账'}>
            <TextInput
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              maxLength={200}
              placeholder={activeQr?.channel === 'alipay' ? '例如：支付宝昵称「小明」或转账备注后四位' : '例如：微信昵称「小明」或转账备注后四位'}
            />
          </Field>

          {error && <p className="border border-danger/25 bg-danger/[0.06] px-3 py-2 text-sm text-danger">{error}</p>}

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Btn block disabled={submitting || !activeQr} onClick={submit}>
              {submitting ? '正在提交核验…' : '我已完成付款'}
            </Btn>
            {onLater && <Btn variant="outline" disabled={submitting} onClick={onLater}>稍后支付</Btn>}
          </div>
          <p className="text-center font-data text-[8px] tracking-[0.14em] text-ink-faint">DO NOT CLOSE THIS WINDOW UNTIL SUBMITTED</p>
        </div>
      </section>
    </div>
  )
}