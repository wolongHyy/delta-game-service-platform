import { NextResponse } from 'next/server'
import { createCommunityComment, getCommunityPost, listCommunityComments } from '@/lib/db'
import { readCustomerSession, requireCustomer } from '@/lib/customer-auth'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params
  const customer = await readCustomerSession()
  const post = getCommunityPost(id, customer?.customerId || '')
  if (!post) return NextResponse.json({ error: '帖子不存在' }, { status: 404 })
  return NextResponse.json({ comments: listCommunityComments(id), total: post.commentCount })
}

export async function POST(request: Request, { params }: Context) {
  if (!rateLimit(`community-comment:${clientIp(request)}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: '评论太频繁，请稍后再试' }, { status: 429 })
  }
  try {
    const customer = await requireCustomer()
    const { id } = await params
    const body = await request.json()
    const comment = createCommunityComment(id, customer.customerId, String(body.content || ''), String(body.parentId || ''))
    return NextResponse.json(comment, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '评论失败' }, { status: error?.status === 401 ? 401 : 400 })
  }
}
