'use client'

import Dialog from '@/components/common/Dialog'
import clsx from 'clsx'
import Image from 'next/image'
import { signIn } from 'next-auth/react'

export default function AuthDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const providers = [
    {
      icon: '/auth/google.svg',
      text: 'Continue with Google',
      onClick: () => signIn('google'),
    },
    {
      icon: '/auth/github.svg',
      text: 'Continue with GitHub',
      onClick: () => signIn('github'),
    },
  ]
  return (
    isOpen && (
      <Dialog>
        <div className={clsx('flex flex-col items-center')}>
          <div
            className={clsx(
              'place-self-end',
              'p-2 rounded-full hover:bg-gray-200 cursor-pointer',
            )}
            onClick={onClose}
          >
            <Image
              src="/common/x-black.svg"
              alt="close dialog"
              width={20}
              height={20}
            />
          </div>
          <div className={clsx('mb-2 text-3xl')}>Login in or sign up</div>
          <div className={clsx('mb-6 text-[16px] text-center')}>
            You’ll get smarter responses and can upload files, images, and more.
          </div>
          <div className={clsx('flex flex-col items-center gap-4 w-full')}>
            {providers.map((provider, index) => (
              <button
                key={index}
                className={clsx(
                  'flex items-center justify-center gap-2 w-full',
                  'border border-gray-300 rounded-full py-4 px-4 hover:bg-gray-100',
                  'cursor-pointer',
                )}
                onClick={provider.onClick}
              >
                <Image
                  src={provider.icon}
                  alt={provider.text}
                  width={20}
                  height={20}
                />
                <span>{provider.text}</span>
              </button>
            ))}
          </div>
        </div>
      </Dialog>
    )
  )
}
