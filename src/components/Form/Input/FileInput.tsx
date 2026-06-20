'use client'

import { useEffect, useRef, type ChangeEvent } from 'react'
import { Attachment } from '@/types/Form'

type FileInputProps = {
  files: Attachment[]
  setFiles: (files: Attachment[]) => void
}

export default function FileInput({ files, setFiles }: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setFiles([
      ...files,
      ...Array.from(e.target.files ?? []).map((item) => ({
        name: item.name,
        isImage: item.type.startsWith('image/'),
        isPDF: item.type === 'application/pdf',
        previewSrc: URL.createObjectURL(item),
        type: item.type === 'application/pdf' ? 'PDF' : 'FILE',
      })),
    ])
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
