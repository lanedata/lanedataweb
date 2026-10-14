'use client'

// Plantillas de historia (1080×1920) del mercado de fichajes. Cada fichaje
// publicado se convierte solo en una historia lista para exportar.
//
// Cuatro plantillas, elegidas según el fichaje y con variación para que el
// perfil no repita siempre la misma imagen:
//   · oficial    — confirmado, fondo oscuro (alterna con «menta»)
//   · menta      — confirmado, fondo menta con sello OFICIAL
//   · rumor      — rumor: bordes discontinuos y cinta RUMOR
//   · incognita  — se sabe que se va (o que llega) pero no de/a dónde
// Dentro de cada plantilla cambian también el titular y algún detalle, con una
// elección estable por fichaje (el mismo fichaje sale siempre igual).
//
// Estilos inline a propósito, como el resto de historias: el exportador
// serializa el nodo y las clases del documento no llegan. Los textos son
// editables a mano antes de exportar.

import type { CSSProperties } from 'react'
import { BRAND, CREAM, DARK_BG, Ed, Footer, Header, MINT, MONO, cardBase } from './StoryCards'
import { lastNameSize } from './types'
import { partirNombre, tipoDe, type Fichaje } from '@/lib/fichajes/types'

export type Plantilla = 'oficial' | 'menta' | 'rumor' | 'incognita'

export const PLANTILLA_NOMBRE: Record<Plantilla, string> = {
  oficial: 'Oficial',
  menta: 'Menta',
  rumor: 'Rumor',
  incognita: 'Incógnita',
}

/** Hash estable (djb2) para que cada fichaje elija siempre la misma variante. */
function hash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return h >>> 0
}

export function plantillaAuto(f: Fichaje): Plantilla {
  if (tipoDe(f) !== 'completo') return 'incognita'
  if (f.estado === 'rumor') return 'rumor'
  return hash(f.id) % 2 === 0 ? 'oficial' : 'menta'
}

const KICKER_CONFIRMADO = ['FICHAJE CONFIRMADO', 'ES OFICIAL', 'CAMBIO DE CLUB', 'NUEVO DESTINO']
const KICKER_RUMOR = ['SE HABLA DE', 'RUMOR DE MERCADO', 'EN EL AIRE', 'SUENA FUERTE']
function elegir<T>(lista: T[], f: Fichaje, sal = ''): T {
  return lista[hash(f.id + sal) % lista.length]
}

/** "14 OCT 2026" para la cabecera. */
export function fechaHistoria(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace('.', '').toUpperCase()
}

/** Cuerpo del nombre de club según lo largo que sea. */
function tamClub(n: string, grande: boolean): number {
  const l = n.length
  if (grande) return l <= 14 ? 76 : l <= 22 ? 62 : l <= 30 ? 52 : 44
  return l <= 14 ? 56 : l <= 22 ? 48 : l <= 30 ? 42 : 36
}

const etiqueta: CSSProperties = { fontSize: 24, letterSpacing: 6 }

// ─── Piezas comunes ──────────────────────────────────────────────────────────

function Nombre({ f, color, kicker, kickerColor }: { f: Fichaje; color: string; kicker: string; kickerColor: string }) {
  const { nombre, apellidos } = partirNombre(f.atleta)
  return (
    <div style={{ padding: '96px 72px 0' }}>
      <Ed style={{ fontSize: 30, letterSpacing: 7, color: kickerColor, marginBottom: 26 }}>{kicker}</Ed>
      {nombre && (
        <Ed style={{ fontFamily: BRAND, fontWeight: 700, fontSize: 64, lineHeight: 1, letterSpacing: '-1.5px', color }}>
          {nombre}
        </Ed>
      )}
      <Ed
        style={{
          fontFamily: BRAND, fontWeight: 800, fontSize: lastNameSize(apellidos.split(' ')[0] ?? apellidos),
          lineHeight: 0.92, letterSpacing: '-3px', color, marginTop: 6, textTransform: 'uppercase',
        }}
      >
        {apellidos}
      </Ed>
    </div>
  )
}

function PanelClub({
  rotulo, nombre, division, grande, fondo, color, borde, rotuloColor,
}: {
  rotulo: string
  nombre: string
  division: string | null
  grande?: boolean
  fondo: string
  color: string
  borde: string
  rotuloColor: string
}) {
  return (
    <div style={{ background: fondo, border: borde, padding: '34px 40px' }}>
      <div style={{ ...etiqueta, color: rotuloColor }}>{rotulo}</div>
      <Ed style={{
        fontFamily: BRAND, fontWeight: grande ? 800 : 700, fontSize: tamClub(nombre, !!grande),
        lineHeight: 1.02, letterSpacing: '-1.5px', color, marginTop: 14,
      }}>
        {nombre}
      </Ed>
      {division && (
        <div style={{ marginTop: 18, display: 'inline-block', border: `1.5px solid ${rotuloColor}`, padding: '8px 18px', fontSize: 22, letterSpacing: 4, color: rotuloColor }}>
          {division.toUpperCase()}
        </div>
      )}
    </div>
  )
}

function Flecha({ color }: { color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '22px 0' }}>
      <svg width="88" height="88" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v17M5 13l7 7 7-7" />
      </svg>
    </div>
  )
}

function Incognita({ rotulo, color, borde }: { rotulo: string; color: string; borde: string }) {
  return (
    <div style={{ border: borde, padding: '30px 40px', display: 'flex', alignItems: 'center', gap: 40 }}>
      <div style={{ fontFamily: BRAND, fontWeight: 800, fontSize: 260, lineHeight: 0.8, color }}>?</div>
      <div>
        <div style={{ ...etiqueta, color }}>{rotulo}</div>
        <Ed style={{ fontFamily: BRAND, fontWeight: 700, fontSize: 48, lineHeight: 1.05, color, marginTop: 12 }}>
          Por confirmar
        </Ed>
      </div>
    </div>
  )
}

// ─── Tarjeta ─────────────────────────────────────────────────────────────────

export function FichajeCard({ id, f, plantilla }: { id: string; f: Fichaje; plantilla: Plantilla }) {
  const fecha = fechaHistoria(f.informado_en)
  const rumor = f.estado === 'rumor'
  const kicker = rumor ? elegir(KICKER_RUMOR, f) : elegir(KICKER_CONFIRMADO, f)

  // ── Menta: fondo claro y sello OFICIAL ──
  if (plantilla === 'menta') {
    const INK = '#0c2a18'
    return (
      <div id={id} style={{ ...cardBase, background: '#93E393', color: INK }}>
        <Header fecha={fecha} dark={false} />
        <div style={{
          position: 'absolute', top: 230, right: 64, transform: 'rotate(8deg)',
          border: `5px solid ${INK}`, padding: '14px 30px', fontFamily: BRAND, fontWeight: 800,
          fontSize: 56, letterSpacing: '2px', color: INK,
        }}>
          {rumor ? 'RUMOR' : 'OFICIAL'}
        </div>
        <Nombre f={f} color={INK} kicker={kicker} kickerColor="#1d5a33" />
        <div style={{ position: 'absolute', left: 72, right: 72, top: 820 }}>
          <PanelClub rotulo="SALE DE" nombre={f.club_origen ?? '?'} division={f.division_origen}
            fondo="rgba(12,42,24,0.06)" color={INK} borde={`2px solid rgba(12,42,24,0.25)`} rotuloColor="#2f6b42" />
          <Flecha color={INK} />
          <PanelClub rotulo="FICHA POR" nombre={f.club_destino ?? '?'} division={f.division_destino} grande
            fondo={INK} color="#93E393" borde={`2px solid ${INK}`} rotuloColor="#93E393" />
        </div>
        <Footer dark={false} />
      </div>
    )
  }

  // ── Rumor: discontinuo y con cinta ──
  if (plantilla === 'rumor') {
    const cinta = elegir(['RUMOR · RUMOR · RUMOR · RUMOR · RUMOR', 'SIN CONFIRMAR · SIN CONFIRMAR · SIN CONFIRMAR'], f, 'cinta')
    return (
      <div id={id} style={{ ...cardBase, background: DARK_BG }}>
        {/* La cinta cruza entre el nombre y los clubes: arriba tapaba el titular. */}
        <div style={{
          position: 'absolute', top: 742, left: -120, right: -120, transform: 'rotate(-5deg)',
          background: MINT, color: '#0c2a18', padding: '16px 0', textAlign: 'center',
          fontSize: 30, letterSpacing: 10, fontFamily: MONO, fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          {cinta}
        </div>
        <Header fecha={fecha} />
        <Nombre f={f} color="#f0efe3" kicker={kicker} kickerColor={MINT} />
        <div style={{ position: 'absolute', left: 72, right: 72, top: 880 }}>
          <PanelClub rotulo="SALDRÍA DE" nombre={f.club_origen ?? '?'} division={f.division_origen}
            fondo="transparent" color={CREAM} borde="3px dashed rgba(238,237,224,0.35)" rotuloColor="#9fc2aa" />
          <Flecha color={MINT} />
          <PanelClub rotulo="DESTINO QUE SUENA" nombre={f.club_destino ?? '?'} division={f.division_destino} grande
            fondo="rgba(143,227,143,0.08)" color={MINT} borde={`3px dashed ${MINT}`} rotuloColor={MINT} />
          <Ed style={{ marginTop: 34, fontSize: 24, letterSpacing: 5, color: '#9fc2aa' }}>
            PENDIENTE DE CONFIRMACIÓN OFICIAL
          </Ed>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Incógnita: un lado del movimiento se desconoce ──
  if (plantilla === 'incognita') {
    const sinDestino = !f.club_destino
    return (
      <div id={id} style={{ ...cardBase, background: DARK_BG }}>
        <Header fecha={fecha} />
        <Nombre
          f={f} color="#f0efe3" kickerColor={MINT}
          kicker={sinDestino ? (rumor ? 'PODRÍA DEJAR SU CLUB' : 'DEJA SU CLUB') : (rumor ? 'PODRÍA LLEGAR A' : 'NUEVA INCORPORACIÓN')}
        />
        <div style={{ position: 'absolute', left: 72, right: 72, top: 820 }}>
          {f.club_origen
            ? <PanelClub rotulo="SALE DE" nombre={f.club_origen} division={f.division_origen}
                fondo="rgba(238,237,224,0.05)" color={CREAM} borde="2px solid rgba(238,237,224,0.25)" rotuloColor="#9fc2aa" />
            : <Incognita rotulo="PROCEDENCIA" color="#9fc2aa" borde="3px dashed rgba(238,237,224,0.35)" />}
          <Flecha color={MINT} />
          {f.club_destino
            ? <PanelClub rotulo="FICHA POR" nombre={f.club_destino} division={f.division_destino} grande
                fondo={MINT} color="#0c2a18" borde={`2px solid ${MINT}`} rotuloColor="#1d5a33" />
            : <Incognita rotulo="SU DESTINO" color={MINT} borde={`3px dashed ${MINT}`} />}
        </div>
        <Footer />
      </div>
    )
  }

  // ── Oficial (por defecto): oscuro, destino en menta ──
  return (
    <div id={id} style={{ ...cardBase, background: DARK_BG }}>
      <Header fecha={fecha} />
      <Nombre f={f} color="#f0efe3" kicker={kicker} kickerColor={MINT} />
      <div style={{ position: 'absolute', left: 72, right: 72, top: 820 }}>
        <PanelClub rotulo="SALE DE" nombre={f.club_origen ?? '?'} division={f.division_origen}
          fondo="rgba(238,237,224,0.05)" color={CREAM} borde="2px solid rgba(238,237,224,0.25)" rotuloColor="#9fc2aa" />
        <Flecha color={MINT} />
        <PanelClub rotulo="FICHA POR" nombre={f.club_destino ?? '?'} division={f.division_destino} grande
          fondo={MINT} color="#0c2a18" borde={`2px solid ${MINT}`} rotuloColor="#1d5a33" />
      </div>
      <Footer />
    </div>
  )
}
