import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { ObjectId } from 'mongodb'
import { auth } from '@/auth'
import { encryptApiKey } from '@/lib/util/encryptApiKey'

export async function GET() {
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
    const apiKeysCollection = await db!.collection('apiKeys')
    const apiKey = await apiKeysCollection
      .find(
        userId
          ? {
              _id: new ObjectId(userId),
            }
          : {},
      )
      .project({
        userId: 1,
        apiKeyLast4: 1,
        apiKeyEncrypted: 1,
      })
      .sort({ updatedAt: -1 })

    return NextResponse.json({
      code: 0,
      message: 'ok',
      data: apiKey,
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
    const { apiKey } = await req.json()

    const session = await auth()

    if (!session?.user.id)
      return Response.json(
        {
          message: 'Unauthorized',
        },
        { status: 401 },
      )

    const userId = session.user.id

    const apiKeyEncrypted = encryptApiKey(apiKey, userId)

    const db = await getDb()
    const apiKeysCollection = await db!.collection('apiKeys')

    await apiKeysCollection.updateOne(
      { userId },
      {
        $set: {
          apiKeyEncrypted: apiKeyEncrypted,
          apiKeyLast4: apiKey.trim().slice(-4),
          updateDate: new Date(),
        },
        $setOnInsert: {
          userId,
          createDate: new Date(),
        },
      },
      { upsert: true },
    )

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
