import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { contents } from '@/lib/schema'
import { v4 as uuidv4 } from 'uuid'

// POST: 创建内容
export async function POST(request: Request) {
  try {
    const db = getDb()
    console.log('Contents API: Received request')
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch (jsonError) {
      console.error('Contents API: Invalid JSON body:', jsonError)
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const { html, sessionId, id: clientId } = body as {
      html?: unknown
      sessionId?: unknown
      id?: unknown
    }
    const htmlText = typeof html === 'string' ? html : undefined

    console.log('Contents API: html length:', htmlText?.length, 'sessionId:', sessionId)

    if (!htmlText) {
      console.error('Contents API: html is required')
      return NextResponse.json(
        { error: 'html is required' },
        { status: 400 }
      )
    }

    const id = typeof clientId === 'string' ? clientId : uuidv4()
    const newContent = {
      id,
      sessionId: typeof sessionId === 'string' ? sessionId : null,
      html: htmlText,
      source: 'ai_generated',
      createdAt: new Date(),
    }

    console.log('Contents API: Inserting content with id:', id)
    await db.insert(contents).values(newContent)
    console.log('Contents API: Content inserted successfully')

    return NextResponse.json(newContent, { status: 201 })
  } catch (error) {
    console.error('Contents API: Create content error:', error)
    console.error('Contents API: Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
