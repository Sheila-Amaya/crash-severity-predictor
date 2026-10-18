const ENTERO = new Intl.NumberFormat('es-GT', { maximumFractionDigits: 0 })
const PORCENTAJE = new Intl.NumberFormat('es-GT', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export const formatoEntero = (valor: number) => ENTERO.format(valor)

/** Porcentaje ya expresado en 0–100 (la API devuelve letalidad así). */
export const formatoPorcentaje = (valor: number) => `${PORCENTAJE.format(valor)} %`

export const formatoNulo = (valor: number | null, formato: (v: number) => string) =>
  valor === null ? '—' : formato(valor)
