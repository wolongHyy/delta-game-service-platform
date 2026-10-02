import { NextResponse } from 'next/server'
import { listCommunityPosts } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'
import type { CommunityPostStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const status = (searchParams.get('status') || 'pending') as CommunityPostStatus | 'all'
    return NextResponse.json(listCommunityPosts({
      channel: 'latest',
      status,
      keyword: searchParams.get('keyword') || '',
      page: Number(searchParams.get('page')) || 1,
      pageSize: Number(searchParams.get('pageSize')) || 30,
    }))
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '无权限' }, { status: 401 })
  }
}
