import clsx from 'clsx'
import Image from 'next/image'

export default function AskInput({
  value,
  onChange,
  onKeyDown,
}: {
  value: string
  onChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-start',
        'w-full p-4 bg-white',
        'rounded-3xl border border-gray-300',
        'shadow-[0_0_20px_rgba(255,255,255)]',
      )}
    >
      <input
        type="text"
        value={value}
        placeholder="Ask me anything..."
        className="w-full outline-none border-none bg-transparent"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => onKeyDown(e)}
      />
      <div className="flex items-start mt-2">
        <div className="flex items-start mt-2">
          <Image
            src="/common/plus.svg"
            alt="plus"
            width={20}
            height={20}
            className="cursor-pointer"
          />
          <span className="ml-2 text-sm text-blue-400 cursor-pointer">
            Thinking
          </span>
        </div>
      </div>
    </div>
  )
}
