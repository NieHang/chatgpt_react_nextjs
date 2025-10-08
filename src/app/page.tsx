'use client'

import SideBar from '@/components/SideBar'
import Image from 'next/image'
import Popover from '@/components/common/Popover'
import ModelSwitch from '@/components/ModelSwitch'

export default function Home() {
  return (
    <div className="flex h-full w-full">
      <SideBar />
      <section className="relative w-full p-1 flex items-center justify-center">
        <div className="absolute top-1 left-1 right-1 flex items-center justify-between">
          <ModelSwitch />
          <div className="p-2 rounded-2xl hover:bg-gray-200 cursor-pointer">
            <Image
              src="/common/temp-chat.svg"
              alt="temp-chat"
              width={20}
              height={20}
            ></Image>
          </div>
        </div>
      </section>
    </div>
  )
}

