import { useMemo } from 'react'

import { useCatalogos } from '../api/queries'
import type { Catalogos, FiltroKey } from '../api/types'
import { FILTRO_KEYS, FILTROS_EVENTO, FILTROS_VICTIMA } from '../api/types'
import { contarFiltros, tieneFiltrosVictima, useFiltros } from '../state/filtros'
import { useSanearFiltros } from '../state/useSanearFiltros'
import { ETIQUETAS_FILTRO } from '../utils/etiquetas'
import { EtiquetaSeccion } from './ui/Editorial'
import { ErrorCarga, Skeleton } from './ui/Estados'

export function Selector({ campo, catalogos, prefijo }: { campo: FiltroKey; catalogos: Catalogos; prefijo: string }) {
  const valor = useFiltros((estado) => estado.filtros[campo])
  const depto = useFiltros((estado) => estado.filtros.depto)
  const setFiltro = useFiltros((estado) => estado.setFiltro)
  const id = `${prefijo}-${campo}`

  const grupos = useMemo(() => {
    if (campo !== 'municipio') return null

    // Municipios del departamento elegido, o todos agrupados por departamento
    const municipios = catalogos.municipio.filter((m) => depto === undefined || m.depto === depto)

    return catalogos.depto
      .map((d) => ({ depto: d, municipios: municipios.filter((m) => m.depto === d.id) }))
      .filter((grupo) => grupo.municipios.length > 0)
  }, [campo, catalogos, depto])

  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2 px-3 py-1.5">
      <label htmlFor={id} className={`text-xs ${valor === undefined ? 'text-tenue' : 'font-semibold text-tinta'}`}>
        {ETIQUETAS_FILTRO[campo]}
      </label>
      <select
        id={id}
        value={valor ?? ''}
        onChange={(e) => setFiltro(campo, e.target.value === '' ? undefined : Number(e.target.value))}
        className={`w-full min-w-0 truncate rounded-sm border bg-panel-2 px-2 py-1 text-sm max-lg:min-h-11 ${
          valor === undefined ? 'border-borde-fuerte text-tenue' : 'border-acento text-tinta'
        }`}
      >
        <option value="">Todos</option>
        {grupos
          ? grupos.map((grupo) => (
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

/**
 * Contenido del panel "Filtros": cabecera con contador, selectores de evento
 * y de víctima, y acciones "Limpiar" / "Todo el país".
 * `prefijo` evita ids duplicados cuando hay dos instancias (panel y hoja móvil).
 */
export function BarraFiltros({
  prefijo = 'filtro',
  conCabecera = true,
}: {
  prefijo?: string
  /** false cuando el contenedor (hoja móvil) ya muestra el título. */
  conCabecera?: boolean
}) {
  const { data: catalogos, isPending, isError, refetch } = useCatalogos()
  const filtros = useFiltros((estado) => estado.filtros)
  const limpiar = useFiltros((estado) => estado.limpiar)
  const setFiltro = useFiltros((estado) => estado.setFiltro)

  useSanearFiltros(catalogos)

  const activos = contarFiltros(filtros)
  const hayTerritorio = filtros.depto !== undefined || filtros.municipio !== undefined

  return (
    <section
      aria-labelledby={conCabecera ? `${prefijo}-titulo` : undefined}
      aria-label={conCabecera ? undefined : 'Filtros'}
      className="flex min-h-0 flex-col"
    >
      {conCabecera && (
        <div className="border-b border-borde px-3 py-2.5">
          <EtiquetaSeccion id={`${prefijo}-titulo`} derecha={`${activos}/${FILTRO_KEYS.length}`}>
            Filtros
          </EtiquetaSeccion>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto py-1.5">
        {isPending ? (
          <div className="flex flex-col gap-2 p-3" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-7" etiqueta="Cargando filtros…" />
            ))}
          </div>
        ) : isError || !catalogos ? (
          <div className="p-3">
            <ErrorCarga mensaje="No se pudieron cargar los filtros." onReintentar={refetch} />
          </div>
        ) : (
          <>
            <p className="etiqueta px-3 pt-1 pb-0.5 text-[10px]">Evento</p>
            {FILTROS_EVENTO.map((campo) => (
              <Selector key={campo} campo={campo} catalogos={catalogos} prefijo={prefijo} />
            ))}

            <p className="etiqueta mt-1 border-t border-borde px-3 pt-2.5 pb-0.5 text-[10px]">Víctima</p>
            {FILTROS_VICTIMA.map((campo) => (
              <Selector key={campo} campo={campo} catalogos={catalogos} prefijo={prefijo} />
            ))}

            {tieneFiltrosVictima(filtros) && (
              <p className="mx-3 mt-2 border-l-2 border-acento pl-2 text-xs text-tenue">
                Con filtros de víctima no se cuentan hechos: los archivos del INE no vinculan
                víctimas con hechos.
              </p>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 border-t border-borde text-sm">
        <button
          type="button"
          onClick={limpiar}
          disabled={activos === 0}
          className="border-r border-borde px-3 py-2.5 font-medium text-tinta transition-colors duration-150 hover:bg-panel-2 disabled:cursor-not-allowed disabled:text-tenue disabled:hover:bg-transparent"
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={() => setFiltro('depto', undefined)}
          disabled={!hayTerritorio}
          className="px-3 py-2.5 font-medium text-tinta transition-colors duration-150 hover:bg-panel-2 disabled:cursor-not-allowed disabled:text-tenue disabled:hover:bg-transparent"
        >
          Todo el país
        </button>
      </div>
    </section>
  )
}
