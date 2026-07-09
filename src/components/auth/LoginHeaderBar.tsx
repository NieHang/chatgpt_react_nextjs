import clsx from 'clsx'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import AuthPopup from './AuthPopup'

export default function LoginHeaderBar() {
  const { data: session, status } = useSession()

  return (
    <div
      className={clsx(
        'flex items-center',
        'p-2 bg-white z-10',
        session?.user ? 'justify-end' : 'justify-between',
      )}
    >
      {session?.user?.email ? (
        <div className="p-2 rounded-2xl hover:bg-gray-200 cursor-pointer">
          <Image
            src="/common/temp-chat.svg"
            alt="temp-chat"
            width={20}
            height={20}
          />
        </div>
      ) : (
        <>
          <AuthPopup />
        </>
      )}
    </div>
  )
}
