import type { Editor } from '@tiptap/react'
import { AttachmentOption } from '@/types/Form'

export const insertToolChip = (editor: Editor, option: AttachmentOption) => {
  editor
    .chain()
    .focus()
    .command(({ state, tr }) => {
      let toolChipPosition: number | null = null

      state.doc.descendants((node, pos) => {
        if (node.type.name === 'toolChip') {
          toolChipPosition = pos
          return false
        }

        return true
      })

      if (toolChipPosition !== null) {
        const toolChip = state.doc.nodeAt(toolChipPosition)

        if (toolChip) {
          tr.delete(toolChipPosition, toolChipPosition + toolChip.nodeSize)
        }
      }

      return true
    })
    .insertContent({
      type: 'toolChip',
      attrs: {
        kind: option.type,
        label: option.label,
        icon: option.icon,
      },
    })
    .run()
}
