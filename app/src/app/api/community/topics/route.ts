import { NextResponse } from 'next/server'
import { listCommunityPosts } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const feed = listCommunityPosts({ pageSize: 1 })
  return NextResponse.json({ topics: feed.topics, stats: feed.stats })
}
