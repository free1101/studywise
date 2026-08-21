import { NextResponse } from 'next/server'
import { replyToAnnotation } from '@/lib/ai/providers'

export async function POST(request: Request) {
  try {
    const { body, type, quote, annotationId, contentHtml, provider, previousReply } = await request.json()

    if (!body || !type || !quote) {
      return NextResponse.json(
        { error: 'Missing required fields: body, type, quote' },
        { status: 400 }
      )
    }

    const reply = await replyToAnnotation(body, type, quote, provider, contentHtml, previousReply)

    return NextResponse.json({ reply, annotationId })
  } catch (error) {
    console.error('AI reply error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
