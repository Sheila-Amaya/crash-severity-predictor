/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

import { svgFavicon } from './src/theme/logo'

/** favicon.svg generado desde la geometría del logotipo y palette.json. */
function favicon(): Plugin {
  return {
    name: 'favicon-logotipo',
    configureServer(server) {
      server.middlewares.use('/favicon.svg', (_req, res) => {
        res.setHeader('Content-Type', 'image/svg+xml')
        res.end(svgFavicon())
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'favicon.svg', source: svgFavicon() })
    },
  }
}
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:8000'

  return {
    plugins: [react(), tailwindcss(), favicon()],
    // El worker de MapLibre se importa con ?worker&url (ver MapaCoropletico):
    // se emite como módulo ES porque importa maplibre-gl-shared.mjs.
    worker: {
      format: 'es',
    },
    build: {
      // MapLibre (~1,045 kB minificado, 285 kB gzip) es una sola biblioteca que
      // no se puede dividir más; solo la carga la página del mapa. El límite
      // cubre ese chunk y sigue avisando si cualquier otro crece de más.
      chunkSizeWarningLimit: 1100,
      rollupOptions: {
        output: {
          // Bibliotecas grandes en chunks propios (solo las pide la página del
          // mapa) y cacheables aparte del código de la app
          manualChunks(id) {
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
            if (id.includes('node_modules/maplibre-gl')) return 'maplibre'
            if (/node_modules\/(recharts|d3-|victory-vendor|lodash)/.test(id)) return 'graficas'
          },
        },
      },
    },
    server: {
      port: 5173,
      // En desarrollo el navegador llama a /api en el mismo origen y Vite
      // reenvía a la API (sin CORS).
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }
})
