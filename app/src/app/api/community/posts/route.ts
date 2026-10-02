import { NextResponse } from 'next/server'
import { createCommunityPost, getOrCreateCommunityProfile, listCommunityPosts } from '@/lib/db'
import { readCustomerSession, requireCustomer } from '@/lib/customer-auth'
import type { CommunityChannel } from '@/lib/types'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const customer = await readCustomerSession()
    const channel = (searchParams.get('channel') || 'recommend') as CommunityChannel
    const feed = listCommunityPosts({
      channel,
      topic: searchParams.get('topic') || '',
      keyword: searchParams.get('keyword') || '',
      page: Number(searchParams.get('page')) || 1,
      pageSize: Number(searchParams.get('pageSize')) || 12,
      viewerId: customer?.customerId || '',
      followingId: customer?.customerId || '',
    })
    return NextResponse.json(feed)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '社区加载失败' }, { status: 400 })
  }
}

export async function POST(request: Request) {
  if (!rateLimit(`community-post:${clientIp(request)}`, 6, 10 * 60 * 1000)) {
    return NextResponse.json({ error: '发帖太频繁，请稍后再试' }, { status: 429 })
  }
  try {
    const customer = await requireCustomer()
    const body = await request.json()
    getOrCreateCommunityProfile(customer.customerId, customer.nickname || '', customer.avatarUrl || '')
    const post = createCommunityPost({
      authorId: customer.customerId,
      title: String(body.title || ''),
      content: String(body.content || ''),
      topic: String(body.topic || ''),
      serviceId: String(body.serviceId || ''),
      images: Array.isArray(body.images) ? body.images : [],
      tags: Array.isArray(body.tags) ? body.tags : [],
    })
    return NextResponse.json(post, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '发帖失败' }, { status: error?.status === 401 ? 401 : 400 })
  }
}
