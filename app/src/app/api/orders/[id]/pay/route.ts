import { NextResponse } from 'next/server'
import { getOrder, submitPaymentProof } from '@/lib/db'
import { readCustomerSession } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

// 顾客端提交扫码付款信息；真正到账由管理员核对后确认。
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const customer = await readCustomerSession()
  if (!customer) return NextResponse.json({ error: '请刷新页面获取顾客身份' }, { status: 401 })
  const order = getOrder((await params).id)
  if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 })
  if (order.customerId && order.customerId !== customer.customerId) {
    return NextResponse.json({ error: '无权操作该订单' }, { status: 403 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    return NextResponse.json(
      submitPaymentProof(order.id, customer.customerId, String(body.paymentNote || ''), customer.nickname || ''),
    )
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '提交付款信息失败' }, { status: 409 })
  }
}
