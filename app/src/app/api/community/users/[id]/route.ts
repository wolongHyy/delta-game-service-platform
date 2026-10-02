import { NextResponse } from 'next/server'
import { getCommunityProfileView, getOrCreateCommunityProfile } from '@/lib/db'
import { readCustomerSession } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const viewer = await readCustomerSession()
  if (viewer?.customerId === id) getOrCreateCommunityProfile(id, viewer.nickname || '', viewer.avatarUrl || '')
  const view = getCommunityProfileView(id, viewer?.customerId || '', {
    page: Number(searchParams.get('page')) || 1,
    pageSize: Number(searchParams.get('pageSize')) || 12,
  })
  if (!view) return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  return NextResponse.json(view)
}
