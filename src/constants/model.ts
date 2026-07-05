import { OPTION_TYPE } from '@/constants/form'

export const intelligenceToReasoningEffort = {
  Instant: 'low',
  Medium: 'medium',
  Thinking: 'high',
} as const

export const toolChipKind = {
  [OPTION_TYPE.IMAGE]: 'image_generation',
} as const
