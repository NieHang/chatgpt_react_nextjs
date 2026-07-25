import clsx from 'clsx'
import Image from 'next/image'
import { useState } from 'react'
import { updateApiKey } from '@/lib/api-wrapper/apiKeys'

export default function UserSecuritySettings({
  onClose,
}: {
  onClose: () => void
}) {
  const [apiKey, setApiKey] = useState('')

  async function updateUserApiKey(apiKey: string) {
    await updateApiKey({ apiKey })
    onClose()
  }

  return (
    <div className="flex items-center justify-between mt-2">
      <label
        className={clsx(
          'flex items-center gap-1',
          'p-2 bg-white border-2 border-gray-300 rounded-2xl',
        )}
      >
        <input
          type="text"
          placeholder="Type your apiKey"
          className="outline-none"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <div
          className={clsx(
            'flex items-center justify-center w-[20px] h-[20px] rounded-full bg-gray-300',
            apiKey ? 'opacity-100' : 'opacity-0',
          )}
        >
          <Image
            src="/common/x-black.svg"
            alt="clear apiKey value"
            width={15}
            height={15}
            className="cursor-pointer"
            onClick={() => setApiKey('')}
          ></Image>
        </div>
      </label>
      <button
        className={clsx(
          'flex items-center justify-center',
          'py-2 px-4',
          'bg-black text-white rounded-3xl',
          'hover:bg-gray-900',
          'cursor-pointer',
        )}
        onClick={() => updateUserApiKey(apiKey)}
      >
        Save
      </button>
    </div>
  )
}
