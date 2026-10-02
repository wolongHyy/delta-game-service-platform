import { NextResponse } from 'next/server'
import { reviewCommunityPost } from '@/lib/db'
import { auditAdminAction, requireAdmin } from '@/lib/admin-auth'
import type { CommunityPostStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const status = String(body.status || '') as CommunityPostStatus
    const post = reviewCommunityPost(id, status, {
      featured: body.featured,
      pinned: body.pinned,
      knowledge: body.knowledge,
    })
    await auditAdminAction(request, `community.${status}`, id, {
      featured: Boolean(body.featured),
      pinned: Boolean(body.pinned),
      knowledge: Boolean(body.knowledge),
    })
    return NextResponse.json(post)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '审核失败' }, { status: error?.status === 401 ? 401 : 400 })
  }
}
