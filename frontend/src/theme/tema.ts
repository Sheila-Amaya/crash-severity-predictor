import palette from './palette.json'

// La paleta vive en palette.json (verificada con `npm run contraste`). Este
// módulo la vuelca a variables CSS (--c-*) que usan Tailwind, Recharts y
// MapLibre. Por ahora la app es solo oscura; el modo claro se agrega al final.

export type Tema = keyof typeof palette
export type Paleta = (typeof palette)['dark']

const TEMA: Tema = 'dark'

const aKebab = (clave: string) => clave.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)

export function aplicarTema(tema: Tema = TEMA) {
  const raiz = document.documentElement
  raiz.dataset.theme = tema
  raiz.style.colorScheme = tema

  for (const [clave, valor] of Object.entries(palette[tema])) {
    if (Array.isArray(valor)) {
      valor.forEach((color, i) => raiz.style.setProperty(`--c-${aKebab(clave)}-${i + 1}`, color))
    } else {
      raiz.style.setProperty(`--c-${aKebab(clave)}`, valor)
    }
  }
}

aplicarTema()

export const usePaleta = (): Paleta => palette[TEMA]
