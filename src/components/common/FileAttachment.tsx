import clsx from 'clsx'
import Image from 'next/image'

type FileAttachmentFile = {
  name: string
  type: string
  isPDF: boolean
  downloadUrl?: string
  previewSrc?: string
}

export default function FileAttachment({ file }: { file: FileAttachmentFile }) {
  return (
    <a
      href={file?.downloadUrl || file?.previewSrc}
      download={file.name}
      className={clsx('flex items-center gap-2 pr-8')}
    >
      <div
        className={clsx(
          'flex items-center justify-center shrink',
          'w-10 h-10 rounded-[5px]',
          file.isPDF ? 'bg-orange-600' : 'bg-gray-500',
        )}
      >
        <Image
          src={
            file.isPDF
              ? '/attachment-options/pdf.svg'
              : '/attachment-options/file.svg'
          }
          alt={file.name}
          width={25}
          height={25}
        />
      </div>
      <div className="flex flex-col items-start min-w-0">
        <div
          className={clsx(
            'max-w-[200px]',
            'text-black text-xm font-bold',
            'overflow-hidden whitespace-nowrap text-ellipsis',
          )}
        >
          {file.name}
        </div>
        <div className="text-gray-400 text-xs">{file.type}</div>
      </div>
    </a>
  )
}
