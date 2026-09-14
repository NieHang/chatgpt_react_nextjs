import { create } from 'zustand'

interface UserSettingState {
  instructions: string
  updateInstructions: (instructions: string) => void
}

export const userSettingModel = create<UserSettingState>((set) => ({
  instructions: '',
  updateInstructions: (instructions) => {
    set({ instructions })
  },
}))
