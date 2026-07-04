import { Node, mergeAttributes } from '@tiptap/core'
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from '@tiptap/react'
import clsx from 'clsx'
import Image from 'next/image'

export const ToolChipNode = Node.create({
  name: 'toolChip',

  inline: true,
  group: 'inline',
  selectable: false,
  atom: true,

  addAttributes() {
    return {
      kind: {
        default: null,
      },
      label: {
        default: null,
      },
      icon: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="tool-chip"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'tool-chip',
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToolChipView)
  },
})

function ToolChipView({ node }: ReactNodeViewProps) {
  const { label, icon } = node.attrs

  return (
    <NodeViewWrapper
      as="span"
      contentEditable={false}
      className={clsx(
        'inline-flex align-middle gap-1 mr-1 px-1',
        'align-middle whitespace-nowrap leading-none',
        'text-blue-500 text-[18px] font-medium',
      )}
    >
      {icon && (
        <Image
          src={icon}
          alt={label}
          width={20}
          height={20}
          className="h-5 w-5 shrink-0"
        />
      )}
      <span>{label}</span>
    </NodeViewWrapper>
  )
}
