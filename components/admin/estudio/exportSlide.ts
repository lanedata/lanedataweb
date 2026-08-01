// Exportador PNG del Estudio IG — sin dependencias.
//
// Funciona porque SlideCanvas usa exclusivamente estilos inline: basta con
// serializar el nodo a XHTML, envolverlo en un <svg><foreignObject> con las
// fuentes embebidas como data: URIs, cargarlo como imagen y pintarlo en un
// canvas 1080×1350. (Se probó html-to-image y se colgaba al reprocesar las
// hojas de estilo del documento; esto es más simple y más rápido.)

import { SLIDE_H, SLIDE_W } from './SlideCanvas'

// Debe coincidir con el @import de app/globals.css
const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;500&family=Inter:ital,wght@0,400;0,500;0,600;1,400&display=swap'

let fontCssCache: Promise<string> | null = null

async function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as string)
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(blob)
  })
}

/** CSS de las fuentes de marca con los .woff2 embebidos como data: URIs. */
function getFontCss(): Promise<string> {
  if (!fontCssCache) {
    fontCssCache = (async () => {
      const res = await fetch(FONT_CSS_URL)
      if (!res.ok) throw new Error(`No se pudo cargar el CSS de fuentes (${res.status})`)
      let css = await res.text()
      const urls = [...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]))]
      const dataUris = await Promise.all(
        urls.map(async (u) => blobToDataUri(await (await fetch(u)).blob()))
      )
      urls.forEach((u, i) => { css = css.split(u).join(dataUris[i]) })
      return css
    })()
    // si falla, permite reintentar en la próxima exportación
    fontCssCache.catch(() => { fontCssCache = null })
  }
  return fontCssCache
}

/** Clona el nodo e incrusta las <img> externas como data: URIs. */
async function cloneWithInlineImages(node: HTMLElement): Promise<HTMLElement> {
  const clone = node.cloneNode(true) as HTMLElement
  const originals = Array.from(node.querySelectorAll('img'))
  const clones = Array.from(clone.querySelectorAll('img'))
  await Promise.all(
    clones.map(async (img, i) => {
      const src = originals[i]?.src
      if (!src || src.startsWith('data:')) return
      try {
        img.src = await blobToDataUri(await (await fetch(src, { mode: 'cors' })).blob())
      } catch {
        throw new Error(
          'No se pudo incrustar la imagen de fondo (el servidor no permite CORS). ' +
          'Usa una imagen subida a Supabase o quítala.'
        )
      }
    })
  )
  return clone
}

/** Renderiza el nodo de una diapositiva (1080×1350, estilos inline) a PNG data URL. */
export async function slideToPng(node: HTMLElement): Promise<string> {
  await document.fonts.ready
  const [fontCss, clone] = await Promise.all([getFontCss(), cloneWithInlineImages(node)])

  const xhtml = new XMLSerializer().serializeToString(clone)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SLIDE_W}" height="${SLIDE_H}">` +
    `<foreignObject width="100%" height="100%"><style>${fontCss.replace(/</g, '')}</style>` +
    `${xhtml}</foreignObject></svg>`
  const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)

  const img = new Image()
  img.width = SLIDE_W
  img.height = SLIDE_H
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('El navegador no pudo renderizar la diapositiva'))
    img.src = svgUrl
  })
  // decode() asegura que la imagen está lista antes de pintarla
  if ('decode' in img) await img.decode().catch(() => undefined)

  const canvas = document.createElement('canvas')
  canvas.width = SLIDE_W
  canvas.height = SLIDE_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas no disponible')
  ctx.drawImage(img, 0, 0, SLIDE_W, SLIDE_H)
  return canvas.toDataURL('image/png')
}
