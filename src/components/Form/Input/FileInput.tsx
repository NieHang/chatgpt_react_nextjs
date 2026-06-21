'use client'

import {
  useEffect,
  useRef,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { Attachment } from '@/types/Form'

type FileInputProps = {
  setFiles: Dispatch<SetStateAction<Attachment[]>>
  onFilesSelected?: () => void
}

export default function FileInput({
  setFiles,
  onFilesSelected,
}: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.currentTarget.files ?? [])
    e.currentTarget.value = ''

    if (!selectedFiles.length) {
      return
    }

    const newAttachments = selectedFiles.map((item) => {
      const isPDF =
        item.type === 'application/pdf' ||
        item.name.toLowerCase().endsWith('.pdf')
      const previewFile = isPDF
        ? new Blob([item], { type: 'application/pdf' })
        : item

      return {
        name: item.name,
        isImage: item.type.startsWith('image/'),
        isPDF,
        previewSrc: URL.createObjectURL(previewFile),
        type: isPDF ? 'PDF' : 'FILE',
      }
    })
    setFiles((currentFiles) => [...currentFiles, ...newAttachments])
    onFilesSelected?.()
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.ctrlKey && e.key === 'u') {
      inputRef.current?.click()
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  })

  return (
    <input
      type="file"
      ref={inputRef}
      multiple
      onChange={(e) => handleChange(e)}
      className="sr-only"
    ></input>
  )
}
