'use client'

import SideBar from '@/components/SideBar'
import Image from 'next/image'
import ModelSwitch from '@/components/ModelSwitch'
import AskInput from '@/components/common/AskInput'

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
        <div className='w-full flex flex-col items-center justify-center'>
          <div className='text-[30px] mb-8'>What are you working on?</div>
          <AskInput />
        </div>
      </section>
    </div>
  )
}

