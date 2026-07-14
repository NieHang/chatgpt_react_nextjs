import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { ObjectId } from 'mongodb'
import { auth } from '@/auth'

export async function GET(req: NextRequest) {
  try {
    const conversationId = req.nextUrl.searchParams.get('conversationId')
    const session = await auth()

    if (!session?.user.id)
      return NextResponse.json(
        {
          message: 'Unauthorized',
        },
        { status: 401 },
      )

    const db = await getDb()
    const list = await db!
      .collection('conversations')
      .find(
        conversationId
          ? {
              _id: new ObjectId(conversationId),
              userId: session?.user.id,
            }
          : {
              userId: session?.user.id,
            },
      )
      .project({
        title: 1,
        messages: 1,
        content: 1,
        updatedAt: 1,
        attachments: 1,
      })
      .sort({ updatedAt: -1 })
      .toArray()

    return NextResponse.json({
      code: 0,
      message: 'ok',
      data: list.map((c) => ({
        id: c._id.toString(),
        title: c.title,
        messages: c.messages,
        content: c.content,
        attachments: c.attachments,
        updatedAt: c.updatedAt,
      })),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { message: 'Failed to fetch conversations' },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = await getDb()
    const conversationCollection = db!.collection('conversations')
    const { title, conversationId } = await req.json()
    if (typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ message: 'Invalid title' }, { status: 400 })
    }
    if (
      !conversationCollection.findOne({
        conversationId,
      })
    ) {
      return NextResponse.json(
        { message: 'Invalid conversation ID' },
        { status: 400 },
      )
    }

    await db!.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $set: {
          title: title.trim(),
          updatedAt: new Date(),
        },
      },
    )
    return NextResponse.json({
      ok: true,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { message: 'Failed to update conversation' },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    const db = await getDb()
    if (!ObjectId.isValid(id!)) {
      return NextResponse.json(
        { message: 'Invalid conversation ID' },
        { status: 400 },
      )
    }
    const _id = new ObjectId(id!)
    await db!.collection('conversations').deleteOne({ _id })
    return NextResponse.json({
      ok: true,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { message: 'Failed to delete conversation' },
      { status: 500 },
    )
  }
}
