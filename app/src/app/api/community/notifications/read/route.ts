import { NextResponse } from 'next/server'
import { markAllCommunityNotificationsRead, markCommunityNotificationRead } from '@/lib/db'
import { requireCustomer } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const customer = await requireCustomer()
    const body = await request.json().catch(() => ({}))
    if (body.all === true) return NextResponse.json({ changed: markAllCommunityNotificationsRead(customer.customerId) })
    return NextResponse.json({ ok: markCommunityNotificationRead(String(body.id || ''), customer.customerId) })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '操作失败' }, { status: 401 })
  }
}
