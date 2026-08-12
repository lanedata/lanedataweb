// Exportador PNG compartido por el Estudio IG (1080×1350) y las Historias
// (1080×1920).
//
// Delega en `html-to-image`. La implementación anterior serializaba el nodo a
// XHTML, lo metía dentro de <svg><foreignObject> con las fuentes embebidas
// como data: URIs y pintaba el SVG en canvas. Se veía bien en pantalla pero
// el PNG salía con otra tipografía: al cargar el SVG como <img>, Chromium
// aísla el pintado y descarta los @font-face con url(data:...), así que caía
// a la fuente del sistema. Ni precargar las mismas @font-face en el
// documento arreglaba el pintado del SVG (aislamiento por seguridad).
//
// html-to-image también usa foreignObject, pero embebe las fuentes por otro
// camino (rescata las hojas de estilo del documento) que sí sobrevive al
// cargador de imágenes, así que el PNG conserva Bricolage y JetBrains Mono.

import { toPng } from 'html-to-image'

/** Renderiza un nodo a PNG (data URL) del tamaño indicado. Las tarjetas se
 *  ven en pantalla reducidas con `transform: scale(...)`; se anula ese
 *  transform durante la captura para exportarlas a tamaño real. */
export async function nodeToPng(
  node: HTMLElement,
  width: number,
  height: number,
): Promise<string> {
  // Aseguro que las fuentes están cargadas antes de capturar. html-to-image
  // hace su propio await internamente, pero este await evita capturas con
  // fuentes a medio cargar cuando se exporta nada más entrar en la página.
  await document.fonts.ready

  return toPng(node, {
    width,
    height,
    pixelRatio: 1,
    cacheBust: false,
    style: { transform: 'none', margin: '0' },
  })
}

/** Descarga un data URL como fichero. */
export function downloadPng(dataUrl: string, name: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = name.endsWith('.png') ? name : `${name}.png`
  a.click()
}
