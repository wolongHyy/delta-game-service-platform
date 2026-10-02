import { NextResponse } from 'next/server'
import { getSettings } from '@/lib/db'

export const dynamic = 'force-dynamic'

// 顾客端只需要读取收款码展示信息，不暴露后台其他设置。
export async function GET() {
  const s = getSettings()
  const wechatQrUrl = s.paymentQrWechatUrl || s.paymentQrUrl || ''
  const alipayQrUrl = s.paymentQrAlipayUrl || ''
  const qrCodes = [
    ...(wechatQrUrl ? [{ channel: 'wechat', label: '微信支付', qrUrl: wechatQrUrl }] : []),
    ...(alipayQrUrl ? [{ channel: 'alipay', label: '支付宝', qrUrl: alipayQrUrl }] : []),
  ]
  return NextResponse.json({
    enabled: qrCodes.length > 0,
    qrUrl: qrCodes[0]?.qrUrl || '',
    qrCodes,
    title: s.paymentQrTitle || '扫码付款',
    instructions: s.paymentInstructions || '请扫码支付后，填写付款人昵称、转账备注或手机号后四位，管理员核对到账后开始派单。',
  })
}
