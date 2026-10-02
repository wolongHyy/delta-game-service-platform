import { NextResponse } from 'next/server'
import { rejectPaymentProof } from '@/lib/db'
import { auditAdminAction } from '@/lib/admin-auth'

// 管理员核对后未收到款：退回待付款，订单不会进入抢单池。
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id
    const order = rejectPaymentProof(id)
    await auditAdminAction(request, 'order.reject_payment', id)
    return NextResponse.json(order)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '退回付款信息失败' }, { status: 409 })
  }
}
