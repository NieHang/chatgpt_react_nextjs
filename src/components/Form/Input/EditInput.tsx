import UserAttachments from '@/components/common/UserAttachments'
import type { ConversationMessage } from '@/types/Conversation'
import clsx from 'clsx'
import { useState } from 'react'

export default function EditInput({
  msg,
  setMsgIndexToBeEdited,
  handleMsgUpdate,
}: {
  msg: ConversationMessage
  setMsgIndexToBeEdited: (index: number | null) => void
  handleMsgUpdate: (val: string) => void
}) {
  const messageToBeEdited =
    typeof msg.content === 'string'
      ? msg.content
      : msg.content.find((item) => item.type === 'input_text')?.text

  const [textareaVal, setTextareaVal] = useState(messageToBeEdited || '')
  return (
    <div
      className={clsx(
        'flex flex-col',
        'w-full max-h-80 p-4 rounded-2xl bg-gray-100',
      )}
    >
      {msg.attachments && <UserAttachments files={msg.attachments} editMode />}
      <textarea
        value={textareaVal}
        className="outline-none resize-none field-sizing-content max-h-80"
        onChange={(e) => setTextareaVal(e.target.value)}
      ></textarea>
      <div className="flex items-center gap-2 place-self-end mt-4">
        <button
          className={clsx(
            'px-4 py-1.5 border-gray-100 rounded-2xl bg-white',
            'hover:bg-gray-50',
            'cursor-pointer',
          )}
          onClick={() => setMsgIndexToBeEdited(null)}
        >
          Cancel
        </button>
        <button
          disabled={!textareaVal}
          className={clsx(
            'px-4 py-1.5 border-gray-100 rounded-2xl bg-black text-white',
            !textareaVal
              ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed'
              : 'hover:bg-gray-900 cursor-pointer',
          )}
          onClick={() => {
            handleMsgUpdate(textareaVal)
            setMsgIndexToBeEdited(null)
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
