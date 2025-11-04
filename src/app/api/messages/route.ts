import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { ObjectId } from 'mongodb'

export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get('conversationId')
  try {
    const db = await getDb()

    if (!conversationId || !ObjectId.isValid(conversationId)) {
      return NextResponse.json(
        {
          code: 400,
          message: 'Invalid or missing conversationId',
          data: [],
        },
        {
          status: 400,
        }
      )
    }

    const _cid = new ObjectId(conversationId)
    const messages = await db!
      .collection('messages')
      .find({ conversationId: _cid })
      .sort({ createdAt: 1 })
      .toArray()

    return NextResponse.json({
      code: 0,
      message: 'ok',
      data: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
      })),
    })
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      {
        code: 500,
        message: 'Internal Server Error',
        data: [],
      },
      {
        status: 500,
      }
    )
  }
}
