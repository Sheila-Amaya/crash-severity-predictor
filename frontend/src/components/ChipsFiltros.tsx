import { useCatalogos } from '../api/queries'
import { FILTRO_KEYS } from '../api/types'
import { useFiltros } from '../state/filtros'
import { ETIQUETAS_FILTRO } from '../utils/etiquetas'

/** Resumen de filtros activos; cada chip se puede quitar. */
export function ChipsFiltros() {
  const filtros = useFiltros((estado) => estado.filtros)
  const setFiltro = useFiltros((estado) => estado.setFiltro)
  const { data: catalogos } = useCatalogos()

  const activos = FILTRO_KEYS.filter((key) => filtros[key] !== undefined)

  if (activos.length === 0) {
    return <p className="text-sm text-tenue">Mostrando todo el país, 2018–2024.</p>
  }

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Filtros activos">
      {activos.map((key) => {
        const valor = filtros[key]!
        const descripcion =
          catalogos?.[key].find((opcion) => opcion.id === valor)?.descripcion ?? String(valor)

        return (
          <li key={key}>
            <button
              type="button"
              onClick={() => setFiltro(key, undefined)}
              className="flex items-center gap-1.5 rounded-full border border-borde-fuerte bg-tarjeta px-3 py-1 text-sm transition-colors duration-150 hover:bg-tarjeta-2"
              aria-label={`Quitar filtro ${ETIQUETAS_FILTRO[key]}: ${descripcion}`}
            >
              <span className="text-tenue">{ETIQUETAS_FILTRO[key]}:</span>
              <span className="font-semibold">{descripcion}</span>
              <span aria-hidden="true" className="text-ambar">
                ×
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
