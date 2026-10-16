import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Map as MapaLibre,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type ErrorEvent,
  type ExpressionSpecification,
  type GeoJSONSource,
  type LngLatBoundsLike,
  type MapMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// El worker de MapLibre 6 importa maplibre-gl-shared.mjs; con ?worker&url Vite
// lo empaqueta con sus dependencias (desarrollo y producción).
import urlWorkerMapLibre from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

import { useCoropletico } from '../../api/queries'
import type { Nivel } from '../../api/types'
import { usePrefiereMenosMovimiento } from '../../hooks/movimiento'
import { useFiltros } from '../../state/filtros'
import type { Vista } from '../../state/mapaUi'
import { usePaleta, type Paleta } from '../../theme/tema'
import type { PropiedadesMapa } from '../../utils/clasificacion'
import { formatoEntero, formatoNulo, formatoPorcentaje } from '../../utils/formato'
import { cajaEnvolvente, centroide, radioBurbuja, radioMaximo } from '../../utils/geometria'
import { ErrorCarga } from '../ui/Estados'
import { useClasificacionMapa } from './useClasificacionMapa'

setWorkerUrl(urlWorkerMapLibre)

// Guatemala completa (oeste, sur, este, norte)
const GUATEMALA: [number, number, number, number] = [-92.3, 13.6, -88.15, 17.85]
const PITCH_3D = 50
const RADIO_CIFRA = 17 // radio mínimo (px) para escribir la cifra dentro

const CAPAS_INTERACTIVAS: Record<Vista, string[]> = {
  burbujas: ['burbujas', 'areas-relleno'],
  areas: ['areas-relleno', 'areas-sin-victimas'],
  '3d': ['areas-3d'],
}

/** Fondo liso, sin teselas externas ni claves: funciona sin internet. */
const estilo = (paleta: Paleta): StyleSpecification => ({
  version: 8,
  sources: {},
  layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': paleta.bg } }],
})

/** Patrón de rayado diagonal para "Sin víctimas" en la vista de áreas. */
function patronRayado(paleta: Paleta): ImageData {
  const lado = 8
  const canvas = document.createElement('canvas')
  canvas.width = lado
  canvas.height = lado
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = paleta.mapNull
  ctx.fillRect(0, 0, lado, lado)
  ctx.strokeStyle = paleta.mapBubbleStroke
  ctx.lineWidth = 1.2
  ctx.beginPath()
  for (const [x0, y0, x1, y1] of [
    [-1, lado + 1, lado + 1, -1],
    [-1, 1, 1, -1],
    [lado - 1, lado + 1, lado + 1, lado - 1],
  ]) {
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
  }
  ctx.stroke()
  return ctx.getImageData(0, 0, lado, lado)
}

const claveEncuadreDe = (nivel: Nivel, depto?: number, municipio?: number, vista?: Vista) =>
  `${nivel}|${depto ?? ''}|${municipio ?? ''}|${vista === '3d' ? '3d' : '2d'}`

const vacio = (): GeoJSON.FeatureCollection => ({ type: 'FeatureCollection', features: [] })

interface Hover {
  x: number
  y: number
  props: PropiedadesMapa
}

function TarjetaHover({ hover, nivel }: { hover: Hover; nivel: Nivel }) {
  const { props } = hover

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 w-56 rounded-sm border border-borde-fuerte bg-panel-2/95 p-2.5 text-xs shadow-xl backdrop-blur"
      style={{ left: hover.x + 16, top: hover.y + 16 }}
    >
      <p className="font-semibold text-tinta">{props.nombre}</p>
      <dl className="cifra mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <dt className="text-tenue">Víctimas</dt>
        <dd className="text-right">{formatoEntero(props.total)}</dd>
        <dt className="text-tenue">Fallecidos</dt>
        <dd className="text-right">{formatoEntero(props.fallecidos)}</dd>
        <dt className="text-tenue">Letalidad</dt>
        <dd className="text-right">{formatoNulo(props.letalidad, formatoPorcentaje)}</dd>
      </dl>
      <p className="etiqueta mt-2 text-[10px] text-tinta">{props.etiquetaClase}</p>
      <p className="etiqueta mt-0.5 text-[10px]">
        Clic: {nivel === 'depto' ? 'acercar y ver sus municipios' : 'acercar y filtrar el municipio'}
      </p>
    </div>
  )
}

export function MapaCoropletico() {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<MapaLibre | null>(null)
  const marcadores = useRef<Marker[]>([])
  const [listo, setListo] = useState(false)
  const [hover, setHover] = useState<Hover | null>(null)

  const paleta = usePaleta()
  const reducido = usePrefiereMenosMovimiento()
  const filtros = useFiltros((estado) => estado.filtros)
  const setFiltro = useFiltros((estado) => estado.setFiltro)
  const { clasificacion, nivel, vista, data, isPending, isError, refetch, isFetching } = useClasificacionMapa()

  // Límites de departamentos como contexto (geometría IDEG, sin filtros)
  const { data: contexto } = useCoropletico({}, 'depto')

  // -- Datos derivados: burbujas (centroides) y alturas 3D ------------------
  const capas = useMemo(() => {
    if (!clasificacion) return null
    const features = clasificacion.coleccion.features
    const maxTotal = Math.max(1, ...features.map((f) => f.properties.total))
    const k = clasificacion.clases.length
    const radioMax = radioMaximo(nivel)

    const caja = cajaEnvolvente(clasificacion.coleccion) ?? GUATEMALA
    const diagonalMetros = Math.hypot(caja[2] - caja[0], caja[3] - caja[1]) * 111_000
    const alturaMax = diagonalMetros * 0.08

    const areas: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: features.map((f) => ({
        ...f,
        // Raíz cuadrada: un municipio muy grande no aplana al resto
        properties: { ...f.properties, altura: Math.sqrt(f.properties.total / maxTotal) * alturaMax },
      })),
    }

    const burbujas: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: features.flatMap((f) => {
        const punto = centroide(f.geometry)
        if (!punto) return []
        return [
          {
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: punto },
            properties: {
              ...f.properties,
              radio: radioBurbuja(f.properties.total, maxTotal, 5, radioMax),
              // Brillo en los dos grupos más altos de letalidad
              brillo: k >= 2 && f.properties.clase >= k - 1,
            },
          },
        ]
      }),
    }

    return { areas, burbujas }
  }, [clasificacion, nivel])

  // Valores actuales para los manejadores registrados una sola vez
  const actual = useRef({ nivel, vista, setFiltro, reducido, capas })
  const ultimoEncuadre = useRef<string | null>(null)
  useEffect(() => {
    actual.current = { nivel, vista, setFiltro, reducido, capas }
  }, [nivel, vista, setFiltro, reducido, capas])

  // -- Creación del mapa (una vez) ----------------------------------------
  useEffect(() => {
    if (!contenedor.current) return

    const mapa = new MapaLibre({
      container: contenedor.current,
      style: estilo(paleta),
      bounds: GUATEMALA,
      fitBoundsOptions: { padding: 24 },
      attributionControl: false,
      dragRotate: false,
      maxPitch: 60,
    })
    mapa.touchZoomRotate.disableRotation()
    mapa.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    mapaRef.current = mapa

    // Con un manejador propio MapLibre ya no registra los errores: se hace aquí
    mapa.on('error', (evento: ErrorEvent) => console.error(evento.error))

    const montarCapas = () => {
      if (mapa.getSource('areas')) return

      mapa.addImage('rayado', patronRayado(paleta), { pixelRatio: 2 })
      mapa.addSource('contexto', { type: 'geojson', data: vacio(), promoteId: 'codigo' })
      mapa.addSource('areas', { type: 'geojson', data: vacio(), promoteId: 'codigo' })
      mapa.addSource('burbujas', { type: 'geojson', data: vacio(), promoteId: 'codigo' })

      const hover: ExpressionSpecification = ['boolean', ['feature-state', 'hover'], false]

      mapa.addLayer({ id: 'areas-relleno', type: 'fill', source: 'areas', paint: { 'fill-color': paleta.text, 'fill-opacity': 0.05 } })
      mapa.addLayer({
        id: 'areas-sin-victimas',
        type: 'fill',
        source: 'areas',
        filter: ['==', ['get', 'clase'], 0],
        layout: { visibility: 'none' },
        paint: { 'fill-pattern': 'rayado', 'fill-opacity': 0.7 },
      })
      mapa.addLayer({ id: 'areas-borde', type: 'line', source: 'areas', paint: { 'line-color': paleta.mapLine, 'line-width': 0.6 } })
      mapa.addLayer({ id: 'contexto-borde', type: 'line', source: 'contexto', paint: { 'line-color': paleta.mapLine, 'line-width': 0.9 } })
      mapa.addLayer({
        id: 'contexto-seleccion',
        type: 'line',
        source: 'contexto',
        filter: ['==', ['get', 'codigo'], -1],
        paint: { 'line-color': paleta.mapLineStrong, 'line-width': 1.4 },
      })
      mapa.addLayer({
        id: 'areas-3d',
        type: 'fill-extrusion',
        source: 'areas',
        layout: { visibility: 'none' },
        paint: {
          'fill-extrusion-color': ['case', ['==', ['get', 'clase'], 0], paleta.mapNull, ['get', 'color']],
          'fill-extrusion-height': ['get', 'altura'],
          'fill-extrusion-opacity': 0.9,
        },
      })
      mapa.addLayer({
        id: 'areas-hover',
        type: 'line',
        source: 'areas',
        paint: { 'line-color': paleta.mapHover, 'line-width': ['case', hover, 1.6, 0] },
      })
      mapa.addLayer({
        id: 'burbujas-brillo',
        type: 'circle',
        source: 'burbujas',
        filter: ['==', ['get', 'brillo'], true],
        paint: {
          'circle-radius': ['*', ['get', 'radio'], 1.8],
          'circle-color': ['get', 'color'],
          'circle-blur': 1,
          'circle-opacity': 0.32,
        },
      })
      mapa.addLayer({
        id: 'burbujas',
        type: 'circle',
        source: 'burbujas',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'clase'], 0], 2.5, ['get', 'radio']],
          'circle-color': ['case', ['==', ['get', 'clase'], 0], paleta.mapNullDot, ['get', 'color']],
          'circle-opacity': 0.9,
          'circle-stroke-color': ['case', hover, paleta.mapHover, paleta.mapBubbleStroke],
          'circle-stroke-width': ['case', hover, 2, ['==', ['get', 'clase'], 0], 0, 0.8],
          'circle-stroke-opacity': 0.9,
        },
      })

      // -- Interacción: tarjeta al pasar el cursor y clic para acercar ----
      let hoverId: number | null = null
      const marcarHover = (id: number | null) => {
        if (hoverId === id) return
        for (const source of ['areas', 'burbujas']) {
          if (hoverId !== null) mapa.setFeatureState({ source, id: hoverId }, { hover: false })
          if (id !== null) mapa.setFeatureState({ source, id }, { hover: true })
        }
        hoverId = id
      }

      const featureEn = (e: MapMouseEvent) => {
        const capasActivas = CAPAS_INTERACTIVAS[actual.current.vista].filter((c) => mapa.getLayer(c))
        return mapa.queryRenderedFeatures(e.point, { layers: capasActivas })[0]
      }

      mapa.on('mousemove', (e) => {
        const feature = featureEn(e)
        if (!feature) {
          marcarHover(null)
          setHover(null)
          mapa.getCanvas().style.cursor = ''
          return
        }
        marcarHover(feature.id as number)
        mapa.getCanvas().style.cursor = 'pointer'
        setHover({ x: e.point.x, y: e.point.y, props: feature.properties as PropiedadesMapa })
      })

      mapa.getCanvas().addEventListener('mouseleave', () => {
        marcarHover(null)
        setHover(null)
      })

      mapa.on('click', (e) => {
        const feature = featureEn(e)
        const codigo = Number(feature?.properties?.codigo)
        if (!feature || !Number.isFinite(codigo)) return

        const { nivel: nivelActual, vista: vistaActual, setFiltro: aplicar, reducido: sinMovimiento, capas: datos } = actual.current
        const area = datos?.areas.features.find((f) => f.properties?.codigo === codigo)
        const caja = area ? cajaEnvolvente({ features: [area] }) : null

        // Bajar un nivel: departamento -> sus municipios; municipio -> filtrarlo
        const esDepto = nivelActual === 'depto'
        const depto = esDepto ? codigo : Math.floor(codigo / 100)
        ultimoEncuadre.current = claveEncuadreDe('municipio', depto, esDepto ? undefined : codigo, vistaActual)

        if (caja) {
          mapa.fitBounds(caja as LngLatBoundsLike, {
            padding: margenesEncuadre(),
            maxZoom: 11,
            duration: sinMovimiento ? 0 : 900,
            pitch: vistaActual === '3d' ? PITCH_3D : 0,
          })
        }

        marcarHover(null)
        setHover(null)
        aplicar(esDepto ? 'depto' : 'municipio', codigo)
      })

      setListo(true)
    }

    // Sin fuentes externas 'load' siempre llega; si el estilo ya cargó, se monta ya
    if (mapa.isStyleLoaded()) montarCapas()
    else mapa.once('load', montarCapas)

    return () => {
      for (const m of marcadores.current) m.remove()
      marcadores.current = []
      mapa.remove()
      mapaRef.current = null
    }
    // La paleta es fija (solo tema oscuro); el mapa se crea una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // -- Datos ---------------------------------------------------------------
  useEffect(() => {
    const mapa = mapaRef.current
    if (!listo || !mapa || !capas) return
    ;(mapa.getSource('areas') as GeoJSONSource).setData(capas.areas)
    ;(mapa.getSource('burbujas') as GeoJSONSource).setData(capas.burbujas)
  }, [listo, capas])

  useEffect(() => {
    const mapa = mapaRef.current
    if (!listo || !mapa || !contexto) return
    ;(mapa.getSource('contexto') as GeoJSONSource).setData(contexto as unknown as GeoJSON.FeatureCollection)
  }, [listo, contexto])

  // Departamento seleccionado: borde un poco más visible
  useEffect(() => {
    const mapa = mapaRef.current
    if (!listo || !mapa) return
    mapa.setFilter('contexto-seleccion', ['==', ['get', 'codigo'], filtros.depto ?? -1])
  }, [listo, filtros.depto])

  // -- Vista: burbujas / áreas / 3D ----------------------------------------
  useEffect(() => {
    const mapa = mapaRef.current
    if (!listo || !mapa) return

    const hover: ExpressionSpecification = ['boolean', ['feature-state', 'hover'], false]
    const visible = (capa: string, si: boolean) => mapa.setLayoutProperty(capa, 'visibility', si ? 'visible' : 'none')

    visible('burbujas', vista === 'burbujas')
    visible('burbujas-brillo', vista === 'burbujas')
    visible('areas-relleno', vista !== '3d')
    visible('areas-sin-victimas', vista === 'areas')
    visible('areas-3d', vista === '3d')
    visible('areas-hover', vista !== '3d')

    if (vista === 'areas') {
      mapa.setFilter('areas-relleno', ['>', ['get', 'clase'], 0])
      mapa.setPaintProperty('areas-relleno', 'fill-color', ['get', 'color'])
      mapa.setPaintProperty('areas-relleno', 'fill-opacity', ['case', hover, 0.6, 0.42])
    } else {
      // Relleno casi invisible que solo se ilumina al pasar el cursor
      mapa.setFilter('areas-relleno', null)
      mapa.setPaintProperty('areas-relleno', 'fill-color', paleta.text)
      mapa.setPaintProperty('areas-relleno', 'fill-opacity', ['case', hover, 0.14, 0.05])
    }

    mapa.easeTo({ pitch: vista === '3d' ? PITCH_3D : 0, duration: reducido ? 0 : 700 })
  }, [listo, vista, paleta, reducido])

  // -- Encuadre automático (filtros, "volver", enlaces compartidos) --------
  const claveEncuadre = claveEncuadreDe(nivel, filtros.depto, filtros.municipio, vista)

  useEffect(() => {
    const mapa = mapaRef.current
    if (!listo || !mapa || !data || data.nivel !== nivel || isFetching) return
    if (ultimoEncuadre.current === claveEncuadre) return
    ultimoEncuadre.current = claveEncuadre

    const nacional = filtros.depto === undefined && filtros.municipio === undefined
    const caja = nacional ? GUATEMALA : cajaEnvolvente(data)
    if (!caja) return

    mapa.fitBounds(caja, {
      padding: margenesEncuadre(),
      maxZoom: 11,
      duration: reducido ? 0 : 800,
      pitch: vista === '3d' ? PITCH_3D : 0,
    })
  }, [listo, data, nivel, claveEncuadre, filtros.depto, filtros.municipio, isFetching, reducido, vista])

  // -- Etiquetas (HTML, JetBrains Mono): departamentos y cifras ------------
  useEffect(() => {
    const mapa = mapaRef.current
    if (!listo || !mapa) return

    for (const m of marcadores.current) m.remove()
    marcadores.current = []
    if (vista === '3d') return

    const nuevo = (lngLat: [number, number], elemento: HTMLElement, desplazamientoY = 0) => {
      marcadores.current.push(
        new Marker({ element: elemento, offset: [0, desplazamientoY] }).setLngLat(lngLat).addTo(mapa),
      )
    }

    // Nombres de departamento, pequeños y apagados (menos el seleccionado),
    // encima de su burbuja para no taparla
    const radios = new Map<number, number>()
    if (vista === 'burbujas' && nivel === 'depto' && capas) {
      for (const b of capas.burbujas.features) radios.set(b.properties!.codigo, b.properties!.radio)
    }
    for (const f of contexto?.features ?? []) {
      if (f.properties.codigo === filtros.depto) continue
      const punto = centroide(f.geometry)
      if (!punto) continue
      const el = document.createElement('span')
      el.className = 'etiqueta-mapa'
      el.textContent = f.properties.nombre
      nuevo(punto, el, -((radios.get(f.properties.codigo) ?? 0) + 10))
    }

    // Cifras dentro de las burbujas grandes
    if (vista === 'burbujas' && capas) {
      for (const f of capas.burbujas.features) {
        const p = f.properties as PropiedadesMapa & { radio: number }
        if (p.clase === 0 || p.radio < RADIO_CIFRA) continue
        const el = document.createElement('span')
        el.className = 'cifra-burbuja'
        el.textContent = formatoEntero(p.total)
        el.style.color = p.clase <= 2 ? paleta.mapCifraClara : paleta.mapCifraOscura
        nuevo(f.geometry.coordinates as [number, number], el)
      }
    }
  }, [listo, vista, nivel, capas, contexto, filtros.depto, paleta])

  return (
    <div className="absolute inset-0">
      {/* MapLibre fuerza position: relative en el contenedor: altura explícita */}
      <div
        ref={contenedor}
        className="h-full w-full"
        role="region"
        aria-label={`Mapa de víctimas por ${nivel === 'depto' ? 'departamento' : 'municipio'}. Use el ranking o el filtro de departamento para navegar con teclado.`}
      />

      {hover && <TarjetaHover hover={hover} nivel={nivel} />}

      {(isPending || (isFetching && !clasificacion)) && (
        <p className="flotante etiqueta absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1.5" role="status">
          Cargando mapa…
        </p>
      )}

      {isError && (
        <div className="absolute top-16 left-1/2 w-72 -translate-x-1/2">
          <ErrorCarga mensaje="No se pudo cargar el mapa." onReintentar={refetch} />
        </div>
      )}
    </div>
  )
}

/** Márgenes de encuadre: deja libres los paneles flotantes en escritorio. */
function margenesEncuadre() {
  return window.matchMedia('(min-width: 1024px)').matches
    ? { top: 70, bottom: 90, left: 330, right: 480 }
    : { top: 60, bottom: 130, left: 24, right: 24 }
}
