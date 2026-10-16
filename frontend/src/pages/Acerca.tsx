import { EsquemaFlujo, EtiquetaSeccion, ListaRecuadro, SeccionEditorial } from '../components/ui/Editorial'
import { useTituloPagina } from '../hooks/useTituloPagina'
import { REPOSITORIO } from '../proyecto'

// Cifras de la base migrada (INE 2018–2024, verificadas contra la API) y de la
// Tabla I del paper (modelo v1, conjunto de prueba).
const DATOS = [
  { cifra: '52,488', etiqueta: 'Hechos' },
  { cifra: '71,942', etiqueta: 'Víctimas' },
  { cifra: '13,741', etiqueta: 'Fallecidos' },
  { cifra: '58,201', etiqueta: 'Lesionados' },
]

const METRICAS = [
  {
    nombre: 'Accuracy',
    valor: '0.6949',
    explicacion: 'Proporción de víctimas de prueba clasificadas correctamente: cerca de 7 de cada 10.',
  },
  {
    nombre: 'F1 ponderado',
    valor: '0.7233',
    explicacion: 'Equilibrio entre precisión y recall de ambas clases, pesado por cuántas víctimas tiene cada una.',
  },
  {
    nombre: 'ROC-AUC',
    valor: '0.7336',
    explicacion: 'Qué tan bien ordena el riesgo: 0.5 sería azar y 1, separar perfectamente fallecidos de lesionados.',
  },
  {
    nombre: 'Recall de fallecidos',
    valor: '0.6245',
    explicacion: 'De cada 100 víctimas que fallecieron, el modelo identifica a unas 62.',
  },
  {
    nombre: 'Precisión de fallecidos',
    valor: '0.3382',
    explicacion: 'De cada 100 alertas «Fallecido», unas 34 son correctas: 1 de cada 3.',
  },
]

export function Acerca() {
  useTituloPagina(
    'Acerca de',
    'Qué es el proyecto, de dónde salen los datos (INE 2018–2024), cómo funciona el modelo Random Forest y cómo usarlo con responsabilidad.',
  )

  return (
    <article className="mx-auto w-full max-w-[780px] px-4 py-14 sm:py-20">
      <header className="flex flex-col gap-4 pb-12">
        <EtiquetaSeccion as="p">Acerca del proyecto</EtiquetaSeccion>
        <h1 className="text-4xl font-semibold tracking-tight text-tinta sm:text-5xl">
          Un mapa de severidad vial, abierto y explicable.
        </h1>
        <p className="text-lg leading-relaxed text-tenue">
          Un sistema web que analiza los hechos de tránsito de Guatemala registrados por el INE entre 2018 y 2024 y
          estima la severidad para cada víctima —fallecido o lesionado— con un modelo de aprendizaje automático,
          mostrando por qué llega a cada estimación.
        </p>
      </header>

      <SeccionEditorial etiqueta="De dónde salen los datos" titulo="Microdatos oficiales del INE, 2018–2024.">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-borde bg-borde sm:grid-cols-4">
          {DATOS.map((d) => (
            <div key={d.etiqueta} className="flex flex-col-reverse gap-1 bg-panel px-4 py-3">
              <dt className="etiqueta">{d.etiqueta}</dt>
              <dd className="cifra text-2xl text-tinta">{d.cifra}</dd>
            </div>
          ))}
        </dl>
        <p className="leading-relaxed text-tenue">
          El INE publica por separado los archivos de hechos, de víctimas y de vehículos, y no comparten una clave
          común. Por eso las estadísticas de víctimas usan los datos del hecho que trae el propio registro de cada
          víctima, sin cruzarlos con el archivo de hechos.
        </p>
        <p className="leading-relaxed text-tenue">
          Límites territoriales: IDEG. Contexto geográfico de los países vecinos: Natural Earth (dominio público).
        </p>
      </SeccionEditorial>

      <SeccionEditorial etiqueta="Cómo funciona" titulo="De los microdatos al mapa y al simulador.">
        <EsquemaFlujo
          etiqueta="Flujo del sistema"
          pasos={['Microdatos INE', 'Limpieza', 'Entrenamiento', 'API', 'Mapa y simulador']}
        />
        <p className="leading-relaxed text-tenue">
          Los datos limpios se guardan en PostgreSQL con PostGIS; una API en FastAPI sirve las estadísticas, la
          geometría y las predicciones, y esta aplicación las presenta.
        </p>
      </SeccionEditorial>

      <SeccionEditorial etiqueta="El modelo" titulo="Random Forest, explicado con SHAP.">
        <p className="leading-relaxed text-tenue">
          Clasifica a cada víctima como fallecida o lesionada a partir de 8 variables del hecho y de la persona. Para
          cada estimación, SHAP indica cuánto empujó cada variable hacia una u otra clase.
        </p>
        <div className="overflow-x-auto rounded-sm border border-borde bg-panel">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="etiqueta border-b border-borde px-4 py-2.5 text-left">
              Tabla I · Desempeño en el conjunto de prueba
            </caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Métrica</th>
                <th scope="col">Valor</th>
                <th scope="col">Qué significa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {METRICAS.map((m) => (
                <tr key={m.nombre} className="align-baseline">
                  <th scope="row" className="py-3 pr-3 pl-4 font-medium text-tinta sm:whitespace-nowrap">
                    {m.nombre}
                    {/* En móvil la explicación va bajo el nombre (la columna sería muy angosta) */}
                    <span className="mt-1 block font-normal text-tenue sm:hidden">{m.explicacion}</span>
                  </th>
                  <td className="cifra py-3 pr-4 text-tinta">{m.valor}</td>
                  <td className="hidden py-3 pr-4 text-tenue sm:table-cell">{m.explicacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SeccionEditorial>

      <SeccionEditorial etiqueta="Uso responsable">
        <ListaRecuadro
          etiqueta="Uso responsable"
          items={[
            <>
              Clasifica la severidad <strong>dado que el hecho ya ocurrió</strong>; no predice accidentes.
            </>,
            <>
              Con una precisión de fallecidos de <span className="cifra">0.34</span>, solo{' '}
              <strong>1 de cada 3 alertas «Fallecido» es real</strong>.
            </>,
            <>Es apoyo a la decisión; no sustituye el criterio de las autoridades.</>,
            <>
              Usa datos agregados y anonimizados del INE, sin ubicaciones exactas ni datos personales.
            </>,
            <>El mapa llega hasta el nivel municipal.</>,
          ]}
        />
      </SeccionEditorial>

      {/* Pie solo con el enlace al repositorio, si está definido */}
      {REPOSITORIO && (
        <footer className="border-t border-borde pt-10 text-sm text-tenue">
          <a href={REPOSITORIO} className="text-tinta underline decoration-acento underline-offset-4">
            Repositorio del proyecto
          </a>
        </footer>
      )}
    </article>
  )
}
