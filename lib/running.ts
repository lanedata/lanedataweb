// Small time helpers shared by the running tools (pace, predictor).

/** Parse "h:mm:ss(.d)", "mm:ss(.d)" or "ss.d" into seconds. Null if invalid. */
export function parseClock(raw: string): number | null {
  const s = raw.trim().replace(',', '.')
  if (!s) return null
  if (s.includes(':')) {
    const parts = s.split(':').map(p => p.trim())
    if (parts.some(p => p === '' || isNaN(Number(p)))) return null
    let sec = 0
    for (const p of parts) sec = sec * 60 + Number(p)
    return sec > 0 ? sec : null
  }
  const v = Number(s)
  return Number.isFinite(v) && v > 0 ? v : null
}

/** Format seconds → "h:mm:ss" or "m:ss". */
export function formatClock(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) totalSeconds = 0
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.round(totalSeconds % 60)
  if (s === 60) return formatClock(totalSeconds + (60 - (totalSeconds % 60)))
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Format a race time: sprints (<60 s) keep decimals, longer events use clock. */
export function formatRaceTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '—'
  if (totalSeconds < 60) return totalSeconds.toFixed(2)
  return formatClock(totalSeconds)
}

/** Format a per-km/mile pace (seconds) → "m:ss". */
export function formatPace(secPerUnit: number): string {
  if (!Number.isFinite(secPerUnit) || secPerUnit <= 0) return '—'
  const m = Math.floor(secPerUnit / 60)
  const s = Math.round(secPerUnit % 60)
  if (s === 60) return `${m + 1}:00`
  return `${m}:${String(s).padStart(2, '0')}`
}

export const METRES_PER_MILE = 1609.344
