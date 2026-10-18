import palette from './palette.json'

// Logotipo: un punto con dos anillos concéntricos, como las burbujas del mapa.
// Única fuente de la geometría: la usan el componente <Logotipo> y el favicon
// (generado en vite.config.ts con los colores de palette.json).

export const LOGO = {
  /** Lado del viewBox. */
  vista: 24,
  punto: 3.4,
  anillos: [
    { r: 6.8, grosor: 1.5, opacidad: 0.5 },
    { r: 10.2, grosor: 1.4, opacidad: 0.25 },
  ],
} as const

type Paleta = (typeof palette)['dark']

/** Punto y anillos centrados en un viewBox de LOGO.vista, en el color dado. */
function marcas(color: string, escalaGrosor = 1): string {
  const c = LOGO.vista / 2
  const anillos = LOGO.anillos
    .map(
      (a) =>
        `<circle cx="${c}" cy="${c}" r="${a.r}" fill="none" stroke="${color}" stroke-width="${a.grosor * escalaGrosor}" stroke-opacity="${a.opacidad}"/>`,
    )
    .join('')
  return `${anillos}<circle cx="${c}" cy="${c}" r="${LOGO.punto}" fill="${color}"/>`
}

/**
 * Favicon SVG: el logotipo en un cuadro de borde fino con el fondo del tema.
 * Sigue el tema del sistema (prefers-color-scheme) con las dos paletas.
 * El logotipo ocupa casi todo el cuadro y el borde es fino: así, a 16 px,
 * quedan más de 1 px de separación entre el punto y cada anillo.
 */
export function svgFavicon(oscuro: Paleta = palette.dark, claro: Paleta = palette.light): string {
  const lado = 32
  const margen = 2
  const escala = (lado - 2 * margen) / LOGO.vista
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}">`,
    `<style>.f{fill:${oscuro.bg};stroke:${oscuro.borderStrong}}.m{color:${oscuro.accent}}`,
    `@media (prefers-color-scheme: light){.f{fill:${claro.bg};stroke:${claro.borderStrong}}.m{color:${claro.accent}}}</style>`,
    `<rect class="f" x="0.5" y="0.5" width="${lado - 1}" height="${lado - 1}" rx="6" stroke-width="1"/>`,
    `<g class="m" transform="translate(${margen} ${margen}) scale(${+escala.toFixed(4)})">${marcas('currentColor')}</g>`,
    `</svg>`,
  ].join('')
}
