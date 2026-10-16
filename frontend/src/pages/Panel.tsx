import { useCallback, useState } from 'react'

import { BarraFiltros } from '../components/BarraFiltros'
import { Insignia } from '../components/mapa/Insignia'
import { ContenidoDatos, PanelDatos } from '../components/mapa/PanelDatos'
import { useCatalogos } from '../api/queries'
import { Leyenda } from '../components/mapa/Leyenda'
import { MapaCoropletico } from '../components/mapa/MapaCoropletico'
import { SelectorVista } from '../components/mapa/SelectorVista'
import { HojaInferior } from '../components/ui/HojaInferior'
import { contarFiltros, useFiltros } from '../state/filtros'
import { useSincronizarUrl } from '../state/useSincronizarUrl'

/** Botón de drill-down de vuelta al país (también por teclado). */
function VolverNacional() {
  const depto = useFiltros((estado) => estado.filtros.depto)
  const setFiltro = useFiltros((estado) => estado.setFiltro)
  const { data: catalogos } = useCatalogos()

  if (depto === undefined) return null
  const nombre = catalogos?.depto.find((d) => d.id === depto)?.descripcion

  return (
    <button
      type="button"
      onClick={() => setFiltro('depto', undefined)}
      className="flotante pointer-events-auto flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-tinta hover:bg-panel-2"
    >
      <span aria-hidden="true">←</span> Volver a nivel nacional
      {nombre && <span className="etiqueta hidden text-[10px] sm:inline">· {nombre}</span>}
    </button>
  )
}

type Hoja = 'filtros' | 'datos' | null

export function Panel() {
  useSincronizarUrl()

  const [plegado, setPlegado] = useState(false)
  const [hoja, setHoja] = useState<Hoja>(null)
  const activos = useFiltros((estado) => contarFiltros(estado.filtros))
  // Estable: la hoja enfoca y restaura el foco solo al abrir/cerrar
  const cerrarHoja = useCallback(() => setHoja(null), [])

  return (
    <div className="absolute inset-0">
      <MapaCoropletico />

      {/* Capa de paneles: no captura eventos salvo en los paneles (el mapa queda usable) */}
      <div className="pointer-events-none absolute inset-0 p-3">
        {/* Escritorio: panel de filtros a la izquierda */}
        <div className="absolute top-3 bottom-16 left-3 hidden w-72 lg:flex lg:items-start">
          <div className="flotante pointer-events-auto flex max-h-full w-full flex-col overflow-hidden">
            <BarraFiltros prefijo="panel-filtro" />
          </div>
        </div>

        {/* Escritorio: columna derecha con el panel de datos (deja sitio al zoom)
            y la leyenda abajo; el panel cede altura para no taparla */}
        <div className="absolute top-3 right-3 bottom-3 hidden flex-col items-end gap-3 lg:flex">
          <div className="mr-11 flex min-h-0 flex-1 items-start">
            <PanelDatos plegado={plegado} onAlternar={() => setPlegado((v) => !v)} />
          </div>
          <Leyenda />
        </div>

        {/* Abajo a la izquierda: insignia e interruptor de vista (sobre la barra en móvil) */}
        <div className="absolute bottom-16 left-3 flex flex-wrap items-end gap-2 lg:bottom-3">
          <Insignia />
          <SelectorVista />
        </div>

        {/* Drill-down: volver al país (arriba al centro; arriba a la izquierda en móvil) */}
        <div className="absolute top-3 left-3 lg:left-1/2 lg:-translate-x-1/2">
          <VolverNacional />
        </div>

        {/* Tableta: leyenda abajo a la derecha. Móvil: dentro de la hoja "Datos" */}
        <div className="absolute right-3 bottom-16 hidden sm:block lg:hidden">
          <Leyenda />
        </div>

        {/* Móvil: barra inferior que abre las hojas */}
        <div className="flotante pointer-events-auto absolute right-3 bottom-3 left-3 grid grid-cols-2 overflow-hidden lg:hidden">
          <button
            type="button"
            onClick={() => setHoja('filtros')}
            aria-haspopup="dialog"
            className="border-r border-borde px-3 py-2.5 text-sm font-medium"
          >
            Filtros <span className="cifra text-tenue">{activos}/9</span>
          </button>
          <button type="button" onClick={() => setHoja('datos')} aria-haspopup="dialog" className="px-3 py-2.5 text-sm font-medium">
            Datos
          </button>
        </div>
      </div>

      <HojaInferior titulo={`Filtros · ${activos}/9`} abierta={hoja === 'filtros'} onCerrar={cerrarHoja}>
        <BarraFiltros prefijo="hoja-filtro" conCabecera={false} />
      </HojaInferior>
      <HojaInferior titulo="Datos" abierta={hoja === 'datos'} onCerrar={cerrarHoja}>
        <div className="p-3 sm:hidden [&>section]:w-full">
          <Leyenda />
        </div>
        <ContenidoDatos />
      </HojaInferior>
    </div>
  )
}
