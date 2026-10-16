/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:8000'

  return {
    plugins: [react(), tailwindcss()],
    // El worker de MapLibre se importa con ?worker&url (ver MapaCoropletico):
    // se emite como módulo ES porque importa maplibre-gl-shared.mjs.
    worker: {
      format: 'es',
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
