// Imprime los hashes CSP ('sha256-…') de los <script> inline (sin src) de un
// index.html compilado. El Dockerfile los inserta en script-src de nginx, así
// la CSP permite el script que fija el tema sin recurrir a 'unsafe-inline'.
//
// Uso: node scripts/csp-hash.mjs dist/index.html

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const archivo = process.argv[2] ?? 'dist/index.html'
const html = readFileSync(archivo, 'utf8')

const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
  .map(([, contenido]) => `'sha256-${createHash('sha256').update(contenido, 'utf8').digest('base64')}'`)

if (hashes.length === 0) {
  console.error(`No hay scripts inline en ${archivo}.`)
  process.exit(1)
}
console.log(hashes.join(' '))
