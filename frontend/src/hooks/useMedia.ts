import { useSyncExternalStore } from 'react'

// Sin matchMedia (jsdom, navegadores muy antiguos) la consulta no se cumple
const hayMatchMedia = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'

/** true mientras la media query se cumpla (se actualiza al redimensionar). */
export function useMedia(consulta: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (!hayMatchMedia()) return () => {}
      const m = window.matchMedia(consulta)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => hayMatchMedia() && window.matchMedia(consulta).matches,
    () => false,
  )
}

/** Escritorio: paneles flotantes; por debajo, hojas desde abajo. */
export const useEsEscritorio = () => useMedia('(min-width: 1024px)')

/** Pantalla táctil como puntero principal (sin hover). */
export const useEsTactil = () => useMedia('(pointer: coarse)')
