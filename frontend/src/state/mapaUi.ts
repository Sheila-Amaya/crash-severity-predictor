import { create } from 'zustand'

import type { Metrica } from '../utils/clasificacion'

export type Vista = 'burbujas' | 'areas' | '3d'

interface EstadoMapaUi {
  vista: Vista
  /** Métrica del color en la vista de áreas (burbujas y 3D usan letalidad). */
  metrica: Metrica
  /** Efecto de luz suave en las burbujas (halo y difuminado). */
  brillo: boolean
  setVista: (vista: Vista) => void
  setMetrica: (metrica: Metrica) => void
  setBrillo: (brillo: boolean) => void
}

export const useMapaUi = create<EstadoMapaUi>()((set) => ({
  vista: 'burbujas',
  metrica: 'letalidad',
  brillo: true,
  setVista: (vista) => set({ vista }),
  setMetrica: (metrica) => set({ metrica }),
  setBrillo: (brillo) => set({ brillo }),
}))
