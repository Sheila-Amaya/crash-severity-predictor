import { useMemo } from 'react'

import { useCoropletico } from '../../api/queries'
import type { Nivel } from '../../api/types'
import { useFiltros } from '../../state/filtros'
import { useMapaUi } from '../../state/mapaUi'
import { usePaleta } from '../../theme/tema'
import { clasificar, type Metrica } from '../../utils/clasificacion'

/**
 * Datos del mapa clasificados por quintiles relativos.
 * - Nivel: departamentos a escala nacional; municipios con un departamento
 *   filtrado (drill-down) o en la vista 3D.
 * - Color: letalidad en burbujas y 3D; métrica elegida en áreas.
 * Lo comparten el mapa y la leyenda (misma consulta en caché).
 */
export function useClasificacionMapa() {
  const filtros = useFiltros((estado) => estado.filtros)
  const vista = useMapaUi((estado) => estado.vista)
  const metricaAreas = useMapaUi((estado) => estado.metrica)
  const paleta = usePaleta()

  const nivel: Nivel = filtros.depto !== undefined || vista === '3d' ? 'municipio' : 'depto'
  const metrica: Metrica = vista === 'areas' ? metricaAreas : 'letalidad'
  const consulta = useCoropletico(filtros, nivel)

  const clasificacion = useMemo(
    () => (consulta.data ? clasificar(consulta.data, metrica, paleta.mapScale, paleta.mapNull) : undefined),
    [consulta.data, metrica, paleta],
  )

  return { ...consulta, nivel, metrica, vista, clasificacion }
}
