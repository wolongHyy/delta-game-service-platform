'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/client'
import type { PaymentQrChannel } from '@/lib/types'
import { Btn, Field, TextArea, TextInput } from '@/components/ui'
import { AdminCode, AdminMetric, AdminNotice, AdminPageHeader, AdminPanelTitle } from '@/components/admin/AdminUI'

type SettingsForm = {
  shopName: string
  customerServiceWechat: string
  notice: string
  paymentQrWechatUrl: string
  paymentQrAlipayUrl: string
  paymentQrTitle: string
  paymentInstructions: string
}

const EMPTY_FORM: SettingsForm = {
  shopName: '',
  customerServiceWechat: '',
  notice: '',
  paymentQrWechatUrl: '',
  paymentQrAlipayUrl: '',
  paymentQrTitle: '',
  paymentInstructions: '',
}

export default function AdminSettings() {
  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<PaymentQrChannel | ''>('')
  const [notice, setNotice] = useState('')
  const wechatFileInputRef = useRef<HTMLInputElement>(null)
  const alipayFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api<Record<string, string>>('/api/admin/settings')
      .then((s) => setForm({
        shopName: s.shopName || '',
        customerServiceWechat: s.customerServiceWechat || '',
        notice: s.notice || '',
        paymentQrWechatUrl: s.paymentQrWechatUrl || s.paymentQrUrl || '',
        paymentQrAlipayUrl: s.paymentQrAlipayUrl || '',
        paymentQrTitle: s.paymentQrTitle || '',
        paymentInstructions: s.paymentInstructions || '',
      }))
      .catch((e) => setNotice(e.message))
  }, [])

  async function save() {
    setSaving(true)
    setNotice('')
    try {
      await api('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ ...form, paymentQrUrl: '' }),
      })
      setNotice('设置已保存')
    } catch (e: any) {
      setNotice(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function uploadQr(channel: PaymentQrChannel, file?: File) {
    if (!file) return
    setUploading(channel)
    setNotice('')
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('channel', channel)
      const response = await fetch('/api/admin/settings/payment-qr', { method: 'POST', body })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || '收款码上传失败')
      setForm((prev) => ({
        ...prev,
        paymentQrWechatUrl: data.paymentQrWechatUrl || '',
        paymentQrAlipayUrl: data.paymentQrAlipayUrl || '',
      }))
      setNotice(`${channel === 'wechat' ? '微信' : '支付宝'}收款码已上传并生效`)
    } catch (e: any) {
      setNotice(e.message || '收款码上传失败')
    } finally {
      setUploading('')
      const input = channel === 'wechat' ? wechatFileInputRef.current : alipayFileInputRef.current
      if (input) input.value = ''
    }
  }

  function removeQr(channel: PaymentQrChannel) {
    setForm((prev) => channel === 'wechat'
      ? { ...prev, paymentQrWechatUrl: '' }
      : { ...prev, paymentQrAlipayUrl: '' })
  }

  const configured = [form.paymentQrWechatUrl, form.paymentQrAlipayUrl].filter(Boolean).length

  return (
    <div className="page-enter space-y-4">
      <AdminPageHeader
        eyebrow="PLATFORM CONTROL / SETTINGS"
        title="平台设置"
        description="维护店铺身份、客服入口、付款说明与二维码收款通道。二维码上传后立即生效。"
        meta={<><span>收款通道 {configured}/2</span><span>数据源 SQLite</span></>}
        actions={<Btn onClick={save} disabled={saving}>{saving ? '保存中…' : '保存设置'}</Btn>}
      />

      <section className="grid grid-cols-3 gap-2">
        <AdminMetric code="S / SHOP" label="店铺名称" value={form.shopName || '未设置'} />
        <AdminMetric code="S / QR" label="可用收款码" value={`${configured}/2`} tone={configured ? 'ok' : 'warn'} />
        <AdminMetric code="S / SERVICE" label="客服微信" value={form.customerServiceWechat ? '已配置' : '未配置'} tone={form.customerServiceWechat ? 'ok' : 'warn'} />
      </section>

      {notice && <AdminNotice tone={notice.includes('失败') ? 'danger' : 'ok'}>{notice}</AdminNotice>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <section className="command-panel overflow-hidden">
          <AdminPanelTitle code="IDENTITY / PUBLIC PROFILE" title="店铺身份" description="用户端可见的基础信息。" />
          <div className="space-y-3 p-4">
            <Field label="店铺名称">
              <TextInput value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
            </Field>
            <Field label="客服微信">
              <TextInput value={form.customerServiceWechat} onChange={(e) => setForm({ ...form, customerServiceWechat: e.target.value })} placeholder="微信号" />
            </Field>
            <Field label="门店公告">
              <TextArea rows={6} value={form.notice} onChange={(e) => setForm({ ...form, notice: e.target.value })} />
            </Field>
            <div className="border border-line bg-surface2/60 p-3 font-data text-[9px] leading-5 tracking-[0.08em] text-ink-faint">
              <p>SYSTEM / DELTA GAME SERVICE PLATFORM v1.0</p>
              <p>STORAGE / SQLITE custom.db</p>
              <p>RUNTIME / START.BAT OR NPM RUN DEV</p>
            </div>
          </div>
        </section>

        <section className="command-panel overflow-hidden">
          <AdminPanelTitle code="PAYMENT / QR ROUTING" title="二维码收款" description="顾客扫码付款后进入待确认到账；核对账单后再到订单调度确认收款。" action={<AdminCode tone={configured ? 'primary' : 'default'}>{configured ? 'CHANNEL READY' : 'NOT CONFIGURED'}</AdminCode>} />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {([
              { channel: 'wechat' as PaymentQrChannel, label: '微信收款码', url: form.paymentQrWechatUrl, inputRef: wechatFileInputRef },
              { channel: 'alipay' as PaymentQrChannel, label: '支付宝收款码', url: form.paymentQrAlipayUrl, inputRef: alipayFileInputRef },
            ]).map(({ channel, label, url, inputRef }) => (
              <div key={channel} className="border border-line bg-surface2/55 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{label}</p>
                  <span className={`font-data text-[9px] ${url ? 'text-ok' : 'text-ink-faint'}`}>{url ? 'ACTIVE' : 'EMPTY'}</span>
                </div>
                <div data-matrix className="mt-3 flex min-h-56 items-center justify-center border border-dashed border-line bg-white p-3">
                  {url ? <img src={url} alt={label} className="max-h-72 max-w-full object-contain" /> : <p className="px-2 text-center text-xs text-ink-faint">尚未上传{label}</p>}
                </div>
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadQr(channel, e.target.files?.[0])} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Btn size="sm" variant="soft" disabled={Boolean(uploading)} onClick={() => inputRef.current?.click()}>{uploading === channel ? '上传中…' : url ? '替换' : '上传'}</Btn>
                  {url && <Btn size="sm" variant="outline" disabled={Boolean(uploading)} onClick={() => removeQr(channel)}>移除</Btn>}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3 border-t border-line p-4">
            <Field label="收款码标题">
              <TextInput value={form.paymentQrTitle} onChange={(e) => setForm({ ...form, paymentQrTitle: e.target.value })} placeholder="扫码付款" />
            </Field>
            <Field label="付款说明">
              <TextArea rows={4} value={form.paymentInstructions} onChange={(e) => setForm({ ...form, paymentInstructions: e.target.value })} placeholder="请扫码支付后，填写付款人昵称、转账备注或手机号后四位，管理员核对到账后开始派单。" />
            </Field>
            <p className="text-[11px] leading-5 text-ink-faint">上传后立即保存到数据库；点击页头「保存设置」会同步标题、付款说明和基础资料。微信、支付宝可以只配置一个，也可以两个都配置。</p>
          </div>
        </section>
      </div>
    </div>
  )
}