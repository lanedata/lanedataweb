'use client'

// Tarjetas de historia a 1080×1920. Todo va en estilos inline a propósito: el
// exportador serializa el nodo dentro de un <svg><foreignObject>, donde las
// clases CSS del documento no llegan.
//
// Los textos son contentEditable. React sólo toca el DOM cuando cambia el prop,
// así que las ediciones a mano sobreviven a los re-renders mientras no se
// recargue el CSV.

import type { CSSProperties, ReactNode } from 'react'
import type { Cover, Feat, MinimaRow, RecordRow, SectionHead, Top5Row } from './types'
import { STORY_H, STORY_W, lastNameSize } from './types'

const BRAND = "'Bricolage Grotesque', sans-serif"
// El nombre literal resuelve en el export (el CSS embebido lo trae) y también
// en pantalla vía next/font; la variable queda de red por si acaso.
const MONO = "'JetBrains Mono', var(--font-story-mono), monospace"

const CREAM = '#eae9dc'
const MINT = '#8FE38F'
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

/** Texto editable a mano dentro de la tarjeta. */
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

/** Cabecera: marca a la izquierda, fecha editable a la derecha. */
function Header({ fecha, dark = true }: { fecha: string; dark?: boolean }) {
  return (
    <div style={{ padding: '64px 72px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <LogoMark />
        <span style={{ fontFamily: BRAND, fontWeight: 800, fontSize: 44, letterSpacing: '-1px', color: dark ? CREAM : '#0c2a18' }}>
          lanedata
        </span>
      </div>
      <Ed
        tag="span"
        style={{
          border: `1.5px solid ${dark ? 'rgba(238,237,224,0.32)' : 'rgba(12,42,24,0.35)'}`,
          padding: '14px 32px', fontSize: 26, letterSpacing: 5,
        }}
      >
        {fecha}
      </Ed>
    </div>
  )
}

function Footer({ dark = true }: { dark?: boolean }) {
  return (
    <div style={{ position: 'absolute', left: 72, right: 72, bottom: 56 }}>
      <div style={{ height: 1, background: dark ? 'rgba(238,237,224,0.18)' : 'rgba(12,42,24,0.25)', marginBottom: 32 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <div style={{ width: 64, height: 64, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="40" height="40" viewBox="0 0 100 100" aria-hidden="true">
            <g fill="none" stroke="#0c2a18" strokeWidth="9">
              <rect x="14" y="28" width="72" height="44" rx="22" />
              <rect x="32" y="40" width="36" height="20" rx="10" />
            </g>
          </svg>
        </div>
        <span style={{ fontSize: 22, letterSpacing: 5, color: dark ? '#7fa98c' : '#3f6a4d' }}>POWERED BY</span>
        <span style={{ fontFamily: BRAND, fontWeight: 700, fontSize: 30, color: dark ? CREAM : '#0c2a18' }}>
          mundo atletismo
        </span>
      </div>
    </div>
  )
}

/** Kicker + titular a dos líneas, común a récords / top5 / mínimas. */
function SectionTitle({ head, size = 132, extra }: { head: SectionHead; size?: number; extra?: ReactNode }) {
  return (
    <div style={{ padding: '78px 72px 0' }}>
      {extra ?? (
        <Ed style={{ fontSize: 30, letterSpacing: 7, color: MINT, marginBottom: 22 }}>{head.kicker}</Ed>
      )}
      <div style={{ fontFamily: BRAND, fontWeight: 800, fontSize: size, lineHeight: 0.9, letterSpacing: '-3px', color: '#f0efe3' }}>
        <Ed>{head.t1}</Ed>
        <Ed>{head.t2}</Ed>
      </div>
    </div>
  )
}

// ─── 01 · Portada ────────────────────────────────────────────────────────────
export function CoverCard({ id, cover }: { id: string; cover: Cover }) {
  return (
    <div id={id} style={{ ...cardBase, background: '#93E393', color: '#0c2a18' }}>
      <div style={{ padding: '64px 72px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <span style={{ display: 'flex', gap: 11 }}>
            <span style={{ width: 22, height: 28, borderRadius: '50%', background: '#0c2a18', display: 'block' }} />
            <span style={{ width: 22, height: 28, borderRadius: '50%', background: '#0c2a18', display: 'block' }} />
          </span>
          <span style={{ fontFamily: BRAND, fontWeight: 800, fontSize: 44, letterSpacing: '-1px' }}>lanedata</span>
        </div>
        <Ed tag="span" style={{ fontSize: 28, letterSpacing: 9, fontWeight: 500 }}>{cover.kicker2}</Ed>
      </div>

      <div style={{ position: 'absolute', left: 72, right: 72, bottom: 250 }}>
        <Ed style={{ fontSize: 30, letterSpacing: 9, marginBottom: 30 }}>{cover.kicker}</Ed>
        <div style={{ fontFamily: BRAND, fontWeight: 800, fontSize: 118, lineHeight: 0.9, letterSpacing: '-3px' }}>
          <Ed>{cover.t1}</Ed>
          <Ed>{cover.t2}</Ed>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 22, marginTop: 52, background: '#0c2a18', color: CREAM, padding: '28px 50px' }}>
          <Ed tag="span" style={{ fontFamily: BRAND, fontWeight: 700, fontSize: 44 }}>{cover.pill}</Ed>
          <Ed tag="span" style={{ fontSize: 24, letterSpacing: 6, color: '#6f9a7d' }}>{cover.year}</Ed>
        </div>
      </div>

      <Footer dark={false} />
    </div>
  )
}

// ─── 02 · Récords ────────────────────────────────────────────────────────────
export function RecordsCard({ id, fecha, head, rows }: { id: string; fecha: string; head: SectionHead; rows: RecordRow[] }) {
  return (
    <div id={id} style={{ ...cardBase, background: DARK_BG }}>
      <Header fecha={fecha} />
      <SectionTitle head={head} />
      <div style={{ padding: '96px 72px 0' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '26px 0', borderTop: '1px solid rgba(238,237,224,0.14)' }}>
            <Ed tag="span" style={{ minWidth: 118, textAlign: 'center', border: '1.5px solid rgba(143,227,143,0.5)', color: MINT, padding: '9px 0', fontSize: 22, letterSpacing: 2, fontWeight: 500 }}>
              {r.cat}
            </Ed>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Ed style={{ fontFamily: BRAND, fontWeight: 700, fontSize: 46, color: '#f0efe3', lineHeight: 1.05 }}>{r.name}</Ed>
              <Ed style={{ fontSize: 24, color: '#84a98f', marginTop: 6 }}>{r.meta}</Ed>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Ed style={{ fontFamily: BRAND, fontWeight: 800, fontSize: 58, color: MINT, lineHeight: 1 }}>{r.mark}</Ed>
              <Ed style={{ fontSize: 20, color: '#84a98f', letterSpacing: 1, marginTop: 6 }}>{r.tag}</Ed>
            </div>
          </div>
        ))}
        <div style={{ borderTop: '1px solid rgba(238,237,224,0.14)' }} />
      </div>
      <Footer />
    </div>
  )
}

// ─── 03 · Top 5 ──────────────────────────────────────────────────────────────
export function Top5Card({ id, fecha, head, rows }: { id: string; fecha: string; head: SectionHead; rows: Top5Row[] }) {
  return (
    <div id={id} style={{ ...cardBase, background: DARK_BG }}>
      <Header fecha={fecha} />
      <SectionTitle head={head} />
      <div style={{ padding: '104px 72px 0' }}>
        {rows.map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 30, padding: '28px 0', borderTop: '1px solid rgba(238,237,224,0.14)' }}>
            <span style={{ fontFamily: BRAND, fontWeight: 800, fontSize: 66, color: MINT, width: 56, lineHeight: 1 }}>{t.n}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Ed style={{ fontFamily: BRAND, fontWeight: 800, fontSize: 52, color: '#f0efe3', lineHeight: 1.02 }}>{t.name}</Ed>
              <Ed style={{ fontSize: 24, color: '#84a98f', marginTop: 8 }}>{t.meta}</Ed>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Ed style={{ fontFamily: BRAND, fontWeight: 800, fontSize: 64, color: '#f0efe3', lineHeight: 1 }}>{t.mark}</Ed>
              <Ed style={{ fontSize: 24, color: MINT, marginTop: 8 }}>{t.pts}</Ed>
            </div>
          </div>
        ))}
        <div style={{ borderTop: '1px solid rgba(238,237,224,0.14)' }} />
      </div>
      <Footer />
    </div>
  )
}

// ─── 04 · Mínimas ────────────────────────────────────────────────────────────
export function MinimaCard({ id, fecha, head, idx, rows }: { id: string; fecha: string; head: SectionHead; idx: string; rows: MinimaRow[] }) {
  return (
    <div id={id} style={{ ...cardBase, background: DARK_BG }}>
      <Header fecha={fecha} />
      <SectionTitle
        head={head}
        size={120}
        extra={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 20, marginBottom: 22 }}>
            <Ed tag="span" style={{ fontSize: 27, letterSpacing: 5, color: MINT, whiteSpace: 'nowrap' }}>{head.kicker}</Ed>
            <span style={{ fontSize: 24, letterSpacing: 3, color: '#84a98f', whiteSpace: 'nowrap' }}>{idx}</span>
          </div>
        }
      />
      <div style={{ padding: '96px 72px 0' }}>
        {rows.map((m, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '30px 0', borderTop: '1px solid rgba(238,237,224,0.14)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Ed style={{ fontFamily: BRAND, fontWeight: 700, fontSize: 50, color: '#f0efe3', lineHeight: 1.04 }}>{m.name}</Ed>
              <Ed style={{ fontSize: 24, color: '#84a98f', marginTop: 6 }}>{m.event}</Ed>
            </div>
            <Ed style={{ fontFamily: BRAND, fontWeight: 800, fontSize: 62, color: MINT, lineHeight: 1 }}>{m.mark}</Ed>
            <Ed tag="span" style={{ minWidth: 184, textAlign: 'center', border: '1.5px solid rgba(238,237,224,0.34)', padding: '12px 0', fontSize: 22, letterSpacing: 2, color: CREAM }}>
              {m.tag}
            </Ed>
          </div>
        ))}
        <div style={{ borderTop: '1px solid rgba(238,237,224,0.14)' }} />
      </div>
      <Footer />
    </div>
  )
}

// ─── 05 · Destacado individual ───────────────────────────────────────────────
export interface FeatCardProps {
  id: string
  fecha: string
  feat: Feat
  /** Refs imperativas: la foto se mueve sin re-renderizar la tarjeta. */
  imgRef: (el: HTMLImageElement | null) => void
  placeholderRef: (el: HTMLDivElement | null) => void
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void
}

export function FeatCard({
  id, fecha, feat: f, imgRef, placeholderRef,
  onPointerDown, onPointerMove, onPointerUp,
}: FeatCardProps) {
  const medal = (color: string, value: number) => (
    <span style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
      <span style={{ width: 16, height: 16, borderRadius: '50%', background: color, display: 'block' }} />
      <Ed tag="span">{String(value)}</Ed>
    </span>
  )

  return (
    <div
      id={id}
      style={{
        ...cardBase,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        background: DARK_BG,
      }}
    >
      {/* <img> a pelo, no next/image: el exportador serializa este nodo tal cual
          y necesita un <img> con su src en data: URI, sin wrappers ni srcset. */}
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
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, #0a2416 1%, #0a2416 12%, rgba(10,36,22,0.9) 26%, rgba(10,36,22,0.32) 46%, rgba(10,36,22,0.08) 64%, rgba(10,36,22,0.22) 100%)',
      }} />

      <div style={{ position: 'absolute', top: 64, left: 72, right: 72, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <LogoMark />
          <span style={{ fontFamily: BRAND, fontWeight: 800, fontSize: 44, letterSpacing: '-1px', color: CREAM }}>lanedata</span>
        </div>
        <Ed tag="span" style={{ border: '1.5px solid rgba(238,237,224,0.4)', padding: '14px 32px', fontSize: 26, letterSpacing: 5 }}>
          {fecha}
        </Ed>
      </div>

      <div
        ref={placeholderRef}
        style={{
          position: 'absolute', top: '29%', left: '50%', transform: 'translate(-50%,-50%)',
          border: '2px dashed rgba(238,237,224,0.35)', padding: '40px 56px',
          textAlign: 'center', color: '#bcd6c3', zIndex: 2,
        }}
      >
        <div style={{ fontSize: 34, letterSpacing: 2 }}>Sube una foto</div>
        <div style={{ fontSize: 24, color: '#84a98f', marginTop: 12 }}>y arrástrala para encuadrar</div>
      </div>

      <div style={{ position: 'relative', zIndex: 3, margin: '0 72px 40px' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <Ed tag="span" style={{ background: MINT, color: '#0c2216', padding: '10px 24px', fontSize: 24, letterSpacing: 2, fontWeight: 700 }}>{f.pillGreen}</Ed>
          <Ed tag="span" style={{ border: '1.5px solid rgba(238,237,224,0.45)', padding: '12px 24px', fontSize: 24, letterSpacing: 2, color: '#e2ecdf' }}>{f.pillOutline}</Ed>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16 }}>
          <Ed tag="span" style={{ background: 'rgba(238,237,224,0.14)', padding: '8px 20px', fontSize: 24, letterSpacing: 2, fontWeight: 700, color: '#f0efe3' }}>{f.event}</Ed>
          <Ed tag="span" style={{ fontSize: 24, letterSpacing: 3, color: '#a7c6b0' }}>{f.cat}</Ed>
        </div>
        <Ed style={{ fontFamily: BRAND, fontWeight: 700, fontSize: 46, lineHeight: 1, color: MINT }}>{f.first}</Ed>
        <Ed style={{ fontFamily: BRAND, fontWeight: 800, lineHeight: 0.9, letterSpacing: '-2px', color: '#f4f3e8', fontSize: lastNameSize(f.last) }}>{f.last}</Ed>
        <Ed style={{ fontSize: 26, color: '#bcd6c3', marginTop: 12 }}>{f.sub}</Ed>
        <Ed style={{ fontSize: 26, letterSpacing: 5, color: '#7fa98c', marginTop: 20 }}>RESULTADO</Ed>
        <Ed style={{ fontFamily: BRAND, fontWeight: 800, fontSize: 104, lineHeight: 0.94, letterSpacing: '-3px', color: MINT }}>{f.mark}</Ed>
        <Ed style={{ fontSize: 29, color: '#e2ecdf', marginTop: 10 }}>{f.where}</Ed>

        <div style={{ display: 'flex', gap: 48, marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(238,237,224,0.2)' }}>
          <div>
            <div style={{ fontSize: 20, letterSpacing: 3, color: '#7fa98c', marginBottom: 14 }}>MEDALLERO</div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', fontFamily: BRAND, fontWeight: 700, fontSize: 34, color: '#f0efe3' }}>
              {medal('#E8B23A', f.g)}
              {medal('#C9CBD1', f.s)}
              {medal('#C77B3E', f.b)}
            </div>
          </div>
          <div>
            <Ed style={{ fontSize: 20, letterSpacing: 3, color: '#7fa98c', marginBottom: 14 }}>{f.s2l}</Ed>
            <Ed style={{ fontFamily: BRAND, fontWeight: 700, fontSize: 34, color: '#f0efe3' }}>{f.s2v}</Ed>
          </div>
          <div>
            <Ed style={{ fontSize: 20, letterSpacing: 3, color: '#7fa98c', marginBottom: 14 }}>{f.s3l}</Ed>
            <Ed style={{ fontFamily: BRAND, fontWeight: 700, fontSize: 34, color: MINT }}>{f.s3v}</Ed>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 3, margin: '0 72px 44px' }}>
        <div style={{ height: 1, background: 'rgba(238,237,224,0.18)', marginBottom: 32 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ width: 64, height: 64, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 100 100" aria-hidden="true">
              <g fill="none" stroke="#0c2a18" strokeWidth="9">
                <rect x="14" y="28" width="72" height="44" rx="22" />
                <rect x="32" y="40" width="36" height="20" rx="10" />
              </g>
            </svg>
          </div>
          <span style={{ fontSize: 22, letterSpacing: 5, color: '#9bbfa5' }}>POWERED BY</span>
          <span style={{ fontFamily: BRAND, fontWeight: 700, fontSize: 30, color: CREAM }}>mundo atletismo</span>
        </div>
      </div>

      {/*
        Capa de arrastre. Va por encima de todo (zIndex 9) para que el gesto
        de arrastrar sirva en cualquier zona de la tarjeta (los textos ocupan
        casi todo el cartel y si no atrapasen los eventos aquí, el arrastre
        sólo funcionaría en tiras estrechas). Un clic sin movimiento se
        reenvía al elemento de debajo en el handler de pointerup, así que los
        textos siguen siendo editables. `touchAction:none` evita que el
        scroll de la página se lleve el gesto en móvil.
      */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: 'absolute', inset: 0, zIndex: 9,
          touchAction: 'none',
        }}
      />
    </div>
  )
}
