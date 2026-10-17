import { useCallback, useState, type ReactNode } from 'react'

import { useCatalogos, useResumen } from '../api/queries'
import { Lightbox, type FiguraAmpliable } from '../components/acerca/Lightbox'
import { useAparecer } from '../components/acerca/useAparecer'
import { EtiquetaSeccion } from '../components/ui/Editorial'
import { Skeleton } from '../components/ui/Estados'
import { useTituloPagina } from '../hooks/useTituloPagina'
import { REPOSITORIO } from '../proyecto'
import { formatoEntero } from '../utils/formato'

// Datos del modelo v1 (verificados contra random_forest.pkl y test.parquet) y
// Tabla I del paper. Las cifras de víctimas, hechos, años y departamentos se
// leen de la API.
const ARBOLES = 200
const PRUEBA = { victimas: 14_389, porcentaje: 20 }
const VARIABLES = [
  'Tipo de evento',
  'Tipo de vehículo',
  'Departamento',
  'Jornada',
  'Día de la semana',
  'Sexo',
  'Grupo de edad',
  'Mayor o menor de edad',
]

const METRICAS = [
  { nombre: 'Accuracy', valor: 0.6949, explicacion: 'Víctimas de prueba clasificadas correctamente: cerca de 7 de cada 10.' },
  { nombre: 'F1 ponderado', valor: 0.7233, explicacion: 'Equilibrio entre precisión y recall de ambas clases, pesado por su tamaño.' },
  { nombre: 'ROC-AUC', valor: 0.7336, explicacion: 'Qué tan bien ordena el riesgo: 0.5 sería azar y 1, separar sin error.' },
  { nombre: 'Recall de fallecidos', valor: 0.6245, explicacion: 'De cada 100 víctimas que fallecieron, identifica a unas 62.' },
  { nombre: 'Precisión de fallecidos', valor: 0.3382, explicacion: 'De cada 100 alertas «Fallecido», unas 34 son correctas: 1 de cada 3.' },
]

const FLUJO = [
  { paso: 'Microdatos INE', detalle: 'Hechos, víctimas y vehículos, 2018–2024' },
  { paso: 'Limpieza', detalle: 'Códigos corregidos y catálogos' },
  { paso: 'Entrenamiento', detalle: 'Random Forest y SHAP' },
  { paso: 'API', detalle: 'FastAPI sobre PostgreSQL/PostGIS' },
  { paso: 'Mapa y simulador', detalle: 'Esta aplicación' },
]

// Figuras del paper (fondo blanco): se muestran en un marco claro, sin alterar
const FIGURAS: FiguraAmpliable[] = [
  {
    src: '/figuras/shap-resumen.png',
    ancho: 2369,
    alto: 1469,
    titulo: 'Qué variables pesan más',
    alt: 'Barras horizontales del valor SHAP medio por variable: tipo de evento, departamento y sexo encabezan; día de la semana y mayor o menor de edad son las de menor impacto.',
    pie: 'Valor SHAP medio por variable. El tipo de evento es la que más pesa (≈0.08), seguido del departamento y el sexo.',
  },
  {
    src: '/figuras/shap-abejas.png',
    ancho: 2319,
    alto: 1375,
    titulo: 'Cómo empuja cada variable',
    alt: 'Gráfico de enjambre: por cada variable, puntos de colores entre azul y rojo a la izquierda y a la derecha de una línea central en cero.',
    pie: 'Cada punto es una víctima: a la derecha empuja hacia fallecido y a la izquierda hacia lesionado. El color es el código de la variable (azul bajo, rojo alto).',
  },
  {
    src: '/figuras/shap-cascada.png',
    ancho: 1294,
    alto: 799,
    titulo: 'Una predicción, paso a paso',
    alt: 'Gráfico de cascada de una predicción: parte de 0.5, barras rojas suman y una barra azul resta, hasta llegar a 0.719.',
    pie: 'Una sola víctima: del valor medio 0.5 a 0.719. Departamento 17 (Petén) y atropello suman 0.11 cada uno; bicicleta resta 0.11.',
  },
  {
    src: '/figuras/arbol-decision.png',
    ancho: 2960,
    alto: 1184,
    titulo: 'Un árbol del bosque (ilustrativo)',
    alt: 'Diagrama de un árbol de decisión truncado a profundidad 3: la primera división es por grupo de edad y luego por sexo, departamento, tipo de vehículo, jornada y tipo de evento.',
    pie: `Uno de los ${ARBOLES} árboles, cortado a profundidad 3. La predicción promedia todos los árboles: uno solo no explica el modelo.`,
  },
]

// -- Íconos simples (trazo, currentColor) -------------------------------------
const ICONOS = {
  reloj: <path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  diana: <path d="M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 11a1 1 0 1 0 1 1M21 3l-8 8" />,
  balanza: <path d="M12 4v16M7 20h10M5 8h14M5 8l-2.5 6a3 3 0 0 0 5 0L5 8Zm14 0-2.5 6a3 3 0 0 0 5 0L19 8Z" />,
  candado: <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" />,
  mapa: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14" />,
} satisfies Record<string, ReactNode>

function Icono({ nombre }: { nombre: keyof typeof ICONOS }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 text-acento"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONOS[nombre]}
    </svg>
  )
}

const USO_RESPONSABLE: { icono: keyof typeof ICONOS; texto: ReactNode }[] = [
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

// -- Piezas de la página ------------------------------------------------------

/** Bloque numerado: etiqueta mono "01 — DATOS", línea fina y entrada suave. */
function Bloque({ numero, etiqueta, titulo, children }: { numero: string; etiqueta: string; titulo: string; children: ReactNode }) {
  const { ref, clase } = useAparecer<HTMLElement>()
  const id = `bloque-${numero}`
  return (
    <section ref={ref} aria-labelledby={id} className={`border-t border-borde py-14 sm:py-20 ${clase}`}>
      <p className="etiqueta flex items-center gap-3">
        <span className="cifra text-acento">{numero}</span>
        <span aria-hidden="true" className="h-px w-8 bg-borde-fuerte" />
        <span>{etiqueta}</span>
      </p>
      <h2 id={id} className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-tinta sm:text-4xl">
        {titulo}
      </h2>
      <div className="mt-8 flex flex-col gap-8">{children}</div>
    </section>
  )
}

function Tarjeta({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-borde bg-panel p-5">
      <p className="etiqueta">{etiqueta}</p>
      {children}
    </div>
  )
}

/** Burbujas decorativas del hero, con la escala de color del mapa. */
function Burbujas() {
  const puntos = [
    { x: 250, y: 90, r: 58, c: 5 },
    { x: 150, y: 170, r: 36, c: 4 },
    { x: 290, y: 220, r: 26, c: 3 },
    { x: 80, y: 80, r: 18, c: 2 },
    { x: 205, y: 270, r: 12, c: 1 },
    { x: 60, y: 230, r: 9, c: 3 },
  ]
  return (
    // viewBox con margen: ningún halo se corta. Tenues detrás del título en
    // móvil y tablet; plenas solo en escritorio, a la derecha del título.
    <svg
      aria-hidden="true"
      viewBox="-20 -50 390 390"
      className="pointer-events-none absolute top-2 right-0 h-44 w-auto opacity-25 lg:top-4 lg:h-80 lg:opacity-80"
    >
      {puntos.map((p) => (
        <g key={`${p.x}-${p.y}`}>
          <circle cx={p.x} cy={p.y} r={p.r * 1.9} fill={`var(--c-map-scale-${p.c})`} opacity="0.08" />
          <circle cx={p.x} cy={p.y} r={p.r * 1.4} fill="none" stroke={`var(--c-map-scale-${p.c})`} strokeOpacity="0.3" />
          <circle cx={p.x} cy={p.y} r={p.r} fill={`var(--c-map-scale-${p.c})`} opacity="0.85" />
        </g>
      ))}
    </svg>
  )
}

/** Cifras clave del hero, leídas de la API (/api/resumen y /api/catalogos). */
function CifrasClave() {
  const resumen = useResumen({})
  const catalogos = useCatalogos()
  const anios = catalogos.data?.anio.map((a) => a.id) ?? []
  const rango = anios.length ? `${Math.min(...anios)}–${Math.max(...anios)}` : ''

  const cifras = [
    { etiqueta: 'Víctimas', valor: resumen.data ? formatoEntero(resumen.data.victimas) : undefined, nota: 'fallecidas o lesionadas' },
    { etiqueta: 'Hechos', valor: resumen.data?.hechos != null ? formatoEntero(resumen.data.hechos) : undefined, nota: 'de tránsito registrados' },
    { etiqueta: 'Años', valor: catalogos.data ? String(anios.length) : undefined, nota: rango },
    { etiqueta: 'Departamentos', valor: catalogos.data ? String(catalogos.data.depto.length) : undefined, nota: 'de Guatemala' },
  ]
  const fallo = resumen.isError || catalogos.isError

  return (
    <div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-borde bg-borde lg:grid-cols-4">
        {cifras.map((c) => (
          <div key={c.etiqueta} className="flex flex-col-reverse gap-1 bg-panel px-4 py-4 sm:px-5">
            <dt className="etiqueta">
              {c.etiqueta}
              {c.nota && <span className="block text-[10px] tracking-normal normal-case">{c.nota}</span>}
            </dt>
            <dd className="cifra text-2xl text-tinta sm:text-3xl">
              {c.valor ?? (fallo ? '—' : <Skeleton className="h-8 w-24" etiqueta={`Cargando ${c.etiqueta.toLowerCase()}…`} />)}
            </dd>
          </div>
        ))}
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

/** Diagrama de flujo: pasos numerados con conectores; en móvil se apila. */
function Flujo() {
  return (
    <ol aria-label="Flujo del sistema" className="grid gap-4 sm:grid-cols-5 sm:gap-3">
      {FLUJO.map((f, i) => (
        <li key={f.paso} className="relative flex flex-col gap-1.5 rounded-md border border-borde bg-panel p-4">
          <span className="cifra text-xs text-acento">{String(i + 1).padStart(2, '0')}</span>
          <span className="font-mono text-sm text-tinta">{f.paso}</span>
          <span className="text-xs leading-snug text-tenue">{f.detalle}</span>
          {i < FLUJO.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute -bottom-[0.95rem] left-6 font-mono text-xs text-tenue sm:top-1/2 sm:-right-[0.6rem] sm:bottom-auto sm:left-auto sm:-translate-y-1/2"
            >
              <span className="sm:hidden">↓</span>
              <span className="hidden sm:inline">→</span>
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}

/** Tabla I: tarjetas con barra proporcional (visual) + tabla accesible. */
function TablaI() {
  return (
    <div>
      <ul aria-hidden="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {METRICAS.map((m) => (
          <li key={m.nombre} className="flex flex-col gap-2 rounded-md border border-borde bg-panel p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="etiqueta">{m.nombre}</span>
              <span className="cifra text-2xl text-tinta">{m.valor.toFixed(4)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-panel-2">
              <div className="h-full rounded-full bg-acento" style={{ width: `${m.valor * 100}%` }} />
            </div>
            <p className="text-xs leading-snug text-tenue">{m.explicacion}</p>
          </li>
        ))}
      </ul>
      {/* Un <table> no respeta el ancho de .sr-only: se recorta con un div */}
      <div className="sr-only">
        <table>
          <caption>Tabla I · Desempeño en el conjunto de prueba</caption>
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
                <td>{m.explicacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="etiqueta mt-3 text-[10px]">Tabla I · Desempeño en el conjunto de prueba · escala de 0 a 1</p>
    </div>
  )
}

/** Figuras SHAP en marco claro (su fondo es blanco) con clic para ampliar. */
function Figuras({ onAmpliar }: { onAmpliar: (f: FiguraAmpliable) => void }) {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      {FIGURAS.map((f) => (
        <figure key={f.src} className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onAmpliar(f)}
            aria-label={`Ampliar figura: ${f.titulo}`}
            className="group relative block overflow-hidden rounded-md border border-borde-fuerte bg-white p-2 transition-shadow duration-200 hover:shadow-lg"
          >
            <img src={f.src} alt={f.alt} width={f.ancho} height={f.alto} loading="lazy" decoding="async" className="h-auto w-full" />
            <span
              aria-hidden="true"
              className="etiqueta absolute right-2 bottom-2 rounded-sm bg-black/70 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              Ampliar ⤢
            </span>
          </button>
          <figcaption className="flex flex-col gap-1">
            <span className="font-mono text-sm text-tinta">{f.titulo}</span>
            <span className="text-sm leading-snug text-tenue">{f.pie}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

// -- Página -------------------------------------------------------------------

export function Acerca() {
  useTituloPagina(
    'Acerca de',
    'Qué es el proyecto, de dónde salen los datos (INE 2018–2024), cómo funciona el modelo Random Forest, qué explica SHAP y cómo usarlo con responsabilidad.',
  )
  const [ampliada, setAmpliada] = useState<FiguraAmpliable | null>(null)
  const cerrar = useCallback(() => setAmpliada(null), [])

  return (
    <article className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6">
      {/* Hero */}
      <header className="relative overflow-hidden py-14 sm:py-20">
        <Burbujas />
        <div className="relative max-w-2xl">
          <EtiquetaSeccion as="p">Acerca del proyecto</EtiquetaSeccion>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-tinta sm:text-6xl">
            Un mapa de severidad vial, abierto y explicable.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-tenue">
            Analiza los hechos de tránsito de Guatemala y estima, para cada víctima, si resultaría fallecida o
            lesionada, mostrando por qué.
          </p>
        </div>
        <div className="relative mt-10">
          <CifrasClave />
        </div>
      </header>

      <Bloque numero="01" etiqueta="Datos" titulo="Microdatos oficiales del INE.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Tarjeta etiqueta="Fuente">
            <p className="text-tinta">INE · microdatos de hechos de tránsito, 2018–2024.</p>
          </Tarjeta>
          <Tarjeta etiqueta="Archivos independientes">
            <p className="text-sm leading-relaxed text-tenue">
              Hechos, víctimas y vehículos no comparten una clave común: las estadísticas de víctimas usan los datos
              del hecho que trae el registro de cada víctima.
            </p>
          </Tarjeta>
          <Tarjeta etiqueta="Cartografía">
            <p className="text-sm leading-relaxed text-tenue">
              Límites territoriales: IDEG. Contexto de los países vecinos: Natural Earth (dominio público).
            </p>
          </Tarjeta>
        </div>
        <Flujo />
      </Bloque>

      <Bloque numero="02" etiqueta="Modelo" titulo="Random Forest, evaluado en datos que no vio.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tarjeta etiqueta="Algoritmo">
            <p className="cifra text-2xl text-tinta">{ARBOLES}</p>
            <p className="text-sm text-tenue">árboles de decisión (Random Forest)</p>
          </Tarjeta>
          <Tarjeta etiqueta="Clases">
            <p className="text-tinta">Fallecido / Lesionado</p>
            <p className="text-sm text-tenue">con pesos balanceados en el entrenamiento</p>
          </Tarjeta>
          <Tarjeta etiqueta="Partición de prueba">
            <p className="cifra text-2xl text-tinta">{formatoEntero(PRUEBA.victimas)}</p>
            <p className="text-sm text-tenue">víctimas ({PRUEBA.porcentaje} % de los datos)</p>
          </Tarjeta>
          <Tarjeta etiqueta={`Variables · ${VARIABLES.length}`}>
            <ul className="flex flex-wrap gap-1.5">
              {VARIABLES.map((v) => (
                <li key={v} className="rounded-sm border border-borde-fuerte px-1.5 py-0.5 text-xs text-tinta">
                  {v}
                </li>
              ))}
            </ul>
          </Tarjeta>
        </div>
        <TablaI />
      </Bloque>

      <Bloque numero="03" etiqueta="Explicabilidad" titulo="Qué pesó en cada estimación.">
        <p className="max-w-3xl leading-relaxed text-tenue">
          SHAP indica cuánto empujó cada variable hacia fallecido o hacia lesionado. Las figuras son las del paper
          (etiquetas en inglés) y describen asociaciones en los datos, no causas.
        </p>
        <Figuras onAmpliar={setAmpliada} />
      </Bloque>

      <Bloque numero="04" etiqueta="Uso responsable" titulo="Para qué sirve y para qué no.">
        <ul className="grid gap-3 sm:grid-cols-2">
          {USO_RESPONSABLE.map((u) => (
            <li key={u.icono} className="flex items-start gap-3 rounded-md border border-borde bg-panel p-4 text-tinta">
              <Icono nombre={u.icono} />
              <span className="leading-relaxed">{u.texto}</span>
            </li>
          ))}
        </ul>
      </Bloque>

      {REPOSITORIO && (
        <Bloque numero="05" etiqueta="Código" titulo="Código abierto.">
          <div className="flex flex-col items-start gap-4 rounded-md border border-borde bg-panel p-5 sm:flex-row sm:items-center sm:justify-between">
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
        </Bloque>
      )}

      <Lightbox figura={ampliada} onCerrar={cerrar} />
    </article>
  )
}
