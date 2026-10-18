import { create } from 'zustand'

import type { Catalogos, FiltroKey, Filtros } from '../api/types'
import { FILTRO_KEYS, FILTROS_VICTIMA } from '../api/types'

// -- Funciones puras (probadas en filtros.test.ts) ---------------------------

/** Departamento de un municipio (código DDMM). */
export const deptoDeMunicipio = (municipio: number) => Math.floor(municipio / 100)

/**
 * Aplica un filtro manteniendo la cascada departamento -> municipio:
 * - cambiar o quitar el departamento quita un municipio que ya no le pertenece;
 * - elegir un municipio fija su departamento.
 */
export function aplicarFiltro(filtros: Filtros, key: FiltroKey, valor?: number): Filtros {
  const siguiente: Filtros = { ...filtros }

  if (valor === undefined) delete siguiente[key]
  else siguiente[key] = valor

  if (key === 'depto' && siguiente.municipio !== undefined) {
    if (valor === undefined || deptoDeMunicipio(siguiente.municipio) !== valor) {
      delete siguiente.municipio
    }
  }

  if (key === 'municipio' && valor !== undefined) {
    siguiente.depto = deptoDeMunicipio(valor)
  }

  return siguiente
}

/** Lee los filtros conocidos de la query string; ignora valores no numéricos. */
export function filtrosDesdeParams(params: URLSearchParams): Filtros {
  const filtros: Filtros = {}

  for (const key of FILTRO_KEYS) {
    const raw = params.get(key)
    if (raw === null || !/^\d+$/.test(raw)) continue
    filtros[key] = Number(raw)
  }

  return filtros
}

/**
 * Devuelve una copia de `params` con los filtros actuales: reemplaza las claves
 * de filtro y conserva cualquier otro parámetro de la URL.
 */
export function paramsConFiltros(params: URLSearchParams, filtros: Filtros): URLSearchParams {
  const siguiente = new URLSearchParams(params)

  for (const key of FILTRO_KEYS) {
    const valor = filtros[key]
    if (valor === undefined) siguiente.delete(key)
    else siguiente.set(key, String(valor))
  }

  return siguiente
}

/**
 * Quita códigos que no existen en los catálogos y municipios fuera del
 * departamento. Un municipio sin departamento (p. ej. un enlace a mano) fija
 * su departamento, igual que al elegirlo en la interfaz.
 */
export function sanearFiltros(filtros: Filtros, catalogos: Catalogos): Filtros {
  const saneados: Filtros = {}

  for (const key of FILTRO_KEYS) {
    const valor = filtros[key]
    if (valor === undefined) continue
    if (catalogos[key].some((opcion) => opcion.id === valor)) saneados[key] = valor
  }

  if (
    saneados.municipio !== undefined &&
    saneados.depto !== undefined &&
    deptoDeMunicipio(saneados.municipio) !== saneados.depto
  ) {
    delete saneados.municipio
  }

  if (saneados.municipio !== undefined && saneados.depto === undefined) {
    saneados.depto = deptoDeMunicipio(saneados.municipio)
  }

  return saneados
}

export function sonIguales(a: Filtros, b: Filtros): boolean {
  return FILTRO_KEYS.every((key) => a[key] === b[key])
}

export const contarFiltros = (filtros: Filtros) =>
  FILTRO_KEYS.filter((key) => filtros[key] !== undefined).length

export const tieneFiltrosVictima = (filtros: Filtros) =>
  FILTROS_VICTIMA.some((key) => filtros[key] !== undefined)

// -- Store global ---------------------------------------------------------------

interface EstadoFiltros {
  filtros: Filtros
  setFiltro: (key: FiltroKey, valor?: number) => void
  reemplazar: (filtros: Filtros) => void
  limpiar: () => void
}

export const useFiltros = create<EstadoFiltros>()((set) => ({
  filtros: {},
  setFiltro: (key, valor) => set((estado) => ({ filtros: aplicarFiltro(estado.filtros, key, valor) })),
  reemplazar: (filtros) => set({ filtros: { ...filtros } }),
  limpiar: () => set({ filtros: {} }),
}))
