import { create } from 'zustand'

import palette from './palette.json'

// La paleta vive en palette.json (verificada con `npm run contraste`). Este
// módulo la vuelca a variables CSS (--c-*) que usan Tailwind, Recharts y MapLibre.

export type Tema = 'light' | 'dark'
export type Preferencia = 'sistema' | 'claro' | 'oscuro'
export type Paleta = (typeof palette)['light']

const CLAVE_STORAGE = 'tema'
const SIN_MEDIA = { matches: false, addEventListener: () => {} } as const

// matchMedia no existe en algunos entornos (p. ej. jsdom en las pruebas)
const consulta = () =>
  typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : SIN_MEDIA

function leerPreferencia(): Preferencia {
  try {
    const guardada = localStorage.getItem(CLAVE_STORAGE)
    if (guardada === 'claro' || guardada === 'oscuro') return guardada
  } catch {
    // almacenamiento no disponible (modo privado, etc.)
  }
  return 'sistema'
}

function resolver(preferencia: Preferencia): Tema {
  if (preferencia === 'claro') return 'light'
  if (preferencia === 'oscuro') return 'dark'
  return consulta().matches ? 'dark' : 'light'
}

const aKebab = (clave: string) => clave.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)

export function aplicarTema(tema: Tema) {
  const raiz = document.documentElement
  raiz.dataset.theme = tema
  raiz.style.colorScheme = tema

  const colores = palette[tema]
  for (const [clave, valor] of Object.entries(colores)) {
    if (Array.isArray(valor)) {
      valor.forEach((color, i) => raiz.style.setProperty(`--c-${aKebab(clave)}-${i + 1}`, color))
    } else {
      raiz.style.setProperty(`--c-${aKebab(clave)}`, valor)
    }
  }
}

interface EstadoTema {
  preferencia: Preferencia
  tema: Tema
  setPreferencia: (preferencia: Preferencia) => void
}

export const useTema = create<EstadoTema>()((set) => {
  const preferencia = leerPreferencia()
  const tema = resolver(preferencia)
  aplicarTema(tema)

  // Seguir al sistema mientras la preferencia sea "sistema"
  consulta().addEventListener('change', () => {
    const { preferencia: actual } = useTema.getState()
    if (actual !== 'sistema') return
    const nuevo = resolver('sistema')
    aplicarTema(nuevo)
    set({ tema: nuevo })
  })

  return {
    preferencia,
    tema,
    setPreferencia: (nueva) => {
      try {
        if (nueva === 'sistema') localStorage.removeItem(CLAVE_STORAGE)
        else localStorage.setItem(CLAVE_STORAGE, nueva)
      } catch {
        // sin persistencia: el cambio aplica solo a esta sesión
      }
      const tema = resolver(nueva)
      aplicarTema(tema)
      set({ preferencia: nueva, tema })
    },
  }
})

export const usePaleta = (): Paleta => palette[useTema((estado) => estado.tema)]
