import { Conversation } from '@/types/Conversation'
import getMessagePreview from '@/utils/getMessagePreview'
import clsx from 'clsx'
import { ParamValue } from 'next/dist/server/request/params'
import Image from 'next/image'
import Popover from '@/components/common/Popover'
import { KeyboardEvent, useState } from 'react'
import { useConversations } from '@/providers/ConversationProvider'

export default function ConversationList({
  conversations,
  currentConversationId,
  cutNav,
  handleConversationClick,
}: {
  conversations: Conversation[]
  currentConversationId: ParamValue
  cutNav: boolean
  handleConversationClick: (id?: string) => void
}) {
  const { updateConversation } = useConversations()

  const moreOptions = [
    {
      label: 'rename',
      icon: '/sidebar/pencil.svg',
      fn: () => {
        setEnableRenameMode(true)
        setEditedTitle(
          conversations[currentEditingConversationIndex].title ||
            getMessagePreview(
              conversations[currentEditingConversationIndex]?.messages?.[0]
                ?.content,
            ),
        )
      },
    },
    {
      label: 'delete',
      icon: '/sidebar/trashcan-red.svg',
      warned: true,
      fn: () => {},
    },
  ]

  const moreOptionContent = (
    <div className="flex flex-col -mx-2">
      {moreOptions.map((option, index) => (
        <button
          key={index}
          className={clsx(
            'flex items-center gap-2',
            'w-[180px] py-1 px-3',
            'hover:bg-gray-100 rounded-xl',
            'cursor-pointer',
          )}
          onClick={option.fn}
        >
          <Image src={option.icon} alt={option.label} width={20} height={20} />
          <div className="text-black text-lg">{option.label}</div>
        </button>
      ))}
    </div>
  )

  const [currentEditingConversationIndex, setCurrentEditingConversationIndex] =
    useState(-1)
  const [enableRenameMode, setEnableRenameMode] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [isMoreOptionPopupOpen, setIsMoreOptionPopupOpen] = useState(false)

  function handleEditKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      updateConversation({
        title: editedTitle,
        conversationId: conversations[currentEditingConversationIndex].id!,
      })
      setIsMoreOptionPopupOpen(false)
      e.currentTarget.blur()
    }
  }

  return (
    <aside className="flex flex-col gap-2 pt-2">
      {conversations.map((item, index) => (
        <div
          key={item?.id}
          className={clsx(
            'sidebar-item transition-[opacity] duration-300 ease-in group',
            item.id === currentConversationId ? 'bg-gray-200' : '',
          )}
          style={{ opacity: cutNav ? 0 : 1 }}
          onClick={() => handleConversationClick(item?.id)}
        >
          {currentEditingConversationIndex === index && enableRenameMode ? (
            <input
              type="text"
              autoFocus
              value={editedTitle}
              className="text-sm outline-none  selection:bg-pink-200"
              onFocus={(e) => e.currentTarget.select()}
              onBlur={() => setEnableRenameMode(false)}
              onChange={(e) => setEditedTitle(e.currentTarget.value)}
              onKeyDown={(e) => handleEditKeyDown(e)}
            />
          ) : (
            <div
              className={`w-full overflow-ellipsis overflow-hidden text-sm whitespace-nowrap`}
            >
              {item?.title ?? getMessagePreview(item?.messages?.[0]?.content)}
            </div>
          )}
          {/* More Options */}
          <div
            className={clsx(
              'flex items-center gap-2 opacity-0',
              'group-hover:opacity-100',
            )}
          >
            <Popover
              content={moreOptionContent}
              placement="right-start"
              floatingClassName="border-gray-300 border-1 rounded-2xl py-2 px-3 z-10 bg-white"
              open={
                isMoreOptionPopupOpen &&
                currentEditingConversationIndex === index
              }
              onOpenChange={setIsMoreOptionPopupOpen}
            >
              <Image
                src="/sidebar/ellipsis.svg"
                alt="ellipsis"
                width={10}
                height={10}
                onClick={() => setCurrentEditingConversationIndex(index)}
              ></Image>
            </Popover>
          </div>
        </div>
      ))}
    </aside>
  )
}
