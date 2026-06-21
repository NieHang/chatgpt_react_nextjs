import { getDb } from '@/lib/db'
import { GridFSBucket, ObjectId } from 'mongodb'
import { Readable } from 'stream'
import type { ReadableStream as NodeReadableStream } from 'stream/web'

export default async function saveFileToGridFS(
  file: File,
  metadata: {
    openaiFileId: string
  },
): Promise<ObjectId> {
  const db = await getDb()

  if (!db) throw new Error('Database not available')

  const bucket = new GridFSBucket(db, {
    bucketName: 'uploads',
  })

  return await new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(file.name, {
      contentType: file.type,
      metadata,
    })

    Readable.fromWeb(file.stream() as unknown as NodeReadableStream).pipe(
      uploadStream,
    )

    uploadStream.on('error', reject)
    uploadStream.on('finish', () => resolve(uploadStream.id))
  })
}
