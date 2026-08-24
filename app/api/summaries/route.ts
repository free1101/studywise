import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { summaries } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: Request) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const result = await db.select().from(summaries).where(eq(summaries.sessionId, sessionId))

    if (result.length === 0) {
      return NextResponse.json(null)
    }

    const summary = result[0]

    return NextResponse.json({
      summary: summary.finalSummary,
      reviewQuestions: summary.reviewQuestions ? JSON.parse(summary.reviewQuestions) : [],
    })
  } catch (error) {
    console.error('Get summary error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
