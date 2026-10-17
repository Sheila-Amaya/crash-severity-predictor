import { useResumen } from '../../api/queries'
import { CASO_CASCADA, COMO_LEER, LEYENDA_ARBOL } from './contenido'
import { Icono } from './Iconos'

/** "Cómo leer estas figuras": tres viñetas cortas sobre SHAP. */
export function ComoLeer() {
  return (
    <div className="max-w-3xl">
      <p className="etiqueta mb-3 flex items-center gap-2">
        <span className="text-acento">
          <Icono nombre="lista" className="h-4 w-4" />
        </span>
        Cómo leer estas figuras
      </p>
      <ul className="flex flex-col gap-2">
        {COMO_LEER.map((t) => (
          <li key={t} className="flex items-start gap-3 leading-relaxed text-tenue">
            <span aria-hidden="true" className="mt-[0.6em] h-1.5 w-1.5 shrink-0 bg-acento" />
            {t}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-tenue">Las etiquetas de las figuras están en inglés.</p>
    </div>
  )
}

/**
 * Complementos de las figuras, junto a la cuadrícula (fuera de las celdas, para
 * que las cuatro sigan midiendo lo mismo): datos del caso de la FIG. 03 y
 * leyenda de colores de la FIG. 04.
 */
export function DetalleFiguras() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <section aria-labelledby="detalle-fig-03" className="flex flex-col gap-3 rounded-lg border border-borde bg-panel p-4 sm:p-5">
        <h3 id="detalle-fig-03" className="etiqueta">
          <span className="cifra">FIG. 03</span> · Datos de este caso
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">
              Datos de la víctima de la figura 03: variable, valor y aporte SHAP. Parte de {CASO_CASCADA.base} y llega a{' '}
              {CASO_CASCADA.resultado}.
            </caption>
            <thead>
              <tr className="border-b border-borde">
                <th scope="col" className="etiqueta py-1.5 pr-3 font-normal">
                  Variable
                </th>
                <th scope="col" className="etiqueta py-1.5 pr-3 font-normal">
                  Valor
                </th>
                <th scope="col" className="etiqueta py-1.5 text-right font-normal">
                  Aporte
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {CASO_CASCADA.filas.map((f) => (
                <tr key={f.variable}>
                  <th scope="row" className="py-1.5 pr-3 font-normal text-tenue">
                    {f.variable}
                  </th>
                  <td className="py-1.5 pr-3 text-tinta">
                    {f.valor} <span className="cifra text-xs text-tenue">({f.codigo})</span>
                  </td>
                  <td className="cifra py-1.5 text-right text-tinta">{f.aporte}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs leading-relaxed text-tenue">{CASO_CASCADA.nota}</p>
      </section>

      <section aria-labelledby="detalle-fig-04" className="flex flex-col gap-3 rounded-lg border border-borde bg-panel p-4 sm:p-5">
        <h3 id="detalle-fig-04" className="etiqueta">
          <span className="cifra">FIG. 04</span> · Cómo leer el árbol
        </h3>
        <ul className="flex flex-col gap-2.5">
          {LEYENDA_ARBOL.colores.map((c) => (
            <li key={c.clase} className="flex items-center gap-3 text-sm text-tinta">
              {/* Los colores son los de la figura (plot_tree), del más claro al más intenso */}
              <span
                aria-hidden="true"
                className="h-3 w-14 shrink-0 rounded-sm border border-borde-fuerte"
                style={{ background: `linear-gradient(to right, ${c.claro}, ${c.intenso})` }}
              />
              {c.texto}
            </li>
          ))}
        </ul>
        <p className="text-sm text-tenue">{LEYENDA_ARBOL.intensidad}</p>
        <p className="text-xs leading-relaxed text-tenue">{LEYENDA_ARBOL.nota}</p>
      </section>
    </div>
  )
}

/**
 * Qué es la salida del modelo. Se entrenó con las clases equilibradas
 * (class_weight="balanced"): su puntaje medio es 0.5, no la proporción real.
 */
export function NotaSalida() {
  const resumen = useResumen({})
  const real = resumen.data?.letalidad
  return (
    <p className="max-w-3xl rounded-lg border border-borde bg-panel-2 px-4 py-3 text-sm leading-relaxed text-tinta">
      El resultado es un <strong>puntaje del modelo entre 0 y 1</strong>; no es la probabilidad real de fallecer
      {real != null ? <> (en los datos, los fallecidos son el {real.toFixed(1)} %)</> : null}.
    </p>
  )
}
