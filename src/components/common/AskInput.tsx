import Image from 'next/image'

export default function AskInput() {
  return <form className="w-[70%] flex flex-col items-start p-4 rounded-3xl border border-gray-300">
    <input
      type="text"
      placeholder="Ask me anything..."
      className="w-full outline-none border-none bg-transparent"
    />
    <div className="flex items-start mt-2">
      <div className="flex items-start mt-2">
        <Image
          src="/common/plus.svg"
          alt="plus"
          width={20}
          height={20}
          className='cursor-pointer'
        />
        <span className="ml-2 text-sm text-blue-400 cursor-pointer">Thinking</span>
      </div>
    </div>
  </form>
}
