import { NextResponse } from 'next/server'
import { getOrder, payOrder } from '@/lib/db'
import { auditAdminAction } from '@/lib/admin-auth'

// 管理端确认到账：支持二维码人工核销，也兼容旧的手工线下收款。
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id
    const current = getOrder(id)
    if (!current) return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    const method = current.status === 'payment_review' ? 'qr_manual' : 'offline'
    const order = payOrder(id, { type: 'admin', name: 'admin' }, method)
    await auditAdminAction(_request, 'order.pay', id, { method })
    return NextResponse.json(order)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 409 })
  }
}
