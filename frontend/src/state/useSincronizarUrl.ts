import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

import { filtrosDesdeParams, paramsConFiltros, sonIguales, useFiltros } from './filtros'

/**
 * Sincroniza el store de filtros con la query string en ambos sentidos:
 * - URL -> store: al cargar la página (enlace compartido) y al navegar
 *   atrás/adelante;
 * - store -> URL: cada cambio de filtros (con replace, sin llenar el historial).
 *
 * Ambos efectos leen el store con getState() (Zustand actualiza de forma
 * síncrona), así el efecto store -> URL nunca ve filtros desactualizados al
 * montar (incluido el doble montaje de StrictMode) y no borra la URL inicial.
 */
export function useSincronizarUrl() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filtros = useFiltros((estado) => estado.filtros)
  const reemplazar = useFiltros((estado) => estado.reemplazar)
  const query = searchParams.toString()

  // URL -> store
  useEffect(() => {
    const desdeUrl = filtrosDesdeParams(new URLSearchParams(query))
    if (!sonIguales(desdeUrl, useFiltros.getState().filtros)) reemplazar(desdeUrl)
  }, [query, reemplazar])

  // store -> URL (`filtros` solo dispara el efecto; el valor se lee del store)
  useEffect(() => {
    const actuales = new URLSearchParams(query)
    const siguientes = paramsConFiltros(actuales, useFiltros.getState().filtros)

    if (siguientes.toString() !== actuales.toString()) {
      setSearchParams(siguientes, { replace: true })
    }
  }, [filtros, query, setSearchParams])
}
