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
    <div className="w-full flex flex-col items-start p-4 rounded-3xl border border-gray-300 bg-white">
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

