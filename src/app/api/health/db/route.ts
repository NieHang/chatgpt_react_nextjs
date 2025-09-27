export const runtime = 'nodejs' // 重要：mongodb 驱动需要 Node 运行时

import { NextResponse } from 'next/server'
import { MongoClient, ServerApiVersion } from 'mongodb'

const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB || 'appdb'

let clientPromise: Promise<MongoClient>
const g = global as any

if (!g._mongoClientPromise) {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    serverSelectionTimeoutMS: 30000, // 5s 内选不到可用节点就报错，方便快速发现连通性问题
  })
  g._mongoClientPromise = client.connect()
}
clientPromise = g._mongoClientPromise

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(dbName)

    // 真正的连通性测试：ping
    const ping = await db.command({ ping: 1 })

    return NextResponse.json({
      ok: true,
      ping,
      db: db.databaseName,
      topology: client.topology?.description?.type || 'connected',
    })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    )
  }
}

