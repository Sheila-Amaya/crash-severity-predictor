import { describe, expect, it } from 'vitest'

import { ApiError } from '../api/client'
import type { Factor, OpcionesPrediccion, Prediccion } from '../api/types'
import {
  camposFaltantes,
  direccionFactor,
  edadIncoherente,
  explicarFactor,
  mayorMenorSegunEdad,
  mensajeDeError,
  puntosHaciaFallecido,
} from './simulador'

const factor = (contribucion: number): Factor => ({
  variable: 'tipo_eve',
  etiqueta: 'Tipo de evento',
  valor: 5,
  contribucion,
  efecto: contribucion >= 0 ? 'aumenta' : 'disminuye',
})

const prediccion = (clase: 1 | 2): Prediccion => ({
  resultado: clase === 1 ? 'Fallecido' : 'Lesionado',
  clase,
  confianza: 60,
  probabilidades: { Fallecido: clase === 1 ? 60 : 40, Lesionado: clase === 1 ? 40 : 60 },
  factores: [],
})

const OPCIONES = { tipo_eve: [{ id: 5, descripcion: 'Atropello' }] } as unknown as OpcionesPrediccion

describe('dirección de los factores SHAP', () => {
  it('positiva con predicción Fallecido empuja hacia fallecido', () => {
    expect(direccionFactor(prediccion(1), factor(9.9))).toBe('fallecido')
    expect(puntosHaciaFallecido(prediccion(1), factor(9.9))).toBe(9.9)
  })

  it('positiva con predicción Lesionado empuja hacia lesionado', () => {
    expect(direccionFactor(prediccion(2), factor(4.7))).toBe('lesionado')
    expect(puntosHaciaFallecido(prediccion(2), factor(4.7))).toBe(-4.7)
  })

  it('negativa con predicción Lesionado empuja hacia fallecido', () => {
    expect(direccionFactor(prediccion(2), factor(-3))).toBe('fallecido')
  })

  it('explica el factor en lenguaje sencillo con la descripción del valor', () => {
    expect(explicarFactor(prediccion(1), factor(9.85), OPCIONES)).toBe(
      'Tipo de evento «Atropello» sube la probabilidad de fallecimiento en 9.9 puntos.',
    )
    expect(explicarFactor(prediccion(1), factor(-2), OPCIONES)).toContain('baja la probabilidad')
  })
})

describe('formulario', () => {
  it('lista los campos que faltan en orden', () => {
    expect(camposFaltantes({ tipo_eve: 1, depto_ocu: 1 })).toEqual([
      'tipo_veh',
      'g_hora_5',
      'dia_sem_ocu',
      'sexo_per',
      'edad_quinquenales',
      'mayor_menor',
    ])
  })

  it('sugiere mayor o menor de edad según el grupo quinquenal', () => {
    expect(mayorMenorSegunEdad(2)).toBe(2) // 5–9: menor
    expect(mayorMenorSegunEdad(7)).toBe(1) // 30–34: mayor
    expect(mayorMenorSegunEdad(4)).toBeUndefined() // 15–19: no se sabe
    expect(mayorMenorSegunEdad(18)).toBeUndefined() // Ignorado
  })

  it('detecta combinaciones de edad contradictorias', () => {
    expect(edadIncoherente({ edad_quinquenales: 2, mayor_menor: 1 })).toBe(true)
    expect(edadIncoherente({ edad_quinquenales: 4, mayor_menor: 1 })).toBe(false)
  })
})

describe('mensajes de error', () => {
  it('422: nombra el campo y conserva la explicación de la API', () => {
    const error = new ApiError(422, 'Validation error', [
      { loc: ['body', 'tipo_veh'], msg: 'Value error, tipo_veh=99 es el código Ignorado.', type: 'value_error' },
    ])
    const mensaje = mensajeDeError(error)
    expect(mensaje.campos).toEqual(['tipo_veh'])
    expect(mensaje.detalles[0]).toBe('Tipo de vehículo: tipo_veh=99 es el código Ignorado.')
  })

  it('503: modelo no disponible', () => {
    expect(mensajeDeError(new ApiError(503, 'x')).titulo).toMatch(/modelo no está disponible/)
  })

  it('sin conexión', () => {
    expect(mensajeDeError(new ApiError(0, 'x')).titulo).toMatch(/No se pudo conectar/)
  })
})
