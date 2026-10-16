import { useCallback, useState } from 'react'

import { BarraFiltros } from '../components/BarraFiltros'
import { Insignia } from '../components/mapa/Insignia'
import { ContenidoDatos, PanelDatos } from '../components/mapa/PanelDatos'
import { EtiquetaSeccion } from '../components/ui/Editorial'
import { HojaInferior } from '../components/ui/HojaInferior'
import { contarFiltros, useFiltros } from '../state/filtros'
import { useSincronizarUrl } from '../state/useSincronizarUrl'

/** Fondo del mapa. El mapa MapLibre se monta aquí en la etapa (d). */
function FondoMapa() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-fondo"
      style={{
        backgroundImage: 'radial-gradient(var(--c-border) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}
    />
  )
}

/** Hueco de la leyenda (se completa con el mapa en la etapa d). */
function LeyendaProvisional() {
  return (
    <div className="flotante pointer-events-auto w-56 px-3 py-2">
      <EtiquetaSeccion as="p">Leyenda</EtiquetaSeccion>
      <p className="mt-1 text-xs text-tenue">Se completa con el mapa (etapa d).</p>
    </div>
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
      <FondoMapa />

      {/* Capa de paneles: no captura eventos salvo en los paneles (el mapa queda usable) */}
      <div className="pointer-events-none absolute inset-0 p-3">
        {/* Escritorio: panel de filtros a la izquierda */}
        <div className="absolute top-3 bottom-16 left-3 hidden w-72 lg:flex lg:items-start">
          <div className="flotante pointer-events-auto flex max-h-full w-full flex-col overflow-hidden">
            <BarraFiltros prefijo="panel-filtro" />
          </div>
        </div>

        {/* Escritorio: panel de datos a la derecha (deja sitio al zoom del mapa) */}
        <div className="absolute top-3 right-14 bottom-24 hidden lg:flex lg:items-start">
          <PanelDatos plegado={plegado} onAlternar={() => setPlegado((v) => !v)} />
        </div>

        {/* Insignia abajo a la izquierda (sobre la barra de botones en móvil) */}
        <div className="absolute bottom-16 left-3 lg:bottom-3">
          <Insignia />
        </div>

        {/* Leyenda abajo a la derecha */}
        <div className="absolute right-3 bottom-16 hidden sm:block lg:bottom-3">
          <LeyendaProvisional />
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
        <ContenidoDatos />
      </HojaInferior>
    </div>
  )
}
