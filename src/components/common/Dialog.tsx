'use client'

import clsx from 'clsx'

export default function Dialog({ children }: { children: React.ReactNode }) {
  return (
    <section
      className={clsx(
        'fixed top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 z-10',
        'w-[388px] h-fit p-4.5',
        'border border-gray-300 rounded-2xl shadow-lg',
        'bg-white',
      )}
    >
      {children}
    </section>
  )
}
