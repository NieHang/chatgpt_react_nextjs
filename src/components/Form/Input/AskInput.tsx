import clsx from 'clsx'
import Image from 'next/image'
import Popover from '@/components/common/Popover'
import { useState } from 'react'
import FileInput from '@/components/Form/Input/FileInput'
import UploadedFiles from '@/components/Form/UploadedFiles'
import { OPTION_TYPE } from '@/constants/form'
import { Attachment } from '@/types/Form'
import Tip from '@/components/common/Tip'
import ModelSwitch from '@/components/ModelSwitch'
import { EditorContent, useEditor } from '@tiptap/react'
import { ToolChipNode } from '@/components/TipTap/ToolChipNode'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { useModel } from '@/stores/modelStore'
import { toolChipKind } from '@/constants/model'
import { AttachmentOption } from '@/types/Form'
import { insertToolChip } from '@/utils/TipTap/InsertToolChip'

export default function AskInput({
  value,
  onChange,
  onKeyDown,
}: {
  value: string
  onChange: (value: string) => void
  onKeyDown: (inputFiles: Attachment[]) => void
}) {
  const attachmentOptions: AttachmentOption[] = [
    {
      type: OPTION_TYPE.FILE,
      label: 'Add photos & files',
      icon: '/attachment-options/pins.svg',
      keyword: 'Ctrl + U',
    },
    {
      type: OPTION_TYPE.IMAGE,
      label: 'Create image',
      icon: '/attachment-options/image.svg',
    },
  ]

  const [files, setFiles] = useState<Attachment[]>([])
  const [isAttachmentPopoverOpen, setIsAttachmentPopoverOpen] = useState(false)

  const updateTool = useModel((state) => state.updateTool)

  const editor = useEditor({
    extensions: [Document, Paragraph, Text, ToolChipNode],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getText())
      let hasToolChip = false

      editor.state.doc.descendants((node) => {
        if (node.type.name === 'toolChip') {
          hasToolChip = true
          return false
        }

        return true
      })

      if (!hasToolChip) {
        updateTool(undefined)
      }
    },
    editorProps: {
      handleKeyDown(view, e) {
        if (e.key === 'Enter') {
          e.preventDefault()
          onKeyDown(files)
          onChange('')
          setFiles([])
          return true
        }
        return false
      },
    },
  })

  const attachmentOptionJSX = (
    <div className="flex flex-col w-[250px] bg-white">
      {attachmentOptions.map((option) => (
        <label
          key={option.label}
          className={clsx(
            'group relative',
            'flex items-center -mx-1.5 px-3 py-1 cursor-pointer',
            'hover:bg-gray-100 rounded-[12px]',
          )}
          onClick={() => {
            if (editor) {
              insertToolChip(editor, option)
            }

            updateTool({
              type: toolChipKind[option.type as keyof typeof toolChipKind],
            })
          }}
        >
          <Image
            src={option.icon}
            alt={option.label}
            width={20}
            height={20}
            className="mr-2"
          ></Image>
          <div className="flex items-center justify-between w-full">
            <span className="whitespace-nowrap">{option.label}</span>
            {option.type === OPTION_TYPE.FILE && (
              <>
                <span className="hidden text-gray-300 group-hover:block">
                  {option.keyword}
                </span>
                <FileInput
                  setFiles={setFiles}
                  onFilesSelected={() => setIsAttachmentPopoverOpen(false)}
                />
              </>
            )}
          </div>
        </label>
      ))}
    </div>
  )

  return (
    <div
      className={clsx(
        'flex flex-col',
        'w-full p-2 bg-white',
        'rounded-4xl border border-gray-300',
        'shadow-[0_0_20px_rgba(255,255,255)]',
        'overflow-hidden',
      )}
    >
      <div className={clsx('mx-[-8px]')}>
        {!!files.length && <UploadedFiles files={files} setFiles={setFiles} />}
      </div>
      <div className={clsx('flex items-center gap-2')}>
        <Popover
          content={attachmentOptionJSX}
          placement="top-start"
          floatingClassName="border-gray-300 border-1 rounded-2xl py-2 px-3 z-10 bg-white"
          open={isAttachmentPopoverOpen}
          onOpenChange={setIsAttachmentPopoverOpen}
        >
          <Tip
            tipContent={
              <div className="flex items-center gap-2">
                <span>Add files and more</span>
                <div
                  className={clsx(
                    'flex items-center justify-center p-1',
                    'rounded-[4px]',
                    'bg-gray-600',
                  )}
                >
                  <Image
                    src="/common/@.svg"
                    alt="Send Prompt"
                    width={10}
                    height={10}
                  />
                </div>
              </div>
            }
          >
            <div
              className={clsx(
                'p-2 rounded-full mr-1',
                'cursor-pointer',
                'hover:bg-gray-100',
              )}
            >
              <Image src="/common/plus.svg" alt="plus" width={40} height={40} />
            </div>
          </Tip>
        </Popover>
        <EditorContent
          editor={editor}
          className="w-full min-w-0 [&_.ProseMirror]:outline-none"
        />
        <ModelSwitch />
        <Tip
          tipContent={
            <div className="flex items-center gap-2">
              <span>Send Prompt</span>
              <Image
                src="/common/enter-key.svg"
                alt="Send Prompt"
                width={15}
                height={15}
              />
            </div>
          }
        >
          <button
            disabled={!value}
            className={clsx(
              'w-[36px] h-[36px] bg-[#e0766d] rounded-full',
              'flex items-center justify-center shrink-0',
              !value ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            )}
            onClick={() => {
              onKeyDown(files)
              setFiles([])
            }}
          >
            <Image
              src="/common/top-arrow.svg"
              alt="send message"
              width={30}
              height={30}
            />
          </button>
        </Tip>
      </div>
    </div>
  )
}
