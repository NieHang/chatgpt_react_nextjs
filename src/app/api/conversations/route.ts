import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const db = await getDb()
    const list = await db!
      .collection('conversations')
      .find({})
      .project({
        title: 1,
        updatedAt: 1,
        content: 1,
      })
      .sort({ updatedAt: -1 })
      .toArray()

    return NextResponse.json(
      list.map((c) => ({
        id: c._id.toString(),
        title: c.title,
        content: c.content,
        updatedAt: c.updatedAt,
      }))
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { message: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    const db = await getDb()
    const now = new Date()
    const doc = {
      title: 'New Conversation',
      createdAt: now,
      updatedAt: now,
    }
    const { insertedId } = await db!.collection('conversations').insertOne(doc)
    return NextResponse.json({
      id: insertedId.toString(),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { message: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}

