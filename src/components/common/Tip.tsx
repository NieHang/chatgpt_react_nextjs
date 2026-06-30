import clsx from 'clsx'
import { ReactElement } from 'react'
import Popover from '@/components/common/Popover'

export default function Tip({
  children,
  tipContent,
}: {
  children: ReactElement
  tipContent: ReactElement
}) {
  return (
    <Popover
      trigger="hover"
      distance={5}
      content={
        <div
          className={clsx(
            'py-1 px-2',
            'bg-gray-900 border rounded-[10px]',
            'text-white text-sm font-bold',
          )}
        >
          {tipContent}
        </div>
      }
      placement="bottom"
      floatingClassName="z-50"
    >
      {children}
    </Popover>
  )
}
