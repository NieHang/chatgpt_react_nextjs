import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { auth } from '@/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ project: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user.id)
      return Response.json(
        {
          message: 'Unauthorized',
        },
        { status: 401 },
      )

    const userId = session?.user.id
    const { project: projectName } = await params

    const db = await getDb()
    const memoriesCollection = await db!.collection('memories')
    const memory = await memoriesCollection.findOne({
      userId,
      projectName,
    })

    return NextResponse.json({
      code: 0,
      message: 'ok',
      data: memory,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { message: 'Failed to fetch conversations' },
      { status: 500 },
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ project: string }> },
) {
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
      content,
    }: {
      content: string
    } = await req.json()

    const { project: projectName } = await params

    const userId = session.user.id

    const db = await getDb()
    const memoriesCollection = await db!.collection('memories')

    await memoriesCollection.updateOne(
      {
        userId,
        projectName,
      },
      {
        $set: {
          projectName,
          content,
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

