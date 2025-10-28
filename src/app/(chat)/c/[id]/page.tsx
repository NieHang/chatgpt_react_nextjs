import Chat from '@/components/Chat'

type ChatPageProps = {
  params: {
    id: string
  }
}

export default function ChatPage({ params }: ChatPageProps) {
  const { id: chatId } = params

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <Chat key={chatId} />
    </div>
  )
}

