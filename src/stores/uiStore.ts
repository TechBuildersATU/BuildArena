import { create } from 'zustand'

interface Toast {
  id: number
  icon: string
  text: string
}

interface UiState {
  /** Staff menu unlocked with the PIN (memory only; locks again when the menu closes). */
  staffUnlocked: boolean
  unlockStaff: () => void
  lockStaff: () => void
  toast: Toast | null
  showToast: (icon: string, text: string) => void
}

let toastTimer: number | undefined

export const useUiStore = create<UiState>((set) => ({
  staffUnlocked: false,
  unlockStaff: () => set({ staffUnlocked: true }),
  lockStaff: () => set({ staffUnlocked: false }),
  toast: null,
  showToast: (icon, text) => {
    window.clearTimeout(toastTimer)
    set({ toast: { id: Date.now(), icon, text } })
    toastTimer = window.setTimeout(() => set({ toast: null }), 2600)
  },
}))
