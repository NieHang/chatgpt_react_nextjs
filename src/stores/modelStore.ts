import { create } from 'zustand'
import type { Model } from '@/types/Model'
import { Tool } from 'openai/resources/responses/responses.js'

interface ModelState {
  model: Model
  intelligence: string
  tool?: Tool
  updateModel: ({
    model,
    intelligence,
  }: {
    model: Model
    intelligence: string | undefined
  }) => void
  updateTool: (tool?: Tool) => void
}

export const useModel = create<ModelState>((set) => ({
  model: {
    name: 'GPT-4o-Mini',
    model: 'gpt-4o-mini',
    alias: '4o-mini',
  },
  intelligence: '',
  tool: undefined,
  updateModel: ({ model, intelligence }) => set({ model, intelligence }),
  updateTool: (tool?: Tool) => set({ tool }),
}))
