import { NextResponse } from 'next/server'
import { generateSummary } from '@/lib/ai/providers'
import { db } from '@/lib/db'
import { summaries } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  try {
    const { annotations, contentHtml, sessionId, provider } = await request.json()

    if (!annotations || !Array.isArray(annotations) || annotations.length === 0) {
      return NextResponse.json(
        { error: 'Annotations array is required and cannot be empty' },
        { status: 400 }
      )
    }

    const result = await generateSummary(annotations, provider, contentHtml)

    // 持久化到数据库
    if (sessionId) {
      const existing = await db.select().from(summaries).where(eq(summaries.sessionId, sessionId))

      if (existing.length > 0) {
        // 已有记录，更新
        await db.update(summaries).set({
          finalSummary: result.summary,
          reviewQuestions: JSON.stringify(result.reviewQuestions),
          aiEvaluation: JSON.stringify(annotations),
          createdAt: new Date(),
        }).where(eq(summaries.sessionId, sessionId))
      } else {
        // 新增
        await db.insert(summaries).values({
          id: uuidv4(),
          sessionId,
          finalSummary: result.summary,
          reviewQuestions: JSON.stringify(result.reviewQuestions),
          aiEvaluation: JSON.stringify(annotations),
          createdAt: new Date(),
        })
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Summarize error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
