// Verificación de contraste WCAG 2.x para la paleta (src/theme/palette.json).
// Texto: 4.5:1 (AA). Componentes gráficos y de interfaz: 3:1 (AA, 1.4.11).
// Escalas del mapa: luminancia estrictamente monótona (se leen en grises).
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

// [primer plano, fondo, mínimo, descripción]
const TEXTO = 4.5
const GRAFICO = 3

const pares = (t) => [
  ['text', 'bg', TEXTO, 'Texto principal / fondo'],
  ['text', 'surface', TEXTO, 'Texto principal / tarjeta'],
  ['text', 'surface2', TEXTO, 'Texto principal / tarjeta secundaria'],
  ['muted', 'bg', TEXTO, 'Texto secundario / fondo'],
  ['muted', 'surface', TEXTO, 'Texto secundario / tarjeta'],
  ['muted', 'surface2', TEXTO, 'Texto secundario / tarjeta secundaria'],
  ['accentText', 'bg', TEXTO, 'Texto ámbar / fondo'],
  ['accentText', 'surface', TEXTO, 'Texto ámbar / tarjeta'],
  ['buttonText', 'button', TEXTO, 'Texto de botón / botón'],
  ['danger', 'surface', TEXTO, 'Texto de error / tarjeta'],
  ['borderStrong', 'bg', GRAFICO, 'Borde de control / fondo'],
  ['borderStrong', 'surface', GRAFICO, 'Borde de control / tarjeta'],
  ['focus', 'bg', GRAFICO, 'Anillo de foco / fondo'],
  ['focus', 'surface', GRAFICO, 'Anillo de foco / tarjeta'],
  ['button', 'surface', GRAFICO, 'Botón / tarjeta'],
  ...(t === 'dark' ? [['accent', 'surface', GRAFICO, 'Acento ámbar / tarjeta']] : []),
  ['serieHechos', 'surface', GRAFICO, 'Serie hechos / tarjeta'],
  ['serieLesionados', 'surface', GRAFICO, 'Serie lesionados / tarjeta'],
  ['serieFallecidos', 'surface', GRAFICO, 'Serie fallecidos / tarjeta'],
  ['mapOutline', 'bg', GRAFICO, 'Borde de polígono / fondo neutro del mapa'],
]

let fallos = 0

for (const tema of ['light', 'dark']) {
  const p = palette[tema]
  console.log(`\n== Tema ${tema === 'light' ? 'claro' : 'oscuro'} ==`)

  for (const [fg, bgKey, minimo, desc] of pares(tema)) {
    const ratio = contraste(p[fg], p[bgKey])
    const ok = ratio >= minimo
    if (!ok) fallos++
    console.log(`${ok ? 'OK  ' : 'FALLA'} ${ratio.toFixed(2).padStart(5)}:1 (mín ${minimo}) ${desc}  [${p[fg]} sobre ${p[bgKey]}]`)
  }

  // Ámbar de señal: en claro no llega a 3:1, así que ahí es solo decorativo
  // (línea de carril, detalles); lo que comunica usa accentText / focus.
  const ambar = Math.min(contraste(p.accent, p.bg), contraste(p.accent, p.surface))
  console.log(
    `info  ${ambar.toFixed(2).padStart(5)}:1 Ámbar de señal ${p.accent} / fondo y tarjeta → ` +
      (ambar >= GRAFICO ? 'apto para gráficos e indicadores' : 'solo decorativo en este tema'),
  )

  // Cada clase del mapa frente al fondo neutro: las que no llegan a 3:1
  // dependen del borde de polígono (que sí cumple) para verse.
  p.mapScale.forEach((color, i) => {
    const ratio = contraste(color, p.bg)
    console.log(
      `info  ${ratio.toFixed(2).padStart(5)}:1 Clase ${i + 1} / fondo  [${color}]` +
        (ratio < GRAFICO ? ' → se apoya en el borde de polígono' : ''),
    )
  })

  // El borde de polígono debe distinguirse de cada clase y del gris de "sin datos"
  for (const [i, color] of [...p.mapScale.map((c, i) => [i + 1, c]), ['sin datos', p.mapNull]]) {
    const ratio = contraste(p.mapOutline, color)
    console.log(`info  ${ratio.toFixed(2).padStart(5)}:1 Borde de polígono / clase ${i}  [${color}]`)
  }

  const lums = p.mapScale.map(luminancia)
  const ascendente = lums.every((l, i) => i === 0 || l > lums[i - 1])
  const descendente = lums.every((l, i) => i === 0 || l < lums[i - 1])
  const monotona = ascendente || descendente
  if (!monotona) fallos++

  const pasos = lums.slice(1).map((l, i) => contraste(p.mapScale[i + 1], p.mapScale[i]).toFixed(2))
  console.log(
    `${monotona ? 'OK  ' : 'FALLA'} Escala del mapa monótona en luminancia (${descendente ? 'oscurece' : 'aclara'} hacia el quintil 5): ` +
      lums.map((l) => l.toFixed(3)).join(' → ') +
      `; contraste entre clases vecinas: ${pasos.join(', ')}`,
  )

  const minNull = Math.min(...p.mapScale.map((c) => contraste(c, p.mapNull)))
  console.log(`info  Gris "sin datos" vs. clase más parecida: ${minNull.toFixed(2)}:1 (se distingue además por tono y por la leyenda)`)
}

console.log(fallos === 0 ? '\nTodas las combinaciones cumplen WCAG AA.' : `\n${fallos} combinación(es) no cumplen.`)
process.exit(fallos === 0 ? 0 : 1)
