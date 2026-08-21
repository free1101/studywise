import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { annotations } from '@/lib/schema'
import { eq } from 'drizzle-orm'

// PUT: 更新批注
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { body: annotationBody, type, aiReply, color } = body

    const updateData: Record<string, unknown> = {}
    if (annotationBody !== undefined) updateData.body = annotationBody
    if (type !== undefined) updateData.type = type
    if (aiReply !== undefined) updateData.aiReply = aiReply
    if (color !== undefined) updateData.color = color

    await db
      .update(annotations)
      .set(updateData)
      .where(eq(annotations.id, id))

    const updated = await db
      .select()
      .from(annotations)
      .where(eq(annotations.id, id))
      .limit(1)

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Annotation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(updated[0])
  } catch (error) {
    console.error('Update annotation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: 删除批注
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await db.delete(annotations).where(eq(annotations.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete annotation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
