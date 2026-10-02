import { NextResponse } from 'next/server'
import { getOrCreateCommunityProfile, updateCommunityProfile } from '@/lib/db'
import { requireCustomer } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const customer = await requireCustomer()
    return NextResponse.json(getOrCreateCommunityProfile(customer.customerId, customer.nickname || '', customer.avatarUrl || ''))
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '身份加载失败' }, { status: 401 })
  }
}

export async function PATCH(request: Request) {
  try {
    const customer = await requireCustomer()
    const body = await request.json()
    return NextResponse.json(updateCommunityProfile(customer.customerId, {
      nickname: body.nickname,
      avatarUrl: body.avatarUrl,
      bio: body.bio,
    }))
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '资料保存失败' }, { status: error?.status === 401 ? 401 : 400 })
  }
}
