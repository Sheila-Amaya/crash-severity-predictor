import { useSyncExternalStore } from 'react'

/** true mientras la media query se cumpla (se actualiza al redimensionar). */
export function useMedia(consulta: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(consulta)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(consulta).matches,
    () => false,
  )
}

/** Escritorio: paneles flotantes; por debajo, hojas desde abajo. */
export const useEsEscritorio = () => useMedia('(min-width: 1024px)')
