import Dialog from '@/components/common/Dialog'
import clsx from 'clsx'
import Image from 'next/image'
import UserSecuritySettings from '@/components/user/UserSecuritySettings'
import { useState } from 'react'

export default function UserSettingsDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const options = [
    {
      label: 'Security',
      icon: '/user/key.svg',
    },
  ]

  const [currentOption, setCurrentOption] = useState(options[0])

  return (
    isOpen && (
      <Dialog extraClass="w-[510px]">
        <div className="flex">
          <div className="flex flex-col gap-2 w-[150px] pr-2 border-gray-300 border-r-1">
            <Image
              src="/common/x-black.svg"
              alt="close userSettingsDialog"
              width={20}
              height={20}
              className="cursor-pointer"
              onClick={onClose}
            ></Image>
            {options.map((option) => (
              <div
                key={option.label}
                className={clsx(
                  'flex items-center gap-2 w-full cursor-pointer',
                  'p-2',
                  'hover:bg-gray-100 hover:rounded-[8px]',
                )}
              >
                <Image
                  src={option.icon}
                  alt={option.label}
                  width={20}
                  height={20}
                ></Image>
                <span>{option.label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col flex-1 pl-2">
            <div className="pb-2 mb-1 text-xl border-b-1 border-gray-300">
              {currentOption.label}
            </div>
            <UserSecuritySettings onClose={onClose} />
          </div>
        </div>
      </Dialog>
    )
  )
}
