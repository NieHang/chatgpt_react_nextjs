'use client'

import AskInput from '@/components/form/Input/AskInput'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ObjectId } from 'bson'

export default function Home() {
  const router = useRouter()
  const [input, setInput] = useState('')

  const onInputChange = (value: string) => {
    setInput(value)
  }

  const onInputKeyDown = () => {
    if (!input.trim()) return

    const chatId = new ObjectId().toHexString()
    router.push(
      `/c/${chatId}?initialMessage=${encodeURIComponent(input.trim())}`,
    )
  }

  return (
    <div className="w-[70%] flex flex-col items-center justify-center">
      <div className="text-[30px] mb-8">What are you working on?</div>
      <AskInput
        value={input}
        onChange={onInputChange}
        onKeyDown={onInputKeyDown}
      />
    </div>
  )
}
