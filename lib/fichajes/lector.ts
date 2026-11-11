// Lector de capturas del mercado de fichajes.
//
// Sube (o pega) una captura de donde sea —un post de Instagram, un tuit, una
// nota de prensa, un WhatsApp— y se rellena el formulario solo:
//   1. OCR en el propio navegador (tesseract.js, gratis, sin servidor). Se lee
//      la imagen dos veces, normal e invertida, porque en los carteles hay
//      mucho texto claro sobre fondo oscuro.
//   2. El texto se cruza con la base de atletas y clubes de la RFEA: no hace
//      falta que el OCR sea perfecto, basta con que acierte nombre + apellido.
//   3. Pistas del texto: «procedente de», «ficha por», «oficial», «rumor»,
//      «bienvenida»… deciden origen/destino, estado y sexo.
// Todo queda editable: el lector solo propone.

import { cargarDatos, type Atleta, type Club } from './datos'
import { normalizar, type EstadoFichaje, type Genero } from './types'

export interface Lectura {
  texto: string
  /** Candidatos ordenados de más a menos probable. */
  atletas: Atleta[]
  clubes: Club[]
  origen: string | null
  destino: string | null
  estado: EstadoFichaje | null
  genero: Genero | null
  fuente: string | null
}

// ─── OCR ─────────────────────────────────────────────────────────────────────

async function prepararImagen(file: Blob, invertir: boolean): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file)
  // El OCR va mejor con letra grande: se escala hasta ~1600 px de ancho.
  const escala = Math.min(3, Math.max(1, 1600 / bmp.width))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * escala)
  c.height = Math.round(bmp.height * escala)
  const ctx = c.getContext('2d')!
  ctx.filter = `grayscale(1) contrast(1.4)${invertir ? ' invert(1)' : ''}`
  ctx.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  return c
}

export async function leerTexto(file: Blob, onProgreso?: (p: number) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  let fase = 0
  const worker = await createWorker('spa', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgreso?.((fase + m.progress) / 2)
    },
  })
  try {
    const normal = await worker.recognize(await prepararImagen(file, false))
    fase = 1
    const invertida = await worker.recognize(await prepararImagen(file, true))
    return `${normal.data.text}\n${invertida.data.text}`
  } finally {
    await worker.terminate()
  }
}

// ─── Interpretación ──────────────────────────────────────────────────────────

/** Palabras que no distinguen a un club de otro. */
const VACIAS = new Set([
  'club', 'atletismo', 'atletisme', 'atletismoa', 'athletics', 'athletic', 'running', 'runners', 'team', 'de', 'del', 'la', 'el', 'los', 'las',
  'y', 'i', 'a', 'ad', 'ca', 'cd', 'cda', 'cdb', 'ce', 'sd', 'ud', 'ac', 'aa', 'sociedad', 'deportiva', 'deportivo',
  'agrupacion', 'asociacion', 'escuela', 'esc', 'c', 'd', 'e', 's', 'u', 'cluba', 'sad', 'at', 'atl',
])

const PISTAS_ORIGEN = ['procedente', 'procede', 'deja', 'dejara', 'abandona', 'sale de', 'saldria', 'desde', 'viene de', 'llega desde', 'despide', 'adios', 'gracias']
const PISTAS_DESTINO = ['ficha por', 'fichara', 'se une', 'llega a', 'nuevo atleta', 'nueva atleta', 'refuerza', 'rumbo a', 'nuevo fichaje', 'bienvenid', 'se incorpora', 'competira con', 'vestira', 'defendera', 'nuevo club', 'firma con', 'jugara']
const PISTAS_CONFIRMADO = ['oficial', 'confirmad', 'bienvenid', 'nuevo fichaje', 'nueva incorporacion', 'se incorpora', 'anuncia', 'firma', 'ya es', 'comunicado', 'presentamos', 'damos la bienvenida']
const PISTAS_RUMOR = ['rumor', 'podria', 'suena', 'segun', 'apunta', 'estaria', 'negocia', 'cerca de', 'se habla', 'interes', 'fuentes', 'todo apunta']
const PISTAS_MUJER = ['bienvenida', 'nuestra nueva', 'nueva atleta', 'la atleta', 'femenin', 'ella ']
const PISTAS_HOMBRE = ['bienvenido', 'nuestro nuevo', 'nuevo atleta', 'el atleta', 'masculin']

function cuenta(texto: string, pistas: string[]): number {
  return pistas.reduce((n, p) => n + (texto.includes(p) ? 1 : 0), 0)
}

interface IndiceLector {
  atletasTok: string[][]
  clubesTok: string[][]
}
let indice: IndiceLector | null = null

async function prepararIndice() {
  const d = await cargarDatos()
  if (!indice) {
    indice = {
      atletasTok: d.atletasNorm.map((n) => n.split(' ')),
      clubesTok: d.clubesNorm.map((n) => n.split(' ').filter((w) => w.length > 1 && !VACIAS.has(w))),
    }
  }
  return { d, ix: indice }
}

export async function interpretar(textoBruto: string): Promise<Lectura> {
  const { d, ix } = await prepararIndice()
  const norm = normalizar(textoBruto)
  const toks = norm.split(' ').filter(Boolean)
  const posiciones = new Map<string, number[]>()
  toks.forEach((t, i) => { const l = posiciones.get(t); if (l) l.push(i); else posiciones.set(t, [i]) })

  // Tolerancia a UNA letra de diferencia en palabras largas (errores del OCR o
  // de la propia base): «Cucarella» encuentra «Cucarellla» y al revés.
  const borrados = (w: string) => Array.from({ length: w.length }, (_, k) => w.slice(0, k) + w.slice(k + 1))
  const variantes = new Map<string, number[]>()
  toks.forEach((t, i) => {
    if (t.length < 5) return
    for (const v of borrados(t)) { const l = variantes.get(v); if (l) l.push(i); else variantes.set(v, [i]) }
  })
  const posDe = (w: string): number[] | undefined => {
    const exacta = posiciones.get(w)
    if (exacta || w.length < 5) return exacta
    const v = variantes.get(w)
    if (v) return v
    for (const d of borrados(w)) { const r = posiciones.get(d) ?? variantes.get(d); if (r) return r }
    return undefined
  }

  // ── Atletas: nombre de pila + al menos un apellido, mejor si van seguidos ──
  const cand: { i: number; score: number; pos: number }[] = []
  for (let i = 0; i < ix.atletasTok.length; i++) {
    const t = ix.atletasTok[i]
    if (t.length < 2) continue
    const corte = t.length >= 4 ? 2 : 1
    const nombre = t.slice(0, corte)
    const apellidos = t.slice(corte)
    const pNombre = posiciones.get(nombre[0])
    if (!pNombre) continue
    const apEnTexto = apellidos.filter((a) => a.length >= 3 && posDe(a))
    if (apEnTexto.length === 0) continue
    let score = apEnTexto.length * 2 + nombre.filter((n) => posiciones.has(n)).length
    // Bonus si el primer apellido sigue (casi) al nombre en el texto.
    const pAp = posDe(apellidos[0]) ?? []
    if (pNombre.some((p) => pAp.some((q) => q > p && q - p <= corte + 1))) score += 4
    if (apEnTexto.length === apellidos.length) score += 1
    cand.push({ i, score, pos: Math.min(...pNombre) })
  }
  cand.sort((a, b) => b.score - a.score || a.pos - b.pos)
  const atletas = cand.slice(0, 5).map((c) => d.atletas[c.i])

  // ── Clubes: todas sus palabras distintivas aparecen en el texto ──
  const encontrados: { c: Club; pos: number; peso: number }[] = []
  for (let i = 0; i < ix.clubesTok.length; i++) {
    const t = ix.clubesTok[i]
    if (t.length === 0 || !t.some((w) => w.length >= 4)) continue
    const dentro = t.filter((w) => posDe(w))
    if (dentro.length < t.length && !(dentro.length >= 2 && dentro.length / t.length >= 0.66)) continue
    const pos = Math.min(...dentro.map((w) => posDe(w)![0]))
    encontrados.push({ c: d.clubes[i], pos, peso: dentro.length })
  }
  // Si un club está contenido en otro más largo (Valencia ⊂ Valencia Esports), gana el largo.
  encontrados.sort((a, b) => b.peso - a.peso || a.pos - b.pos)
  const clubes: { c: Club; pos: number }[] = []
  for (const e of encontrados) {
    if (clubes.some((x) => Math.abs(x.pos - e.pos) <= 1)) continue
    clubes.push(e)
    if (clubes.length >= 4) break
  }
  clubes.sort((a, b) => a.pos - b.pos)

  // ── Origen y destino ──
  const atleta = atletas[0] ?? null
  const contexto = (pos: number) => toks.slice(Math.max(0, pos - 5), pos).join(' ')
  let origen: string | null = null
  let destino: string | null = null
  for (const { c, pos } of clubes) {
    const ctx = contexto(pos)
    if (!destino && cuenta(ctx, PISTAS_DESTINO) > 0) destino = c.n
    else if (!origen && cuenta(ctx, PISTAS_ORIGEN) > 0) origen = c.n
  }
  const clubDelAtleta = atleta?.club?.n ?? null
  if (!origen && clubDelAtleta && clubDelAtleta !== destino) origen = clubDelAtleta
  for (const { c } of clubes) {
    if (c.n === origen || c.n === destino) continue
    if (!destino) destino = c.n
    else if (!origen) origen = c.n
  }

  // ── Estado y sexo ──
  const rumor = cuenta(norm, PISTAS_RUMOR)
  const conf = cuenta(norm, PISTAS_CONFIRMADO)
  const estado: EstadoFichaje | null = rumor > conf ? 'rumor' : conf > 0 ? 'confirmado' : null
  const m = cuenta(norm, PISTAS_MUJER), h = cuenta(norm, PISTAS_HOMBRE)
  const genero: Genero | null = atleta?.genero ?? (m > h ? 'M' : h > m ? 'H' : null)

  // ── Fuente: la primera @cuenta que aparezca ──
  const arroba = textoBruto.match(/@[A-Za-z0-9_.]{3,30}/)
  const fuente = arroba ? `Captura · ${arroba[0]}` : 'Captura'

  return { texto: textoBruto.trim(), atletas, clubes: clubes.map((x) => x.c), origen, destino, estado, genero, fuente }
}
