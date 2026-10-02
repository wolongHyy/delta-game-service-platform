import { NextResponse } from 'next/server'
import { toggleCommunityFavorite } from '@/lib/db'
import { requireCustomer } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const customer = await requireCustomer()
    const { id } = await params
    return NextResponse.json(toggleCommunityFavorite(id, customer.customerId))
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '操作失败' }, { status: error?.status === 401 ? 401 : 400 })
  }
}
