'use client'

// TEMPORAL — Panel del mercado de fichajes.
//
//   1. ENLACES Y COLABORADORES: quién puede entrar en /fichajes/enviar/ (lista
//      blanca por correo de Google) y las incidencias que marcan entre ellos.
//   2. PROPUESTAS DE ATLETAS: lo que mandan los propios atletas desde
//      /fichajes/mi-fichaje no se publica solo. Aquí se aprueba (como rumor o
//      confirmado) o se descarta. El contacto que dejan solo se ve aquí.
//   3. EL DIRECTO: cambiar rumor ⇄ confirmado, ocultar (queda guardado pero
//      fuera de la web) o borrar.

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FICHAJE_COLUMNS, diaDe, esChivatazo, horaDe,
  type Colaborador, type EstadoFichaje, type Fichaje, type IncidenciaAdmin, type Propuesta,
} from '@/lib/fichajes/types'
import { BloqueColaboradores } from './Colaboradores'
import { BloqueClubes, BloquePortada } from './ClubesYPortada'
import { BloqueTablon } from './TablonAdmin'

const ENLACES = [
  { ruta: '/fichajes/mi-fichaje/#chivatazo', titulo: 'Chivatazos', texto: 'Para todo el mundo, sin clave. Compártelo: llega aquí abajo para que lo apruebes.' },
  { ruta: '/fichajes/mi-fichaje/', titulo: 'Atletas', texto: 'La misma página, abierta en «es el mío».' },
  { ruta: '/fichajes/enviar/', titulo: 'Colaboradores', texto: 'El mismo enlace para todos: entran con Google si su correo está en la lista de abajo.' },
  { ruta: '/mercado/', titulo: 'Mercado público', texto: 'Directo + tablón de atletas y clubes.' },
  { ruta: '/admin/movil/', titulo: 'Panel móvil', texto: 'Instálalo como app y activa los avisos.' },
]

type FichajeAdmin = Fichaje & { visible: boolean; colaborador_id: string | null }
type EstadoTabla = 'cargando' | 'listo' | 'sin-tabla' | 'error'

export function FichajesPanel() {
  const [estado, setEstado] = useState<EstadoTabla>('cargando')
  const [fichajes, setFichajes] = useState<FichajeAdmin[]>([])
  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [incidencias, setIncidencias] = useState<IncidenciaAdmin[]>([])

  const cargar = useCallback(async () => {
    const supabase = createClient()
    const [lista, props, incs, colabs] = await Promise.all([
      supabase.from('fichajes').select(`${FICHAJE_COLUMNS}, visible, colaborador_id`)
        .order('informado_en', { ascending: false }).limit(500),
      supabase.from('fichajes_propuestas')
        .select('*')
        .order('creado_en', { ascending: true }),
      // Si la tabla aún no existe (SQL v5 sin aplicar) simplemente no hay incidencias.
      supabase.from('fichajes_incidencias').select('id, creado_en, fichaje_id, colaborador_id, texto, resuelta_en')
        .is('resuelta_en', null).order('creado_en', { ascending: true }),
      supabase.from('fichajes_colaboradores').select('*').order('creado_en', { ascending: true }),
    ])

    const fallo = lista.error ?? props.error
    if (fallo) {
      // 42P01: falta una tabla · 42703: falta una columna → SQL sin aplicar o en v1
      setEstado(fallo.code === '42P01' || fallo.code === '42703' ? 'sin-tabla' : 'error')
      return
    }
    setFichajes((lista.data as unknown as FichajeAdmin[]) ?? [])
    setPropuestas((props.data as unknown as Propuesta[]) ?? [])
    setColaboradores((colabs.data as Colaborador[]) ?? [])
    setIncidencias((incs.data as IncidenciaAdmin[]) ?? [])
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
      <BloqueIncidencias incidencias={incidencias} fichajes={fichajes} colaboradores={colaboradores} onCambio={cargar} />
      <BloquePropuestas propuestas={propuestas} colaboradores={colaboradores} onCambio={cargar} />
      <BloqueTablon />
      <BloqueDirecto fichajes={fichajes} colaboradores={colaboradores} onCambio={cargar} />
      <BloqueColaboradores
        colaboradores={colaboradores}
        cuentas={fichajes.reduce<Record<string, number>>((m, f) => {
          if (f.colaborador_id) m[f.colaborador_id] = (m[f.colaborador_id] ?? 0) + 1
          return m
        }, {})}
        onCambio={cargar}
      />
      <BloquePortada />
      <BloqueClubes />
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
    <section className="grid gap-px border border-ink/[0.14] bg-ink/[0.14] sm:grid-cols-2 lg:grid-cols-5">
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
function BloquePropuestas({ propuestas, colaboradores, onCambio }: { propuestas: Propuesta[]; colaboradores: Colaborador[]; onCambio: () => void }) {
  const nombres: Record<string, string> = Object.fromEntries(colaboradores.map((c) => [c.id, c.nombre]))
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
        <h2 className="font-brand text-base font-extrabold tracking-tight text-ink">Chivatazos y atletas</h2>
        <span className="label-mono text-ink/50">{propuestas.length} pendientes</span>
        <p className="w-full text-[0.8rem] text-ink/50">
          Los chivatazos también los revisan y publican los colaboradores; lo que cuenta un atleta solo lo apruebas tú (usa el contacto para ver que es él de verdad).
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
                <p className={`mb-1 inline-block px-1.5 py-0.5 label-mono text-[0.55rem] ${esChivatazo(p) ? 'bg-ink text-mint' : 'border border-ink/25 text-ink/55'}`}>
                  {esChivatazo(p) ? '🤫 chivatazo' : 'lo cuenta el atleta'}
                </p>
                {p.descartada_en && (
                  <p className="mb-1 ml-2 inline-block border border-red-300 px-1.5 py-0.5 label-mono text-[0.55rem] text-red-700">
                    descartado por {p.descartada_por ? nombres[p.descartada_por] ?? '¿?' : '¿?'}
                  </p>
                )}
                <p className="font-brand text-[1rem] font-extrabold leading-tight text-ink">
                  {p.atleta}{p.genero && <span className="ml-2 label-mono text-[0.55rem] text-ink/45">{p.genero === 'H' ? 'hombres' : 'mujeres'}</span>}
                </p>
                <Movimiento origen={p.club_origen} destino={p.club_destino} divOrigen={p.division_origen} divDestino={p.division_destino} />
                {p.nota && <p className="mt-1 text-[0.78rem] text-ink/50">{p.nota}</p>}
                {p.fuente && <p className="mt-1 text-[0.78rem] text-ink/50"><span className="label-mono text-[0.55rem] text-ink/40">fuente </span>{p.fuente}</p>}
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

// ─── Incidencias que marcan los colaboradores ────────────────────────────────
function BloqueIncidencias({ incidencias, fichajes, colaboradores, onCambio }: {
  incidencias: IncidenciaAdmin[]; fichajes: FichajeAdmin[]; colaboradores: Colaborador[]; onCambio: () => void
}) {
  const [trabajando, setTrabajando] = useState<string | null>(null)
  if (incidencias.length === 0) return null
  const nombres: Record<string, string> = Object.fromEntries(colaboradores.map((c) => [c.id, c.nombre]))
  const porId = new Map(fichajes.map((f) => [f.id, f]))

  async function hacer(i: IncidenciaAdmin, ocultar: boolean) {
    setTrabajando(i.id)
    const sb = createClient()
    if (ocultar) await sb.from('fichajes').update({ visible: false }).eq('id', i.fichaje_id)
    await sb.from('fichajes_incidencias')
      .update({ resuelta_en: new Date().toISOString(), resuelta_por: 'admin' })
      .eq(ocultar ? 'fichaje_id' : 'id', ocultar ? i.fichaje_id : i.id).is('resuelta_en', null)
    setTrabajando(null)
    onCambio()
  }

  return (
    <section className="border border-amber-400 bg-paper">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-amber-300 bg-amber-50 px-5 py-3">
        <h2 className="font-brand text-base font-extrabold tracking-tight text-ink">⚑ Incidencias</h2>
        <span className="label-mono text-ink/50">{incidencias.length} abiertas</span>
        <p className="w-full text-[0.8rem] text-ink/55">
          Un colaborador avisa de que un fichaje publicado está mal. También le llega a quien lo subió, que puede corregirlo o retirarlo.
          Para cambiar rumor ⇄ confirmado, hazlo abajo, en el directo, y luego ciérrala.
        </p>
      </header>
      <ul className="divide-y divide-ink/[0.09]">
        {incidencias.map((i) => {
          const f = porId.get(i.fichaje_id)
          return (
            <li key={i.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:gap-5">
              <div className="min-w-0 flex-1">
                <p className="font-brand text-[1rem] font-extrabold leading-tight text-ink">
                  {f?.atleta ?? 'Fichaje antiguo'}
                  {f && <span className="ml-2 label-mono text-[0.55rem] text-ink/45">{f.estado}{f.visible ? '' : ' · oculto'}</span>}
                </p>
                {f && <Movimiento origen={f.club_origen} destino={f.club_destino} divOrigen={f.division_origen} divDestino={f.division_destino} />}
                <p className="mt-2 border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-[0.85rem] leading-snug text-ink/80">{i.texto}</p>
                <p className="mt-1.5 label-mono text-[0.55rem] text-ink/45">
                  la marca {i.colaborador_id ? nombres[i.colaborador_id] ?? '¿?' : '¿?'} · {diaDe(i.creado_en)} {horaDe(i.creado_en)}
                  {f?.colaborador_id && <> · lo subió {nombres[f.colaborador_id] ?? '¿?'}</>}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button type="button" disabled={trabajando === i.id} onClick={() => hacer(i, false)} className={botonCls}>cerrar incidencia</button>
                {f?.visible && (
                  <button type="button" disabled={trabajando === i.id} onClick={() => hacer(i, true)}
                    className="border border-red-300 px-2.5 py-1.5 label-mono text-red-700 transition-colors hover:bg-red-50 disabled:opacity-40">
                    ocultar el fichaje
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ─── Directo publicado ───────────────────────────────────────────────────────
function BloqueDirecto({
  fichajes, colaboradores, onCambio,
}: { fichajes: FichajeAdmin[]; colaboradores: Colaborador[]; onCambio: () => void }) {
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const [quien, setQuien] = useState<string>('')
  const nombres: Record<string, string> = Object.fromEntries(colaboradores.map((c) => [c.id, c.nombre]))
  const lista = quien ? fichajes.filter((f) => (quien === '-' ? !f.colaborador_id : f.colaborador_id === quien)) : fichajes
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
        {colaboradores.length > 0 && (
          <select value={quien} onChange={(e) => setQuien(e.target.value)}
            className="mt-1 border border-ink/[0.15] bg-cream/50 px-2 py-1 text-[0.78rem] text-ink">
            <option value="">Todos los que suben</option>
            {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            <option value="-">Sin colaborador (atletas, tú)</option>
          </select>
        )}
      </header>

      {fichajes.length === 0 ? (
        <p className="p-5 text-sm text-ink/55">Todavía no ha llegado ningún fichaje.</p>
      ) : (
        <ul className="divide-y divide-ink/[0.09]">
          {lista.map((f) => {
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
                    {f.bomba && <span className="bg-mint px-1.5 py-0.5 label-mono text-[0.55rem] text-ink">💥 bomba</span>}
                    {f.origen_envio === 'atleta' && <span className="label-mono text-[0.55rem] text-ink/45">lo contó el atleta</span>}
                    {f.origen_envio === 'chivatazo' && <span className="label-mono text-[0.55rem] text-ink/45">chivatazo</span>}
                    {f.colaborador_id && (
                      <span className="label-mono text-[0.55rem] text-ink/55">{f.origen_envio === 'chivatazo' ? 'aprobado' : 'subido'} por {nombres[f.colaborador_id] ?? '¿?'}</span>
                    )}
                    {f.origen_envio === 'colaborador' && !f.colaborador_id && (
                      <span className="label-mono text-[0.55rem] text-ink/35">clave antigua</span>
                    )}
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
                  <button type="button" disabled={trabajando === f.id} onClick={() => actualizar(f, { bomba: !f.bomba })} className={botonCls}>
                    {f.bomba ? 'quitar bomba' : '💥 bomba'}
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

// ─── Piezas ──────────────────────────────────────────────────────────────────
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
