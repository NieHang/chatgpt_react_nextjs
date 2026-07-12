import clsx from 'clsx'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Popover from '@/components/common/Popover'
import Tip from '@/components/common/Tip'

export default function UserInfoSection({
  showBorder,
}: {
  showBorder: boolean
}) {
  const options = [
    {
      url: 'https://chatgpt.com/download/',
      icon: '/user/desktop.svg',
      label: 'Get ChatGPT desktop',
    },
    {
      url: 'https://chatgpt.com/download/',
      icon: '/user/mobile.svg',
      label: 'Get ChatGPT mobile',
    },
  ]
  const shopOptionJSX = (
    <div className="flex flex-col gap-2">
      {options.map((option, index) => (
        <a
          key={index}
          href={option.url}
          target="_blank"
          className={clsx(
            'flex items-center gap-1',
            'p-1 rounded-[8px] hover:bg-gray-100',
          )}
        >
          <Image
            src={option.icon}
            alt={option.label}
            width={20}
            height={20}
          ></Image>
          <span>{option.label}</span>
        </a>
      ))}
    </div>
  )

  const { data: session } = useSession()

  return (
    session?.user && (
      <div
        className={clsx(
          'shrink-0 p-2 bg-gray-50 cursor-pointer transition-all',
          showBorder && 'inset-shadow-xs shadow-gray-400',
        )}
      >
        <div className="p-1 flex items-center justify-between rounded-[8px] hover:bg-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-400 rounded-full text-[12px] text-white text-center leading-8">
              {String(session?.user?.name?.slice(0, 2)).toUpperCase()}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[14px] text-black text-xs">
                {session?.user?.name}
              </span>
              <span className="text-gray-500 text-xs">Plus</span>
            </div>
          </div>
          <Popover
            content={shopOptionJSX}
            placement="top-start"
            floatingClassName="border-gray-300 border-1 rounded-2xl py-2 px-3 z-10 bg-white"
          >
            <Tip tipContent={<div className="text-center">Download apps</div>}>
              <Image src="/user/shop.svg" alt="plus" width={20} height={20} />
            </Tip>
          </Popover>
        </div>
      </div>
    )
  )
}
