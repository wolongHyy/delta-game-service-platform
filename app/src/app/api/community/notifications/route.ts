import { NextResponse } from 'next/server'
import { listCommunityNotifications } from '@/lib/db'
import { requireCustomer } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const customer = await requireCustomer()
    const { searchParams } = new URL(request.url)
    return NextResponse.json(listCommunityNotifications(customer.customerId, {
      page: Number(searchParams.get('page')) || 1,
      pageSize: Number(searchParams.get('pageSize')) || 20,
      unreadOnly: searchParams.get('unread') === '1',
    }))
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '通知加载失败' }, { status: 401 })
  }
}
