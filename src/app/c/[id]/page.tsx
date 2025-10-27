import Chat from '@/components/Chat'

type ChatPageProps = {
  params: {
    id: string
  }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params
  return (
    <div>
      <Chat />
    </div>
  )
}

