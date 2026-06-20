import clsx from 'clsx'
import { Attachment } from '@/types/Form'
import Image from 'next/image'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'

export default function UploadedFiles({
  files,
  setFiles,
}: {
  files: Attachment[]
  setFiles: (files: Attachment[]) => void
}) {
  return (
    <Swiper
      style={{
        padding: '0 8px',
      }}
      spaceBetween={10}
      slidesPerView="auto"
      className={clsx('mb-1 px-2')}
    >
      {files.map((file, index) => (
        <SwiperSlide
          key={index}
          style={{
            width: 'auto',
            maxWidth: '280px',
          }}
          className={clsx(
            'relative',
            'flex items-center p-2',
            file.isImage && 'justify-center',
            'border border-gray-300 rounded-xl',
            'hover:bg-gray-100',
            'cursor-pointer',
          )}
        >
          {file.isImage && file.previewSrc ? (
            <Image
              src={file.previewSrc}
              alt={file.name}
              width={files.length > 1 ? 40 : 144}
              height={files.length > 1 ? 40 : 144}
            />
          ) : (
            <div className={clsx('flex items-center gap-2 pr-8')}>
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
            </div>
          )}
          <div
            className={clsx(
              'absolute top-1 right-1',
              'flex items-center justify-center',
              'bg-black',
              'rounded-full',
              'text-white cursor-pointer',
              files.length > 1 ? 'w-4 h-4' : 'w-6 h-6',
            )}
            onClick={() => {
              setFiles(files.filter((item, fileIndex) => fileIndex !== index))
            }}
          >
            <Image
              src="/common/x.svg"
              alt="delete file"
              width={files.length > 1 ? 15 : 20}
              height={files.length > 1 ? 15 : 20}
            />
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  )
}
