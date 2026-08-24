import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { annotations } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

// GET: 获取批注列表
export async function GET(request: Request) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('contentId')

    console.log('GET annotations for contentId:', contentId)

    if (!contentId) {
      return NextResponse.json(
        { error: 'contentId is required' },
        { status: 400 }
      )
    }

    const result = await db
      .select()
      .from(annotations)
      .where(eq(annotations.contentId, contentId))

    console.log('Found annotations:', result.length)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Get annotations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: 创建批注
export async function POST(request: Request) {
  try {
    const db = getDb()
    const body = await request.json()
    const { contentId, quote, quoteOffset, quoteLength, type, body: annotationBody } = body

    console.log('POST annotation:', { contentId, quote, type, annotationBody })

    if (!contentId || !quote || !type || !annotationBody) {
      console.error('Missing required fields:', { contentId: !!contentId, quote: !!quote, type: !!type, annotationBody: !!annotationBody })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const id = uuidv4()
    const newAnnotation = {
      id,
      contentId,
      quote,
      quoteOffset: quoteOffset || 0,
      quoteLength: quoteLength || quote.length,
      body: annotationBody,
      type,
      color: '#FFEB3B',
      createdAt: new Date(),
    }

    console.log('Inserting annotation:', newAnnotation)
    await db.insert(annotations).values(newAnnotation)
    console.log('Annotation inserted successfully')

    return NextResponse.json(newAnnotation, { status: 201 })
  } catch (error) {
    console.error('Create annotation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
