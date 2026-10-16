import { create } from 'zustand'

import type { Metrica } from '../utils/clasificacion'

export type Vista = 'burbujas' | 'areas' | '3d'

interface EstadoMapaUi {
  vista: Vista
  /** Métrica del color en la vista de áreas (burbujas y 3D usan letalidad). */
  metrica: Metrica
  setVista: (vista: Vista) => void
  setMetrica: (metrica: Metrica) => void
}

export const useMapaUi = create<EstadoMapaUi>()((set) => ({
  vista: 'burbujas',
  metrica: 'letalidad',
  setVista: (vista) => set({ vista }),
  setMetrica: (metrica) => set({ metrica }),
}))
