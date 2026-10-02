import { NextResponse } from 'next/server'
import { listCommunityEvidence } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return NextResponse.json({ evidence: listCommunityEvidence(id) })
}
