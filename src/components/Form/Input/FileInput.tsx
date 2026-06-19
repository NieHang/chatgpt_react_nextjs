'use client'

import { useEffect, useRef, type ChangeEvent } from 'react'
import { Attachment } from '@/types/Form'

type FileInputProps = {
  setFiles: (files: Attachment[]) => void
}

export default function FileInput({ setFiles }: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setFiles(
      Array.from(e.target.files ?? []).map((item) => ({
        name: item.name,
        isImage: item.type.startsWith('image/'),
        previewSrc: URL.createObjectURL(item),
      })),
    )
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
