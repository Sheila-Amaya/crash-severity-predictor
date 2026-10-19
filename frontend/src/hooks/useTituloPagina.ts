import { useEffect } from 'react'

const SITIO = 'Crash Severity · Guatemala'

/** Título de la pestaña y meta description de cada página. */
export function useTituloPagina(titulo: string, descripcion: string) {
  useEffect(() => {
    document.title = `${titulo} · ${SITIO}`
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = descripcion
  }, [titulo, descripcion])
}
