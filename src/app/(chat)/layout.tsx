import { auth } from '@/auth'
import ChatLayoutClient from '@/components/chat/ChatLayoutClient'

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return <ChatLayoutClient session={session}>{children}</ChatLayoutClient>
}
