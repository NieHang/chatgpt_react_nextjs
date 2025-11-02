import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { ObjectId } from 'mongodb'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb()
    const list = await db!
      .collection('conversations')
      .find({
        conversationId: new ObjectId(params.id),
      })
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb()
    const { title } = await req.json()
    if (typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ message: 'Invalid title' }, { status: 400 })
    }
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { message: 'Invalid conversation ID' },
        { status: 400 }
      )
    }
    const _id = new ObjectId(params.id)
    await db!.collection('conversations').updateOne(
      { _id },
      {
        $set: {
          title: title.trim(),
          updatedAt: new Date(),
        },
      }
    )
    return NextResponse.json({
      ok: true,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { message: 'Failed to update conversation' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb()
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { message: 'Invalid conversation ID' },
        { status: 400 }
      )
    }
    const _id = new ObjectId(params.id)
    await db!.collection('messages').deleteMany({
      conversationId: params.id,
    })
    await db!.collection('conversations').deleteOne({ _id })
    return NextResponse.json({
      ok: true,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { message: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}

