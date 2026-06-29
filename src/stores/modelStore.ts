import { create } from 'zustand'
import type { Model } from '@/types/Model'

interface ModelState {
  model: Model
  intelligence: string
  updateModel: ({
    model,
    intelligence,
  }: {
    model: Model
    intelligence: string | undefined
  }) => void
}

export const useModel = create<ModelState>((set) => ({
  model: {
    name: 'GPT-4o-Mini',
    model: 'gpt-4o-mini',
    alias: '4o-mini',
  },
  intelligence: '',
  updateModel: ({ model, intelligence }) => set({ model, intelligence }),
}))
