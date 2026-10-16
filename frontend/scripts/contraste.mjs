// Verificación de contraste WCAG 2.x para la paleta (src/theme/palette.json).
// Texto: 4.5:1 (AA). Componentes gráficos y de interfaz: 3:1 (AA, 1.4.11).
// Escala del mapa: luminancia estrictamente monótona (se lee en grises).
// Uso: npm run contraste   (sale con código 1 si algo no cumple)

import { readFileSync } from 'node:fs'

const palette = JSON.parse(readFileSync(new URL('../src/theme/palette.json', import.meta.url), 'utf8'))

function luminancia(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const canal = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

const TEXTO = 4.5
const GRAFICO = 3

// [primer plano, fondo, mínimo, descripción]
const PARES = [
  ['text', 'topbar', TEXTO, 'Texto / barra superior'],
  ['muted', 'topbar', TEXTO, 'Subtítulo monoespaciado / barra superior'],
  ['text', 'bg', TEXTO, 'Texto / fondo del mapa (insignia, leyenda)'],
  ['muted', 'bg', TEXTO, 'Texto secundario / fondo del mapa'],
  ['text', 'surface', TEXTO, 'Texto / panel flotante'],
  ['text', 'surface2', TEXTO, 'Texto / control del panel'],
  ['muted', 'surface', TEXTO, 'Texto secundario / panel flotante'],
  ['muted', 'surface2', TEXTO, 'Texto secundario / control del panel'],
  ['accent', 'surface', TEXTO, 'Texto de acento / panel'],
  ['buttonText', 'button', TEXTO, 'Texto de botón / botón'],
  ['danger', 'surface', TEXTO, 'Texto de error / panel'],
  ['borderStrong', 'surface', GRAFICO, 'Borde de control / panel'],
  ['borderStrong', 'bg', GRAFICO, 'Borde de control / fondo del mapa'],
  ['accent', 'topbar', GRAFICO, 'Logotipo (punto) / barra superior'],
  ['accent', 'bg', GRAFICO, 'Logotipo del favicon / fondo'],
  ['focus', 'surface', GRAFICO, 'Anillo de foco / panel'],
  ['focus', 'bg', GRAFICO, 'Anillo de foco / fondo del mapa'],
  ['button', 'surface', GRAFICO, 'Botón / panel'],
  ['serieHechos', 'surface', GRAFICO, 'Serie hechos / panel'],
  ['serieLesionados', 'surface', GRAFICO, 'Serie lesionados / panel'],
  ['serieFallecidos', 'surface', GRAFICO, 'Serie fallecidos / panel'],
  ['serieLetalidad', 'surface', GRAFICO, 'Serie letalidad / panel'],
  ['serieFallecidos', 'surface2', GRAFICO, 'Barra SHAP hacia fallecido / riel del simulador'],
  ['serieLesionados', 'surface2', GRAFICO, 'Barra SHAP hacia lesionado / riel del simulador'],
  ['mapLabel', 'bg', TEXTO, 'Etiqueta de departamento / fondo del mapa'],
  ['mapBubbleStroke', 'bg', GRAFICO, 'Borde de burbuja / fondo del mapa'],
  ['mapContextLabel', 'bg', TEXTO, 'Etiqueta de contexto (país, mar, coordenadas) / mar'],
  ['mapContextLabel', 'mapLand', TEXTO, 'Etiqueta de contexto / tierra vecina'],
  ['mapLabel', 'mapLand', TEXTO, 'Etiqueta de departamento / tierra'],
  ['mapNullDot', 'bg', GRAFICO, 'Punto "sin víctimas" / fondo del mapa'],
  ['mapLineStrong', 'bg', 1, 'Límite resaltado (decorativo) / fondo'],
]

let fallos = 0

for (const [tema, p] of Object.entries(palette)) {
  console.log(`\n== Tema ${tema === 'dark' ? 'oscuro' : 'claro'} ==`)

  for (const [fg, bgKey, minimo, desc] of PARES) {
    const ratio = contraste(p[fg], p[bgKey])
    const ok = ratio >= minimo
    if (!ok) fallos++
    console.log(`${ok ? 'OK  ' : 'FALLA'} ${ratio.toFixed(2).padStart(5)}:1 (mín ${minimo}) ${desc}  [${p[fg]} sobre ${p[bgKey]}]`)
  }

  // Cada clase frente al fondo: las que no llegan a 3:1 se apoyan en el borde
  p.mapScale.forEach((color, i) => {
    const ratio = contraste(color, p.bg)
    console.log(
      `info  ${ratio.toFixed(2).padStart(5)}:1 Clase ${i + 1} / fondo  [${color}]` +
        (ratio < GRAFICO ? ' → se apoya en el borde de burbuja' : ''),
    )
  })

  // Borde de burbuja frente a cada clase
  for (const [nombre, color] of p.mapScale.map((c, i) => [`clase ${i + 1}`, c])) {
    console.log(`info  ${contraste(p.mapBubbleStroke, color).toFixed(2).padStart(5)}:1 Borde de burbuja / ${nombre}  [${color}]`)
  }
  console.log(`info  ${contraste(p.mapLine, p.bg).toFixed(2).padStart(5)}:1 Límite tenue (decorativo) / fondo`)
  // Contexto (decorativo, por debajo de IDEG): tierra, costa, fronteras y retícula
  for (const [clave, nombre] of [['mapLand', 'Tierra vecina'], ['mapCoast', 'Costa'], ['mapBorder', 'Frontera internacional (punteada)'], ['mapGrid', 'Retícula']]) {
    console.log(`info  ${contraste(p[clave], p.bg).toFixed(2).padStart(5)}:1 ${nombre} (decorativo) / mar`)
  }
  const jerarquia = contraste(p.mapLine, p.bg) > contraste(p.mapBorder, p.bg) && contraste(p.mapBorder, p.bg) > contraste(p.mapGrid, p.bg)
  if (!jerarquia) fallos++
  console.log(`${jerarquia ? 'OK  ' : 'FALLA'} Jerarquía: límites IDEG > fronteras de contexto > retícula`)

  // Cifra dentro de la burbuja: mapCifraBaja sobre las clases 1-2, mapCifraAlta sobre 3-5
  p.mapScale.forEach((color, i) => {
    const texto = i < 2 ? p.mapCifraBaja : p.mapCifraAlta
    const ratio = contraste(texto, color)
    const ok = ratio >= TEXTO
    if (!ok) fallos++
    console.log(`${ok ? 'OK  ' : 'FALLA'} ${ratio.toFixed(2).padStart(5)}:1 (mín 4.5) Cifra en burbuja / clase ${i + 1}  [${texto} sobre ${color}]`)
  })

  // Resaltado al pasar el cursor: línea y borde de tonos opuestos, para
  // verse sobre cualquier clase (incluida la más clara)
  const minHover = Math.min(...[...p.mapScale, p.mapNull].map((c) => Math.max(contraste(p.mapHover, c), contraste(p.mapHoverCasing, c))))
  const okHover = minHover >= GRAFICO
  if (!okHover) fallos++
  console.log(`${okHover ? 'OK  ' : 'FALLA'} ${minHover.toFixed(2).padStart(5)}:1 (mín 3) Resaltado (doble línea) / peor clase del mapa`)

  // Escala monótona en luminancia (lectura en escala de grises)
  const lums = p.mapScale.map(luminancia)
  const asc = lums.every((l, i) => i === 0 || l > lums[i - 1])
  const desc = lums.every((l, i) => i === 0 || l < lums[i - 1])
  if (!(asc || desc)) fallos++
  const pasos = p.mapScale.slice(1).map((c, i) => contraste(c, p.mapScale[i]).toFixed(2))
  console.log(
    `${asc || desc ? 'OK  ' : 'FALLA'} Escala del mapa monótona en luminancia (${asc ? 'aclara' : 'oscurece'} hacia el quintil 5): ` +
      `${lums.map((l) => l.toFixed(3)).join(' → ')}; contraste entre clases vecinas: ${pasos.join(', ')}`,
  )

  const parecida = Math.min(...p.mapScale.map((c) => contraste(c, p.mapNull)))
  console.log(
    `info  Gris "sin víctimas" (áreas) vs. clase más parecida: ${parecida.toFixed(2)}:1 → se distingue con rayado diagonal y entrada propia en la leyenda`,
  )
}

console.log(fallos === 0 ? '\nTodas las combinaciones cumplen WCAG AA.' : `\n${fallos} combinación(es) no cumplen.`)
process.exit(fallos === 0 ? 0 : 1)
