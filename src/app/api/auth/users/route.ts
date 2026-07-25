import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { ObjectId } from 'mongodb'
import { auth } from '@/auth'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await req.json()
    const db = await getDb()
    const usersCollection = await db!.collection('accounts')
    const account = await usersCollection
      .find(
        userId
          ? {
              _id: new ObjectId(userId),
            }
          : {},
      )
      .project({
        userId: 1,
        name: 1,
        email: 1,
        avatar: 1,
      })
      .sort({ updatedAt: -1 })

    return NextResponse.json({
      code: 0,
      message: 'ok',
      data: account,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { message: 'Failed to fetch conversations' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user.id)
      return Response.json(
        {
          message: 'Unauthorized',
        },
        { status: 401 },
      )

    const userId = session.user.id

    const db = await getDb()
    const usersCollection = await db!.collection('users')

    if (
      !usersCollection.findOne(
        userId
          ? {
              _id: new ObjectId(userId),
            }
          : {},
      )
    ) {
      await usersCollection?.insertOne({
        _id: new ObjectId(userId),
        createDate: new Date(),
        updateDate: new Date(),
      })
    }

    return NextResponse.json({
      code: 0,
      message: 'ok',
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
    const { userId, provider, type } = await req.json()
    const db = await getDb()
    const usersCollection = await db!.collection('accounts')
    if (!ObjectId.isValid(userId!)) {
      return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 })
    }
    const _id = new ObjectId(userId!)
    await usersCollection.updateOne(
      { _id },
      {
        $set: {
          provider,
          type,
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
