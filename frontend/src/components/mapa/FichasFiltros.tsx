import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { useCatalogos } from '../../api/queries'
import type { Catalogos, FiltroKey } from '../../api/types'
import { FILTROS_VICTIMA } from '../../api/types'
import { contarFiltros, useFiltros } from '../../state/filtros'
import { useSanearFiltros } from '../../state/useSanearFiltros'
import { Selector } from '../BarraFiltros'
import { ErrorCarga, Skeleton } from '../ui/Estados'

interface DefinicionFicha {
  id: string
  etiqueta: string
  campos: readonly FiltroKey[]
}

const FICHAS: DefinicionFicha[] = [
  { id: 'anio', etiqueta: 'Año', campos: ['anio'] },
  { id: 'depto', etiqueta: 'Departamento', campos: ['depto'] },
  { id: 'municipio', etiqueta: 'Municipio', campos: ['municipio'] },
  { id: 'jornada', etiqueta: 'Jornada', campos: ['g_hora_5'] },
  { id: 'dia', etiqueta: 'Día', campos: ['dia_sem_ocu'] },
  { id: 'evento', etiqueta: 'Tipo de evento', campos: ['tipo_eve'] },
  { id: 'victima', etiqueta: 'Víctima', campos: FILTROS_VICTIMA },
]

function resumenValor(ficha: DefinicionFicha, catalogos: Catalogos, filtros: Record<string, number | undefined>) {
  const activos = ficha.campos.filter((c) => filtros[c] !== undefined)
  if (activos.length === 0) return 'Todos'
  if (ficha.campos.length > 1) return activos.length === 1 ? '1 activo' : `${activos.length} activos`
  const campo = ficha.campos[0]
  return catalogos[campo].find((o) => o.id === filtros[campo])?.descripcion ?? String(filtros[campo])
}

function Ficha({
  ficha,
  catalogos,
  abierta,
  onAbrir,
  onCerrar,
}: {
  ficha: DefinicionFicha
  catalogos: Catalogos
  abierta: boolean
  onAbrir: () => void
  onCerrar: () => void
}) {
  const filtros = useFiltros((estado) => estado.filtros)
  const setFiltro = useFiltros((estado) => estado.setFiltro)
  const id = useId()
  const contenedor = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)

  const activa = ficha.campos.some((c) => filtros[c] !== undefined)
  const valor = resumenValor(ficha, catalogos, filtros)

  // Esc o clic fuera cierran el menú; el foco vuelve a la ficha
  useEffect(() => {
    if (!abierta) return
    contenedor.current?.querySelector<HTMLSelectElement>('select')?.focus()

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      onCerrar()
      boton.current?.focus()
    }
    const alPulsar = (e: PointerEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) onCerrar()
    }
    document.addEventListener('keydown', alTeclear)
    document.addEventListener('pointerdown', alPulsar)
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.removeEventListener('pointerdown', alPulsar)
    }
  }, [abierta, onCerrar])

  return (
    <div ref={contenedor} className="relative">
      <button
        ref={boton}
        type="button"
        onClick={abierta ? onCerrar : onAbrir}
        aria-expanded={abierta}
        aria-controls={id}
        className={`flex w-full items-center justify-between gap-3 rounded-sm border px-2.5 py-1.5 text-left transition-colors duration-150 ${
          activa ? 'border-acento bg-panel' : 'border-borde bg-panel hover:border-borde-fuerte'
        }`}
      >
        <span className={`etiqueta text-[10px] ${activa ? 'text-acento' : ''}`}>{ficha.etiqueta}</span>
        <span className={`max-w-[7.5rem] truncate text-xs ${activa ? 'font-semibold text-tinta' : 'text-tenue'}`}>
          {valor}
        </span>
      </button>

      {abierta && (
        <div
          id={id}
          role="group"
          aria-label={`Filtro: ${ficha.etiqueta}`}
          className="flotante absolute top-0 left-full z-30 ml-2 w-72 py-1.5"
        >
          {ficha.campos.map((campo) => (
            <Selector key={campo} campo={campo} catalogos={catalogos} prefijo={`ficha-${ficha.id}`} />
          ))}
          <div className="flex justify-end gap-2 px-3 pt-1.5">
            {activa && (
              <button
                type="button"
                onClick={() => ficha.campos.forEach((c) => setFiltro(c, undefined))}
                className="etiqueta rounded-sm border border-borde-fuerte px-2 py-1 text-[10px] text-tinta hover:bg-panel-2"
              >
                Quitar
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onCerrar()
                boton.current?.focus()
              }}
              className="etiqueta rounded-sm bg-boton px-2 py-1 text-[10px] text-boton-texto"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Barra compacta de fichas de filtros (escritorio). */
export function FichasFiltros() {
  const { data: catalogos, isPending, isError, refetch } = useCatalogos()
  const filtros = useFiltros((estado) => estado.filtros)
  const limpiar = useFiltros((estado) => estado.limpiar)
  const setFiltro = useFiltros((estado) => estado.setFiltro)
  const [abierta, setAbierta] = useState<string | null>(null)
  const cerrar = useCallback(() => setAbierta(null), [])

  useSanearFiltros(catalogos)

  const activos = contarFiltros(filtros)
  const hayTerritorio = filtros.depto !== undefined || filtros.municipio !== undefined

  return (
    <nav aria-label="Filtros" className="flex w-60 flex-col gap-1.5">
      <p className="etiqueta flex justify-between px-0.5 text-[10px]">
        <span>Filtros</span>
        <span className="cifra">{activos}/9</span>
      </p>

      {isPending ? (
        Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-8" etiqueta="Cargando filtros…" />)
      ) : isError || !catalogos ? (
        <ErrorCarga mensaje="No se pudieron cargar los filtros." onReintentar={refetch} />
      ) : (
        FICHAS.map((ficha) => (
          <Ficha
            key={ficha.id}
            ficha={ficha}
            catalogos={catalogos}
            abierta={abierta === ficha.id}
            onAbrir={() => setAbierta(ficha.id)}
            onCerrar={cerrar}
          />
        ))
      )}

      <div className="mt-0.5 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={limpiar}
          disabled={activos === 0}
          className="rounded-sm border border-borde bg-panel px-2 py-1.5 text-xs font-medium text-tinta hover:border-borde-fuerte disabled:cursor-not-allowed disabled:text-tenue"
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={() => setFiltro('depto', undefined)}
          disabled={!hayTerritorio}
          className="rounded-sm border border-borde bg-panel px-2 py-1.5 text-xs font-medium text-tinta hover:border-borde-fuerte disabled:cursor-not-allowed disabled:text-tenue"
        >
          Todo el país
        </button>
      </div>
    </nav>
  )
}
