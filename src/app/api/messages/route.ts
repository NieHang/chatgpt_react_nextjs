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
          error: 'Invalid or missing conversationId',
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

    return NextResponse.json(
      messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
      }))
    )
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      {
        error: 'Internal Server Error',
      },
      {
        status: 500,
      }
    )
  }
}

