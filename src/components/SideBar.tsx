import Image from 'next/image';

export default function SideBar() {
  return <div className="w-60 h-full p-1 border-r-1 border-gray-100">
    <div className="flex items-center justify-between pb-2">
      <div className='sidebar-item'>
        <Image src="/sidebar/gpt.svg" alt="GPT Logo" width={20} height={20} />
      </div>
      <div className='sidebar-item'>
        <Image src="/sidebar/close-bar.svg" alt="Close sidebar" width={20} height={20} />
      </div>
    </div>
    <div className='pb-2'>
      <div className='sidebar-item flex flex-row items-center w-full gap-1'>
        <Image src="/sidebar/edit.svg" alt="Edit Chat" width={20} height={20} />
        <div className='text-sm'>New Chat</div>
      </div>
    </div>
  </div>
}