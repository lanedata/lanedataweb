'use client'

// Story de "El dato de la semana" a 1080×1920. Misma estética de marca que las
// Historias, pero con 4 variantes visuales para que no salga siempre igual:
//
//   1 · Aniversario   — año como marca de agua, titular abajo, pill destacado.
//   2 · Número         — el valor destacado GIGANTE en el centro.
//   3 · Editorial claro — fondo menta, tinta oscura, aire de portada.
//   4 · Foto            — foto a sangre con el titular sobreimpreso.
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
            border: `1.5px solid ${dark ? 'rgba(238,237,224,0.32)' : 'rgba(12,42,24,0.35)'}`,
            padding: '14px 30px', fontSize: 24, letterSpacing: 4, whiteSpace: 'nowrap',
            color: dark ? CREAM : INK,
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
      <div style={{ height: 1, background: dark ? 'rgba(238,237,224,0.18)' : 'rgba(12,42,24,0.25)', marginBottom: 32 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <div style={{ width: 64, height: 64, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MundoAtletismoMark />
        </div>
        <span style={{ fontSize: 22, letterSpacing: 5, color: dark ? '#7fa98c' : '#3f6a4d' }}>POWERED BY</span>
        <span style={{ fontFamily: BRAND, fontWeight: 700, fontSize: 30, color: dark ? CREAM : INK }}>mundo atletismo</span>
      </div>
    </div>
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

/** Capa de foto + placeholder + capa de arrastre, común a las variantes con foto. */
function PhotoLayer({
  imgRef, placeholderRef, overlay, showPlaceholder,
}: Pick<DatoCardProps, 'imgRef' | 'placeholderRef'> & { overlay: string; showPlaceholder: boolean }) {
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
      {showPlaceholder && (
        <div
          ref={placeholderRef}
          style={{
            position: 'absolute', top: '32%', left: '50%', transform: 'translate(-50%,-50%)',
            border: '2px dashed rgba(238,237,224,0.35)', padding: '40px 56px',
            textAlign: 'center', color: '#bcd6c3', zIndex: 2,
          }}
        >
          <div style={{ fontSize: 34, letterSpacing: 2 }}>Sube una foto</div>
          <div style={{ fontSize: 24, color: '#84a98f', marginTop: 12 }}>y arrástrala para encuadrar</div>
        </div>
      )}
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

function Kicker({ text, color = MINT, dark = true }: { text: string; color?: string; dark?: boolean }) {
  return (
    <Ed style={{ fontSize: 30, letterSpacing: 8, color: dark ? color : INK, marginBottom: 26 }}>
      {(text || '').toUpperCase()}
    </Ed>
  )
}

export function DatoCard(props: DatoCardProps) {
  const { id, dato: d, variant } = props
  const right = d.categoria || d.fechaHistorica || undefined

  // ─── Variante 3 · Editorial claro (fondo menta) ───────────────────────────
  if (variant === 3) {
    return (
      <div id={id} style={{ ...cardBase, background: '#93E393', color: INK }}>
        <Header right={right} dark={false} />
        <div style={{ position: 'absolute', left: 72, right: 72, top: 300 }}>
          <Kicker text={d.kicker} dark={false} />
          <Ed style={{ fontFamily: BRAND, fontWeight: 800, lineHeight: 0.98, letterSpacing: '-3px', color: INK, fontSize: titularSize(d.titular) + 10 }}>
            {d.titular}
          </Ed>
          {d.contexto && (
            <Ed style={{ fontSize: 30, lineHeight: 1.4, color: 'rgba(12,42,24,0.72)', marginTop: 34, maxWidth: 820 }}>
              {d.contexto}
            </Ed>
          )}
          {d.destacado && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 24, marginTop: 52, background: INK, color: CREAM, padding: '26px 46px' }}>
              <Ed tag="span" style={{ fontFamily: BRAND, fontWeight: 800, fontSize: 72, lineHeight: 1, color: MINT }}>{d.destacado}</Ed>
              {d.destacadoLabel && (
                <Ed tag="span" style={{ fontSize: 24, letterSpacing: 4, color: '#9fb9a6', maxWidth: 300 }}>{(d.destacadoLabel || '').toUpperCase()}</Ed>
              )}
            </div>
          )}
        </div>
        <Footer dark={false} />
      </div>
    )
  }

  // ─── Variante 2 · Número gigante ───────────────────────────────────────────
  if (variant === 2) {
    return (
      <div id={id} style={{ ...cardBase, background: DARK_BG }}>
        <Header right={right} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 72px' }}>
          <Kicker text={d.kicker} />
          {d.destacado && (
            <Ed style={{ fontFamily: BRAND, fontWeight: 800, lineHeight: 0.82, letterSpacing: '-6px', color: MINT, fontSize: 380 }}>
              {d.destacado}
            </Ed>
          )}
          {d.destacadoLabel && (
            <Ed style={{ fontSize: 34, letterSpacing: 8, color: '#9fc7a8', marginTop: 8, marginBottom: 44 }}>
              {(d.destacadoLabel || '').toUpperCase()}
            </Ed>
          )}
          <Ed style={{ fontFamily: BRAND, fontWeight: 700, lineHeight: 1.02, letterSpacing: '-1.5px', color: '#f0efe3', fontSize: Math.min(72, titularSize(d.titular)), maxWidth: 860 }}>
            {d.titular}
          </Ed>
          {d.contexto && (
            <Ed style={{ fontSize: 28, lineHeight: 1.45, color: '#9fb9a6', marginTop: 30, maxWidth: 780 }}>{d.contexto}</Ed>
          )}
        </div>
        <Footer />
      </div>
    )
  }

  // ─── Variante 4 · Foto protagonista ────────────────────────────────────────
  if (variant === 4) {
    return (
      <div id={id} style={{ ...cardBase, background: DARK_BG, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <PhotoLayer
          imgRef={props.imgRef}
          placeholderRef={props.placeholderRef}
          showPlaceholder
          overlay="linear-gradient(to top, #0a2416 4%, rgba(10,36,22,0.92) 26%, rgba(10,36,22,0.35) 52%, rgba(10,36,22,0.12) 74%, rgba(10,36,22,0.28) 100%)"
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
            <Ed style={{ fontSize: 28, lineHeight: 1.45, color: '#d5e4d9', marginTop: 26, maxWidth: 820 }}>{d.contexto}</Ed>
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
        showPlaceholder={false}
        overlay="linear-gradient(to top, #0a2416 6%, rgba(10,36,22,0.9) 30%, rgba(10,36,22,0.55) 60%, rgba(10,36,22,0.4) 100%)"
      />
      {/* Año como marca de agua */}
      {d.anio && (
        <span style={{ position: 'absolute', top: 300, right: 40, fontFamily: BRAND, fontWeight: 800, fontSize: 460, lineHeight: 1, letterSpacing: '-10px', color: 'rgba(143,227,143,0.09)', zIndex: 1, pointerEvents: 'none' }}>
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
          <Ed style={{ fontSize: 29, lineHeight: 1.45, color: '#d5e4d9', marginTop: 28, maxWidth: 820 }}>{d.contexto}</Ed>
        )}
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', marginTop: 40 }}>
          {d.fechaHistorica && (
            <Ed tag="span" style={{ background: MINT, color: INK, padding: '14px 30px', fontSize: 26, letterSpacing: 3, fontWeight: 700 }}>
              {(d.fechaHistorica || '').toUpperCase()}
            </Ed>
          )}
          {d.destacado && (
            <Ed tag="span" style={{ border: '1.5px solid rgba(238,237,224,0.45)', padding: '14px 30px', fontSize: 26, letterSpacing: 2, color: '#e2ecdf' }}>
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
