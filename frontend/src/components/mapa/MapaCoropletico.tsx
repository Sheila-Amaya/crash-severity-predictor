import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { useMapaUi, type Vista } from '../../state/mapaUi'
import palette from '../../theme/palette.json'
import { usePaleta, type Paleta } from '../../theme/tema'
import type { PropiedadesMapa } from '../../utils/clasificacion'
import { etiquetasVisibles, margenesLibres, type Lado } from '../../utils/espacio'
import { formatoEntero, formatoNulo, formatoPorcentaje } from '../../utils/formato'
import { RADIO_MINIMO_BURBUJA, cajaEnvolvente, centroide, radioBurbuja, radioMaximo } from '../../utils/geometria'
import { ErrorCarga } from '../ui/Estados'
import { FichaSeleccion } from './FichaSeleccion'
import { useClasificacionMapa } from './useClasificacionMapa'
// Contexto: Natural Earth (dominio público), recortado con scripts/contexto_natural_earth.py.
// 1:50m de la región en el bundle; el 1:10m alrededor de Guatemala se carga en diferido.
import contextoRegion from '../../data/contexto-region.json'

setWorkerUrl(urlWorkerMapLibre)

type Caja4 = [number, number, number, number]

// Guatemala completa (oeste, sur, este, norte)
const GUATEMALA: Caja4 = [-92.25, 13.72, -88.2, 17.82]
const PITCH_3D = 50
const BORDE_FRENTE = 1.25 // px, contorno de la burbuja bajo el cursor
const SEPARACION_ETIQUETA = 8
// Alto (px) que ocupan abajo la ficha táctil, el selector de vista y la barra
const ALTO_ZONA_FICHA = 280

const CAPAS_INTERACTIVAS: Record<Vista, string[]> = {
  burbujas: ['burbujas', 'areas-relleno'],
  areas: ['areas-relleno', 'areas-sin-victimas'],
  '3d': ['areas-3d'],
}

const HOVER: ExpressionSpecification = ['boolean', ['feature-state', 'hover'], false]

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

// Región del contexto (= límites de navegación) y retícula de 1° (generada aquí)
const REGION = { oeste: -100, este: -76, sur: 5, norte: 24 }
const ZOOM_DETALLE = 7.5 // a partir de aquí (departamento o más cerca) se carga el 1:10m
const MERIDIANOS = Array.from({ length: REGION.este - REGION.oeste + 1 }, (_, i) => REGION.oeste + i)
const PARALELOS = Array.from({ length: REGION.norte - REGION.sur + 1 }, (_, i) => REGION.sur + i)

const reticula = (): GeoJSON.FeatureCollection<GeoJSON.LineString> => ({
  type: 'FeatureCollection',
  features: [
    ...MERIDIANOS.map((lon) => ({
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates: [[lon, REGION.sur], [lon, REGION.norte]] },
    })),
    ...PARALELOS.map((lat) => ({
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates: [[REGION.oeste, lat], [REGION.este, lat]] },
    })),
  ],
})

/**
 * Filtro de las capas de contexto. Tierra: todos los países (Guatemala incluida,
 * como base bajo IDEG). Costa: sin Guatemala. Frontera: sin los tramos junto a
 * Guatemala (gtm), donde dibuja IDEG.
 */
function filtroContexto(tipo: 'tierra' | 'costa' | 'frontera'): ExpressionSpecification {
  if (tipo === 'tierra') return ['==', ['get', 'capa'], 'pais']
  if (tipo === 'costa') return ['all', ['==', ['get', 'capa'], 'pais'], ['!=', ['get', 'iso'], 'GTM']]
  return ['all', ['==', ['get', 'capa'], 'frontera'], ['!=', ['get', 'gtm'], true]]
}

/** Etiquetas de contexto (países vecinos y mares), en mayúsculas y apagadas. */
const ETIQUETAS_CONTEXTO: { texto: string; lngLat: [number, number] }[] = [
  { texto: 'México', lngLat: [-92.6, 17.55] },
  { texto: 'Belice', lngLat: [-88.75, 17.25] },
  { texto: 'Honduras', lngLat: [-87.1, 14.8] },
  { texto: 'El Salvador', lngLat: [-88.95, 13.85] },
  { texto: 'Nicaragua', lngLat: [-85.6, 12.9] },
  { texto: 'Costa Rica', lngLat: [-84.15, 10.0] },
  { texto: 'Panamá', lngLat: [-80.3, 8.55] },
  { texto: 'Colombia', lngLat: [-76.7, 6.4] },
  { texto: 'Cuba', lngLat: [-79.6, 22.05] },
  { texto: 'Jamaica', lngLat: [-77.3, 18.25] },
  { texto: 'Islas de la Bahía', lngLat: [-86.35, 16.55] },
  { texto: 'Océano Pacífico', lngLat: [-91.4, 13.1] },
  { texto: 'Mar Caribe', lngLat: [-82.5, 15.6] },
]

const formatoLon = (lon: number) => `${Math.abs(lon)}°O`
const formatoLat = (lat: number) => `${lat}°N`

const esPantallaPequena = () => window.matchMedia('(max-width: 1023px)').matches

/** Márgenes del encuadre: el espacio libre entre los paneles marcados con data-obstaculo. */
function margenesEncuadre(contenedor: HTMLElement) {
  const raiz = contenedor.closest('[data-mapa-raiz]') ?? contenedor
  const caja = contenedor.getBoundingClientRect()
  const obstaculos = [...raiz.querySelectorAll<HTMLElement>('[data-obstaculo]')].map((el) => ({
    lado: el.dataset.obstaculo as Lado,
    caja: el.getBoundingClientRect(),
  }))
  return margenesLibres(caja, obstaculos)
}

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

interface EtiquetaMapa {
  marcador: Marker
  elemento: HTMLElement
  lngLat: [number, number]
  /** Índice de su burbuja en capas.burbujas (o -1). */
  burbuja: number
  radio: number
}

export function MapaCoropletico() {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<MapaLibre | null>(null)
  const marcadores = useRef<Marker[]>([])
  const etiquetas = useRef<EtiquetaMapa[]>([])
  const objetivo = useRef<Caja4>(GUATEMALA)
  const recolocar = useRef<() => void>(() => {})
  const coordenadas = useRef<{ lon: HTMLElement[]; lat: HTMLElement[] }>({ lon: [], lat: [] })
  const [listo, setListo] = useState(false)
  const [hover, setHover] = useState<Hover | null>(null)
  // Ficha táctil: se guarda con las capas en que se tocó; si los datos cambian
  // (filtros, nivel) deja de mostrarse sola
  const [ficha, setFicha] = useState<{ props: PropiedadesMapa; capas: unknown } | null>(null)
  const marcarHoverRef = useRef<(id: number | null) => void>(() => {})
  const bajarNivelRef = useRef<(codigo: number) => void>(() => {})
  const cerrarFicha = useCallback(() => {
    setFicha(null)
    marcarHoverRef.current(null)
  }, [])

  const paleta = usePaleta()
  const reducido = usePrefiereMenosMovimiento()
  const filtros = useFiltros((estado) => estado.filtros)
  const setFiltro = useFiltros((estado) => estado.setFiltro)
  const brillo = useMapaUi((estado) => estado.brillo)
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
              // Raíz cuadrada con tope (radioMax): la mayor no tapa a sus vecinas
              radio: radioBurbuja(f.properties.total, maxTotal, RADIO_MINIMO_BURBUJA, radioMax),
              // Halo más intenso en los dos grupos más altos (quintiles 4 y 5)
              intenso: k >= 2 && f.properties.clase >= k - 1,
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
    const elemento = contenedor.current
    if (!elemento) return

    const mapa = new MapaLibre({
      container: elemento,
      style: estilo(paleta),
      bounds: GUATEMALA,
      fitBoundsOptions: { padding: 24 },
      attributionControl: false,
      dragRotate: false,
      maxPitch: 60,
      // No se puede alejar ni desplazar fuera de la región con contexto
      maxBounds: [
        [REGION.oeste, REGION.sur],
        [REGION.este, REGION.norte],
      ],
      minZoom: 4,
    })
    mapa.touchZoomRotate.disableRotation()
    mapa.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')
    mapaRef.current = mapa

    // Con un manejador propio MapLibre ya no registra los errores: se hace aquí
    mapa.on('error', (evento: ErrorEvent) => console.error(evento.error))

    // -- Etiquetas: se ocultan las que chocan con una burbuja ajena o con
    //    otra etiqueta; al acercar hay más espacio y reaparecen ------------
    let cuadro = 0
    const recolocarEtiquetas = () => {
      cancelAnimationFrame(cuadro)
      cuadro = requestAnimationFrame(() => {
        const datos = actual.current.capas
        const circulos =
          actual.current.vista === 'burbujas' && datos
            ? datos.burbujas.features.map((b) => {
                const p = mapa.project(b.geometry.coordinates as [number, number])
                return { x: p.x, y: p.y, r: Math.max(2.5, b.properties!.radio) }
              })
            : []

        const lista = etiquetas.current
        const cajas = lista.map((e) => {
          const p = mapa.project(e.lngLat)
          const ancho = e.elemento.offsetWidth || 60
          const centroY = p.y - (e.radio + SEPARACION_ETIQUETA)
          return { left: p.x - ancho / 2, right: p.x + ancho / 2, top: centroY - 6, bottom: centroY + 6, propia: e.burbuja }
        })
        // Paneles flotantes (coordenadas relativas al mapa): ahí no se escriben etiquetas
        const base = elemento.getBoundingClientRect()
        const raiz = elemento.closest('[data-mapa-raiz]') ?? elemento
        const bloqueos = [...raiz.querySelectorAll<HTMLElement>('[data-obstaculo]')].map((el) => {
          const r = el.getBoundingClientRect()
          return { left: r.left - base.left, right: r.right - base.left, top: r.top - base.top, bottom: r.bottom - base.top }
        })
        // Fuera del área visible tampoco (no se muestran cortadas en el borde)
        const { width: w, height: h } = base
        bloqueos.push(
          { left: -1e5, right: 0, top: -1e5, bottom: 1e5 },
          { left: w, right: 1e5, top: -1e5, bottom: 1e5 },
          { left: -1e5, right: 1e5, top: -1e5, bottom: 0 },
          { left: -1e5, right: 1e5, top: h, bottom: 1e5 },
        )
        const visibles = etiquetasVisibles(cajas, circulos, bloqueos)
        lista.forEach((e, i) => {
          e.elemento.style.visibility = visibles[i] ? 'visible' : 'hidden'
        })

        // Coordenadas en los bordes del mapa: longitud arriba, latitud a la izquierda
        const centro = mapa.getCenter()
        // Paneles con 12 px de holgura: las coordenadas no quedan pegadas a ellos
        const sinPaneles = bloqueos
          .slice(0, -4)
          .map((b) => ({ left: b.left - 12, right: b.right + 12, top: b.top - 12, bottom: b.bottom + 12 }))
        const colocar = (el: HTMLElement, x: number, y: number) => {
          const ancho = el.offsetWidth || 28
          const caja = { left: x - ancho / 2, right: x + ancho / 2, top: y - 6, bottom: y + 6 }
          const dentro = caja.left > 2 && caja.right < w - 2 && caja.top > 2 && caja.bottom < h - 2
          const libre = dentro && !sinPaneles.some((b) => caja.left < b.right && b.left < caja.right && caja.top < b.bottom && b.top < caja.bottom)
          el.style.transform = `translate(${x - ancho / 2}px, ${y - 6}px)`
          el.style.visibility = libre ? 'visible' : 'hidden'
        }
        coordenadas.current.lon.forEach((el, i) => colocar(el, mapa.project([MERIDIANOS[i], centro.lat]).x, 10))
        coordenadas.current.lat.forEach((el, i) => colocar(el, 22, mapa.project([centro.lng, PARALELOS[i]]).y))
      })
    }
    // Spans de coordenadas (DOM propio, sin re-render de React al mover)
    const capaCoordenadas = document.createElement('div')
    capaCoordenadas.className = 'capa-coordenadas'
    capaCoordenadas.setAttribute('aria-hidden', 'true')
    const crear = (texto: string) => {
      const el = document.createElement('span')
      el.className = 'coordenada-mapa'
      el.textContent = texto
      capaCoordenadas.appendChild(el)
      return el
    }
    coordenadas.current = { lon: MERIDIANOS.map((l) => crear(formatoLon(l))), lat: PARALELOS.map((l) => crear(formatoLat(l))) }
    mapa.getContainer().appendChild(capaCoordenadas)

    mapa.on('move', recolocarEtiquetas)
    recolocar.current = recolocarEtiquetas

    const montarCapas = () => {
      if (mapa.getSource('areas')) return

      mapa.addImage('rayado', patronRayado(paleta), { pixelRatio: 2 })
      mapa.addSource('contexto', { type: 'geojson', data: vacio(), promoteId: 'codigo' })
      mapa.addSource('areas', { type: 'geojson', data: vacio(), promoteId: 'codigo' })
      mapa.addSource('burbujas', { type: 'geojson', data: vacio(), promoteId: 'codigo' })

      const sinVictimas: ExpressionSpecification = ['==', ['get', 'clase'], 0]
      // Pequeñas encima de las grandes
      const ordenRadio: ExpressionSpecification = ['-', 0, ['get', 'radio']]

      // -- Contexto (por debajo de todo lo de IDEG) ------------------------
      mapa.addSource('region', { type: 'geojson', data: contextoRegion as unknown as GeoJSON.FeatureCollection })
      mapa.addSource('reticula', { type: 'geojson', data: reticula() })
      // Guatemala (Natural Earth) es tierra de base bajo IDEG: sin costa propia y sin
      // los tramos de frontera junto a ella (ahí manda el límite de IDEG)
      mapa.addLayer({ id: 'region-tierra', type: 'fill', source: 'region', filter: filtroContexto('tierra'), paint: { 'fill-color': paleta.mapLand } })
      mapa.addLayer({ id: 'reticula', type: 'line', source: 'reticula', paint: { 'line-color': paleta.mapGrid, 'line-width': 0.6 } })
      mapa.addLayer({
        id: 'region-costa',
        type: 'line',
        source: 'region',
        filter: filtroContexto('costa'),
        paint: { 'line-color': paleta.mapCoast, 'line-width': 0.7 },
      })
      mapa.addLayer({
        id: 'region-fronteras',
        type: 'line',
        source: 'region',
        filter: filtroContexto('frontera'),
        paint: { 'line-color': paleta.mapBorder, 'line-width': 0.9, 'line-dasharray': [3, 2.5] },
      })

      // -- Detalle 1:10m alrededor de Guatemala, en diferido al acercar ---
      let detalleCargado = false
      const cargarDetalle = () => {
        if (detalleCargado || mapa.getZoom() < ZOOM_DETALLE) return
        detalleCargado = true
        import('../../data/contexto-detalle.json')
          .then(({ default: detalle }) => {
            if (!mapa.getStyle()) return
            mapa.addSource('detalle', { type: 'geojson', data: detalle as unknown as GeoJSON.FeatureCollection })
            mapa.addLayer({ id: 'detalle-tierra', type: 'fill', source: 'detalle', filter: filtroContexto('tierra'), paint: { 'fill-color': paleta.mapLand } }, 'reticula')
            mapa.addLayer({ id: 'detalle-costa', type: 'line', source: 'detalle', filter: filtroContexto('costa'), paint: { 'line-color': paleta.mapCoast, 'line-width': 0.7 } }, 'region-fronteras')
            mapa.addLayer({
              id: 'detalle-fronteras',
              type: 'line',
              source: 'detalle',
              filter: filtroContexto('frontera'),
              paint: { 'line-color': paleta.mapBorder, 'line-width': 0.9, 'line-dasharray': [3, 2.5] },
            }, 'areas-relleno')
            // El 1:50m de esa zona deja paso al 1:10m
            for (const [capa, tipo] of [['region-tierra', 'tierra'], ['region-costa', 'costa'], ['region-fronteras', 'frontera']] as const) {
              mapa.setFilter(capa, ['all', filtroContexto(tipo), ['!=', ['get', 'detalle'], true]])
            }
          })
          .catch((error) => {
            detalleCargado = false
            console.error(error)
          })
      }
      mapa.on('zoomend', cargarDetalle)
      cargarDetalle()

      mapa.addLayer({ id: 'areas-relleno', type: 'fill', source: 'areas', paint: { 'fill-color': paleta.text, 'fill-opacity': 0.05 } })
      mapa.addLayer({
        id: 'areas-sin-victimas',
        type: 'fill',
        source: 'areas',
        filter: sinVictimas,
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
          'fill-extrusion-color': ['case', sinVictimas, paleta.mapNull, ['get', 'color']],
          'fill-extrusion-height': ['get', 'altura'],
          'fill-extrusion-opacity': 0.9,
        },
      })
      mapa.addLayer({
        id: 'areas-hover',
        type: 'line',
        source: 'areas',
        paint: { 'line-color': paleta.mapHover, 'line-width': ['case', HOVER, 1.6, 0] },
      })
      // Halo: círculo mayor, mismo color, difuminado (estilo "punto de luz")
      mapa.addLayer({
        id: 'burbujas-halo',
        type: 'circle',
        source: 'burbujas',
        filter: ['>', ['get', 'clase'], 0],
        layout: { 'circle-sort-key': ordenRadio },
        paint: { 'circle-color': ['get', 'color'], 'circle-blur': 0.8 },
      })
      // Opacidad 1: el color de la letalidad no se mezcla con lo que hay debajo
      const pinturaBurbuja = {
        'circle-radius': ['case', sinVictimas, 2.5, ['get', 'radio']] as ExpressionSpecification,
        'circle-color': ['case', sinVictimas, paleta.mapNullDot, ['get', 'color']] as ExpressionSpecification,
        'circle-opacity': 1,
      }
      mapa.addLayer({
        id: 'burbujas',
        type: 'circle',
        source: 'burbujas',
        layout: { 'circle-sort-key': ordenRadio },
        paint: { ...pinturaBurbuja, 'circle-stroke-color': paleta.mapBubbleStroke },
      })
      // La burbuja bajo el cursor se vuelve a dibujar encima de todas, aunque sea
      // pequeña o quede debajo de otra, con un contorno fino
      mapa.addLayer({
        id: 'burbujas-frente',
        type: 'circle',
        source: 'burbujas',
        filter: ['==', ['get', 'codigo'], -1],
        paint: {
          ...pinturaBurbuja,
          'circle-stroke-color': paleta.mapHover,
          'circle-stroke-width': BORDE_FRENTE,
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
        mapa.setFilter('burbujas-frente', ['==', ['get', 'codigo'], id ?? -1])
        hoverId = id
      }

      marcarHoverRef.current = marcarHover

      const featureEn = (e: MapMouseEvent) => {
        const capasActivas = CAPAS_INTERACTIVAS[actual.current.vista].filter((c) => mapa.getLayer(c))
        return mapa.queryRenderedFeatures(e.point, { layers: capasActivas })[0]
      }

      // Táctil: sin hover, el toque abre una ficha fija en lugar de bajar de nivel.
      // pointerdown llega antes que los eventos de ratón que el navegador emula.
      let tactil = false
      mapa.getCanvas().addEventListener('pointerdown', (e) => {
        tactil = e.pointerType === 'touch'
      })

      // Bajar un nivel: departamento -> sus municipios; municipio -> filtrarlo
      const bajarNivel = (codigo: number) => {
        const { nivel: nivelActual, vista: vistaActual, setFiltro: aplicar, reducido: sinMovimiento, capas: datos } = actual.current
        const area = datos?.areas.features.find((f) => f.properties?.codigo === codigo)
        const caja = area ? cajaEnvolvente({ features: [area] }) : null

        const esDepto = nivelActual === 'depto'
        const depto = esDepto ? codigo : Math.floor(codigo / 100)
        ultimoEncuadre.current = claveEncuadreDe('municipio', depto, esDepto ? undefined : codigo, vistaActual)

        if (caja) {
          objetivo.current = caja
          mapa.fitBounds(caja as LngLatBoundsLike, {
            padding: margenesEncuadre(elemento),
            maxZoom: 11,
            duration: sinMovimiento ? 0 : 900,
            pitch: vistaActual === '3d' ? PITCH_3D : 0,
          })
        }

        marcarHover(null)
        setHover(null)
        setFicha(null)
        aplicar(esDepto ? 'depto' : 'municipio', codigo)
      }
      bajarNivelRef.current = bajarNivel

      mapa.on('mousemove', (e) => {
        if (tactil) return
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
        const valido = feature !== undefined && Number.isFinite(codigo)

        if (tactil) {
          // Mapa vacío: cierra la ficha; otra burbuja o área: la reemplaza
          setHover(null)
          if (!valido) {
            marcarHover(null)
            setFicha(null)
            return
          }
          marcarHover(codigo)
          setFicha({ props: feature.properties as PropiedadesMapa, capas: actual.current.capas })
          // Que la ficha (abajo) no tape lo tocado: si quedó debajo, se sube
          const libreHasta = elemento.clientHeight - ALTO_ZONA_FICHA
          if (e.point.y > libreHasta) {
            mapa.panBy([0, e.point.y - libreHasta], { duration: actual.current.reducido ? 0 : 300 })
          }
          return
        }

        if (valido) bajarNivel(codigo)
      })

      setListo(true)
    }

    // Sin fuentes externas 'load' siempre llega; si el estilo ya cargó, se monta ya
    if (mapa.isStyleLoaded()) montarCapas()
    else mapa.once('load', montarCapas)

    // -- Re-encuadre si cambia el tamaño de la ventana o de un panel -------
    // Solo si cambian los márgenes (p. ej. cambiar de pestaña no mueve el mapa)
    let espera = 0
    let ultimos = ''
    const reencuadrar = () => {
      clearTimeout(espera)
      espera = window.setTimeout(() => {
        mapa.resize()
        const margenes = margenesEncuadre(elemento)
        const firma = [margenes.top, margenes.right, margenes.bottom, margenes.left, elemento.clientWidth, elemento.clientHeight]
          .map((v) => Math.round(v / 4))
          .join('|')
        if (firma === ultimos) return
        ultimos = firma
        mapa.fitBounds(objetivo.current, {
          padding: margenes,
          maxZoom: 11,
          duration: actual.current.reducido ? 0 : 300,
          pitch: actual.current.vista === '3d' ? PITCH_3D : 0,
        })
      }, 150)
    }
    const raiz = elemento.closest('[data-mapa-raiz]') ?? elemento
    const observador = new ResizeObserver(reencuadrar)
    observador.observe(elemento)
    raiz.querySelectorAll('[data-obstaculo]').forEach((el) => observador.observe(el))

    return () => {
      observador.disconnect()
      clearTimeout(espera)
      cancelAnimationFrame(cuadro)
      for (const m of marcadores.current) m.remove()
      marcadores.current = []
      etiquetas.current = []
      mapa.remove()
      mapaRef.current = null
    }
    // El mapa se crea una vez; al cambiar de tema, Panel lo vuelve a montar.
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

    const visible = (capa: string, si: boolean) => mapa.setLayoutProperty(capa, 'visibility', si ? 'visible' : 'none')

    visible('burbujas', vista === 'burbujas')
    visible('burbujas-frente', vista === 'burbujas')
    visible('areas-relleno', vista !== '3d')
    visible('areas-sin-victimas', vista === 'areas')
    visible('areas-3d', vista === '3d')
    visible('areas-hover', vista !== '3d')

    if (vista === 'areas') {
      mapa.setFilter('areas-relleno', ['>', ['get', 'clase'], 0])
      mapa.setPaintProperty('areas-relleno', 'fill-color', ['get', 'color'])
      mapa.setPaintProperty('areas-relleno', 'fill-opacity', ['case', HOVER, 0.6, 0.42])
    } else {
      // Relleno casi invisible que solo se ilumina al pasar el cursor
      mapa.setFilter('areas-relleno', null)
      mapa.setPaintProperty('areas-relleno', 'fill-color', paleta.text)
      mapa.setPaintProperty('areas-relleno', 'fill-opacity', ['case', HOVER, 0.14, 0.05])
    }

    mapa.easeTo({ pitch: vista === '3d' ? PITCH_3D : 0, duration: reducido ? 0 : 700 })
  }, [listo, vista, paleta, reducido])

  // -- Estilo suave de las burbujas ("Brillo"), solo en la vista burbujas --
  useEffect(() => {
    const mapa = mapaRef.current
    if (!listo || !mapa) return

    const activo = vista === 'burbujas' && brillo
    const movil = esPantallaPequena()
    // En tema claro el halo oscuro ensucia el fondo: más tenue, sin difuminar
    // la burbuja y con borde nítido (las clases claras se apoyan en él)
    const claro = paleta === palette.light
    const intenso: ExpressionSpecification = ['==', ['get', 'intenso'], true]

    mapa.setLayoutProperty('burbujas-halo', 'visibility', activo ? 'visible' : 'none')
    // Halo sutil: apenas sobresale de la burbuja y no tiñe a las vecinas; en
    // móvil, aún más corto (menos píxeles difuminados que dibujar)
    mapa.setPaintProperty('burbujas-halo', 'circle-radius', [
      '*',
      ['get', 'radio'],
      ['case', intenso, movil ? 1.3 : 1.5, movil ? 1.15 : 1.3],
    ])
    mapa.setPaintProperty('burbujas-halo', 'circle-opacity', claro ? ['case', intenso, 0.12, 0.06] : ['case', intenso, 0.22, 0.12])

    // Bordes nítidos (sin difuminar la burbuja) y un contorno fino y
    // semitransparente que separa las burbujas que se tocan; en tema claro un
    // poco más opaco, porque las clases claras se apoyan en él
    mapa.setPaintProperty('burbujas', 'circle-blur', 0)
    mapa.setPaintProperty('burbujas', 'circle-stroke-width', ['case', ['==', ['get', 'clase'], 0], 0, 0.75])
    mapa.setPaintProperty('burbujas', 'circle-stroke-opacity', claro ? 0.85 : 0.6)
  }, [listo, vista, brillo, paleta])

  // -- Encuadre automático (filtros, "volver", enlaces compartidos) --------
  const claveEncuadre = claveEncuadreDe(nivel, filtros.depto, filtros.municipio, vista)

  useEffect(() => {
    const mapa = mapaRef.current
    const elemento = contenedor.current
    if (!listo || !mapa || !elemento || !data || data.nivel !== nivel || isFetching) return
    if (ultimoEncuadre.current === claveEncuadre) return
    ultimoEncuadre.current = claveEncuadre

    const nacional = filtros.depto === undefined && filtros.municipio === undefined
    const caja = nacional ? GUATEMALA : cajaEnvolvente(data)
    if (!caja) return
    objetivo.current = caja

    mapa.fitBounds(caja, {
      padding: margenesEncuadre(elemento),
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
    etiquetas.current = []
    if (vista === '3d') return

    const nuevo = (lngLat: [number, number], elemento: HTMLElement, desplazamientoY = 0) => {
      const marcador = new Marker({ element: elemento, offset: [0, desplazamientoY] }).setLngLat(lngLat).addTo(mapa)
      marcadores.current.push(marcador)
      return marcador
    }

    // Burbuja de cada departamento (solo a nivel nacional en vista burbujas)
    const indice = new Map<number, number>()
    if (vista === 'burbujas' && nivel === 'depto' && capas) {
      capas.burbujas.features.forEach((b, i) => indice.set(b.properties!.codigo, i))
    }

    // Nombres de departamento, pequeños y apagados (menos el seleccionado);
    // por víctimas de mayor a menor: los grandes tienen prioridad al chocar
    const departamentos = [...(contexto?.features ?? [])]
      .filter((f) => f.properties.codigo !== filtros.depto)
      .sort((a, b) => b.properties.total - a.properties.total)

    for (const f of departamentos) {
      const punto = centroide(f.geometry)
      if (!punto) continue
      const i = indice.get(f.properties.codigo) ?? -1
      const radio = i >= 0 ? capas!.burbujas.features[i].properties!.radio : 0
      const el = document.createElement('span')
      el.className = 'etiqueta-mapa'
      el.textContent = f.properties.nombre
      const marcador = nuevo(punto, el, -(radio + SEPARACION_ETIQUETA))
      etiquetas.current.push({ marcador, elemento: el, lngLat: punto, burbuja: i, radio })
    }

    // Países vecinos y mares (menor prioridad que los departamentos)
    for (const { texto, lngLat } of ETIQUETAS_CONTEXTO) {
      const el = document.createElement('span')
      el.className = 'etiqueta-contexto'
      el.textContent = texto
      const marcador = nuevo(lngLat, el)
      etiquetas.current.push({ marcador, elemento: el, lngLat, burbuja: -1, radio: -SEPARACION_ETIQUETA })
    }

    recolocar.current()
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
      {ficha && ficha.capas === capas && (
        <FichaSeleccion
          props={ficha.props}
          nivel={nivel}
          onCerrar={cerrarFicha}
          onBajarNivel={() => bajarNivelRef.current(ficha.props.codigo)}
        />
      )}

      {(isPending || (isFetching && !clasificacion)) && (
        <p className="flotante etiqueta absolute top-28 left-1/2 -translate-x-1/2 px-3 py-1.5" role="status">
          Cargando mapa…
        </p>
      )}

      {isError && (
        <div className="absolute top-28 left-1/2 w-72 -translate-x-1/2">
          <ErrorCarga mensaje="No se pudo cargar el mapa." onReintentar={refetch} />
        </div>
      )}
    </div>
  )
}
