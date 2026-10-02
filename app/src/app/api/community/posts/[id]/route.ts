import { NextResponse } from 'next/server'
import { deleteCommunityPost, getCommunityPost, updateCommunityPost } from '@/lib/db'
import { readCustomerSession, requireCustomer } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params
  const customer = await readCustomerSession()
  const post = getCommunityPost(id, customer?.customerId || '', true)
  if (!post) return NextResponse.json({ error: '帖子不存在' }, { status: 404 })
  if (post.status !== 'published' && post.authorId !== customer?.customerId) {
    return NextResponse.json({ error: '帖子不存在或尚未发布' }, { status: 404 })
  }
  return NextResponse.json(post)
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const customer = await requireCustomer()
    const { id } = await params
    const body = await request.json()
    const post = updateCommunityPost(id, customer.customerId, {
      title: body.title,
      content: body.content,
      topic: body.topic,
      serviceId: body.serviceId,
      images: Array.isArray(body.images) ? body.images : undefined,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
    })
    return NextResponse.json(post)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '编辑失败' }, { status: error?.status === 401 ? 401 : 400 })
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const customer = await requireCustomer()
    const { id } = await params
    return NextResponse.json({ ok: deleteCommunityPost(id, customer.customerId) })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '删除失败' }, { status: error?.status === 401 ? 401 : 400 })
  }
}
