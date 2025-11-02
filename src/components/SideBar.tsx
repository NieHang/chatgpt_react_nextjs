'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

export default function SideBar() {
  const [cutNav, setCutNav] = useState(false)
  const [imgSrc, setIconImgSrc] = useState('/sidebar/gpt.svg')
  const [showBorder, setShowBorder] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const features = [
    { src: '/sidebar/edit.svg', label: 'New Chat' },
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

  return (
    <nav
      ref={navRef}
      className={`overflow-y-auto transition-[width] duration-300 ease-in h-auto p-1 border-r-1 border-gray-100 bg-gray-50`}
      style={{ width: cutNav ? '45px' : '260px' }}
    >
      <div className="sticky top-0 flex items-center justify-end pb-2 h-11">
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
        <div
          className={`sidebar-item ${cutNav ? 'hidden' : ''}`}
          onClick={() => setCutNav(!cutNav)}
        >
          <Image
            src="/sidebar/close-bar.svg"
            alt="Close sidebar"
            width={20}
            height={20}
          />
        </div>
      </div>
      <aside
        className={`${
          showBorder ? 'border-b-1 border-gray-200' : ''
        } sticky top-[44px] bg-gray-50`}
      >
        {features.map((feature) => (
          <div className="pb-2" key={feature.label}>
            <div className={`sidebar-item flex flex-row items-center w-auto`}>
              <Image
                src={feature.src}
                alt={feature.label}
                width={20}
                height={20}
              />
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
      <aside className="pt-2">
        {links.map((link, index) => (
          <a
            href={link.link}
            target="_blank"
            rel="noopener noreferrer"
            key={index}
          >
            <div className="sidebar-item flex flex-row items-center w-full">
              <Image
                src={link.src}
                alt={link.label}
                width={20}
                height={20}
                className="shrink-0"
              />
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
    </nav>
  )
}

