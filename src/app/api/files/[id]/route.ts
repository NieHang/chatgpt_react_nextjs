import { getDb } from '@/lib/db'
import { GridFSBucket, ObjectId } from 'mongodb'
import { NextRequest } from 'next/server'
import { Readable } from 'stream'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (!ObjectId.isValid(id)) {
    return new Response('Invalid file id', { status: 400 })
  }

  const db = await getDb()
  if (!db) {
    return new Response('Database not available', { status: 500 })
  }

  const _id = new ObjectId(id)
  const bucket = new GridFSBucket(db, {
    bucketName: 'uploads',
  })

  const fileDoc = await db.collection('uploads.files').findOne({ _id })
  if (!fileDoc) {
    return new Response('File not found', { status: 404 })
  }

  const download = req.nextUrl.searchParams.get('download') === '1'
  const filename = encodeURIComponent(fileDoc.filename ?? 'file')
  const disposition = download ? 'attachment' : 'inline'
  const stream = bucket.openDownloadStream(_id)

  return new Response(
    Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>,
    {
      headers: {
        'Content-Type': fileDoc.contentType ?? 'application/octet-stream',
        'Content-Disposition': `${disposition}; filename="${filename}"`,
      },
    },
  )
}
