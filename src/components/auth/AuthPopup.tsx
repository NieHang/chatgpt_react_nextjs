import clsx from 'clsx'
import Popover from '@/components/common/Popover'
import Image from 'next/image'

export default function AuthPopup() {
  const content = (
    <div className={clsx('flex flex-col', 'w-[280px] bg-white', 'rounded-2xl')}>
      <Image
        src="/auth/starry-sky.jpg"
        alt="starry-sky"
        width={280}
        height={80}
        objectFit="cover"
        className={clsx('h-[80px] rounded-tl-2xl rounded-tr-2xl')}
      />
      <div className={clsx('flex flex-col', 'p-3')}>
        <span className="text-[18px]">Try advanced feature for free</span>
        <span className="text-xs text-gray-500">
          Get smarter responses, upload files, create images, and more by
          logging in.
        </span>
        <div className={clsx('flex items-center gap-3 mt-5')}>
          <button
            className={clsx(
              'flex items-center justify-center',
              'py-2 px-4',
              'bg-black text-white rounded-3xl',
              'hover:bg-gray-900',
              'cursor-pointer',
            )}
          >
            Log in
          </button>
          <button
            className={clsx(
              'flex items-center justify-center',
              'py-2 px-4 border border-gray-300',
              'bg-white text-black rounded-3xl',
              'hover:bg-gray-100',
              'cursor-pointer',
            )}
          >
            Sign up for free
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <Popover
      content={content}
      placement="bottom-start"
      floatingClassName="border-gray-300 border-1 rounded-2xl z-10 bg-white"
    >
      <div
        className={clsx(
          'flex items-center gap-1',
          'p-2 ml-2',
          'text-xl text-black font-bold',
          'hover:bg-gray-100 rounded-md',
          'cursor-pointer',
        )}
      >
        <span>ChatGPT</span>
        <Image
          src="/common/arrow-down.svg"
          alt="arrow-down"
          width={20}
          height={20}
        />
      </div>
    </Popover>
  )
}
