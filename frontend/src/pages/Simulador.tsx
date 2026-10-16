import { useEffect, useRef, useState } from 'react'

import { useOpcionesPrediccion, usePredecir } from '../api/queries'
import type { Prediccion, VariableModelo } from '../api/types'
import { AvisoUsoResponsable, AyudaResultado } from '../components/simulador/AyudaSimulador'
import { FormularioSimulador } from '../components/simulador/FormularioSimulador'
import { ResultadoPrediccion } from '../components/simulador/ResultadoPrediccion'
import { EtiquetaSeccion } from '../components/ui/Editorial'
import { ErrorCarga, Skeleton } from '../components/ui/Estados'
import { useTituloPagina } from '../hooks/useTituloPagina'
import { formularioCompleto, mensajeDeError, type Formulario } from '../utils/simulador'

export function Simulador() {
  useTituloPagina(
    'Simulador',
    'Estime si una víctima de un hecho de tránsito resultaría fallecida o lesionada y vea qué variables pesaron más (Random Forest con SHAP).',
  )
  const opciones = useOpcionesPrediccion()
  const predecir = usePredecir()
  const [valores, setValores] = useState<Formulario>({})
  const [invalidos, setInvalidos] = useState<VariableModelo[]>([])
  const [resultado, setResultado] = useState<{ prediccion: Prediccion; entrada: string } | null>(null)
  const tituloResultado = useRef<HTMLHeadingElement>(null)
  const alertaError = useRef<HTMLDivElement>(null)

  const enviar = () => {
    if (!formularioCompleto(valores)) return
    const entrada = JSON.stringify(valores)
    predecir.mutate(valores, {
      onSuccess: (prediccion) => setResultado({ prediccion, entrada }),
      onError: (error) => setInvalidos(mensajeDeError(error).campos),
    })
  }

  // Foco al resultado (o al error) cuando llega, para teclado y lectores de pantalla
  useEffect(() => {
    if (resultado) tituloResultado.current?.focus()
  }, [resultado])
  useEffect(() => {
    if (predecir.isError) alertaError.current?.focus()
  }, [predecir.isError, predecir.failureCount])

  const error = predecir.isError ? mensajeDeError(predecir.error) : null
  const desactualizado = resultado !== null && resultado.entrada !== JSON.stringify(valores)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <header className="max-w-3xl">
        <EtiquetaSeccion as="p">Simulador</EtiquetaSeccion>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Severidad estimada de una víctima</h1>
        <p className="mt-3 text-tenue">
          Describa el hecho y a la víctima. El modelo estima si la víctima resultaría fallecida o lesionada y muestra
          qué variables pesaron más en esa estimación.
        </p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Formulario */}
        <section aria-labelledby="form-titulo" className="flex flex-col gap-6">
          <div className="rounded-sm border border-borde bg-panel p-5">
            <EtiquetaSeccion as="h2" id="form-titulo" derecha="8 variables">
              Datos del caso
            </EtiquetaSeccion>
            <div className="mt-4">
              {opciones.isPending ? (
                <div className="flex flex-col gap-3" aria-busy="true">
                  {Array.from({ length: 8 }, (_, i) => (
                    <Skeleton key={i} className="h-9" etiqueta="Cargando opciones…" />
                  ))}
                </div>
              ) : opciones.isError ? (
                <ErrorCarga
                  mensaje={mensajeDeError(opciones.error).titulo}
                  detalle={mensajeDeError(opciones.error).detalles[0]}
                  onReintentar={() => opciones.refetch()}
                />
              ) : (
                <FormularioSimulador
                  opciones={opciones.data}
                  valores={valores}
                  onCambio={(nuevos) => {
                    setValores(nuevos)
                    // Un error anterior deja de aplicar al cambiar los datos
                    if (predecir.isError) predecir.reset()
                  }}
                  onEnviar={enviar}
                  enviando={predecir.isPending}
                  invalidos={invalidos}
                  onInvalidos={setInvalidos}
                />
              )}
            </div>
          </div>
          <AvisoUsoResponsable />
        </section>

        {/* Resultado y ayuda */}
        <section aria-label="Resultado y ayuda" className="flex flex-col gap-8">
          <div aria-live="polite">
            {error ? (
              <div
                ref={alertaError}
                tabIndex={-1}
                role="alert"
                className="rounded-sm border border-peligro bg-panel p-5"
              >
                <p className="font-semibold text-peligro">{error.titulo}</p>
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-tinta">
                  {error.detalles.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            ) : predecir.isPending && !resultado ? (
              <Skeleton className="h-72" etiqueta="Calculando la estimación…" />
            ) : resultado ? (
              <ResultadoPrediccion
                ref={tituloResultado}
                prediccion={resultado.prediccion}
                opciones={opciones.data}
                desactualizado={desactualizado}
              />
            ) : (
              <div className="rounded-sm border border-dashed border-borde-fuerte p-6 text-sm text-tenue">
                Complete los datos del caso y pulse <span className="text-tinta">«Estimar severidad»</span>. El
                resultado aparecerá aquí.
              </div>
            )}
          </div>
          <AyudaResultado />
        </section>
      </div>
    </div>
  )
}
