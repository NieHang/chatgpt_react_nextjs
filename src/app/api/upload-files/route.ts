import { NextRequest, NextResponse } from 'next/server'
import getOpenAIClient from '@/lib/openAIClient'
import saveFileToGridFS from '@/app/api/upload-files/saveFileToGridFS'
import { isVisionImageFile } from '@/lib/fileTypes'
import { auth } from '@/auth'
import decryptApiKeyFromDB from '@/lib/util/decryptApiKeyFromDB'
import { getDb } from '@/lib/db'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const inputFiles = formData
    .getAll('files')
    .filter((item) => item instanceof File)

  const db = await getDb().catch((error) => {
    console.error('Failed to connect to database:', error)
    return null
  })

  const session = await auth()

  if (!session?.user.id)
    return Response.json(
      {
        message: 'Unauthorized',
      },
      { status: 401 },
    )

  const userId = session.user.id

  const apiKey = await decryptApiKeyFromDB({ db: db!, userId })

  const openAIClient = getOpenAIClient(apiKey as string)!

  const uploadedFiles = await Promise.all(
    inputFiles.map(async (file) => {
      const openaiFile = await openAIClient.files.create({
        file,
        purpose: isVisionImageFile(file) ? 'vision' : 'user_data',
      })

      const mongoFileId = await saveFileToGridFS(file, {
        openaiFileId: openaiFile.id,
      })

      const mongoId = mongoFileId.toString()

      return {
        id: openaiFile.id,
        name: file.name,
        type: file.type,
        size: file.size,
        openaiFileId: openaiFile.id,
        mongoFileId: mongoId,
        src: `/api/files/${mongoId}`,
        downloadUrl: `/api/files/${mongoId}?download=1`,
        isImage: file.type.startsWith('image/'),
        isPDF:
          file.type === 'application/pdf' ||
          file.name.toLowerCase().endsWith('.pdf'),
      }
    }),
  )

  return NextResponse.json({
    uploadedFiles,
  })
}
