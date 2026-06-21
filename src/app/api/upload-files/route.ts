import { NextRequest, NextResponse } from 'next/server'
import getOpenAIClient from '@/lib/openAIClient'
import saveFileToGridFS from '@/app/api/upload-files/saveFileToGridFS'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const inputFiles = formData
    .getAll('files')
    .filter((item) => item instanceof File)

  const openAIClient = getOpenAIClient()!

  const uploadedFiles = await Promise.all(
    inputFiles.map(async (file) => {
      const openaiFile = await openAIClient.files.create({
        file,
        purpose: 'user_data',
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
      }
    }),
  )

  return NextResponse.json({
    uploadedFiles,
  })
}
