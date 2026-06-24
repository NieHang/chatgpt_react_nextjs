import { UploadedFile } from '@/types/UploadedFile'
import clsx from 'clsx'
import Image from 'next/image'
import FileAttachment from '@/components/common/FileAttachment'

export default function UserAttachments({
  files,
  editMode,
}: {
  files: UploadedFile[]
  editMode?: boolean
}) {
  return files.map((file, index) => (
    <div
      key={index}
      className={clsx(
        'relative',
        'flex items-center w-fit',
        file.isImage && 'justify-center',
        !file.isImage && 'p-2',
        !editMode && 'place-self-end',
        'border border-gray-300 rounded-xl',
        'hover:bg-gray-100',
        'cursor-pointer',
      )}
    >
      {file.isImage ? (
        <Image
          src={file.src}
          alt={file.name}
          width={56}
          height={56}
          className="rounded-xl object-fit h-[56px]"
        />
      ) : (
        <FileAttachment file={file} />
      )}
    </div>
  ))
}
