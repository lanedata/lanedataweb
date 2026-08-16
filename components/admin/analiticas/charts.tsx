'use client'

// Gráficos del panel de analíticas.
//
// Decisiones de diseño, por si alguien las revisa dentro de un año:
//
//  · Una serie por gráfico y un solo color. Nada de degradados por valor: la
//    longitud de la barra ya dice el tamaño, teñirla otra vez del mismo dato
//    gasta el único canal libre que queda.
//  · Las marcas van en `ink`, que contrasta 15:1 contra el papel. El `mint`
//    solo se usa al pasar por encima, nunca para distinguir datos: sobre fondo
//    claro se queda en 1,4:1 y no lo vería medio mundo.
//  · Barras finas, 2 px de aire entre ellas y esquina superior redondeada.
//    Rejilla en línea de pelo, sin discontinuos.
//  · El valor nunca se lee solo del gráfico: todo lo que se pinta está también
//    en una tabla o en el CSV.

import { useState } from 'react'

const INK = '#0D2A14'

export interface BarPoint {
  /** Etiqueta del eje. */
  key: string
  value: number
  /** Lo que se lee al pasar por encima. */
  tooltip: string
  /** Se muestra bajo la barra. Si falta, no se etiqueta. */
  axis?: string
}

/**
 * Barras verticales. La altura fija que se le pasa es la del área de dibujo:
 * las etiquetas del eje van por debajo y fuera, para que nunca queden cortadas.
 */
export function BarChart({
  data,
  height = 170,
  empty = 'Sin datos en este periodo',
}: {
  data: BarPoint[]
  height?: number
  empty?: string
}) {
  const [hover, setHover] = useState<number | null>(null)

  if (!data.length) return <EmptyPlot mensaje={empty} height={height} />

  const max = Math.max(...data.map((d) => d.value), 1)
  const activo = hover === null ? null : data[hover]

  return (
    <div className="relative">
      {/* Cinta del valor destacado: reserva su alto siempre, para que el
          gráfico no dé un salto al pasar el ratón. Sin `label-mono` a
          propósito: esa clase va en versales y una fecha con cifras en
          mayúsculas no hay quien la lea. */}
      <div className="mb-3 h-5 truncate font-mono text-[0.6875rem] leading-5 tracking-wide text-ink/70">
        {activo ? activo.tooltip : <span className="text-ink/25">Pasa por encima para el detalle</span>}
      </div>

      <div className="relative" style={{ height }}>
        {/* Rejilla: cuatro líneas de pelo, un tono por encima del fondo. */}
        <div aria-hidden="true" className="absolute inset-0">
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <div
              key={f}
              className="absolute inset-x-0 border-t border-ink/[0.09]"
              style={{ top: `${f * 100}%` }}
            />
          ))}
        </div>

        <div className="absolute inset-0 flex items-end gap-[2px]">
          {data.map((d, i) => {
            const h = (d.value / max) * 100
            return (
              <button
                key={d.key}
                type="button"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={d.tooltip}
                className="group relative flex h-full min-w-0 flex-1 items-end focus:outline-none"
              >
                <span
                  className="w-full transition-colors duration-100"
                  style={{
                    // Un pelo de altura mínima para que un valor de 0 se vea
                    // como hueco y no como ausencia de barra.
                    height: `${Math.max(h, d.value > 0 ? 1.5 : 0.5)}%`,
                    borderRadius: '4px 4px 0 0',
                    background: hover === i ? '#9FE88D' : INK,
                    opacity: hover === null || hover === i ? 1 : 0.35,
                  }}
                />
              </button>
            )
          })}
        </div>

        <span className="absolute -top-0.5 right-0 translate-y-[-100%] label-mono text-ink/30">
          máx {max.toLocaleString('es-ES')}
        </span>
      </div>

      {/* Eje: solo algunas etiquetas, para que no se pisen. */}
      <div className="mt-2 flex gap-[2px] border-t border-ink/[0.14] pt-2">
        {data.map((d, i) => (
          <span
            key={d.key}
            className="min-w-0 flex-1 truncate text-center font-mono text-[0.5625rem] tracking-wider text-ink/30 tabular-nums"
          >
            {mostrarEtiqueta(i, data.length) ? (d.axis ?? d.key) : ' '}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Reparte como mucho ~8 etiquetas a lo largo del eje. */
function mostrarEtiqueta(i: number, total: number): boolean {
  const paso = Math.max(1, Math.ceil(total / 8))
  return i % paso === 0
}

export interface RankRow {
  label: string
  /** Lo que dibuja la barra. */
  value: number
  /** Texto a la derecha (el valor formateado, con su unidad). */
  display: string
  /** Segunda línea, opcional: sesiones, tiempo medio… */
  meta?: string
  /** Prefijo visual: bandera, icono. */
  prefix?: string
}

/**
 * Ranking en barras horizontales. Es a la vez el gráfico y su tabla: cada fila
 * lleva el valor escrito, así que nada depende del color ni del hover.
 */
export function RankChart({
  rows,
  empty = 'Sin datos en este periodo',
  max: maxProp,
}: {
  rows: RankRow[]
  empty?: string
  max?: number
}) {
  if (!rows.length) {
    return <p className="py-8 text-center label-mono text-ink/25">{empty}</p>
  }

  const max = maxProp ?? Math.max(...rows.map((r) => r.value), 1)

  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="group">
          <div className="flex items-baseline justify-between gap-4">
            <span className="flex min-w-0 items-baseline gap-2">
              {r.prefix && <span aria-hidden="true">{r.prefix}</span>}
              <span className="truncate text-sm text-ink/80" title={r.label}>
                {r.label}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="font-mono text-xs text-ink tabular-nums">{r.display}</span>
              {r.meta && (
                <span className="ml-2 font-mono text-[0.625rem] text-ink/35 tabular-nums">
                  {r.meta}
                </span>
              )}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full bg-ink/[0.07]">
            <div
              className="h-full transition-colors duration-100 group-hover:bg-ink/60"
              style={{ width: `${Math.max((r.value / max) * 100, 1)}%`, background: INK, borderRadius: 2 }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function EmptyPlot({ mensaje, height }: { mensaje: string; height: number }) {
  return (
    <div
      className="flex items-center justify-center border border-dashed border-ink/[0.14]"
      style={{ height: height + 40 }}
    >
      <p className="label-mono text-ink/25">{mensaje}</p>
    </div>
  )
}

/** Cifra grande de cabecera. Figuras proporcionales, no tabulares. */
export function StatTile({
  valor,
  label,
  nota,
}: {
  valor: string
  label: string
  nota?: string
}) {
  return (
    <div className="bg-paper p-5">
      <div className="font-brand text-[2rem] font-extrabold leading-none tracking-[-0.04em] text-ink">
        {valor}
      </div>
      <div className="mt-2 label-mono text-ink/40">{label}</div>
      {nota && <div className="mt-1 text-[0.6875rem] leading-tight text-ink/30">{nota}</div>}
    </div>
  )
}

/** Tarjeta con título para cada bloque del panel. */
export function Card({
  titulo,
  pista,
  children,
  className = '',
}: {
  titulo: string
  pista?: string
  children: React.ReactNode
  className?: string
}) {
  // `min-w-0`: sin él, un hijo de grid no baja de su anchura de contenido y en
  // móvil la tarjeta se sale de la pantalla arrastrando el scroll horizontal.
  return (
    <section className={`min-w-0 border border-ink/[0.14] bg-paper p-5 ${className}`}>
      <header className="mb-5">
        <h2 className="font-brand text-lg font-extrabold tracking-tight text-ink">{titulo}</h2>
        {pista && <p className="mt-1 text-xs leading-relaxed text-ink/40">{pista}</p>}
      </header>
      {children}
    </section>
  )
}
