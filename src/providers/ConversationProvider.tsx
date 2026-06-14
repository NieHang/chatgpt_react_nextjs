'use client'

import React, { useEffect } from 'react'
import { getConversations } from '@/lib/http/path/messages'
import type { Conversation } from '@/types/Conversation'

type ConversationContextValue = {
  conversations: Conversation[]
  refreshConversations: () => Promise<void>
}

const ConversationContext =
  React.createContext<ConversationContextValue | null>(null)

export function ConversationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [conversations, setConversations] = React.useState<Conversation[]>([])

  const refreshConversations = React.useCallback(async () => {
    const res = await getConversations()
    setConversations(res.data ?? [])
  }, [])

  useEffect(() => {
    refreshConversations()
  }, [refreshConversations])

  return (
    <ConversationContext.Provider
      value={{ conversations, refreshConversations }}
    >
      {children}
    </ConversationContext.Provider>
  )
}

export function useConversations(): ConversationContextValue {
  const context = React.useContext(ConversationContext)

  if (!context)
    throw Error('useConversations must be used inside ConversationProvider')

  return context
}
