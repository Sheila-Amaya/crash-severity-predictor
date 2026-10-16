import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'

import { api } from './client'
import type { AccidenteInput, Agrupacion, Filtros, Nivel, OrdenRanking } from './types'

// Catálogos: no cambian durante la sesión.
const ESTATICO = { staleTime: Infinity, gcTime: Infinity } as const

// Datos filtrados: se conserva el resultado anterior mientras llega el nuevo,
// para que el dashboard no "parpadee" al cambiar filtros.
const DINAMICO = { placeholderData: keepPreviousData, staleTime: 5 * 60_000 } as const

export const useCatalogos = () =>
  useQuery({ queryKey: ['catalogos'], queryFn: api.catalogos, ...ESTATICO })

export const useOpcionesPrediccion = () =>
  useQuery({ queryKey: ['predecir', 'opciones'], queryFn: api.opcionesPrediccion, ...ESTATICO })

export const useResumen = (filtros: Filtros) =>
  useQuery({ queryKey: ['resumen', filtros], queryFn: () => api.resumen(filtros), ...DINAMICO })

export const useSerie = (filtros: Filtros, agrupar: Agrupacion) =>
  useQuery({
    queryKey: ['serie', agrupar, filtros],
    queryFn: () => api.serie(filtros, agrupar),
    ...DINAMICO,
  })

export const useRanking = (filtros: Filtros, nivel: Nivel, orden: OrdenRanking) =>
  useQuery({
    queryKey: ['ranking', nivel, orden, filtros],
    queryFn: () => api.ranking(filtros, nivel, orden),
    ...DINAMICO,
  })

export const useCoropletico = (filtros: Filtros, nivel: Nivel) =>
  useQuery({
    queryKey: ['coropletico', nivel, filtros],
    queryFn: () => api.coropletico(filtros, nivel),
    ...DINAMICO,
  })

export const usePredecir = () =>
  useMutation({ mutationFn: (input: AccidenteInput) => api.predecir(input) })
