import { create } from 'zustand'

interface AuthState {
  isLoggedIn: boolean
  showAuthDialog: boolean
  setShowAuthDialog: (show: boolean) => void
  setIsLoggedIn: (isLoggedIn: boolean) => void
}

export const useAuth = create<AuthState>((set) => ({
  isLoggedIn: false,
  showAuthDialog: false,
  setShowAuthDialog: (show: boolean) => set({ showAuthDialog: show }),
  setIsLoggedIn: (isLoggedIn: boolean) => set({ isLoggedIn }),
}))
