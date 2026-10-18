import { create } from 'zustand'

import palette from './palette.json'

// La paleta vive en palette.json (verificada con `npm run contraste` en ambos
// temas). Este módulo la vuelca a variables CSS (--c-*) que usan Tailwind,
// Recharts y MapLibre. El oscuro es el tema principal; el claro es opcional.

export type Tema = keyof typeof palette
export type Paleta = (typeof palette)['dark']

/** Clave en localStorage (también la lee el script inicial de index.html). */
export const CLAVE_TEMA = 'severidad-vial:tema'
const CONSULTA_CLARO = '(prefers-color-scheme: light)'

const esTema = (valor: unknown): valor is Tema => valor === 'dark' || valor === 'light'

/**
 * Tema inicial: la elección guardada manda; sin elección previa se respeta
 * prefers-color-scheme (y si no pide claro, oscuro).
 */
export function temaInicial(guardado: string | null, prefiereClaro: boolean): Tema {
  if (esTema(guardado)) return guardado
  return prefiereClaro ? 'light' : 'dark'
}

function leerGuardado(): string | null {
  try {
    return localStorage.getItem(CLAVE_TEMA)
  } catch {
    return null
  }
}

const prefiereClaro = () => typeof window !== 'undefined' && window.matchMedia?.(CONSULTA_CLARO).matches === true

const aKebab = (clave: string) => clave.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)

export function aplicarTema(tema: Tema) {
  const raiz = document.documentElement
  raiz.dataset.theme = tema
  raiz.style.colorScheme = tema === 'dark' ? 'dark' : 'light'
  raiz.style.background = palette[tema].bg
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette[tema].topbar)

  for (const [clave, valor] of Object.entries(palette[tema])) {
    if (Array.isArray(valor)) {
      valor.forEach((color, i) => raiz.style.setProperty(`--c-${aKebab(clave)}-${i + 1}`, color))
    } else {
      raiz.style.setProperty(`--c-${aKebab(clave)}`, valor)
    }
  }
}

interface EstadoTema {
  tema: Tema
  /** El usuario eligió explícitamente (deja de seguir al sistema). */
  elegido: boolean
  elegir: (tema: Tema) => void
}

export const useTema = create<EstadoTema>((set) => ({
  tema: temaInicial(leerGuardado(), prefiereClaro()),
  elegido: esTema(leerGuardado()),
  elegir: (tema) => {
    try {
      localStorage.setItem(CLAVE_TEMA, tema)
    } catch {
      // Sin almacenamiento (modo privado estricto): la elección dura la sesión
    }
    set({ tema, elegido: true })
  },
}))

aplicarTema(useTema.getState().tema)
useTema.subscribe((estado, previo) => {
  if (estado.tema !== previo.tema) aplicarTema(estado.tema)
})

// Sin elección previa, el tema sigue los cambios del sistema
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia(CONSULTA_CLARO).addEventListener('change', (e) => {
    if (!useTema.getState().elegido) useTema.setState({ tema: e.matches ? 'light' : 'dark' })
  })
}

export const usePaleta = (): Paleta => palette[useTema((estado) => estado.tema)]
