import { Kpis } from '../dashboard/Kpis'
import { RankingTop } from '../dashboard/RankingTop'
import { SerieTemporal } from '../dashboard/SerieTemporal'
import { EtiquetaSeccion } from '../ui/Editorial'

/** Contenido del panel de datos: resumen, ranking y serie, separados por líneas. */
export function ContenidoDatos() {
  return (
    <div className="flex flex-col divide-y divide-borde">
      <section aria-labelledby="resumen-titulo" className="flex flex-col gap-2.5 p-3">
        <EtiquetaSeccion as="h3" id="resumen-titulo">
          Resumen
        </EtiquetaSeccion>
        <Kpis />
      </section>
      <div className="p-3">
        <RankingTop />
      </div>
      <div className="p-3">
        <SerieTemporal />
      </div>
    </div>
  )
}

interface Props {
  plegado: boolean
  onAlternar: () => void
}

/** Panel flotante derecho, plegable (solo escritorio). */
export function PanelDatos({ plegado, onAlternar }: Props) {
  return (
    <aside
      aria-label="Datos"
      className="flotante pointer-events-auto flex max-h-full w-[25rem] flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2 border-b border-borde px-3 py-2">
        <h2 className="etiqueta">Datos</h2>
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={!plegado}
          aria-controls="panel-datos-contenido"
          className="etiqueta rounded-sm border border-borde-fuerte px-2 py-0.5 text-[10px] text-tinta hover:bg-panel-2"
        >
          {plegado ? 'Mostrar' : 'Ocultar'}
        </button>
      </div>
      <div id="panel-datos-contenido" hidden={plegado} className="min-h-0 flex-1 overflow-y-auto">
        <ContenidoDatos />
      </div>
    </aside>
  )
}
