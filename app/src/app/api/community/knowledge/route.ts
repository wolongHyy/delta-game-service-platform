import { NextResponse } from 'next/server'
import { listCommunityPosts } from '@/lib/db'
import { readCustomerSession } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const customer = await readCustomerSession()
  return NextResponse.json(listCommunityPosts({
    channel: 'knowledge',
    keyword: searchParams.get('keyword') || '',
    page: Number(searchParams.get('page')) || 1,
    pageSize: Number(searchParams.get('pageSize')) || 12,
    viewerId: customer?.customerId || '',
  }))
}
