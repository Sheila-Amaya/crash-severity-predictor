import { useEffect, useMemo } from 'react'

import { useCatalogos } from '../api/queries'
import type { Catalogos, FiltroKey } from '../api/types'
import { FILTROS_EVENTO, FILTROS_VICTIMA } from '../api/types'
import { ETIQUETAS_FILTRO } from '../utils/etiquetas'
import { ErrorCarga, Skeleton } from './ui/Estados'
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
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-tenue">
        {ETIQUETAS_FILTRO[campo]}
      </label>
      <select
        id={id}
        value={valor ?? ''}
        onChange={(e) => setFiltro(campo, e.target.value === '' ? undefined : Number(e.target.value))}
        className={`w-full rounded-md border bg-tarjeta px-2 py-1.5 text-sm transition-colors duration-150 ${
          valor === undefined ? 'border-borde-fuerte' : 'border-ambar font-semibold'
        }`}
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

  if (isPending) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-12" etiqueta="Cargando filtros…" />
        ))}
      </div>
    )
  }

  if (isError || !catalogos) {
    return (
      <ErrorCarga mensaje="No se pudieron cargar los filtros." onReintentar={refetch} />
    )
  }

  const activos = contarFiltros(filtros)

  return (
    <section aria-label="Filtros" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {FILTROS_EVENTO.map((campo) => (
          <Selector key={campo} campo={campo} catalogos={catalogos} />
        ))}
      </div>

      <fieldset className="flex flex-col gap-3 border-t border-dashed border-borde-fuerte pt-3">
        <legend className="rotulo pr-2 text-sm font-semibold uppercase tracking-wide">
          Filtros de víctima
        </legend>
        {FILTROS_VICTIMA.map((campo) => (
          <Selector key={campo} campo={campo} catalogos={catalogos} />
        ))}
      </fieldset>

      {tieneFiltrosVictima(filtros) && (
        <p className="rounded-md border-l-4 border-ambar bg-tarjeta-2 p-2 text-xs">
          Con filtros de víctima no se puede contar hechos: los archivos del INE no vinculan
          víctimas con hechos.
        </p>
      )}

      <div>
        <button
          type="button"
          onClick={limpiar}
          disabled={activos === 0}
          className="w-full rounded-md border-2 border-ambar px-3 py-1.5 text-sm font-semibold text-ambar transition-colors duration-150 hover:bg-tarjeta-2 disabled:cursor-not-allowed disabled:border-borde disabled:text-tenue"
        >
          Limpiar filtros{activos > 0 ? ` (${activos})` : ''}
        </button>
      </div>
    </section>
  )
}
