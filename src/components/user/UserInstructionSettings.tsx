import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { getProjectMemory, updateProjectMemory } from '@/lib/api-wrapper/memory'
import { userSettingModel } from '@/stores/userSettingStore'

export default function UserInstructionSettings({
  onClose,
}: {
  onClose: () => void
}) {
  const { instructions: storedInstructions, updateInstructions } =
    userSettingModel()

  const [instructions, setInstructions] = useState(storedInstructions || '')

  async function updateUserInstructions() {
    const userDefaultInstructions = await getProjectMemory('default')
    if (userDefaultInstructions.data) {
      setInstructions(userDefaultInstructions.data.content)
      updateInstructions(userDefaultInstructions.data.content)
    }
  }

  useEffect(() => {
    if (storedInstructions) return
    updateUserInstructions()
    return () => {}
  }, [])

  return (
    <div className="flex items-center justify-between mt-2">
      <label
        className={clsx(
          'flex items-center gap-1',
          'p-2 bg-white border-2 border-gray-300 rounded-2xl',
        )}
      >
        <textarea
          placeholder="Type your instructions"
          className="outline-none"
          maxLength={2000}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </label>
      <button
        className={clsx(
          'flex items-center justify-center',
          'py-2 px-4',
          'bg-black text-white rounded-3xl',
          'hover:bg-gray-900',
          'cursor-pointer',
        )}
        onClick={async () => {
          await updateProjectMemory({
            content: instructions,
            projectName: 'default',
          })
          onClose()
        }}
      >
        Save
      </button>
    </div>
  )
}
