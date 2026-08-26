import Chat from '@/components/Chat'
import clsx from 'clsx'

type ChatPageProps = {
  params: {
    id: string
  }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id: chatId } = await params

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center',
        'w-full h-screen',
      )}
    >
      <Chat key={chatId} />
    </div>
  )
}

