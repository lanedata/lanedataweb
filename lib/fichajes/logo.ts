// Tratamiento de escudos en el navegador: quitar el fondo liso que traen
// muchos logos (JPG o PNG con recuadro) y saber si el logo es claro.
//
// Quitar el fondo: se toma el color de las esquinas y se borra, por relleno
// desde los bordes, todo lo que se le parezca. Así se va el recuadro pero no
// el blanco que esté DENTRO del escudo (no toca los bordes).

export type TipoLogo = 'limpio' | 'claro'
export interface LogoTratado { url: string; proporcion: number; tipo: TipoLogo; teniaFondo: boolean }

const cache = new Map<string, Promise<LogoTratado | null>>()
const LADO = 320 // tamaño máximo del lado al procesar

export function tratarLogo(url: string, quitarFondo: boolean): Promise<LogoTratado | null> {
  const k = `${quitarFondo ? 1 : 0}|${url}`
  let p = cache.get(k)
  if (!p) {
    p = cargar(url).then((im) => (im ? procesar(im, url, quitarFondo) : null)).catch(() => null)
    cache.set(k, p)
  }
  return p
}

function cargar(url: string): Promise<HTMLImageElement | null> {
  return new Promise((ok) => {
    const im = new Image()
    im.crossOrigin = 'anonymous'
    im.onload = () => ok(im)
    im.onerror = () => ok(null)
    im.src = url
  })
}

function procesar(im: HTMLImageElement, url: string, quitar: boolean): LogoTratado {
  const nw = im.naturalWidth || 100, nh = im.naturalHeight || 100
  const proporcion = nw / nh
  const esc = Math.min(1, LADO / Math.max(nw, nh))
  const w = Math.max(1, Math.round(nw * esc)), h = Math.max(1, Math.round(nh * esc))
  try {
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(im, 0, 0, w, h)
    const datos = ctx.getImageData(0, 0, w, h)
    const d = datos.data

    const esquinas = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].map(([x, y]) => (y * w + x) * 4)
    const teniaFondo = esquinas.every((i) => d[i + 3] > 200)
      && esquinas.every((i) => dist(d, i, esquinas[0]) < 60)

    if (teniaFondo && quitar) {
      const fondo = [0, 1, 2].map((k) => esquinas.reduce((s, i) => s + d[i + k], 0) / 4)
      borrarFondo(d, w, h, fondo)
      ctx.putImageData(datos, 0, 0)
    }

    const tipo = esClaro(d) ? 'claro' : 'limpio'
    if (!(teniaFondo && quitar)) return { url, proporcion, tipo, teniaFondo }
    // Sin el fondo suele sobrar margen: se recorta a lo visible.
    const caja = recortar(d, w, h)
    if (!caja) return { url, proporcion, tipo, teniaFondo }
    const [x0, y0, cw, ch] = caja
    const c2 = document.createElement('canvas')
    c2.width = cw; c2.height = ch
    c2.getContext('2d')!.drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch)
    return { url: c2.toDataURL('image/png'), proporcion: cw / ch, tipo, teniaFondo }
  } catch {
    return { url, proporcion, tipo: 'limpio', teniaFondo: false } // sin CORS: tal cual
  }
}

function dist(d: Uint8ClampedArray, i: number, j: number): number {
  return Math.abs(d[i] - d[j]) + Math.abs(d[i + 1] - d[j + 1]) + Math.abs(d[i + 2] - d[j + 2])
}

/** Relleno desde los bordes: transparente lo parecido al fondo, suavizando el contorno. */
function borrarFondo(d: Uint8ClampedArray, w: number, h: number, fondo: number[]) {
  const TOL = 70, SUAVE = 120
  const difDe = (p: number) => Math.abs(d[p * 4] - fondo[0]) + Math.abs(d[p * 4 + 1] - fondo[1]) + Math.abs(d[p * 4 + 2] - fondo[2])
  const visto = new Uint8Array(w * h)
  const pila: number[] = []
  for (let x = 0; x < w; x++) pila.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) pila.push(y * w, y * w + w - 1)
  while (pila.length) {
    const p = pila.pop()!
    if (visto[p]) continue
    visto[p] = 1
    const dif = difDe(p)
    if (dif >= SUAVE) continue
    // Cerca del fondo: fuera del todo; en la transición, medio transparente.
    d[p * 4 + 3] = dif < TOL ? 0 : Math.round(d[p * 4 + 3] * (dif - TOL) / (SUAVE - TOL))
    if (dif >= TOL) continue
    const x = p % w
    if (x > 0) pila.push(p - 1)
    if (x < w - 1) pila.push(p + 1)
    if (p >= w) pila.push(p - w)
    if (p < w * (h - 1)) pila.push(p + w)
  }
}

/** Caja [x, y, ancho, alto] de lo que queda visible. */
function recortar(d: Uint8ClampedArray, w: number, h: number): [number, number, number, number] | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  return x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1]
}

/** ¿Lo visible es casi todo blanco? (no se vería sobre papel) */
function esClaro(d: Uint8ClampedArray): boolean {
  let suma = 0, n = 0
  for (let k = 0; k < d.length; k += 16) {
    if (d[k + 3] < 64) continue
    suma += 0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2]
    n++
  }
  return n > 20 && suma / n > 215
}
