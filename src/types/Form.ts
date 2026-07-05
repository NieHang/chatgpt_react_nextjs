import { OPTION_TYPE } from '@/constants/form'

export interface Attachment {
  name: string
  isImage: boolean
  isPDF: boolean
  previewSrc?: string
  type: string
  file: File
}

export interface AttachmentOption {
  type: OPTION_TYPE
  label: string
  icon: string
  keyword?: string
}
