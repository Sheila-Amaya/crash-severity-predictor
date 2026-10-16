import { useEffect } from 'react'

import type { Catalogos } from '../api/types'
import { sanearFiltros, sonIguales, useFiltros } from './filtros'

/** Quita de la URL/estado códigos que no existen (p. ej. enlaces editados a mano). */
export function useSanearFiltros(catalogos: Catalogos | undefined) {
  const filtros = useFiltros((estado) => estado.filtros)
  const reemplazar = useFiltros((estado) => estado.reemplazar)

  useEffect(() => {
    if (!catalogos) return
    const saneados = sanearFiltros(filtros, catalogos)
    if (!sonIguales(saneados, filtros)) reemplazar(saneados)
  }, [catalogos, filtros, reemplazar])
}
