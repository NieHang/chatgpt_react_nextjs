import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { auth } from '@/auth'
import { PermissionBehavior } from '@/agent/permissions'
import { CollectionNames } from '@/constants/conversation'

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

    const {
      runId,
      callId,
      decision,
    }: {
      runId: string
      callId: string
      decision: PermissionBehavior
    } = await req.json()

    const userId = session.user.id

    const db = await getDb()
    const conversationCollection = await db!.collection(
      CollectionNames.CONVERSATIONS,
    )

    const result = await conversationCollection.findOne({
      userId,
      runId,
    })

    return NextResponse.json({
      code: 0,
      message: 'ok',
      data: result,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { message: 'Failed to fetch paused run' },
      { status: 500 },
    )
  }
}

