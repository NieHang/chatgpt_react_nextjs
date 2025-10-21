type ChatPageProps = {
  params: {
    id: string
  }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params
  return <div>Chat Page {id}</div>
}

