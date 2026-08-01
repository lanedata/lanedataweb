// Lienzo de una diapositiva 1080×1350 (4:5 de Instagram).
// Se usa dos veces: escalado para la vista previa y a tamaño real (oculto)
// para exportar a PNG con html-to-image. Todos los estilos van inline para
// que la exportación sea idéntica a la vista previa.

import type { Slide, SlideTheme } from './types'

export const SLIDE_W = 1080
export const SLIDE_H = 1350
const PAD = 96

const FONT_BRAND = "'Bricolage Grotesque', sans-serif"
const FONT_MONO = "'IBM Plex Mono', monospace"
const FONT_BODY = "'Inter', sans-serif"

interface Palette {
  bg: string
  text: string
  muted: string
  accent: string      // color de acento (kicker, cifras)
  accentText: string  // texto sobre el acento
  rule: string
}

const PALETTES: Record<SlideTheme, Palette> = {
  ink: {
    bg: '#0D2A14',
    text: '#F4F1EA',
    muted: 'rgba(244, 241, 234, 0.55)',
    accent: '#9FE88D',
    accentText: '#0D2A14',
    rule: 'rgba(244, 241, 234, 0.16)',
  },
  paper: {
    bg: '#FBFAF6',
    text: '#0D2A14',
    muted: 'rgba(13, 42, 20, 0.55)',
    accent: '#0D2A14',
    accentText: '#F4F1EA',
    rule: 'rgba(13, 42, 20, 0.14)',
  },
  mint: {
    bg: '#9FE88D',
    text: '#0D2A14',
    muted: 'rgba(13, 42, 20, 0.6)',
    accent: '#0D2A14',
    accentText: '#9FE88D',
    rule: 'rgba(13, 42, 20, 0.2)',
  },
}

const TITLE_SIZES = { S: 64, M: 84, L: 104 }
const STAT_SIZES = { S: 150, M: 200, L: 250 }

interface Props {
  slide: Slide
  index: number
  total: number
}

export function SlideCanvas({ slide, index, total }: Props) {
  const p = PALETTES[slide.theme]
  const hasImage = slide.type === 'portada' && !!slide.imageUrl

  return (
    <div
      style={{
        width: SLIDE_W,
        height: SLIDE_H,
        background: p.bg,
        color: p.text,
        fontFamily: FONT_BODY,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Imagen de fondo (solo portada) */}
      {hasImage && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.imageUrl}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(13,42,20,0.55) 0%, rgba(13,42,20,0.25) 40%, rgba(13,42,20,0.92) 100%)',
            }}
          />
        </>
      )}

      {/* Cabecera */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${PAD * 0.7}px ${PAD}px 0`,
        }}
      >
        <span
          style={{
            fontFamily: FONT_BRAND,
            fontWeight: 800,
            fontSize: 44,
            letterSpacing: '-0.02em',
            color: hasImage ? '#F4F1EA' : p.text,
          }}
        >
          lanedata
        </span>
        {slide.kicker && (
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 24,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              background: hasImage ? '#9FE88D' : p.accent,
              color: hasImage ? '#0D2A14' : p.accentText,
              padding: '10px 22px',
              borderRadius: 999,
            }}
          >
            {slide.kicker}
          </span>
        )}
      </div>

      {/* Cuerpo */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: slide.type === 'portada' && hasImage ? 'flex-end' : 'center',
          padding: `40px ${PAD}px`,
          minHeight: 0,
        }}
      >
        <SlideBody slide={slide} p={p} hasImage={hasImage} />
      </div>

      {/* Pie */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${PAD}px ${PAD * 0.6}px`,
          fontFamily: FONT_MONO,
          fontSize: 24,
          letterSpacing: '0.14em',
          color: hasImage ? 'rgba(244,241,234,0.7)' : p.muted,
        }}
      >
        <span>@lanedata · lanedata.es</span>
        <span>
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}

function SlideBody({ slide, p, hasImage }: { slide: Slide; p: Palette; hasImage: boolean }) {
  const titleSize = TITLE_SIZES[slide.titleSize]
  const textColor = hasImage ? '#F4F1EA' : p.text
  const mutedColor = hasImage ? 'rgba(244,241,234,0.75)' : p.muted

  switch (slide.type) {
    case 'portada':
    case 'cierre':
      return (
        <div>
          <div style={{ width: 72, height: 10, background: hasImage ? '#9FE88D' : p.accent, borderRadius: 6, marginBottom: 40 }} />
          <h1
            style={{
              fontFamily: FONT_BRAND,
              fontWeight: 800,
              fontSize: titleSize,
              lineHeight: 1.06,
              letterSpacing: '-0.03em',
              color: textColor,
              margin: 0,
              whiteSpace: 'pre-wrap',
            }}
          >
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p style={{ fontSize: 38, lineHeight: 1.4, color: mutedColor, margin: '36px 0 0', whiteSpace: 'pre-wrap' }}>
              {slide.subtitle}
            </p>
          )}
          {slide.type === 'cierre' && slide.body && (
            <span
              style={{
                display: 'inline-block',
                marginTop: 48,
                fontFamily: FONT_MONO,
                fontSize: 28,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                border: `3px solid ${p.accent}`,
                color: textColor,
                padding: '18px 36px',
                borderRadius: 999,
              }}
            >
              {slide.body}
            </span>
          )}
        </div>
      )

    case 'dato':
      return (
        <div>
          <div
            style={{
              fontFamily: FONT_BRAND,
              fontWeight: 800,
              fontSize: STAT_SIZES[slide.titleSize],
              lineHeight: 1,
              letterSpacing: '-0.04em',
              color: slide.theme === 'ink' ? '#9FE88D' : p.text,
              whiteSpace: 'pre-wrap',
            }}
          >
            {slide.stat}
          </div>
          {slide.statLabel && (
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 28,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: p.muted,
                marginTop: 36,
                lineHeight: 1.5,
              }}
            >
              {slide.statLabel}
            </div>
          )}
          {slide.body && (
            <p style={{ fontSize: 36, lineHeight: 1.5, color: p.text, margin: '44px 0 0', whiteSpace: 'pre-wrap' }}>
              {slide.body}
            </p>
          )}
        </div>
      )

    case 'lista':
      return (
        <div>
          {slide.title && (
            <h2
              style={{
                fontFamily: FONT_BRAND,
                fontWeight: 800,
                fontSize: 58,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                margin: '0 0 48px',
                color: p.text,
              }}
            >
              {slide.title}
            </h2>
          )}
          <div>
            {slide.items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 32,
                  padding: '26px 0',
                  borderTop: `2px solid ${p.rule}`,
                  borderBottom: i === slide.items.length - 1 ? `2px solid ${p.rule}` : undefined,
                }}
              >
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 30,
                    color: p.muted,
                    minWidth: 56,
                  }}
                >
                  {item.pos}
                </span>
                <span style={{ fontSize: 36, fontWeight: 500, color: p.text, flex: 1, lineHeight: 1.3 }}>
                  {item.nombre}
                </span>
                <span
                  style={{
                    fontFamily: FONT_BRAND,
                    fontWeight: 800,
                    fontSize: 40,
                    letterSpacing: '-0.02em',
                    color: slide.theme === 'ink' ? '#9FE88D' : p.text,
                  }}
                >
                  {item.valor}
                </span>
              </div>
            ))}
          </div>
        </div>
      )

    case 'texto':
      return (
        <div>
          {slide.title && (
            <h2
              style={{
                fontFamily: FONT_BRAND,
                fontWeight: 800,
                fontSize: 58,
                letterSpacing: '-0.02em',
                lineHeight: 1.12,
                margin: '0 0 40px',
                color: p.text,
              }}
            >
              {slide.title}
            </h2>
          )}
          <p style={{ fontSize: 40, lineHeight: 1.55, color: p.text, margin: 0, whiteSpace: 'pre-wrap' }}>
            {slide.body}
          </p>
        </div>
      )

    case 'cita':
      return (
        <div>
          <div style={{ fontFamily: FONT_BRAND, fontWeight: 800, fontSize: 120, lineHeight: 0.5, color: p.accent, marginBottom: 8 }}>
            «
          </div>
          <p
            style={{
              fontFamily: FONT_BRAND,
              fontWeight: 700,
              fontSize: 62,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              color: p.text,
              margin: 0,
              whiteSpace: 'pre-wrap',
            }}
          >
            {slide.quote}
          </p>
          {slide.author && (
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 26,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: p.muted,
                marginTop: 48,
              }}
            >
              — {slide.author}
            </div>
          )}
        </div>
      )
  }
}
