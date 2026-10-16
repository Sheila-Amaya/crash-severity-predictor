import { useEffect, useMemo } from 'react'

import { useCatalogos } from '../api/queries'
import type { Catalogos, FiltroKey } from '../api/types'
import { FILTROS_EVENTO, FILTROS_VICTIMA } from '../api/types'
import { ETIQUETAS_FILTRO } from '../lib/etiquetas'
import {
  contarFiltros,
  sanearFiltros,
  sonIguales,
  tieneFiltrosVictima,
  useFiltros,
} from '../state/filtros'

/** Quita de la URL/estado códigos que no existen (p. ej. enlaces editados a mano). */
function useSanearFiltros(catalogos: Catalogos | undefined) {
  const filtros = useFiltros((estado) => estado.filtros)
  const reemplazar = useFiltros((estado) => estado.reemplazar)

  useEffect(() => {
    if (!catalogos) return
    const saneados = sanearFiltros(filtros, catalogos)
    if (!sonIguales(saneados, filtros)) reemplazar(saneados)
  }, [catalogos, filtros, reemplazar])
}

function Selector({ campo, catalogos }: { campo: FiltroKey; catalogos: Catalogos }) {
  const valor = useFiltros((estado) => estado.filtros[campo])
  const depto = useFiltros((estado) => estado.filtros.depto)
  const setFiltro = useFiltros((estado) => estado.setFiltro)
  const id = `filtro-${campo}`

  const opciones = useMemo(() => {
    if (campo !== 'municipio') return null

    // Municipios del departamento elegido, o todos agrupados por departamento
    const municipios = catalogos.municipio.filter((m) => depto === undefined || m.depto === depto)

    return catalogos.depto
      .map((d) => ({ depto: d, municipios: municipios.filter((m) => m.depto === d.id) }))
      .filter((grupo) => grupo.municipios.length > 0)
  }, [campo, catalogos, depto])

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium">
        {ETIQUETAS_FILTRO[campo]}
      </label>
      <select
        id={id}
        value={valor ?? ''}
        onChange={(e) => setFiltro(campo, e.target.value === '' ? undefined : Number(e.target.value))}
        className="rounded border px-2 py-1"
      >
        <option value="">Todos</option>
        {opciones
          ? opciones.map((grupo) => (
              <optgroup key={grupo.depto.id} label={grupo.depto.descripcion}>
                {grupo.municipios.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.descripcion}
                  </option>
                ))}
              </optgroup>
            ))
          : catalogos[campo].map((opcion) => (
              <option key={opcion.id} value={opcion.id}>
                {opcion.descripcion}
              </option>
            ))}
      </select>
    </div>
  )
}

export function BarraFiltros() {
  const { data: catalogos, isPending, isError, refetch } = useCatalogos()
  const filtros = useFiltros((estado) => estado.filtros)
  const limpiar = useFiltros((estado) => estado.limpiar)

  useSanearFiltros(catalogos)

  if (isPending) return <p aria-busy="true">Cargando filtros…</p>

  if (isError || !catalogos) {
    return (
      <p role="alert">
        No se pudieron cargar los filtros.{' '}
        <button type="button" onClick={() => refetch()}>
          Reintentar
        </button>
      </p>
    )
  }

  const activos = contarFiltros(filtros)

  return (
    <section aria-label="Filtros" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        {FILTROS_EVENTO.map((campo) => (
          <Selector key={campo} campo={campo} catalogos={catalogos} />
        ))}
      </div>

      <fieldset className="flex flex-wrap items-end gap-3">
        <legend className="text-xs">Filtros de víctima</legend>
        {FILTROS_VICTIMA.map((campo) => (
          <Selector key={campo} campo={campo} catalogos={catalogos} />
        ))}
      </fieldset>

      {tieneFiltrosVictima(filtros) && (
        <p className="text-sm">
          Con filtros de víctima no se puede contar hechos: los archivos del INE no vinculan
          víctimas con hechos.
        </p>
      )}

      <div>
        <button type="button" onClick={limpiar} disabled={activos === 0}>
          Limpiar filtros{activos > 0 ? ` (${activos})` : ''}
        </button>
      </div>
    </section>
  )
}
