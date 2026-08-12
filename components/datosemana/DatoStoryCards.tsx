'use client'

// Story de "El dato de la semana" a 1080×1920. Misma estética de marca que las
// Historias, pensada para llevar SIEMPRE una foto de fondo (con degradado para
// legibilidad); si no hay foto, cae a un fondo tinta y muestra el hueco.
//
// 4 variantes visuales para que no salga siempre igual:
//
//   1 · Aniversario — foto a sangre, año de marca de agua, pills abajo.
//   2 · Número       — foto a sangre + el valor destacado GIGANTE abajo.
//   3 · Postal       — foto arriba, banda menta abajo con el texto.
//   4 · Foto          — foto protagonista, texto mínimo abajo.
//
// Todo va en estilos inline: el exportador serializa el nodo dentro de un
// <svg><foreignObject>, donde las clases CSS del documento no llegan. Los
// textos son contentEditable para retocarlos a mano antes de exportar.

import type { CSSProperties, ReactNode } from 'react'
import type { DatoSemana } from '@/lib/datosemana/types'
import { STORY_H, STORY_W, titularSize } from '@/lib/datosemana/types'

const BRAND = "'Bricolage Grotesque', sans-serif"
const MONO = "'JetBrains Mono', var(--font-story-mono), monospace"

const CREAM = '#eae9dc'
const MINT = '#8FE38F'
const INK = '#0c2a18'
const DARK_BG = 'radial-gradient(120% 85% at 28% 0%, #1c3d29 0%, #0d2317 46%, #071810 100%)'

const cardBase: CSSProperties = {
  width: STORY_W,
  height: STORY_H,
  transformOrigin: 'top left',
  position: 'relative',
  overflow: 'hidden',
  color: CREAM,
  fontFamily: MONO,
}

function Ed({ children, style, tag = 'div' }: { children: ReactNode; style?: CSSProperties; tag?: 'div' | 'span' }) {
  const Tag = tag
  return (
    <Tag contentEditable suppressContentEditableWarning style={style}>
      {children}
    </Tag>
  )
}

function LogoMark({ size = 68 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ display: 'block', borderRadius: '50%' }} aria-hidden="true">
      <rect width="200" height="200" fill="#9FE88D" />
      <ellipse cx="74" cy="108" rx="18" ry="26" fill="#0D2A14" />
      <ellipse cx="126" cy="108" rx="18" ry="26" fill="#0D2A14" />
      <circle cx="67" cy="96" r="5.5" fill="#9FE88D" />
      <circle cx="119" cy="96" r="5.5" fill="#9FE88D" />
    </svg>
  )
}

function MundoAtletismoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <g fill="none" strokeLinejoin="round">
        <rect x="10" y="18" width="80" height="64" rx="32" stroke="#12331C" strokeWidth="3.4" />
        <rect x="20" y="28" width="60" height="44" rx="22" stroke="#12331C" strokeWidth="3.4" />
        <rect x="30" y="38" width="40" height="24" rx="12" stroke="#34804A" strokeWidth="3.8" />
      </g>
    </svg>
  )
}

/** Cabecera: marca + etiqueta a la derecha (categoría o fecha histórica). */
function Header({ right, dark = true }: { right?: string; dark?: boolean }) {
  return (
    <div style={{ padding: '64px 72px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 3 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <LogoMark />
        <span style={{ fontFamily: BRAND, fontWeight: 800, fontSize: 44, letterSpacing: '-1px', color: dark ? CREAM : INK }}>
          lanedata
        </span>
      </div>
      {right != null && (
        <Ed
          tag="span"
          style={{
            border: `1.5px solid ${dark ? 'rgba(238,237,224,0.4)' : 'rgba(12,42,24,0.35)'}`,
            padding: '14px 30px', fontSize: 24, letterSpacing: 4, whiteSpace: 'nowrap',
            color: dark ? CREAM : INK,
            background: dark ? 'rgba(7,24,16,0.28)' : 'transparent',
          }}
        >
          {right}
        </Ed>
      )}
    </div>
  )
}

function Footer({ dark = true }: { dark?: boolean }) {
  return (
    <div style={{ position: 'absolute', left: 72, right: 72, bottom: 56, zIndex: 3 }}>
      <div style={{ height: 1, background: dark ? 'rgba(238,237,224,0.22)' : 'rgba(12,42,24,0.25)', marginBottom: 32 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <div style={{ width: 64, height: 64, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MundoAtletismoMark />
        </div>
        <span style={{ fontSize: 22, letterSpacing: 5, color: dark ? '#a7c6b0' : '#3f6a4d' }}>POWERED BY</span>
        <span style={{ fontFamily: BRAND, fontWeight: 700, fontSize: 30, color: dark ? CREAM : INK }}>mundo atletismo</span>
      </div>
    </div>
  )
}

function Kicker({ text, color = MINT, dark = true }: { text: string; color?: string; dark?: boolean }) {
  return (
    <Ed style={{ fontSize: 30, letterSpacing: 8, color: dark ? color : INK, marginBottom: 24 }}>
      {(text || '').toUpperCase()}
    </Ed>
  )
}

export interface DatoCardProps {
  id: string
  dato: DatoSemana
  variant: number
  /** Refs imperativas de la foto (encuadre sin re-render). */
  imgRef: (el: HTMLImageElement | null) => void
  placeholderRef: (el: HTMLDivElement | null) => void
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void
}

/** Capa de foto + placeholder (hueco cuando no hay foto). */
function PhotoLayer({
  imgRef, placeholderRef, overlay, placeholderTop = '30%',
}: Pick<DatoCardProps, 'imgRef' | 'placeholderRef'> & { overlay: string; placeholderTop?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        draggable={false}
        alt=""
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', transformOrigin: 'center', userSelect: 'none', display: 'none',
        }}
      />
      <div style={{ position: 'absolute', inset: 0, background: overlay }} />
      <div
        ref={placeholderRef}
        style={{
          position: 'absolute', top: placeholderTop, left: '50%', transform: 'translate(-50%,-50%)',
          border: '2px dashed rgba(238,237,224,0.35)', padding: '40px 56px',
          textAlign: 'center', color: '#bcd6c3', zIndex: 2,
        }}
      >
        <div style={{ fontSize: 34, letterSpacing: 2 }}>Sube una foto</div>
        <div style={{ fontSize: 24, color: '#84a98f', marginTop: 12 }}>y arrástrala para encuadrar</div>
      </div>
    </>
  )
}

function DragLayer({ onPointerDown, onPointerMove, onPointerUp }: Pick<DatoCardProps, 'onPointerDown' | 'onPointerMove' | 'onPointerUp'>) {
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ position: 'absolute', inset: 0, zIndex: 9, touchAction: 'none' }}
    />
  )
}

/** Tamaño del valor destacado gigante (variante 2) según su longitud. */
function bigMarkSize(v: string): number {
  const n = String(v || '').length
  if (n <= 2) return 300
  if (n <= 4) return 232
  if (n <= 6) return 184
  if (n <= 9) return 140
  return 112
}

export function DatoCard(props: DatoCardProps) {
  const { id, dato: d, variant } = props
  const right = d.categoria || d.fechaHistorica || undefined

  // ─── Variante 3 · Postal (foto arriba, banda menta abajo) ──────────────────
  if (variant === 3) {
    return (
      <div id={id} style={{ ...cardBase, background: DARK_BG }}>
        <PhotoLayer
          imgRef={props.imgRef}
          placeholderRef={props.placeholderRef}
          placeholderTop="26%"
          overlay="linear-gradient(to bottom, rgba(7,24,16,0.55) 0%, rgba(7,24,16,0.12) 18%, rgba(7,24,16,0) 34%, rgba(7,24,16,0) 46%, #93E393 52%)"
        />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          <Header right={right} />
        </div>
        {/* Banda menta */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 900, background: '#93E393', color: INK, padding: '72px 72px 0' }}>
          <Kicker text={d.kicker} dark={false} />
          <Ed style={{ fontFamily: BRAND, fontWeight: 800, lineHeight: 0.98, letterSpacing: '-2px', color: INK, fontSize: titularSize(d.titular) }}>
            {d.titular}
          </Ed>
          {d.contexto && (
            <Ed style={{ fontSize: 28, lineHeight: 1.42, color: 'rgba(12,42,24,0.72)', marginTop: 26, maxWidth: 900 }}>{d.contexto}</Ed>
          )}
          {d.destacado && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 22, marginTop: 44, background: INK, color: CREAM, padding: '24px 42px' }}>
              <Ed tag="span" style={{ fontFamily: BRAND, fontWeight: 800, fontSize: 68, lineHeight: 1, color: MINT }}>{d.destacado}</Ed>
              {d.destacadoLabel && (
                <Ed tag="span" style={{ fontSize: 24, letterSpacing: 4, color: '#9fb9a6', maxWidth: 320 }}>{(d.destacadoLabel || '').toUpperCase()}</Ed>
              )}
            </div>
          )}
        </div>
        <Footer dark={false} />
        <DragLayer {...props} />
      </div>
    )
  }

  // ─── Variante 2 · Número gigante sobre foto ────────────────────────────────
  if (variant === 2) {
    return (
      <div id={id} style={{ ...cardBase, background: DARK_BG, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <PhotoLayer
          imgRef={props.imgRef}
          placeholderRef={props.placeholderRef}
          overlay="linear-gradient(to top, #061912 6%, rgba(6,25,18,0.94) 30%, rgba(6,25,18,0.55) 56%, rgba(6,25,18,0.2) 80%, rgba(6,25,18,0.4) 100%)"
        />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          <Header right={right} />
        </div>
        <div style={{ position: 'relative', zIndex: 3, margin: '0 72px 150px' }}>
          <Kicker text={d.kicker} />
          {d.destacado && (
            <Ed style={{ fontFamily: BRAND, fontWeight: 800, lineHeight: 0.82, letterSpacing: '-5px', color: MINT, fontSize: bigMarkSize(d.destacado) }}>
              {d.destacado}
            </Ed>
          )}
          {d.destacadoLabel && (
            <Ed style={{ fontSize: 32, letterSpacing: 7, color: '#bcd6c3', marginTop: 6, marginBottom: 34 }}>
              {(d.destacadoLabel || '').toUpperCase()}
            </Ed>
          )}
          <Ed style={{ fontFamily: BRAND, fontWeight: 700, lineHeight: 1.02, letterSpacing: '-1.5px', color: '#f0efe3', fontSize: Math.min(72, titularSize(d.titular)), maxWidth: 900 }}>
            {d.titular}
          </Ed>
          {d.contexto && (
            <Ed style={{ fontSize: 27, lineHeight: 1.42, color: '#d5e4d9', marginTop: 22, maxWidth: 860 }}>{d.contexto}</Ed>
          )}
        </div>
        <Footer />
        <DragLayer {...props} />
      </div>
    )
  }

  // ─── Variante 4 · Foto protagonista (texto mínimo) ─────────────────────────
  if (variant === 4) {
    return (
      <div id={id} style={{ ...cardBase, background: DARK_BG, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <PhotoLayer
          imgRef={props.imgRef}
          placeholderRef={props.placeholderRef}
          overlay="linear-gradient(to top, #0a2416 4%, rgba(10,36,22,0.9) 24%, rgba(10,36,22,0.3) 50%, rgba(10,36,22,0.08) 72%, rgba(10,36,22,0.28) 100%)"
        />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          <Header right={right} />
        </div>
        <div style={{ position: 'relative', zIndex: 3, margin: '0 72px 150px' }}>
          <Kicker text={d.kicker} />
          {d.destacado && (
            <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 18, marginBottom: 26 }}>
              <Ed tag="span" style={{ fontFamily: BRAND, fontWeight: 800, fontSize: 132, lineHeight: 0.9, letterSpacing: '-3px', color: MINT }}>{d.destacado}</Ed>
              {d.destacadoLabel && (
                <Ed tag="span" style={{ fontSize: 26, letterSpacing: 4, color: '#bcd6c3' }}>{(d.destacadoLabel || '').toUpperCase()}</Ed>
              )}
            </div>
          )}
          <Ed style={{ fontFamily: BRAND, fontWeight: 800, lineHeight: 0.98, letterSpacing: '-2px', color: '#f4f3e8', fontSize: titularSize(d.titular) + 4 }}>
            {d.titular}
          </Ed>
          {d.contexto && (
            <Ed style={{ fontSize: 28, lineHeight: 1.42, color: '#d5e4d9', marginTop: 24, maxWidth: 860 }}>{d.contexto}</Ed>
          )}
        </div>
        <Footer />
        <DragLayer {...props} />
      </div>
    )
  }

  // ─── Variante 1 · Aniversario (por defecto) ────────────────────────────────
  return (
    <div id={id} style={{ ...cardBase, background: DARK_BG, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <PhotoLayer
        imgRef={props.imgRef}
        placeholderRef={props.placeholderRef}
        overlay="linear-gradient(to top, #0a2416 6%, rgba(10,36,22,0.9) 30%, rgba(10,36,22,0.5) 60%, rgba(10,36,22,0.32) 100%)"
      />
      {/* Año como marca de agua */}
      {d.anio && (
        <span style={{ position: 'absolute', top: 300, right: 40, fontFamily: BRAND, fontWeight: 800, fontSize: 460, lineHeight: 1, letterSpacing: '-10px', color: 'rgba(143,227,143,0.1)', zIndex: 1, pointerEvents: 'none' }}>
          {d.anio}
        </span>
      )}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <Header right={right} />
      </div>
      <div style={{ position: 'relative', zIndex: 3, margin: '0 72px 150px' }}>
        <Kicker text={d.kicker} />
        <Ed style={{ fontFamily: BRAND, fontWeight: 800, lineHeight: 0.98, letterSpacing: '-2px', color: '#f4f3e8', fontSize: titularSize(d.titular) + 8 }}>
          {d.titular}
        </Ed>
        {d.contexto && (
          <Ed style={{ fontSize: 29, lineHeight: 1.42, color: '#d5e4d9', marginTop: 26, maxWidth: 860 }}>{d.contexto}</Ed>
        )}
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', marginTop: 38 }}>
          {d.fechaHistorica && (
            <Ed tag="span" style={{ background: MINT, color: INK, padding: '14px 30px', fontSize: 26, letterSpacing: 3, fontWeight: 700 }}>
              {(d.fechaHistorica || '').toUpperCase()}
            </Ed>
          )}
          {d.destacado && (
            <Ed tag="span" style={{ border: '1.5px solid rgba(238,237,224,0.5)', padding: '14px 30px', fontSize: 26, letterSpacing: 2, color: '#e2ecdf', background: 'rgba(7,24,16,0.3)' }}>
              {d.destacado}{d.destacadoLabel ? ` · ${d.destacadoLabel}` : ''}
            </Ed>
          )}
        </div>
      </div>
      <Footer />
      <DragLayer {...props} />
    </div>
  )
}
