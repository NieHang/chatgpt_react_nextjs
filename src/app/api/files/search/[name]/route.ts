import { getDb } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string; userId: string }> },
) {
  const { name } = await params
  const userId = req.nextUrl.searchParams.get('userId')

  if (!name) {
    return new Response('Invalid file name', { status: 400 })
  }

  const db = await getDb()
  if (!db) {
    return new Response('Database not available', { status: 500 })
  }

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const fileDocs = await db
    .collection('uploads.files')
    .find({
      filename: {
        $regex: escapedName,
        $options: 'i',
      },
      'metadata.userId': userId,
    })
    .project({
      _id: 1,
      filename: 1,
      uploadDate: 1,
      length: 1,
    })
    .sort({ updateDate: -1 })
    .limit(20)
    .toArray()

  if (!fileDocs || fileDocs.length === 0) {
    return new Response('File not found', { status: 404 })
  }

  return Response.json({
    files: fileDocs,
  })
}
