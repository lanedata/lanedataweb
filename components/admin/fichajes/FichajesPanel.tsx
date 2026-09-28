'use client'

// TEMPORAL — Panel del mercado de fichajes.
//
// Dos cosas:
//   1. La CLAVE DE COLABORADOR: la escribes aquí y se guarda hasheada (bcrypt)
//      en Postgres vía `fichajes_set_clave`, que solo puede llamar una sesión
//      autenticada. Nunca vuelve a salir de la base: el panel solo puede saber
//      si está puesta y de cuándo es (`fichajes_clave_estado`). Si la pierdes,
//      no se recupera: se pone otra.
//   2. EL DIRECTO: como los envíos se publican sin revisión, aquí se pueden
//      ocultar (quedan guardados pero fuera de /test) o borrar del todo.

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { horaDe, diaDe } from '@/lib/fichajes/types'

const ENVIAR_PATH = '/fichajes/enviar/'

interface FichajeAdmin {
  id: string
  informado_en: string
  atleta: string
  club_origen: string | null
  club_destino: string | null
  division: string | null
  fuente: string | null
  nota: string | null
  enviado_por: string | null
  visible: boolean
}

type EstadoTabla = 'cargando' | 'listo' | 'sin-tabla' | 'error'

export function FichajesPanel() {
  const [estado, setEstado] = useState<EstadoTabla>('cargando')
  const [fichajes, setFichajes] = useState<FichajeAdmin[]>([])
  const [claveInfo, setClaveInfo] = useState<{ configurada: boolean; actualizado_en: string | null } | null>(null)

  const cargar = useCallback(async () => {
    const supabase = createClient()
    const [lista, clave] = await Promise.all([
      supabase
        .from('fichajes')
        .select('id, informado_en, atleta, club_origen, club_destino, division, fuente, nota, enviado_por, visible')
        .order('informado_en', { ascending: false })
        .limit(200),
      supabase.rpc('fichajes_clave_estado'),
    ])

    if (lista.error) {
      setEstado(lista.error.code === '42P01' ? 'sin-tabla' : 'error')
      return
    }
    setFichajes((lista.data as unknown as FichajeAdmin[]) ?? [])
    const fila = Array.isArray(clave.data) ? clave.data[0] : clave.data
    setClaveInfo(fila ? { configurada: !!fila.configurada, actualizado_en: fila.actualizado_en ?? null } : null)
    setEstado('listo')
  }, [])

  useEffect(() => { cargar() }, [cargar])

  if (estado === 'cargando') {
    return <div className="h-40 animate-pulse border border-ink/[0.14] bg-cream/50" aria-hidden="true" />
  }
  if (estado === 'sin-tabla') return <SinTabla />
  if (estado === 'error') {
    return <Aviso tono="error">No se ha podido cargar el mercado de fichajes. Recarga la página.</Aviso>
  }

  return (
    <div className="space-y-10">
      <BloqueClave info={claveInfo} onCambiada={cargar} />
      <BloqueDirecto fichajes={fichajes} onCambio={cargar} />
    </div>
  )
}

// ─── 1. Clave de colaborador ─────────────────────────────────────────────────
function BloqueClave({
  info, onCambiada,
}: {
  info: { configurada: boolean; actualizado_en: string | null } | null
  onCambiada: () => void
}) {
  const [clave, setClave] = useState('')
  const [repetida, setRepetida] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hecho, setHecho] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const coincide = clave.length > 0 && clave === repetida
  const puedeGuardar = clave.length >= 6 && coincide && !guardando

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!puedeGuardar) return
    setGuardando(true); setError(null); setHecho(false)

    const supabase = createClient()
    const { error: err } = await supabase.rpc('fichajes_set_clave', { p_clave: clave })
    setGuardando(false)

    if (err) { setError(err.message || 'No se ha podido guardar la clave.'); return }
    setClave(''); setRepetida(''); setHecho(true)
    onCambiada()
  }

  async function copiarEnlace() {
    const url = `${window.location.origin}${ENVIAR_PATH}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch { /* sin permiso de portapapeles: se copia a mano */ }
  }

  return (
    <section className="border border-ink/[0.14] bg-paper">
      <header className="border-b border-ink/[0.14] bg-cream/50 px-5 py-3">
        <h2 className="font-brand text-base font-extrabold tracking-tight text-ink">Clave de colaborador</h2>
        <p className="mt-0.5 text-[0.8rem] text-ink/50">
          La pones aquí y se la pasas a quien vaya a mandarte fichajes.
        </p>
      </header>

      <div className="space-y-5 p-5">
        {/* Estado actual */}
        {info?.configurada ? (
          <Aviso tono="ok">
            Hay una clave puesta
            {info.actualizado_en && <> desde el {new Date(info.actualizado_en).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</>}.
            No se puede consultar: si no la recuerdas, escribe una nueva aquí abajo.
          </Aviso>
        ) : (
          <Aviso tono="pendiente">
            Todavía no hay clave. Hasta que pongas una, nadie puede enviar fichajes.
          </Aviso>
        )}

        {/* Enlace que se comparte */}
        <div>
          <span className="mb-1.5 block label-mono text-ink/60">Enlace para colaboradores</span>
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 border border-ink/[0.14] bg-cream/50 px-3 py-2.5 font-mono text-[0.8rem] text-ink/75">
              {ENVIAR_PATH}
            </code>
            <button
              type="button" onClick={copiarEnlace}
              className="border border-ink/25 px-3 py-2.5 label-mono text-ink/70 transition-colors hover:border-ink hover:text-ink"
            >
              {copiado ? 'copiado' : 'copiar'}
            </button>
            <a
              href={ENVIAR_PATH} target="_blank" rel="noopener noreferrer"
              className="border border-ink/25 px-3 py-2.5 label-mono text-ink/70 transition-colors hover:border-ink hover:text-ink"
            >
              abrir ↗
            </a>
          </div>
        </div>

        {/* Poner / cambiar */}
        <form onSubmit={guardar} className="space-y-3 border-t border-ink/[0.1] pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block label-mono text-ink/60">
                {info?.configurada ? 'Clave nueva' : 'Clave'} · mínimo 6
              </span>
              <input
                type="password" value={clave} autoComplete="new-password"
                onChange={(e) => { setClave(e.target.value); setError(null); setHecho(false) }}
                className={inputCls} placeholder="••••••••"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block label-mono text-ink/60">Repítela</span>
              <input
                type="password" value={repetida} autoComplete="new-password"
                onChange={(e) => { setRepetida(e.target.value); setError(null) }}
                className={inputCls} placeholder="••••••••"
              />
            </label>
          </div>

          {repetida.length > 0 && !coincide && (
            <p className="text-[0.8rem] text-ink/55">Las dos claves no coinciden.</p>
          )}
          {error && <Aviso tono="error">{error}</Aviso>}
          {hecho && <Aviso tono="ok">Clave guardada. Ya puedes repartirla con el enlace de arriba.</Aviso>}

          <button
            type="submit" disabled={!puedeGuardar}
            className="bg-ink px-5 py-2.5 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {guardando ? 'Guardando…' : info?.configurada ? 'Cambiar la clave' : 'Guardar la clave'}
          </button>
        </form>
      </div>
    </section>
  )
}

// ─── 2. Directo publicado ────────────────────────────────────────────────────
function BloqueDirecto({ fichajes, onCambio }: { fichajes: FichajeAdmin[]; onCambio: () => void }) {
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const visibles = fichajes.filter((f) => f.visible).length

  async function alternarVisible(f: FichajeAdmin) {
    setTrabajando(f.id)
    const supabase = createClient()
    await supabase.from('fichajes').update({ visible: !f.visible }).eq('id', f.id)
    setTrabajando(null)
    onCambio()
  }

  async function borrar(f: FichajeAdmin) {
    if (!window.confirm(`¿Borrar el fichaje de ${f.atleta}? No se puede deshacer.`)) return
    setTrabajando(f.id)
    const supabase = createClient()
    await supabase.from('fichajes').delete().eq('id', f.id)
    setTrabajando(null)
    onCambio()
  }

  return (
    <section className="border border-ink/[0.14] bg-paper">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-ink/[0.14] bg-cream/50 px-5 py-3">
        <h2 className="font-brand text-base font-extrabold tracking-tight text-ink">En el directo</h2>
        <span className="label-mono text-ink/45">
          {visibles} visibles · {fichajes.length} en total
        </span>
        <p className="w-full text-[0.8rem] text-ink/50">
          Los envíos se publican al momento. Aquí puedes ocultar algo (se guarda, pero sale
          de /test) o borrarlo del todo.
        </p>
      </header>

      {fichajes.length === 0 ? (
        <p className="p-5 text-sm text-ink/55">Todavía no ha llegado ningún fichaje.</p>
      ) : (
        <ul className="divide-y divide-ink/[0.09]">
          {fichajes.map((f) => (
            <li key={f.id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-5 ${f.visible ? '' : 'bg-cream/40 opacity-60'}`}>
              <div className="shrink-0 sm:w-[5.5rem]">
                <p className="font-mono text-sm tabular-nums text-ink">{horaDe(f.informado_en)}</p>
                <p className="label-mono text-[0.58rem] text-ink/35">{diaDe(f.informado_en)}</p>
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-brand text-[1rem] font-extrabold leading-tight text-ink">{f.atleta}</p>
                <p className="mt-1 text-sm text-ink/65">
                  {f.club_origen ?? '?'} → <span className="font-semibold text-ink">{f.club_destino ?? '?'}</span>
                  {f.division && <span className="text-ink/40"> · {f.division}</span>}
                </p>
                {(f.nota || f.fuente || f.enviado_por) && (
                  <p className="mt-1 text-[0.78rem] text-ink/45">
                    {[f.nota, f.fuente, f.enviado_por && `lo manda ${f.enviado_por}`].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button" onClick={() => alternarVisible(f)} disabled={trabajando === f.id}
                  className="border border-ink/25 px-2.5 py-1.5 label-mono text-ink/65 transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
                >
                  {f.visible ? 'ocultar' : 'mostrar'}
                </button>
                <button
                  type="button" onClick={() => borrar(f)} disabled={trabajando === f.id}
                  className="border border-red-300 px-2.5 py-1.5 label-mono text-red-700 transition-colors hover:bg-red-50 disabled:opacity-40"
                >
                  borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ─── Piezas ──────────────────────────────────────────────────────────────────
const inputCls =
  'w-full border border-ink/[0.15] bg-cream/60 px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 transition-colors focus:border-ink/30 focus:bg-cream focus:outline-none focus:ring-2 focus:ring-mint/40'

function Aviso({ tono, children }: { tono: 'ok' | 'error' | 'pendiente'; children: React.ReactNode }) {
  const estilos = {
    ok: 'border-mint bg-mint/15 text-ink/75',
    error: 'border-red-200 bg-red-50 text-red-700',
    pendiente: 'border-ink/20 bg-cream/60 text-ink/70',
  }[tono]
  return <p className={`border-l-2 px-4 py-2.5 text-sm leading-relaxed ${estilos}`}>{children}</p>
}

function SinTabla() {
  return (
    <section className="border border-ink/[0.14] bg-paper p-5">
      <p className="label-mono text-ink/45">Falta un paso</p>
      <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-ink/70">
        La tabla <code className="bg-ink/[0.06] px-1 py-0.5 font-mono text-[0.8rem]">fichajes</code> no
        existe todavía. Abre Supabase (SQL Editor) y ejecuta el fichero{' '}
        <code className="bg-ink/[0.06] px-1 py-0.5 font-mono text-[0.8rem]">supabase/fichajes-schema.sql</code>{' '}
        del repositorio. Después vuelve aquí y pon la clave de colaborador.
      </p>
    </section>
  )
}
