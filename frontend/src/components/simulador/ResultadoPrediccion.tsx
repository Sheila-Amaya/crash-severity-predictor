import { forwardRef } from 'react'

import type { OpcionesPrediccion, Prediccion } from '../../api/types'
import { usePaleta } from '../../theme/tema'
import {
  descripcionValor,
  direccionFactor,
  explicarFactor,
  formatoAporte,
  formatoPuntaje,
  puntosHaciaFallecido,
} from '../../utils/simulador'
import { EtiquetaSeccion } from '../ui/Editorial'

/** Barra del puntaje dividida: fallecido | lesionado (suman 1), con valores escritos. */
function BarraProbabilidad({ prediccion }: { prediccion: Prediccion }) {
  const paleta = usePaleta()
  const { Fallecido, Lesionado } = prediccion.probabilidades

  return (
    <div>
      <div
        className="flex h-3 overflow-hidden rounded-sm"
        role="img"
        aria-label={`Puntaje de severidad: fallecido ${formatoPuntaje(Fallecido)}, lesionado ${formatoPuntaje(Lesionado)}`}
      >
        <span style={{ width: `${Fallecido}%`, backgroundColor: paleta.serieFallecidos }} />
        <span style={{ width: `${Lesionado}%`, backgroundColor: paleta.serieLesionados }} />
      </div>
      <div className="cifra mt-1 flex justify-between text-xs">
        <span className="text-tinta">
          <span aria-hidden="true" className="mr-1 inline-block h-2 w-2" style={{ backgroundColor: paleta.serieFallecidos }} />
          Fallecido {formatoPuntaje(Fallecido)}
        </span>
        <span className="text-tinta">
          Lesionado {formatoPuntaje(Lesionado)}
          <span aria-hidden="true" className="ml-1 inline-block h-2 w-2" style={{ backgroundColor: paleta.serieLesionados }} />
        </span>
      </div>
    </div>
  )
}

/** Factores SHAP como barras divergentes: izquierda hacia lesionado, derecha hacia fallecido. */
function FactoresShap({ prediccion, opciones }: { prediccion: Prediccion; opciones?: OpcionesPrediccion }) {
  const paleta = usePaleta()
  const maximo = Math.max(1, ...prediccion.factores.map((f) => Math.abs(f.contribucion)))

  return (
    <div className="flex flex-col gap-3">
      <div className="etiqueta flex justify-between text-[9.5px]" aria-hidden="true">
        <span>← hacia lesionado</span>
        <span>hacia fallecido →</span>
      </div>
      <ol className="flex flex-col gap-3">
        {prediccion.factores.map((factor) => {
          const puntos = puntosHaciaFallecido(prediccion, factor)
          const haciaFallecido = direccionFactor(prediccion, factor) === 'fallecido'
          const ancho = (Math.abs(puntos) / maximo) * 50
          return (
            <li key={factor.variable} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-tinta">
                  {factor.etiqueta}: <span className="font-semibold">{descripcionValor(opciones, factor)}</span>
                </span>
                <span className="cifra shrink-0 text-xs text-tenue">{formatoAporte(puntos)}</span>
              </div>
              {/* Eje central: la barra crece a la derecha (fallecido) o a la izquierda (lesionado) */}
              <div className="relative h-2.5 rounded-sm bg-panel-2" aria-hidden="true">
                <span className="absolute top-[-3px] bottom-[-3px] left-1/2 w-px bg-borde-fuerte" />
                <span
                  className="absolute top-0 bottom-0 rounded-sm"
                  style={{
                    width: `${ancho}%`,
                    left: haciaFallecido ? '50%' : `${50 - ancho}%`,
                    backgroundColor: haciaFallecido ? paleta.serieFallecidos : paleta.serieLesionados,
                  }}
                />
              </div>
              <p className="text-xs text-tenue">{explicarFactor(prediccion, factor, opciones)}</p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

interface Props {
  prediccion: Prediccion
  opciones?: OpcionesPrediccion
  /** El resultado corresponde a datos que ya cambiaron en el formulario. */
  desactualizado: boolean
}

/** Tarjeta destacada del resultado. Recibe el foco al aparecer. */
export const ResultadoPrediccion = forwardRef<HTMLHeadingElement, Props>(function ResultadoPrediccion(
  { prediccion, opciones, desactualizado },
  ref,
) {
  const paleta = usePaleta()
  const fallecido = prediccion.clase === 1
  const color = fallecido ? paleta.serieFallecidos : paleta.serieLesionados

  return (
    <article
      aria-labelledby="resultado-titulo"
      className={`rounded-sm border bg-panel p-5 transition-opacity duration-200 ${desactualizado ? 'opacity-60' : ''}`}
      style={{ borderColor: color, boxShadow: `0 0 0 1px ${color}33, var(--sombra-panel)` }}
    >
      <EtiquetaSeccion as="p">Resultado</EtiquetaSeccion>
      <h2 id="resultado-titulo" ref={ref} tabIndex={-1} className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm text-tenue">Clase predicha</span>
        <span className="text-3xl font-semibold tracking-tight" style={{ color }}>
          {prediccion.resultado}
        </span>
      </h2>
      <p className="mt-1 text-sm text-tinta">
        Puntaje de severidad (0 a 1):{' '}
        <span className="cifra font-semibold">{formatoPuntaje(prediccion.probabilidades.Fallecido)}</span>
      </p>
      <p className="mt-1 text-xs text-tenue">
        Es un puntaje del modelo entre 0 y 1; no es la probabilidad real de fallecer (en los datos, los fallecidos son
        el 19.1 %).
      </p>
      {desactualizado && (
        <p role="status" className="mt-2 text-xs text-acento">
          Cambió el formulario: pulse «Estimar severidad» para actualizar el resultado.
        </p>
      )}

      <div className="mt-4">
        <BarraProbabilidad prediccion={prediccion} />
      </div>

      <div className="mt-6 border-t border-borde pt-4">
        <EtiquetaSeccion as="h3" derecha="SHAP">
          Lo que más pesó en este caso
        </EtiquetaSeccion>
        <div className="mt-3">
          <FactoresShap prediccion={prediccion} opciones={opciones} />
        </div>
      </div>
    </article>
  )
})
