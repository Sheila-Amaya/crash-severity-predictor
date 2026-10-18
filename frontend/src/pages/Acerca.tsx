import { useCallback, useId, useState, type ReactNode } from 'react'

import { useCatalogos, useResumen } from '../api/queries'
import { ARBOLES, FIGURAS, FLUJO, METRICAS, PRUEBA, SECCIONES, VARIABLES, type Figura } from '../components/acerca/contenido'
import { ComoLeer, DetalleFiguras, NotaSalida } from '../components/acerca/DetalleFiguras'
import { Figuras } from '../components/acerca/Figuras'
import { Icono, type NombreIcono } from '../components/acerca/Iconos'
import { Indice } from '../components/acerca/Indice'
import { Lightbox } from '../components/acerca/Lightbox'
import { useAparecer } from '../components/acerca/useAparecer'
import { useConteo } from '../components/acerca/useConteo'
import { useSeccionActiva } from '../components/acerca/useSeccionActiva'
import { Skeleton } from '../components/ui/Estados'
import { useTituloPagina } from '../hooks/useTituloPagina'
import { REPOSITORIO } from '../proyecto'
import { formatoEntero } from '../utils/formato'

// CAMBIAR AQUÍ el título del hero si se elige otro.
const TITULO_HERO = 'Dónde son más letales los accidentes viales en Guatemala'

const USO_RESPONSABLE: { icono: NombreIcono; texto: ReactNode }[] = [
  { icono: 'reloj', texto: <>Clasifica la severidad <strong>dado que el hecho ya ocurrió</strong>; no predice accidentes.</> },
  {
    icono: 'diana',
    texto: (
      <>
        Con una precisión de fallecidos de <span className="cifra">0.34</span>, solo{' '}
        <strong>1 de cada 3 alertas «Fallecido» es real</strong>.
      </>
    ),
  },
  { icono: 'balanza', texto: <>Es apoyo a la decisión; no sustituye el criterio de las autoridades.</> },
  { icono: 'candado', texto: <>Usa datos agregados y anonimizados del INE, sin ubicaciones exactas ni datos personales.</> },
  { icono: 'mapa', texto: <>El mapa llega hasta el nivel municipal.</> },
]

// -- Piezas ------------------------------------------------------------------

/** Sección con número grande en mono tenue, etiqueta y título; entrada suave. */
function Seccion({ id, numero, etiqueta, titulo, children }: { id: string; numero: string; etiqueta: string; titulo: string; children: ReactNode }) {
  const { ref, clase } = useAparecer<HTMLElement>()
  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={`titulo-${id}`}
      className={`scroll-mt-16 border-t border-borde py-16 first:border-t-0 first:pt-10 sm:py-24 lg:scroll-mt-8 ${clase}`}
    >
      <div className="flex items-end gap-4 sm:gap-6">
        <span aria-hidden="true" className="cifra text-6xl leading-[0.85] text-borde-fuerte sm:text-7xl">
          {numero}
        </span>
        <div className="min-w-0">
          <p className="etiqueta">{etiqueta}</p>
          <h2 id={`titulo-${id}`} className="mt-1.5 text-2xl font-semibold tracking-tight text-tinta sm:text-4xl">
            {titulo}
          </h2>
        </div>
      </div>
      <div className="mt-10 flex flex-col gap-10">{children}</div>
    </section>
  )
}

/** Tarjeta con borde degradado sutil (acento → borde) e ícono del set común. */
function Tarjeta({ icono, etiqueta, children }: { icono: NombreIcono; etiqueta: string; children: ReactNode }) {
  return (
    <div className="rounded-lg bg-linear-to-br from-acento/40 via-borde to-borde p-px">
      <div className="flex h-full flex-col gap-2 rounded-[calc(0.5rem-1px)] bg-panel p-5">
        <p className="etiqueta flex items-center gap-2">
          <span className="text-acento">
            <Icono nombre={icono} className="h-4 w-4" />
          </span>
          {etiqueta}
        </p>
        {children}
      </div>
    </div>
  )
}

/** Fondo del hero: resplandor y burbujas con el degradado de la escala del mapa. */
function FondoHero() {
  const id = useId()
  const burbujas = [
    { x: 250, y: 95, r: 62 },
    { x: 140, y: 175, r: 38 },
    { x: 300, y: 230, r: 26 },
    { x: 70, y: 80, r: 18 },
    { x: 215, y: 285, r: 13 },
    { x: 50, y: 245, r: 9 },
  ]
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div
        className="absolute inset-0 hidden lg:block"
        style={{
          background:
            // closest-side: se desvanece del todo antes de los bordes (sin cortes rectos)
            'radial-gradient(closest-side at 78% 40%, color-mix(in srgb, var(--c-map-scale-4) 18%, transparent), transparent)',
        }}
      />
      {/* Tenues detrás del título en móvil y tablet; plenas a la derecha en escritorio */}
      <svg viewBox="-20 -50 390 390" className="absolute top-4 right-0 h-48 w-auto opacity-30 lg:h-96 lg:opacity-90">
        <defs>
          <linearGradient id={`${id}-burbuja`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--c-map-scale-1)" />
            <stop offset="100%" stopColor="var(--c-map-scale-5)" />
          </linearGradient>
        </defs>
        {burbujas.map((b) => (
          <g key={`${b.x}-${b.y}`}>
            <circle cx={b.x} cy={b.y} r={b.r * 1.9} fill={`url(#${id}-burbuja)`} opacity="0.07" />
            <circle cx={b.x} cy={b.y} r={b.r * 1.4} fill="none" stroke={`url(#${id}-burbuja)`} strokeOpacity="0.35" />
            <circle cx={b.x} cy={b.y} r={b.r} fill={`url(#${id}-burbuja)`} opacity="0.9" />
          </g>
        ))}
      </svg>
    </div>
  )
}

/** Una cifra con conteo animado; el valor final queda siempre para lectores. */
function Cifra({ etiqueta, nota, valor, fallo }: { etiqueta: string; nota: string; valor: number | undefined; fallo: boolean }) {
  const animado = useConteo(valor)
  return (
    <div className="flex flex-col-reverse gap-1 bg-panel px-4 py-5 sm:px-5">
      <dt className="etiqueta">
        {etiqueta}
        {nota && <span className="block text-[10px] tracking-normal normal-case">{nota}</span>}
      </dt>
      <dd className="cifra text-3xl text-tinta sm:text-4xl">
        {valor !== undefined ? (
          <>
            <span aria-hidden="true">{formatoEntero(animado ?? valor)}</span>
            <span className="sr-only">{formatoEntero(valor)}</span>
          </>
        ) : fallo ? (
          '—'
        ) : (
          <Skeleton className="h-9 w-24" etiqueta={`Cargando ${etiqueta.toLowerCase()}…`} />
        )}
      </dd>
    </div>
  )
}

/** Cifras clave del hero, leídas de la API (/api/resumen y /api/catalogos). */
function CifrasClave() {
  const resumen = useResumen({})
  const catalogos = useCatalogos()
  const anios = catalogos.data?.anio.map((a) => a.id) ?? []
  const rango = anios.length ? `${Math.min(...anios)}–${Math.max(...anios)}` : ''
  const fallo = resumen.isError || catalogos.isError

  return (
    <div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-borde bg-borde lg:grid-cols-4">
        <Cifra etiqueta="Víctimas" nota="fallecidas o lesionadas" valor={resumen.data?.victimas} fallo={fallo} />
        <Cifra etiqueta="Hechos" nota="de tránsito registrados" valor={resumen.data?.hechos ?? undefined} fallo={fallo} />
        <Cifra etiqueta="Años" nota={rango} valor={catalogos.data ? anios.length : undefined} fallo={fallo} />
        <Cifra etiqueta="Departamentos" nota="de Guatemala" valor={catalogos.data?.depto.length} fallo={fallo} />
      </dl>
      {fallo && (
        <p role="status" className="mt-2 text-xs text-tenue">
          No se pudieron cargar las cifras de la API.{' '}
          <button
            type="button"
            onClick={() => {
              resumen.refetch()
              catalogos.refetch()
            }}
            className="text-tinta underline decoration-acento underline-offset-4"
          >
            Reintentar
          </button>
        </p>
      )}
    </div>
  )
}

/** Pipeline de datos: nodos unidos por una línea (horizontal; vertical en móvil). */
function Pipeline() {
  return (
    <ol aria-label="Flujo de datos" className="relative grid gap-6 sm:grid-cols-5 sm:gap-3">
      <span
        aria-hidden="true"
        className="absolute top-4 bottom-4 left-[15.5px] w-px bg-linear-to-b from-acento/70 to-borde-fuerte sm:top-[15.5px] sm:right-[10%] sm:bottom-auto sm:left-[10%] sm:h-px sm:w-auto sm:bg-linear-to-r"
      />
      {FLUJO.map((f, i) => (
        <li key={f.paso} className="relative flex items-start gap-4 sm:flex-col sm:items-center sm:gap-3 sm:text-center">
          <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-acento/70 bg-fondo text-acento">
            <Icono nombre={f.icono} className="h-4 w-4" />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="cifra text-[10px] text-tenue">{String(i + 1).padStart(2, '0')}</span>
            <span className="font-mono text-sm text-tinta">{f.paso}</span>
            <span className="text-xs leading-snug text-tenue">{f.detalle}</span>
          </div>
        </li>
      ))}
    </ol>
  )
}

/** Métricas del modelo: tarjetas con barra proporcional + tabla accesible. */
function Metricas() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-tinta">Métricas del modelo</h3>
        <p className="etiqueta mt-1 text-[10px]">
          Evaluación en datos de prueba · {formatoEntero(PRUEBA.registros)} registros · escala de 0 a 1
        </p>
      </div>
      <ul aria-hidden="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {METRICAS.map((m) => (
          <li key={m.nombre} className="flex flex-col gap-2.5 rounded-lg border border-borde bg-panel p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="etiqueta">{m.nombre}</span>
              <span className="cifra text-2xl text-tinta">{m.valor.toFixed(4)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-panel-2">
              <div className="h-full rounded-full bg-linear-to-r from-acento/60 to-acento" style={{ width: `${m.valor * 100}%` }} />
            </div>
            <p className="text-xs leading-snug text-tenue">{m.significado}</p>
          </li>
        ))}
      </ul>
      {/* Un <table> no respeta el ancho de .sr-only: se recorta con un div */}
      <div className="sr-only">
        <table>
          <caption>Métricas del modelo · evaluación en datos de prueba</caption>
          <thead>
            <tr>
              <th scope="col">Métrica</th>
              <th scope="col">Valor</th>
              <th scope="col">Qué significa</th>
            </tr>
          </thead>
          <tbody>
            {METRICAS.map((m) => (
              <tr key={m.nombre}>
                <th scope="row">{m.nombre}</th>
                <td>{m.valor.toFixed(4)}</td>
                <td>{m.significado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// -- Página ------------------------------------------------------------------

const IDS = SECCIONES.map((s) => s.id)

export function Acerca() {
  useTituloPagina(
    'Acerca de',
    'Mapa interactivo de víctimas de hechos de tránsito en Guatemala (INE 2018–2024): de dónde salen los datos, cómo se evaluó el modelo, qué muestra SHAP y cómo usarlo con responsabilidad.',
  )
  const [ampliada, setAmpliada] = useState<Figura | null>(null)
  const cerrar = useCallback(() => setAmpliada(null), [])
  const secciones = REPOSITORIO ? SECCIONES : SECCIONES.filter((s) => s.id !== 'codigo')
  const activa = useSeccionActiva(IDS)

  return (
    <article className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
      {/* Hero */}
      <header className="relative isolate overflow-hidden pt-14 pb-12 sm:pt-20 sm:pb-16">
        <FondoHero />
        <div className="relative max-w-2xl">
          <p className="etiqueta flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-10 bg-linear-to-r from-acento to-transparent" />
            Acerca del proyecto
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance text-tinta sm:text-6xl">{TITULO_HERO}</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-tenue">
            Un mapa interactivo de las víctimas de hechos de tránsito de 2018 a 2024, con datos abiertos del INE, y un
            modelo que estima la severidad de cada caso y muestra qué factores pesaron en esa estimación.
          </p>
        </div>
        <div className="relative mt-12">
          <CifrasClave />
        </div>
        <div aria-hidden="true" className="relative mt-12 h-px bg-linear-to-r from-acento/70 via-borde to-transparent" />
      </header>

      <div className="lg:grid lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-14">
        {/* sticky en el aside (móvil: su contenedor es toda la columna); en
            escritorio el aside es una columna alta y el nav se pega dentro */}
        <aside className="sticky top-0 z-10 lg:static lg:z-auto">
          <Indice secciones={secciones} activa={activa} />
        </aside>

        <div>
          <Seccion id="datos" numero="01" etiqueta="Datos" titulo="Microdatos oficiales del INE.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Tarjeta icono="datos" etiqueta="Fuente">
                <p className="text-tinta">INE (CC BY) · microdatos de hechos de tránsito, 2018–2024.</p>
              </Tarjeta>
              <Tarjeta icono="archivos" etiqueta="Archivos independientes">
                <p className="text-sm leading-relaxed text-tenue">
                  Hechos, víctimas y vehículos no comparten una clave común: las estadísticas de víctimas usan los
                  datos del hecho que trae el registro de cada víctima.
                </p>
              </Tarjeta>
              <Tarjeta icono="mapa" etiqueta="Cartografía">
                <p className="text-sm leading-relaxed text-tenue">
                  Límites territoriales: IDEG/SEGEPLAN. Contexto de los países vecinos: Natural Earth (dominio público).
                </p>
              </Tarjeta>
            </div>
            <Pipeline />
          </Seccion>

          <Seccion id="modelo" numero="02" etiqueta="Modelo" titulo="Random Forest, evaluado en datos que no vio.">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Tarjeta icono="arbol" etiqueta="Algoritmo">
                <p className="cifra text-2xl text-tinta">{ARBOLES}</p>
                <p className="text-sm text-tenue">árboles de decisión (Random Forest)</p>
              </Tarjeta>
              <Tarjeta icono="balanza" etiqueta="Clases">
                <p className="text-tinta">Fallecido / Lesionado</p>
                <p className="text-sm text-tenue">con pesos balanceados en el entrenamiento</p>
              </Tarjeta>
              <Tarjeta icono="matraz" etiqueta="Datos de prueba">
                <p className="cifra text-2xl text-tinta">{formatoEntero(PRUEBA.registros)}</p>
                <p className="text-sm text-tenue">registros ({PRUEBA.porcentaje} % de los datos)</p>
              </Tarjeta>
              <Tarjeta icono="lista" etiqueta={`Variables · ${VARIABLES.length}`}>
                <ul className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <li key={v} className="rounded-sm border border-borde-fuerte px-1.5 py-0.5 text-xs text-tinta">
                      {v}
                    </li>
                  ))}
                </ul>
              </Tarjeta>
            </div>
            <Metricas />
            <NotaSalida />
          </Seccion>

          <Seccion id="explicabilidad" numero="03" etiqueta="Explicabilidad" titulo="Qué pesó en cada estimación.">
            <ComoLeer />
            <Figuras figuras={FIGURAS} onAmpliar={setAmpliada} />
            <DetalleFiguras />
          </Seccion>

          <Seccion id="uso-responsable" numero="04" etiqueta="Uso responsable" titulo="Para qué sirve y para qué no.">
            <div className="rounded-lg border border-acento/45 bg-acento/[0.06] p-5 sm:p-8">
              <ul className="grid gap-5 sm:grid-cols-2">
                {USO_RESPONSABLE.map((u) => (
                  <li key={u.icono} className="flex items-start gap-3 text-tinta">
                    <span className="mt-0.5 text-acento">
                      <Icono nombre={u.icono} />
                    </span>
                    <span className="leading-relaxed">{u.texto}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Seccion>

          {REPOSITORIO && (
            <Seccion id="codigo" numero="05" etiqueta="Código" titulo="Código abierto.">
              <Tarjeta icono="codigo" etiqueta="Repositorio">
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-tenue">La API, el modelo y esta aplicación están publicados en GitHub.</p>
                  <a
                    href={REPOSITORIO}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-2 rounded-sm bg-boton px-4 py-2 text-sm font-semibold text-boton-texto transition-opacity hover:opacity-90"
                  >
                    Ver el repositorio en GitHub
                    <span aria-hidden="true">↗</span>
                    <span className="sr-only">(se abre en una pestaña nueva)</span>
                  </a>
                </div>
              </Tarjeta>
            </Seccion>
          )}
        </div>
      </div>

      <Lightbox figura={ampliada} onCerrar={cerrar} />
    </article>
  )
}
