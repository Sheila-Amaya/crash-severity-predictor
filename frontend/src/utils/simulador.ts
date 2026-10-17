import { ApiError } from '../api/client'
import type { AccidenteInput, Factor, OpcionesPrediccion, Prediccion, VariableModelo } from '../api/types'
import { VARIABLES_MODELO } from '../api/types'

export const ETIQUETAS_VARIABLE: Record<VariableModelo, string> = {
  tipo_eve: 'Tipo de evento',
  tipo_veh: 'Tipo de vehículo',
  g_hora_5: 'Jornada',
  dia_sem_ocu: 'Día de la semana',
  sexo_per: 'Sexo',
  edad_quinquenales: 'Edad (grupo de 5 años)',
  mayor_menor: 'Mayor o menor de edad',
  depto_ocu: 'Departamento',
}

export type Formulario = Partial<Record<VariableModelo, number>>

/** Variables sin valor (en el orden del formulario). */
export const camposFaltantes = (formulario: Formulario): VariableModelo[] =>
  VARIABLES_MODELO.filter((v) => formulario[v] === undefined)

export const formularioCompleto = (formulario: Formulario): formulario is AccidenteInput =>
  camposFaltantes(formulario).length === 0

// -- Mayor / menor de edad según el grupo quinquenal -----------------------
// Códigos INE: 1 = 0–4, 2 = 5–9, 3 = 10–14 (menores); 4 = 15–19 (mixto);
// 5–17 = 20 años o más (mayores); 18 = Ignorado.
const MAYOR = 1
const MENOR = 2

/** Valor de mayor_menor que implica la edad, o undefined si no se puede saber. */
export function mayorMenorSegunEdad(edad: number | undefined): number | undefined {
  if (edad === undefined) return undefined
  if (edad >= 1 && edad <= 3) return MENOR
  if (edad >= 5 && edad <= 17) return MAYOR
  return undefined
}

/** true si la combinación edad / mayor-menor es contradictoria. */
export function edadIncoherente(formulario: Formulario): boolean {
  const esperado = mayorMenorSegunEdad(formulario.edad_quinquenales)
  return esperado !== undefined && formulario.mayor_menor !== undefined && formulario.mayor_menor !== esperado
}

// -- Factores SHAP ------------------------------------------------------------

export type Direccion = 'fallecido' | 'lesionado'

/**
 * Hacia qué clase empuja un factor. La API da la contribución hacia la clase
 * predicha: positiva = hacia esa clase; negativa = hacia la otra.
 */
export function direccionFactor(prediccion: Prediccion, factor: Factor): Direccion {
  const haciaPredicha = factor.contribucion >= 0
  const predichaEsFallecido = prediccion.clase === 1
  return haciaPredicha === predichaEsFallecido ? 'fallecido' : 'lesionado'
}

/**
 * Aporte del factor al puntaje hacia fallecido, en la escala de la API (sobre
 * 100), con signo. Para mostrarlo en la escala 0 a 1 se usa formatoAporte.
 */
export function puntosHaciaFallecido(prediccion: Prediccion, factor: Factor): number {
  const magnitud = Math.abs(factor.contribucion)
  return direccionFactor(prediccion, factor) === 'fallecido' ? magnitud : -magnitud
}

export function descripcionValor(opciones: OpcionesPrediccion | undefined, factor: Factor): string {
  return opciones?.[factor.variable]?.find((o) => o.id === factor.valor)?.descripcion ?? String(factor.valor)
}

// -- Puntaje del modelo -----------------------------------------------------------
// La API da confianza, probabilidades y contribuciones sobre 100 (predict_proba
// × 100). Son el puntaje del modelo, no la probabilidad real de fallecer: se
// entrenó con las clases equilibradas. Se muestran en la escala de 0 a 1.

const PUNTAJE = new Intl.NumberFormat('es-GT', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
const APORTE = new Intl.NumberFormat('es-GT', { minimumFractionDigits: 3, maximumFractionDigits: 3, signDisplay: 'always' })

// Redondeo a una décima sobre 100 (lo que ya mostraba la interfaz) antes de
// pasar a 0 a 1; el 1e-9 evita que 9.85 (9.8499… en coma flotante) baje a 9.8.
const aEscalaUno = (sobre100: number): number =>
  (Math.sign(sobre100) * Math.round(Math.abs(sobre100) * 10 + 1e-9)) / 1000

/** Puntaje de 0 a 1 a partir de un valor de la API sobre 100 (71.6 → "0.716"). */
export const formatoPuntaje = (sobre100: number): string => PUNTAJE.format(aEscalaUno(sobre100))

/** Aporte con signo en la escala de 0 a 1 (7.8 → "+0.078"). */
export const formatoAporte = (sobre100: number): string => APORTE.format(aEscalaUno(sobre100))

/** Explicación en lenguaje sencillo de un factor. */
export function explicarFactor(prediccion: Prediccion, factor: Factor, opciones?: OpcionesPrediccion): string {
  const aporte = formatoPuntaje(Math.abs(factor.contribucion))
  const valor = descripcionValor(opciones, factor)
  const sube = direccionFactor(prediccion, factor) === 'fallecido'
  return `${factor.etiqueta} «${valor}» ${sube ? 'sube' : 'baja'} el puntaje hacia fallecido en ${aporte}.`
}

// -- Errores ---------------------------------------------------------------------

export interface MensajeError {
  titulo: string
  detalles: string[]
  /** Campos señalados por la validación (422). */
  campos: VariableModelo[]
}

/** Mensajes claros para los errores de /api/predecir. */
export function mensajeDeError(error: unknown): MensajeError {
  if (error instanceof ApiError) {
    if (error.status === 422) {
      const campos: VariableModelo[] = []
      const detalles = error.errores.map((e) => {
        const campo = e.loc.find((parte): parte is VariableModelo => VARIABLES_MODELO.includes(parte as VariableModelo))
        if (campo) campos.push(campo)
        // La API ya explica el motivo; se antepone el nombre legible del campo
        const mensaje = e.msg.replace(/^Value error, /, '')
        return campo ? `${ETIQUETAS_VARIABLE[campo]}: ${mensaje}` : mensaje
      })
      return {
        titulo: 'Revise los datos: algún valor no es válido para el modelo.',
        detalles: detalles.length ? detalles : [error.message],
        campos,
      }
    }
    if (error.status === 503) {
      return {
        titulo: 'El modelo no está disponible en este momento.',
        detalles: ['El servidor no tiene cargado el modelo de predicción. Inténtelo más tarde o avise a quien administra la API.'],
        campos: [],
      }
    }
    if (error.status === 0) {
      return {
        titulo: 'No se pudo conectar con la API.',
        detalles: ['Compruebe su conexión o que el servidor esté en marcha.'],
        campos: [],
      }
    }
  }
  return {
    titulo: 'No se pudo calcular la estimación.',
    detalles: [error instanceof Error ? error.message : 'Error desconocido.'],
    campos: [],
  }
}
