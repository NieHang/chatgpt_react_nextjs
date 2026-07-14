'use client'

import React, { useEffect } from 'react'
import { getConversations } from '@/lib/api-wrapper/messages'
import type { Conversation } from '@/types/Conversation'
import { redirect } from 'next/navigation'
import { useAuth } from '@/stores/authStore'
import { updateConversationTitle } from '@/lib/api-wrapper/messages'
import { produce } from 'immer'

type ConversationContextValue = {
  conversations: Conversation[]
  refreshConversations: () => Promise<void>
  updateConversation: ({
    title,
    conversationId,
  }: {
    title: string
    conversationId: string
  }) => void
}

const ConversationContext =
  React.createContext<ConversationContextValue | null>(null)

export function ConversationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const setShowAuthDialog = useAuth((state) => state.setShowAuthDialog)

  const refreshConversations = React.useCallback(async () => {
    const res = await getConversations()

    if (res.status === 401) {
      setShowAuthDialog(true)
      redirect('/')
    }

    setConversations(res.data ?? [])
  }, [])

  const updateConversation = async ({
    title,
    conversationId,
  }: {
    title: string
    conversationId: string
  }) => {
    await updateConversationTitle({
      title,
      conversationId,
    })
    const editedConversations = produce(conversations, (draft) => {
      const target = draft.find((item) => item.id === conversationId)
      if (target) target.title = title
    })
    setConversations(editedConversations)
  }

  useEffect(() => {
    refreshConversations()
  }, [refreshConversations])

  return (
    <ConversationContext.Provider
      value={{ conversations, refreshConversations, updateConversation }}
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
