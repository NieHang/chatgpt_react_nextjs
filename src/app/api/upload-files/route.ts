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
      const isVisionImage = isVisionImageFile(file)
      const openaiFile = await openAIClient.files.create({
        file,
        purpose: isVisionImage ? 'vision' : 'user_data',
      })

      // files.create() can return before OpenAI has finished validating an
      // image. Do not expose its file_id to the Responses API until it is ready.
      const readyOpenAIFile = isVisionImage
        ? await openAIClient.files.waitForProcessing(openaiFile.id, {
            pollInterval: 500,
            maxWait: 30_000,
          })
        : openaiFile

      if (readyOpenAIFile.status === 'error') {
        throw new Error(
          readyOpenAIFile.status_details ||
            `OpenAI failed to process image "${file.name}"`,
        )
      }

      const mongoFileId = await saveFileToGridFS(file, {
        openaiFileId: readyOpenAIFile.id,
      })

      const mongoId = mongoFileId.toString()

      return {
        id: readyOpenAIFile.id,
        name: file.name,
        type: file.type,
        size: file.size,
        openaiFileId: readyOpenAIFile.id,
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
