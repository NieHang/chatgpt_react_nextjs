'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import clsx from 'clsx'
import { useConversations } from '@/providers/ConversationProvider'
import type { ConversationMessage } from '@/types/Conversation'

function getMessagePreview(content?: ConversationMessage['content']) {
  if (!content) return ''
  if (typeof content === 'string') return content

  return content.find((item) => item.type === 'input_text')?.text ?? ''
}
export default function SideBar() {
  const router = useRouter()
  const { id: currentConversationId } = useParams()

  const { conversations } = useConversations()

  const [cutNav, setCutNav] = useState(false)
  const [imgSrc, setIconImgSrc] = useState('/sidebar/gpt.svg')
  const [showBorder, setShowBorder] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const features = [
    { src: '/sidebar/edit.svg', label: 'New Chat', fn: () => router.push('/') },
    { src: '/sidebar/search.svg', label: 'Search Chats' },
    { src: '/sidebar/library.svg', label: 'Library' },
  ]
  const links = [
    {
      src: '/sidebar/codex.svg',
      label: 'Codex',
      link: 'https://chatgpt.com/codex',
    },
    {
      src: '/sidebar/sora.svg',
      label: 'Sora',
      link: 'https://sora.chatgpt.com/explore',
    },
  ]

  useEffect(() => {
    const nav = navRef.current
    if (nav) {
      const handleScroll = (e: Event) => {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current)
        }
        debounceTimer.current = setTimeout(() => {
          setShowBorder((e.target as HTMLElement).scrollTop > 0)
        }, 200)
      }
      nav.addEventListener('scroll', handleScroll)
      return () => {
        nav.removeEventListener('scroll', handleScroll)
        if (debounceTimer.current) clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  function handleConversationClick(id?: string) {
    if (id === currentConversationId) return
    router.push(`/c/${id}`)
  }

  return (
    <nav
      ref={navRef}
      className={clsx(
        'overflow-y-auto transition-[width] duration-300 ease-in h-auto',
        'px-1 border-r-1 border-gray-100 bg-gray-50',
      )}
      style={{ width: cutNav ? '55px' : '260px' }}
    >
      <div
        className={clsx(
          'sticky top-0',
          'flex items-center justify-end',
          'pb-1 h-11 bg-gray-50',
        )}
      >
        <div
          className="sidebar-item absolute top-0 left-0"
          onClick={() => {
            if (cutNav) setCutNav(!cutNav)
          }}
        >
          <Image
            src={imgSrc}
            alt="GPT Logo"
            width={20}
            height={20}
            onMouseEnter={() => {
              if (cutNav) setIconImgSrc('/sidebar/close-bar.svg')
            }}
            onMouseLeave={() => {
              setIconImgSrc('/sidebar/gpt.svg')
            }}
          />
        </div>
        {!cutNav && (
          <div className="sidebar-item" onClick={() => setCutNav(!cutNav)}>
            <Image
              src="/sidebar/close-bar.svg"
              alt="Close sidebar"
              width={20}
              height={20}
            />
          </div>
        )}
      </div>
      <aside
        className={`${
          showBorder ? 'border-b-1 border-gray-200' : ''
        } sticky top-[44px] bg-gray-50`}
      >
        {features.map((feature) => (
          <div
            className="pb-2 last:pb-0"
            key={feature.label}
            onClick={feature.fn}
          >
            <div className={`sidebar-item`}>
              <div className="shrink-0">
                <Image
                  src={feature.src}
                  alt={feature.label}
                  width={20}
                  height={20}
                />
              </div>
              <div
                className={`text-sm ml-1 whitespace-nowrap transition-[opacity] duration-300 ease-in`}
                style={{ opacity: cutNav ? 0 : 1 }}
              >
                {feature.label}
              </div>
            </div>
          </div>
        ))}
      </aside>
      <aside>
        {links.map((link, index) => (
          <a
            href={link.link}
            target="_blank"
            rel="noopener noreferrer"
            key={index}
          >
            <div className="sidebar-item">
              <div className="shrink-0">
                <Image
                  src={link.src}
                  alt={link.label}
                  width={20}
                  height={20}
                  className="shrink-0"
                />
              </div>
              <div
                className={`text-sm ml-1 whitespace-nowrap transition-[opacity] duration-300 ease-in`}
                style={{ opacity: cutNav ? 0 : 1 }}
              >
                {link.label}
              </div>
            </div>
          </a>
        ))}
      </aside>
      <aside className="flex flex-col gap-2 pt-2">
        {conversations.map((item) => (
          <div
            key={item?.id}
            className={`sidebar-item ${
              item.id === currentConversationId ? 'bg-gray-200' : ''
            } transition-[opacity] duration-300 ease-in`}
            style={{ opacity: cutNav ? 0 : 1 }}
            onClick={() => handleConversationClick(item?.id)}
          >
            <div
              className={`w-full overflow-ellipsis overflow-hidden text-sm whitespace-nowrap`}
            >
              {item?.title ?? getMessagePreview(item?.messages?.[0]?.content)}
            </div>
          </div>
        ))}
      </aside>
    </nav>
  )
}
