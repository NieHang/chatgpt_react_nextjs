'use client'

import { ConversationProvider } from '@/providers/ConversationProvider'
import { ReactNode } from 'react'
import SideBar from '@/components/sideBar/SideBar'
import AuthDialog from '@/components/auth/AuthDialog'
import React from 'react'
import LoginHeaderBar from '@/components/auth/LoginHeaderBar'
import type { Session } from 'next-auth'
import { SessionProvider } from 'next-auth/react'
import { useAuth } from '@/stores/authStore'

export default function ChatLayout({
  children,
  session,
}: {
  children: ReactNode
  session: Session | null
}) {
  const { showAuthDialog, setShowAuthDialog } = useAuth()

  return (
    <SessionProvider session={session}>
      <ConversationProvider>
        <div className="flex h-screen w-full">
          <SideBar />
          <section className="relative w-full flex flex-col items-center">
            <div className="w-full sticky top-0">
              <LoginHeaderBar />
            </div>
            <div className="w-full h-full flex items-center justify-center">
              {children}
            </div>
          </section>
          <AuthDialog
            isOpen={showAuthDialog}
            onClose={() => setShowAuthDialog(false)}
          />
        </div>
      </ConversationProvider>
    </SessionProvider>
  )
}
