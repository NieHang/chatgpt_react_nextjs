import clsx from 'clsx'
import Image from 'next/image'
import Popover from '@/components/common/Popover'
import { useState } from 'react'
import FileInput from '@/components/Form/Input/FileInput'
import UploadedFiles from '@/components/Form/UploadedFiles'
import { OPTION_TYPE } from '@/constants/form'
import { Attachment } from '@/types/Form'

export default function AskInput({
  value,
  onChange,
  onKeyDown,
}: {
  value: string
  onChange: (value: string) => void
  onKeyDown: (
    e: React.KeyboardEvent<HTMLInputElement>,
    inputFiles: Attachment[],
  ) => void
}) {
  const attachmentOptions = [
    {
      type: OPTION_TYPE.FILE,
      label: 'Add photos & files',
      icon: '/attachment-options/pins.svg',
      keyword: 'Ctrl + U',
    },
  ]

  const [files, setFiles] = useState<Attachment[]>([])
  const [isAttachmentPopoverOpen, setIsAttachmentPopoverOpen] = useState(false)

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
        >
          <Image
            src={option.icon}
            alt={option.label}
            width={20}
            height={20}
            className="mr-2"
          ></Image>
          <div className="flex items-center justify-between w-full">
            <span>{option.label}</span>
            <span className="hidden text-gray-300 group-hover:block">
              {option.keyword}
            </span>
            <FileInput
              setFiles={setFiles}
              onFilesSelected={() => setIsAttachmentPopoverOpen(false)}
            />
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
      <div className={clsx('flex items-center')}>
        <Popover
          content={attachmentOptionJSX}
          placement="top-start"
          open={isAttachmentPopoverOpen}
          onOpenChange={setIsAttachmentPopoverOpen}
        >
          <div
            className={clsx(
              'p-2 rounded-full mr-1',
              'cursor-pointer',
              'hover:bg-gray-100',
            )}
          >
            <Image src="/common/plus.svg" alt="plus" width={20} height={20} />
          </div>
        </Popover>
        <input
          type="text"
          value={value}
          placeholder="Ask anything"
          className="w-full outline-none border-none bg-transparent"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => onKeyDown(e, files)}
        />
      </div>
    </div>
  )
}
