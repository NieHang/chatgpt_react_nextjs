'use client'

import { Attachment } from '@/types/Form'
import clsx from 'clsx'
import Image from 'next/image'

export default function PhotoPreview({
  file,
  setCurrentPreviewedItem,
}: {
  file: Attachment
  setCurrentPreviewedItem: (file: Attachment | null) => void
}) {
  return (
    <section className="fixed inset-0 z-10 bg-white/60">
      <section
        className={clsx(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'flex w-[90vw] max-w-4xl flex-col',
          'p-4',
          'bg-white',
          'border border-gray-600 rounded-xl',
        )}
      >
        <div className={clsx('flex w-full shrink-0 items-center mb-2')}>
          <div
            className={clsx(
              'min-w-0 flex-1',
              'text-xl',
              'overflow-hidden whitespace-nowrap text-ellipsis',
            )}
          >
            {file.name}
          </div>
          <Image
            src="/common/x-black.svg"
            alt="close preview"
            width={20}
            height={20}
            className="shrink-0 cursor-pointer"
            onClick={() => setCurrentPreviewedItem(null)}
          />
        </div>
        {file.isImage && file.previewSrc && (
          <img src={file.previewSrc} alt={file.name} />
        )}
      </section>
    </section>
  )
}
