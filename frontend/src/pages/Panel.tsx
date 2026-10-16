import { useCallback, useState } from 'react'

import { useCatalogos } from '../api/queries'
import { BarraFiltros } from '../components/BarraFiltros'
import { FichasFiltros } from '../components/mapa/FichasFiltros'
import { FranjaKpis } from '../components/mapa/FranjaKpis'
import { Insignia } from '../components/mapa/Insignia'
import { Leyenda } from '../components/mapa/Leyenda'
import { MapaCoropletico } from '../components/mapa/MapaCoropletico'
import { PanelDatos, PestanasDatos } from '../components/mapa/PanelDatos'
import { SelectorVista } from '../components/mapa/SelectorVista'
import { HojaInferior } from '../components/ui/HojaInferior'
import { contarFiltros, useFiltros } from '../state/filtros'
import { useSincronizarUrl } from '../state/useSincronizarUrl'
import { useEsEscritorio } from '../hooks/useMedia'
import { useTema } from '../theme/tema'
import { useTituloPagina } from '../hooks/useTituloPagina'

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
      {nombre && <span className="etiqueta text-[10px]">· {nombre}</span>}
    </button>
  )
}

type Hoja = 'filtros' | 'datos' | null

/**
 * Página del mapa. Los paneles flotantes se marcan con data-obstaculo (lado
 * que ocupan): el mapa los mide para encuadrar el país en el espacio libre.
 */
export function Panel() {
  useSincronizarUrl()
  useTituloPagina(
    'Mapa',
    'Mapa de víctimas de hechos de tránsito en Guatemala (INE 2018–2024) por departamento y municipio, con filtros, series y ranking.',
  )

  const [plegado, setPlegado] = useState(false)
  const [hoja, setHoja] = useState<Hoja>(null)
  const activos = useFiltros((estado) => contarFiltros(estado.filtros))
  // Cada variante se monta solo en su tamaño (no hay gráficas ocultas de tamaño 0)
  const escritorio = useEsEscritorio()
  // Estable: la hoja enfoca y restaura el foco solo al abrir/cerrar
  const cerrarHoja = useCallback(() => setHoja(null), [])
  // Los colores van en el estilo de MapLibre: al cambiar de tema se rehace el mapa
  const tema = useTema((estado) => estado.tema)

  return (
    <div className="absolute inset-0" data-mapa-raiz>
      {/* Capa de paneles: solo los paneles capturan el cursor (el mapa sigue usable).
          Va antes del mapa en el DOM para que Tab recorra fichas y datos antes que el zoom. */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {/* Arriba al centro: KPIs y "volver" (en escritorio, entre las fichas y el panel de datos) */}
        <div className="absolute top-4 right-4 left-4 flex flex-col items-center gap-2 lg:right-[23rem] lg:left-[17rem]">
          <div data-obstaculo="arriba" className="pointer-events-auto w-full max-w-md lg:w-auto">
            <FranjaKpis />
          </div>
          <div data-obstaculo="arriba">
            <VolverNacional />
          </div>
        </div>

        {escritorio ? (
          <>
            {/* Fichas de filtros a la izquierda */}
            <div data-obstaculo="izquierda" className="pointer-events-auto absolute top-4 left-4">
              <FichasFiltros />
            </div>

            {/* Datos a la derecha, angosto y plegable */}
            <div data-obstaculo="derecha" className="absolute top-4 right-4">
              <PanelDatos plegado={plegado} onAlternar={() => setPlegado((v) => !v)} />
            </div>

            {/* Fila inferior: leyenda, insignia + vista, hueco del zoom */}
            <div className="absolute right-4 bottom-4 left-4 flex items-end justify-between gap-4">
              <div data-obstaculo="abajo">
                <Leyenda />
              </div>
              <div data-obstaculo="abajo" className="flex items-end gap-2">
                <Insignia />
                <SelectorVista />
              </div>
              {/* Espacio del control de zoom (esquina inferior derecha) */}
              <div aria-hidden="true" className="w-[30px] shrink-0" />
            </div>
          </>
        ) : (
          <>
            {/* Insignia + vista sobre la barra; barra que abre las hojas */}
            <div data-obstaculo="abajo" className="absolute right-4 bottom-[4.25rem] left-4 flex flex-wrap items-end justify-center gap-2">
              <Insignia />
              <SelectorVista />
            </div>
            <div
              data-obstaculo="abajo"
              className="flotante pointer-events-auto absolute right-4 bottom-4 left-4 grid grid-cols-2 overflow-hidden"
            >
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
          </>
        )}
      </div>

      <MapaCoropletico key={tema} />

      <HojaInferior titulo={`Filtros · ${activos}/9`} abierta={!escritorio && hoja === 'filtros'} onCerrar={cerrarHoja}>
        <BarraFiltros prefijo="hoja-filtro" conCabecera={false} />
      </HojaInferior>
      <HojaInferior titulo="Datos" abierta={!escritorio && hoja === 'datos'} onCerrar={cerrarHoja}>
        <div className="p-3">
          <Leyenda ancho="w-full" />
        </div>
        <PestanasDatos />
      </HojaInferior>
    </div>
  )
}
