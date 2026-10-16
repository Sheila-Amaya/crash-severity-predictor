import { useId, useRef, type FormEvent } from 'react'

import type { OpcionesPrediccion, VariableModelo } from '../../api/types'
import { VARIABLES_MODELO } from '../../api/types'
import {
  camposFaltantes,
  edadIncoherente,
  ETIQUETAS_VARIABLE,
  mayorMenorSegunEdad,
  type Formulario,
} from '../../utils/simulador'

// Agrupación del formulario: el hecho y la víctima
const GRUPOS: { titulo: string; campos: VariableModelo[] }[] = [
  { titulo: 'El hecho', campos: ['tipo_eve', 'tipo_veh', 'depto_ocu', 'g_hora_5', 'dia_sem_ocu'] },
  { titulo: 'La víctima', campos: ['sexo_per', 'edad_quinquenales', 'mayor_menor'] },
]

const EJEMPLO: Formulario = {
  tipo_eve: 5, // Atropello
  tipo_veh: 4, // Motocicleta
  depto_ocu: 5, // Escuintla
  g_hora_5: 3, // Noche
  dia_sem_ocu: 6, // Sábado
  sexo_per: 1,
  edad_quinquenales: 7,
  mayor_menor: 1,
}

interface Props {
  opciones: OpcionesPrediccion
  valores: Formulario
  onCambio: (valores: Formulario) => void
  onEnviar: () => void
  enviando: boolean
  /** Campos marcados como inválidos (faltantes o rechazados por la API). */
  invalidos: VariableModelo[]
  onInvalidos: (campos: VariableModelo[]) => void
}

export function FormularioSimulador({ opciones, valores, onCambio, onEnviar, enviando, invalidos, onInvalidos }: Props) {
  const base = useId()
  const formulario = useRef<HTMLFormElement>(null)
  const idCampo = (campo: VariableModelo) => `${base}-${campo}`

  const cambiar = (campo: VariableModelo, valor: number | undefined) => {
    const siguiente: Formulario = { ...valores, [campo]: valor }
    // La edad sugiere "mayor o menor" si aún no se eligió
    if (campo === 'edad_quinquenales' && valores.mayor_menor === undefined) {
      const sugerido = mayorMenorSegunEdad(valor)
      if (sugerido !== undefined) siguiente.mayor_menor = sugerido
    }
    onCambio(siguiente)
    if (invalidos.includes(campo)) onInvalidos(invalidos.filter((c) => c !== campo))
  }

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    const faltan = camposFaltantes(valores)
    if (faltan.length > 0) {
      onInvalidos(faltan)
      // Por id (useId genera caracteres que un selector CSS tendría que escapar)
      formulario.current?.ownerDocument.getElementById(idCampo(faltan[0]))?.focus()
      return
    }
    onEnviar()
  }

  const incoherente = edadIncoherente(valores)

  return (
    <form ref={formulario} onSubmit={enviar} noValidate aria-describedby={`${base}-nota`} className="flex flex-col gap-5">
      {GRUPOS.map((grupo) => (
        <fieldset key={grupo.titulo} className="flex flex-col gap-3">
          <legend className="etiqueta mb-2 text-[10px]">{grupo.titulo}</legend>
          {grupo.campos.map((campo) => {
            const invalido = invalidos.includes(campo)
            const idError = `${idCampo(campo)}-error`
            return (
              <div key={campo} className="grid gap-1 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center sm:gap-3">
                <label htmlFor={idCampo(campo)} className="text-sm text-tinta">
                  {ETIQUETAS_VARIABLE[campo]}
                </label>
                <div>
                  <select
                    id={idCampo(campo)}
                    required
                    value={valores[campo] ?? ''}
                    aria-invalid={invalido || undefined}
                    aria-describedby={invalido ? idError : undefined}
                    onChange={(e) => cambiar(campo, e.target.value === '' ? undefined : Number(e.target.value))}
                    className={`w-full rounded-sm border bg-panel-2 px-2.5 py-2 text-sm ${
                      invalido ? 'border-peligro' : valores[campo] === undefined ? 'border-borde-fuerte text-tenue' : 'border-borde-fuerte text-tinta'
                    }`}
                  >
                    <option value="">Seleccione…</option>
                    {opciones[campo].map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.descripcion}
                      </option>
                    ))}
                  </select>
                  {invalido && (
                    <p id={idError} className="mt-1 text-xs text-peligro">
                      {valores[campo] === undefined ? 'Elija una opción.' : 'Valor rechazado por el modelo.'}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </fieldset>
      ))}

      {incoherente && (
        <p role="status" className="border-l-2 border-acento pl-2 text-xs text-tenue">
          La edad elegida no coincide con «mayor o menor de edad». El modelo lo acepta, pero revise si es un error.
        </p>
      )}

      <p id={`${base}-nota`} className="text-xs leading-relaxed text-tenue">
        <span className="etiqueta mr-1 text-[10px]">Por qué faltan opciones:</span>
        {opciones.nota}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={enviando}
          aria-busy={enviando}
          className="rounded-sm bg-boton px-4 py-2 text-sm font-semibold text-boton-texto transition-opacity duration-150 hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          {enviando ? 'Calculando…' : 'Estimar severidad'}
        </button>
        <button
          type="button"
          onClick={() => {
            onCambio(EJEMPLO)
            onInvalidos([])
          }}
          className="rounded-sm border border-borde-fuerte px-4 py-2 text-sm text-tinta hover:bg-panel-2"
        >
          Usar un ejemplo
        </button>
        <button
          type="button"
          onClick={() => {
            onCambio({})
            onInvalidos([])
          }}
          className="rounded-sm border border-borde px-4 py-2 text-sm text-tenue hover:text-tinta"
        >
          Limpiar
        </button>
      </div>
      <p className="sr-only">Todos los campos son obligatorios: {VARIABLES_MODELO.length} variables del modelo.</p>
    </form>
  )
}
