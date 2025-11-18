import { ReactNode } from 'react'
import SideBar from '@/components/SideBar'
import ModelSwitch from '@/components/ModelSwitch'
import Image from 'next/image'

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full">
      <SideBar />
      <section className="relative w-full flex flex-col items-center">
        <div className="w-full sticky top-0 border-b-1 border-gray-200">
          <div className="p-2 flex items-center justify-between bg-white z-10">
            <ModelSwitch />
            <div className="p-2 rounded-2xl hover:bg-gray-200 cursor-pointer">
              <Image
                src="/common/temp-chat.svg"
                alt="temp-chat"
                width={20}
                height={20}
              />
            </div>
          </div>
        </div>
        <div className="w-full h-full flex items-center justify-center">
          {children}
        </div>
      </section>
    </div>
  )
}

