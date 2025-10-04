import {
  useInteractions,
  useFloating,
  useDismiss,
  useClick,
  flip,
  useHover,
} from '@floating-ui/react'
import { CSSProperties, PropsWithChildren, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type Alignment = 'start' | 'end'
type Side = 'top' | 'right' | 'bottom' | 'left'
type AlignedPlacement = `${Side}-${Alignment}`

interface PopoverProps extends PropsWithChildren {
  content: React.ReactNode
  trigger?: 'hover' | 'click'
  placement?: AlignedPlacement | Side
  className?: string
  style?: CSSProperties
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function Popover(props: PopoverProps) {
  const {
    content,
    trigger = 'click',
    placement = 'bottom',
    className,
    style,
    children,
    onOpenChange,
  } = props

  const [isOpen, setIsOpen] = useState(false)

  const [el, setEl] = useState<HTMLElement | null>(null)

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: (open) => {
      setIsOpen(open)
      onOpenChange?.(open)
    },
    placement,
    middleware: [flip()],
  })

  const clickInteraction = useClick(context, { enabled: trigger === 'click' })
  const hoverInteraction = useHover(context, { enabled: trigger === 'hover' })
  const interaction = trigger === 'click' ? clickInteraction : hoverInteraction

  const dismiss = useDismiss(context)

  const { getReferenceProps, getFloatingProps } = useInteractions([
    interaction,
    dismiss,
  ])

  useEffect(() => {
    const portal = document.createElement('div')
    portal.className = 'popover-portal'
    document.body.appendChild(portal)
    setEl(portal)
    return () => {
      document.body.removeChild(portal)
    }
  }, [])

  const floating = isOpen && (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      {...getFloatingProps()}
      className="border-gray-200 border-1 rounded p-2"
    >
      {content}
    </div>
  )

  return (
    <>
      <span
        ref={refs.setReference}
        {...getReferenceProps()}
        className={className}
        style={style}
      >
        {children}
      </span>
      {el && createPortal(floating, el)}
    </>
  )
}

