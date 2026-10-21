import type { Agrupacion, PuntoSerie } from '../api/types'
import { formatoEntero } from './formato'

// Etiquetas de catálogo sin dato útil ("Ignorada" en jornada = g_hora_5 4)
const SIN_DATO = /^(ignorad[oa]|sin dato|no especificad[oa])$/i

const SUSTANTIVO: Record<Agrupacion, string> = {
  anio: 'año',
  mes: 'mes',
  dia_sem: 'día',
  jornada: 'jornada',
}

export const esSinDato = (punto: Pick<PuntoSerie, 'etiqueta'>) => SIN_DATO.test(punto.etiqueta.trim())

/** Separa las categorías sin dato: con pocas víctimas su letalidad engaña y estira el eje. */
export function separarSinDato<T extends PuntoSerie>(datos: T[]) {
  return {
    visibles: datos.filter((d) => !esSinDato(d)),
    omitidos: datos.filter(esSinDato),
  }
}

/** "Se omiten 1,234 víctimas con jornada ignorada." o null si no se omite ninguna víctima. */
export function notaOmitidos(omitidos: PuntoSerie[], agrupar: Agrupacion): string | null {
  const victimas = omitidos.reduce((total, d) => total + d.victimas, 0)
  if (victimas === 0) return null

  const categoria = omitidos.map((d) => d.etiqueta.trim().toLowerCase()).join(' o ')
  const verbo = victimas === 1 ? 'Se omite' : 'Se omiten'
  const sustantivo = victimas === 1 ? 'víctima' : 'víctimas'

  return `${verbo} ${formatoEntero(victimas)} ${sustantivo} con ${SUSTANTIVO[agrupar]} ${categoria}.`
}
