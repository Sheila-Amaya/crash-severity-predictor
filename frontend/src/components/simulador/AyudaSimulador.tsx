import { EtiquetaSeccion, ListaRecuadro } from '../ui/Editorial'

/** Aviso de uso responsable, siempre visible. */
export function AvisoUsoResponsable() {
  return (
    <aside aria-labelledby="aviso-titulo" className="rounded-sm border border-acento/60 bg-panel p-4">
      <EtiquetaSeccion as="h2" id="aviso-titulo">
        Uso responsable
      </EtiquetaSeccion>
      <ul className="mt-2 flex flex-col gap-1.5 text-sm text-tinta">
        <li>
          Clasifica la severidad <strong>dado que el hecho ya ocurrió</strong>; no predice si ocurrirá un accidente.
        </li>
        <li>
          Con una precisión de fallecidos de <span className="cifra">0.34</span>, solo{' '}
          <strong>1 de cada 3 alertas «Fallecido» es real</strong>.
        </li>
        <li>Es apoyo a la decisión; no sustituye el criterio de las autoridades.</li>
      </ul>
    </aside>
  )
}

/** Panel de ayuda "Cómo leer este resultado" (componentes editoriales reutilizables). */
export function AyudaResultado() {
  return (
    <section aria-labelledby="ayuda-titulo" className="flex flex-col gap-3">
      <EtiquetaSeccion as="h2" id="ayuda-titulo">
        Cómo leer este resultado
      </EtiquetaSeccion>
      <ListaRecuadro
        etiqueta="Cómo leer este resultado"
        items={[
          <>
            <strong>Clase predicha</strong>: la severidad más probable para una víctima con esas características,
            según un Random Forest entrenado con datos del INE 2018–2024.
          </>,
          <>
            <strong>Puntaje de severidad (0 a 1)</strong>: el promedio de lo que estiman los árboles del modelo para
            fallecido; con 0.5 o más, la clase predicha es Fallecido. No es la probabilidad real de fallecer: el modelo
            se entrenó con las clases equilibradas, así que su puntaje medio es 0.5 y no el 19.1 % de los datos. Tampoco
            es una certeza: acierta en torno al 69 % de los casos de prueba (accuracy 0.6949).
          </>,
          <>
            <strong>Factores (SHAP)</strong>: cuánto movió cada variable el puntaje hacia fallecido, en la misma escala
            de 0 a 1, frente al promedio del modelo. Solo se muestran los 3 que más pesaron; el resto también
            influye.
          </>,
          <>
            Una barra hacia la <strong>derecha</strong> empuja hacia fallecido; hacia la <strong>izquierda</strong>,
            hacia lesionado. Los factores describen asociaciones en los datos, no causas.
          </>,
        ]}
      />
    </section>
  )
}
