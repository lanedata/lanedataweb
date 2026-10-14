'use client'

// TEMPORAL — Panel del mercado de fichajes.
//
//   1. ENLACES Y CLAVE: la clave de colaborador se escribe aquí y se guarda
//      hasheada (bcrypt) vía `fichajes_set_clave`, que solo puede llamar una
//      sesión autenticada. No vuelve a salir de la base: el panel solo sabe si
//      está puesta y de cuándo es. Si se pierde, se pone otra.
//   2. PROPUESTAS DE ATLETAS: lo que mandan los propios atletas desde
//      /fichajes/mi-fichaje no se publica solo. Aquí se aprueba (como rumor o
//      confirmado) o se descarta. El contacto que dejan solo se ve aquí.
//   3. EL DIRECTO: cambiar rumor ⇄ confirmado, ocultar (queda guardado pero
//      fuera de la web) o borrar.

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FICHAJE_COLUMNS, diaDe, horaDe,
  type EstadoFichaje, type Fichaje, type Propuesta,
} from '@/lib/fichajes/types'

const ENLACES = [
  { ruta: '/fichajes/enviar/', titulo: 'Colaboradores', texto: 'Con la clave. Se publica al momento.' },
  { ruta: '/fichajes/mi-fichaje/', titulo: 'Atletas', texto: 'Sin clave. Llega aquí abajo para que lo apruebes.' },
]

type FichajeAdmin = Fichaje & { visible: boolean }
type EstadoTabla = 'cargando' | 'listo' | 'sin-tabla' | 'error'

export function FichajesPanel() {
  const [estado, setEstado] = useState<EstadoTabla>('cargando')
  const [fichajes, setFichajes] = useState<FichajeAdmin[]>([])
  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [claveInfo, setClaveInfo] = useState<{ configurada: boolean; actualizado_en: string | null } | null>(null)

  const cargar = useCallback(async () => {
    const supabase = createClient()
    const [lista, props, clave] = await Promise.all([
      supabase.from('fichajes').select(`${FICHAJE_COLUMNS}, visible`)
        .order('informado_en', { ascending: false }).limit(200),
      supabase.from('fichajes_propuestas')
        .select('id, creado_en, atleta, genero, club_origen, club_destino, division_origen, division_destino, nota, contacto')
        .order('creado_en', { ascending: true }),
      supabase.rpc('fichajes_clave_estado'),
    ])

    const fallo = lista.error ?? props.error
    if (fallo) {
      // 42P01: falta una tabla · 42703: falta una columna → SQL sin aplicar o en v1
      setEstado(fallo.code === '42P01' || fallo.code === '42703' ? 'sin-tabla' : 'error')
      return
    }
    setFichajes((lista.data as unknown as FichajeAdmin[]) ?? [])
    setPropuestas((props.data as unknown as Propuesta[]) ?? [])
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
      <BloqueEnlaces />
      <BloquePropuestas propuestas={propuestas} onCambio={cargar} />
      <BloqueDirecto fichajes={fichajes} onCambio={cargar} />
      <BloqueClave info={claveInfo} onCambiada={cargar} />
    </div>
  )
}

// ─── Enlaces para repartir ───────────────────────────────────────────────────
function BloqueEnlaces() {
  const [copiado, setCopiado] = useState<string | null>(null)

  async function copiar(ruta: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${ruta}`)
      setCopiado(ruta)
      setTimeout(() => setCopiado(null), 2500)
    } catch { /* sin permiso de portapapeles: se copia a mano */ }
  }

  return (
    <section className="grid gap-px border border-ink/[0.14] bg-ink/[0.14] sm:grid-cols-2">
      {ENLACES.map((e) => (
        <div key={e.ruta} className="bg-paper p-5">
          <p className="font-brand text-base font-extrabold tracking-tight text-ink">{e.titulo}</p>
          <p className="mt-0.5 text-[0.8rem] text-ink/50">{e.texto}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate border border-ink/[0.14] bg-cream/50 px-3 py-2 font-mono text-[0.78rem] text-ink/75">
              {e.ruta}
            </code>
            <button type="button" onClick={() => copiar(e.ruta)} className={botonCls}>
              {copiado === e.ruta ? 'copiado' : 'copiar'}
            </button>
            <a href={e.ruta} target="_blank" rel="noopener noreferrer" className={botonCls}>abrir ↗</a>
          </div>
        </div>
      ))}
    </section>
  )
}

// ─── Propuestas de atletas (pendientes) ──────────────────────────────────────
function BloquePropuestas({ propuestas, onCambio }: { propuestas: Propuesta[]; onCambio: () => void }) {
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function aprobar(p: Propuesta, estado: EstadoFichaje) {
    setTrabajando(p.id); setError(null)
    const { error: err } = await createClient().rpc('fichajes_aprobar', { p_id: p.id, p_estado: estado })
    setTrabajando(null)
    if (err) { setError(err.message); return }
    onCambio()
  }

  async function descartar(p: Propuesta) {
    if (!window.confirm(`¿Descartar la propuesta de ${p.atleta}?`)) return
    setTrabajando(p.id); setError(null)
    const { error: err } = await createClient().from('fichajes_propuestas').delete().eq('id', p.id)
    setTrabajando(null)
    if (err) { setError(err.message); return }
    onCambio()
  }

  return (
    <section className="border border-ink/[0.14] bg-paper">
      <header className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-ink/[0.14] px-5 py-3 ${propuestas.length ? 'bg-mint/25' : 'bg-cream/50'}`}>
        <h2 className="font-brand text-base font-extrabold tracking-tight text-ink">Lo que cuentan los atletas</h2>
        <span className="label-mono text-ink/50">{propuestas.length} pendientes</span>
        <p className="w-full text-[0.8rem] text-ink/50">
          No se publica hasta que lo apruebes. Usa el contacto para comprobar que es el atleta de verdad.
        </p>
      </header>

      {error && <div className="p-4 pb-0"><Aviso tono="error">{error}</Aviso></div>}

      {propuestas.length === 0 ? (
        <p className="p-5 text-sm text-ink/55">No hay propuestas pendientes.</p>
      ) : (
        <ul className="divide-y divide-ink/[0.09]">
          {propuestas.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:gap-5">
              <div className="shrink-0 lg:w-[5.5rem]">
                <p className="font-mono text-sm tabular-nums text-ink">{horaDe(p.creado_en)}</p>
                <p className="label-mono text-[0.58rem] text-ink/35">{diaDe(p.creado_en)}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-brand text-[1rem] font-extrabold leading-tight text-ink">
                  {p.atleta}{p.genero && <span className="ml-2 label-mono text-[0.55rem] text-ink/45">{p.genero === 'H' ? 'hombres' : 'mujeres'}</span>}
                </p>
                <Movimiento origen={p.club_origen} destino={p.club_destino} divOrigen={p.division_origen} divDestino={p.division_destino} />
                {p.nota && <p className="mt-1 text-[0.78rem] text-ink/50">{p.nota}</p>}
                <p className="mt-1.5 text-[0.78rem]">
                  <span className="label-mono text-[0.55rem] text-ink/40">contacto · solo tú </span>
                  <span className="text-ink/75">{p.contacto || '— no ha dejado contacto'}</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button type="button" disabled={trabajando === p.id} onClick={() => aprobar(p, 'confirmado')}
                  className="bg-ink px-3 py-1.5 label-mono text-mint transition-colors hover:bg-mint hover:text-ink disabled:opacity-40">
                  publicar confirmado
                </button>
                <button type="button" disabled={trabajando === p.id} onClick={() => aprobar(p, 'rumor')} className={botonCls}>
                  como rumor
                </button>
                <button type="button" disabled={trabajando === p.id} onClick={() => descartar(p)}
                  className="border border-red-300 px-2.5 py-1.5 label-mono text-red-700 transition-colors hover:bg-red-50 disabled:opacity-40">
                  descartar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ─── Directo publicado ───────────────────────────────────────────────────────
function BloqueDirecto({ fichajes, onCambio }: { fichajes: FichajeAdmin[]; onCambio: () => void }) {
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const visibles = fichajes.filter((f) => f.visible).length

  async function actualizar(f: FichajeAdmin, cambios: Partial<FichajeAdmin>) {
    setTrabajando(f.id)
    await createClient().from('fichajes').update(cambios).eq('id', f.id)
    setTrabajando(null)
    onCambio()
  }

  async function borrar(f: FichajeAdmin) {
    if (!window.confirm(`¿Borrar el fichaje de ${f.atleta}? No se puede deshacer.`)) return
    setTrabajando(f.id)
    await createClient().from('fichajes').delete().eq('id', f.id)
    setTrabajando(null)
    onCambio()
  }

  return (
    <section className="border border-ink/[0.14] bg-paper">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-ink/[0.14] bg-cream/50 px-5 py-3">
        <h2 className="font-brand text-base font-extrabold tracking-tight text-ink">En el directo</h2>
        <span className="label-mono text-ink/45">{visibles} visibles · {fichajes.length} en total</span>
        <p className="w-full text-[0.8rem] text-ink/50">
          Lo de los colaboradores se publica al momento. Cada fichaje visible sale también, ya
          maquetado, en <a href="/admin/historias" className="font-semibold text-ink underline decoration-ink/30 underline-offset-2">Historias</a>.
        </p>
      </header>

      {fichajes.length === 0 ? (
        <p className="p-5 text-sm text-ink/55">Todavía no ha llegado ningún fichaje.</p>
      ) : (
        <ul className="divide-y divide-ink/[0.09]">
          {fichajes.map((f) => {
            const rumor = f.estado === 'rumor'
            return (
              <li key={f.id} className={`flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:gap-5 ${f.visible ? '' : 'bg-cream/40 opacity-60'}`}>
                <div className="shrink-0 lg:w-[5.5rem]">
                  <p className="font-mono text-sm tabular-nums text-ink">{horaDe(f.informado_en)}</p>
                  <p className="label-mono text-[0.58rem] text-ink/35">{diaDe(f.informado_en)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-1.5 py-0.5 label-mono text-[0.55rem] ${rumor ? 'border border-dashed border-ink/40 text-ink/60' : 'bg-ink text-mint'}`}>
                      {rumor ? 'rumor' : 'confirmado'}
                    </span>
                    {f.origen_envio === 'atleta' && <span className="label-mono text-[0.55rem] text-ink/45">lo contó el atleta</span>}
                    {!f.visible && <span className="label-mono text-[0.55rem] text-ink/45">oculto</span>}
                  </div>
                  <p className="mt-1.5 font-brand text-[1rem] font-extrabold leading-tight text-ink">{f.atleta}</p>
                  <Movimiento origen={f.club_origen} destino={f.club_destino} divOrigen={f.division_origen} divDestino={f.division_destino} />
                  {(f.nota || f.fuente) && (
                    <p className="mt-1 text-[0.78rem] text-ink/45">{[f.nota, f.fuente].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button type="button" disabled={trabajando === f.id}
                    onClick={() => actualizar(f, { estado: rumor ? 'confirmado' : 'rumor' })}
                    className={rumor
                      ? 'bg-ink px-2.5 py-1.5 label-mono text-mint transition-colors hover:bg-mint hover:text-ink disabled:opacity-40'
                      : botonCls}>
                    {rumor ? 'confirmar' : 'pasar a rumor'}
                  </button>
                  <button type="button" disabled={trabajando === f.id} onClick={() => actualizar(f, { visible: !f.visible })} className={botonCls}>
                    {f.visible ? 'ocultar' : 'mostrar'}
                  </button>
                  <button type="button" disabled={trabajando === f.id} onClick={() => borrar(f)}
                    className="border border-red-300 px-2.5 py-1.5 label-mono text-red-700 transition-colors hover:bg-red-50 disabled:opacity-40">
                    borrar
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// ─── Clave de colaborador ────────────────────────────────────────────────────
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

  const coincide = clave.length > 0 && clave === repetida
  const puedeGuardar = clave.length >= 6 && coincide && !guardando

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!puedeGuardar) return
    setGuardando(true); setError(null); setHecho(false)
    const { error: err } = await createClient().rpc('fichajes_set_clave', { p_clave: clave })
    setGuardando(false)
    if (err) { setError(err.message || 'No se ha podido guardar la clave.'); return }
    setClave(''); setRepetida(''); setHecho(true)
    onCambiada()
  }

  return (
    <section className="border border-ink/[0.14] bg-paper">
      <header className="border-b border-ink/[0.14] bg-cream/50 px-5 py-3">
        <h2 className="font-brand text-base font-extrabold tracking-tight text-ink">Clave de colaborador</h2>
        <p className="mt-0.5 text-[0.8rem] text-ink/50">La pones aquí y se la pasas a quien vaya a mandarte fichajes.</p>
      </header>
      <div className="space-y-5 p-5">
        {info?.configurada ? (
          <Aviso tono="ok">
            Hay una clave puesta
            {info.actualizado_en && <> desde el {new Date(info.actualizado_en).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</>}.
            No se puede consultar: si no la recuerdas, escribe una nueva aquí abajo.
          </Aviso>
        ) : (
          <Aviso tono="pendiente">Todavía no hay clave. Hasta que pongas una, los colaboradores no pueden enviar.</Aviso>
        )}
        <form onSubmit={guardar} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block label-mono text-ink/60">{info?.configurada ? 'Clave nueva' : 'Clave'} · mínimo 6</span>
              <input type="password" value={clave} autoComplete="new-password"
                onChange={(e) => { setClave(e.target.value); setError(null); setHecho(false) }}
                className={inputCls} placeholder="••••••••" />
            </label>
            <label className="block">
              <span className="mb-1.5 block label-mono text-ink/60">Repítela</span>
              <input type="password" value={repetida} autoComplete="new-password"
                onChange={(e) => { setRepetida(e.target.value); setError(null) }}
                className={inputCls} placeholder="••••••••" />
            </label>
          </div>
          {repetida.length > 0 && !coincide && <p className="text-[0.8rem] text-ink/55">Las dos claves no coinciden.</p>}
          {error && <Aviso tono="error">{error}</Aviso>}
          {hecho && <Aviso tono="ok">Clave guardada. Ya puedes repartirla con el enlace de colaboradores.</Aviso>}
          <button type="submit" disabled={!puedeGuardar}
            className="bg-ink px-5 py-2.5 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
            {guardando ? 'Guardando…' : info?.configurada ? 'Cambiar la clave' : 'Guardar la clave'}
          </button>
        </form>
      </div>
    </section>
  )
}

// ─── Piezas ──────────────────────────────────────────────────────────────────
const inputCls =
  'w-full border border-ink/[0.15] bg-cream/60 px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 transition-colors focus:border-ink/30 focus:bg-cream focus:outline-none focus:ring-2 focus:ring-mint/40'
const botonCls =
  'border border-ink/25 px-2.5 py-1.5 label-mono text-ink/65 transition-colors hover:border-ink hover:text-ink disabled:opacity-40'

function Movimiento({
  origen, destino, divOrigen, divDestino,
}: { origen: string | null; destino: string | null; divOrigen: string | null; divDestino: string | null }) {
  return (
    <p className="mt-1 text-sm text-ink/65">
      {origen ?? '?'}{divOrigen && <span className="text-ink/35"> ({divOrigen})</span>}
      {' → '}
      <span className="font-semibold text-ink">{destino ?? '?'}</span>
      {divDestino && <span className="text-ink/40"> ({divDestino})</span>}
    </p>
  )
}

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
        La base de datos del mercado no está al día. Abre Supabase (SQL Editor) y ejecuta el fichero{' '}
        <code className="bg-ink/[0.06] px-1 py-0.5 font-mono text-[0.8rem]">supabase/fichajes-schema.sql</code>{' '}
        del repositorio. Si ya lo habías ejecutado, vuelve a hacerlo: se actualiza solo sin perder nada.
      </p>
    </section>
  )
}
