export interface Attachment {
  name: string
  isImage: boolean
  isPDF: boolean
  previewSrc?: string
  type: string
  file: File
}
