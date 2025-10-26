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

