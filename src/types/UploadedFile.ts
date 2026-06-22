export type UploadedFile = {
  id: string
  name: string
  type: string
  size: number
  openaiFileId: string
  mongoFileId: string
  src: string
  downloadUrl: string
  isImage: boolean
  isPDF: boolean
}
