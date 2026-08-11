// Exportador PNG compartido por el Estudio IG (1080×1350) y las Historias
// (1080×1920). Sin dependencias.
//
// Funciona porque las tarjetas usan exclusivamente estilos inline: basta con
// serializar el nodo a XHTML, envolverlo en un <svg><foreignObject> con las
// fuentes embebidas como data: URIs, cargarlo como imagen y pintarlo en un
// canvas del tamaño pedido. (Se probó html-to-image y se colgaba al reprocesar
// las hojas de estilo del documento; esto es más simple y más rápido.)
//
// Las fuentes se piden a Google en el momento de exportar, no en la carga de la
// página: el sitio las sirve auto-alojadas vía next/font, pero el
// <foreignObject> necesita el CSS con los woff2 en línea para pintarlas.

const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2' +
  '?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700;12..96,800' +
  '&family=IBM+Plex+Mono:wght@400;500' +
  '&family=JetBrains+Mono:wght@400;500;700' +
  '&display=swap'

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
          'No se pudo incrustar una imagen (el servidor no permite CORS). ' +
          'Sube la foto desde el disco o usa una imagen alojada en Supabase.'
        )
      }
    })
  )
  return clone
}

/** Renderiza un nodo de estilos inline a PNG (data URL) del tamaño indicado. */
export async function nodeToPng(
  node: HTMLElement,
  width: number,
  height: number,
): Promise<string> {
  await document.fonts.ready
  const [fontCss, clone] = await Promise.all([getFontCss(), cloneWithInlineImages(node)])

  // La tarjeta se previsualiza escalada; el PNG se quiere a tamaño real.
  clone.style.transform = 'none'
  clone.style.margin = '0'

  const xhtml = new XMLSerializer().serializeToString(clone)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject width="100%" height="100%"><style>${fontCss.replace(/</g, '')}</style>` +
    `${xhtml}</foreignObject></svg>`
  const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)

  const img = new Image()
  img.width = width
  img.height = height
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('El navegador no pudo renderizar la tarjeta'))
    img.src = svgUrl
  })
  // decode() asegura que la imagen está lista antes de pintarla
  if ('decode' in img) await img.decode().catch(() => undefined)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas no disponible')
  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/png')
}

/** Descarga un data URL como fichero. */
export function downloadPng(dataUrl: string, name: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = name.endsWith('.png') ? name : `${name}.png`
  a.click()
}
