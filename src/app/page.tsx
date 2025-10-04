'use client'

import SideBar from '@/components/SideBar'
import Image from 'next/image'
import Popover from '@/components/common/Popover'

export default function Home() {
  return (
    <div className="flex h-full w-full">
      <SideBar />
      <section className="relative w-full p-1 flex items-center justify-center">
        <div className="absolute top-1 left-1 right-1 flex items-center justify-between">
          <div className="sidebar-item flex items-center p-1">
            <span>ChatGPT</span>
            <span className="text-gray-400 px-1">5</span>
            <Image
              src="/common/down-arrow.svg"
              alt="down-arrow"
              width={16}
              height={16}
            />
          </div>
          <div className="p-2 rounded-2xl hover:bg-gray-200 cursor-pointer">
            <Image
              src="/common/temp-chat.svg"
              alt="temp-chat"
              width={20}
              height={20}
            ></Image>
          </div>
        </div>
        <Popover content="I am a popover" trigger="click">
          hello
        </Popover>
      </section>
    </div>
  )
}

