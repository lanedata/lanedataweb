// Piezas compartidas de los bloques del panel de fichajes.

export const inputCls =
  'w-full border border-ink/[0.15] bg-cream/60 px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 transition-colors focus:border-ink/30 focus:bg-cream focus:outline-none focus:ring-2 focus:ring-mint/40'
export const botonCls =
  'border border-ink/25 px-2.5 py-1.5 label-mono text-ink/65 transition-colors hover:border-ink hover:text-ink disabled:opacity-40'
export const botonFuerteCls =
  'bg-ink px-3 py-1.5 label-mono text-mint transition-colors hover:bg-mint hover:text-ink disabled:opacity-40'
export const botonPeligroCls =
  'border border-red-300 px-2.5 py-1.5 label-mono text-red-700 transition-colors hover:bg-red-50 disabled:opacity-40'

export function Aviso({ tono, children }: { tono: 'ok' | 'error' | 'pendiente'; children: React.ReactNode }) {
  const estilos = {
    ok: 'border-mint bg-mint/15 text-ink/75',
    error: 'border-red-200 bg-red-50 text-red-700',
    pendiente: 'border-ink/20 bg-cream/60 text-ink/70',
  }[tono]
  return <p className={`border-l-2 px-4 py-2.5 text-sm leading-relaxed ${estilos}`}>{children}</p>
}

export function Caja({
  titulo, extra, texto, resaltada, children,
}: { titulo: string; extra?: React.ReactNode; texto?: React.ReactNode; resaltada?: boolean; children: React.ReactNode }) {
  return (
    <section className="border border-ink/[0.14] bg-paper">
      <header className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-ink/[0.14] px-5 py-3 ${resaltada ? 'bg-mint/25' : 'bg-cream/50'}`}>
        <h2 className="font-brand text-base font-extrabold tracking-tight text-ink">{titulo}</h2>
        {extra && <span className="label-mono text-ink/50">{extra}</span>}
        {texto && <p className="w-full text-[0.8rem] text-ink/50">{texto}</p>}
      </header>
      {children}
    </section>
  )
}

export async function copiarTexto(t: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(t); return true } catch { return false }
}
