import { create } from 'zustand'

interface ModelState {
  model: string
  intelligence: string
  updateModel: ({
    model,
    intelligence,
  }: {
    model: string
    intelligence: string
  }) => void
}

export const useModel = create<ModelState>((set) => ({
  model: 'gpt-4o-mini',
  intelligence: 'Instant',
  updateModel: ({ model, intelligence }) => set({ model, intelligence }),
}))
