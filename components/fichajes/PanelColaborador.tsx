'use client'

// TEMPORAL — Zona de colaboradores del mercado (/fichajes/enviar/). El enlace
// es el mismo para todos: cada uno entra con SU cuenta de Google y Postgres
// comprueba que ese correo esté en la lista blanca de /admin/fichajes.
//
// Dentro, tres pestañas:
//   · Publicar: el formulario de siempre; sale en el directo al momento.
//   · Chivatazos: lo que manda el público, para comprobarlo y publicarlo (o
//     descartarlo). Nunca se ve quién lo mandó.
//   · Publicado: todo lo que hay en el directo, sin decir quién lo subió. Si
//     algo está mal se marca una incidencia; el autor (y el admin) la ven y lo
//     corrigen.
//
// Todo pasa por las funciones `colab_*` (supabase/fichajes-schema.sql): tener
// sesión no da acceso a ninguna tabla.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  diaDe, haceDe, horaDe, normalizar,
  type ChivatazoPendiente, type FichajeColab,
} from '@/lib/fichajes/types'
import { FormularioFichaje } from './FormularioFichaje'
import { Pruebas } from './Pruebas'

type Sesion = 'cargando' | 'fuera' | 'dentro'
type Pestana = 'publicar' | 'chivatazos' | 'publicado'
interface Yo { nombre: string; email: string; chivatazos: number; incidencias: number }

const inputCls =
  'w-full border border-ink/[0.15] bg-cream/60 px-4 py-3 text-base text-ink placeholder:text-ink/30 transition-colors focus:border-ink/30 focus:bg-cream focus:outline-none focus:ring-2 focus:ring-mint/40 sm:text-sm'
const botonCls =
  'border border-ink/25 px-3 py-2 label-mono text-[0.6rem] text-ink/70 transition-colors hover:border-ink hover:text-ink disabled:opacity-40'
const botonFuerteCls =
  'bg-ink px-3 py-2 label-mono text-[0.6rem] text-mint transition-colors hover:bg-mint hover:text-ink disabled:opacity-40'
const botonPeligroCls =
  'border border-red-300 px-3 py-2 label-mono text-[0.6rem] text-red-700 transition-colors hover:bg-red-50 disabled:opacity-40'

/** A dónde vuelve Supabase tras pasar por Google. */
const volverA = () => `${window.location.origin}/fichajes/enviar/`

export function PanelColaborador() {
  const [sesion, setSesion] = useState<Sesion>('cargando')
  const [correo, setCorreo] = useState<string | null>(null)
  const [errorEnlace, setErrorEnlace] = useState<string | null>(null)

  useEffect(() => {
    // Si Google falla (o el correo no está en la lista blanca), Supabase vuelve
    // con el error en la URL.
    const p = new URLSearchParams(window.location.hash.slice(1) || window.location.search)
    const fallo = p.get('error_description') ?? p.get('error')
    if (fallo) {
      setErrorEnlace(fallo.replace(/\+/g, ' '))
      history.replaceState(null, '', window.location.pathname)
    }

    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCorreo(session?.user.email ?? null)
      setSesion(session ? 'dentro' : 'fuera')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, session) => {
      setCorreo(session?.user.email ?? null)
      setSesion(session ? 'dentro' : 'fuera')
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      {sesion === 'cargando' ? (
        <div className="h-64 animate-pulse border border-ink/[0.14] bg-cream/50" aria-hidden="true" />
      ) : sesion === 'fuera' ? (
        <Marca><Acceso errorInicial={errorEnlace} /></Marca>
      ) : (
        <Dentro correo={correo} />
      )}
    </div>
  )
}

function Marca({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-sm">
      <p className="font-brand text-2xl font-extrabold tracking-brand text-ink">lanedata</p>
      <p className="mt-1 label-mono text-ink/40">Mercado de fichajes · colaboradores</p>
      {children}
    </div>
  )
}

// ─── Entrar: solo con Google ─────────────────────────────────────────────────
// Sin contraseñas a propósito: no hay nada que adivinar a la fuerza, y Google
// garantiza que el correo es de quien entra.

function Acceso({ errorInicial }: { errorInicial: string | null }) {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(errorInicial)

  useEffect(() => { if (errorInicial) setError(errorInicial) }, [errorInicial])

  async function conGoogle() {
    setError(null); setOcupado(true)
    const { error: err } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: volverA(), queryParams: { prompt: 'select_account' } },
    })
    // Si va bien, el navegador se va a Google y no se llega aquí.
    if (err) {
      setError(/provider is not enabled/i.test(err.message)
        ? 'El inicio de sesión con Google aún no está activado en Supabase.'
        : err.message)
      setOcupado(false)
    }
  }

  return (
    <>
      <h1 className="mt-6 font-brand text-[clamp(26px,6vw,34px)] font-extrabold leading-[1.02] tracking-brand text-ink">
        Entra con tu cuenta de Google
      </h1>
      <p className="mt-2.5 text-sm leading-relaxed text-ink/60">
        Solo entran los correos que lanedata ha dado de alta como colaboradores. Usa la cuenta de
        Google de ese correo.
      </p>
      {error && <p className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <BotonGoogle onClick={conGoogle} ocupado={ocupado} />
    </>
  )
}

export function BotonGoogle({ onClick, ocupado }: { onClick: () => void; ocupado: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={ocupado}
      className="mt-7 flex w-full items-center justify-center gap-3 border border-ink/25 bg-paper py-3.5 font-brand text-[0.95rem] font-bold tracking-tight text-ink transition-colors hover:border-ink disabled:opacity-50">
      <svg aria-hidden="true" viewBox="0 0 18 18" className="h-[18px] w-[18px]">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" />
        <path fill="#FBBC05" d="M3.96 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
      </svg>
      {ocupado ? 'Abriendo Google…' : 'Continuar con Google'}
    </button>
  )
}

// ─── Dentro ──────────────────────────────────────────────────────────────────

function Dentro({ correo }: { correo: string | null }) {
  const [yo, setYo] = useState<Yo | null>(null)
  const [sinAcceso, setSinAcceso] = useState<string | null>(null)
  const [pestana, setPestana] = useState<Pestana>('publicar')
  const [chivatazos, setChivatazos] = useState<ChivatazoPendiente[]>([])
  const [fichajes, setFichajes] = useState<FichajeColab[]>([])
  const [ahora, setAhora] = useState(Date.now())

  const cargar = useCallback(async () => {
    const sb = createClient()
    const quien = await sb.rpc('colab_yo')
    if (quien.error) {
      setYo(null)
      setSinAcceso(quien.error.code === 'PGRST202'
        ? 'La base de datos del mercado no está al día (falta ejecutar supabase/fichajes-schema.sql).'
        : quien.error.message)
      return
    }
    setSinAcceso(null)
    setYo(quien.data as Yo)
    const [c, f] = await Promise.all([sb.rpc('colab_chivatazos'), sb.rpc('colab_fichajes', { p_limite: 200 })])
    if (!c.error) setChivatazos((c.data as ChivatazoPendiente[]) ?? [])
    if (!f.error) setFichajes((f.data as FichajeColab[]) ?? [])
    setAhora(Date.now())
  }, [])

  useEffect(() => {
    cargar()
    const sondeo = setInterval(cargar, 60_000)
    const alVolver = () => { if (document.visibilityState === 'visible') cargar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => { clearInterval(sondeo); document.removeEventListener('visibilitychange', alVolver) }
  }, [cargar])

  const salir = () => createClient().auth.signOut()

  if (sinAcceso) {
    return (
      <Marca>
        <h1 className="mt-6 font-brand text-[clamp(24px,6vw,30px)] font-extrabold leading-[1.05] tracking-brand text-ink">
          Aún no tienes acceso
        </h1>
        <p className="mt-3 border-l-2 border-ink/25 bg-cream/60 px-4 py-3 text-sm leading-relaxed text-ink/75">{sinAcceso}</p>
        {correo && <p className="mt-3 text-[0.82rem] text-ink/50">Has entrado como <strong className="font-semibold text-ink/75">{correo}</strong>.</p>}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={cargar} className={botonCls}>volver a comprobar</button>
          <button type="button" onClick={salir} className={botonCls}>entrar con otro correo</button>
        </div>
      </Marca>
    )
  }
  if (!yo) return <div className="h-64 animate-pulse border border-ink/[0.14] bg-cream/50" aria-hidden="true" />

  const incidenciasMias = fichajes.filter((f) => f.mio && f.incidencias.length > 0).length

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <p className="font-brand text-2xl font-extrabold tracking-brand text-ink">lanedata</p>
          <p className="mt-1 label-mono text-ink/40">Mercado de fichajes · colaboradores</p>
        </div>
        <p className="text-[0.82rem] text-ink/55">
          Hola, <strong className="font-semibold text-ink">{yo.nombre}</strong>
          <button type="button" onClick={salir} className="ml-3 label-mono text-[0.58rem] text-ink/45 underline decoration-ink/20 underline-offset-4 hover:text-ink">salir</button>
        </p>
      </header>

      <nav className="mb-8 grid grid-cols-3 border border-ink/[0.15] bg-cream/60 p-1" aria-label="Secciones">
        <Tab activo={pestana === 'publicar'} onClick={() => setPestana('publicar')}>Publicar</Tab>
        <Tab activo={pestana === 'chivatazos'} onClick={() => setPestana('chivatazos')} cuenta={chivatazos.length}>Chivatazos</Tab>
        <Tab activo={pestana === 'publicado'} onClick={() => setPestana('publicado')} cuenta={incidenciasMias} alerta>Publicado</Tab>
      </nav>

      {/* El formulario sigue montado al cambiar de pestaña: no se pierde lo escrito. */}
      <div className={pestana === 'publicar' ? '' : 'hidden'}>
        <FormularioFichaje modo="colaborador" onPublicado={cargar} />
      </div>
      {pestana === 'chivatazos' && <Chivatazos lista={chivatazos} ahora={ahora} onCambio={cargar} />}
      {pestana === 'publicado' && <Publicado lista={fichajes} onCambio={cargar} />}
    </>
  )
}

function Tab({ activo, onClick, cuenta, alerta, children }: {
  activo: boolean; onClick: () => void; cuenta?: number; alerta?: boolean; children: React.ReactNode
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo}
      className={`flex items-center justify-center gap-1.5 px-2 py-2.5 font-brand text-[0.88rem] font-bold tracking-tight transition-colors ${
        activo ? 'bg-ink text-cream' : 'text-ink/55 hover:text-ink'}`}>
      {children}
      {!!cuenta && (
        <span className={`flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full px-1 font-mono text-[0.62rem] font-semibold leading-none ${
          alerta ? 'bg-amber-400 text-ink' : 'bg-mint text-ink'}`}>
          {cuenta}
        </span>
      )}
    </button>
  )
}

function Movimiento({ f }: { f: Pick<FichajeColab, 'club_origen' | 'club_destino' | 'division_origen' | 'division_destino'> }) {
  return (
    <p className="mt-1 text-sm text-ink/65">
      {f.club_origen ?? '¿?'}{f.division_origen && <span className="text-ink/35"> ({f.division_origen})</span>}
      {' → '}
      <span className="font-semibold text-ink">{f.club_destino ?? '¿?'}</span>
      {f.division_destino && <span className="text-ink/40"> ({f.division_destino})</span>}
    </p>
  )
}

// ─── Chivatazos por revisar ──────────────────────────────────────────────────

function Chivatazos({ lista, ahora, onCambio }: { lista: ChivatazoPendiente[]; ahora: number; onCambio: () => void }) {
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function resolver(c: ChivatazoPendiente, accion: 'confirmado' | 'rumor' | 'descartar') {
    if (accion === 'descartar' && !window.confirm(`¿Descartar el chivatazo de ${c.atleta}?`)) return
    setOcupado(c.id); setError(null)
    const { error: err } = await createClient().rpc('colab_chivatazo_resolver', { p_id: c.id, p_accion: accion })
    setOcupado(null)
    if (err) setError(err.message)
    onCambio()
  }

  return (
    <section>
      <h1 className="font-brand text-[clamp(22px,5vw,28px)] font-extrabold leading-[1.02] tracking-brand text-ink">Chivatazos por revisar</h1>
      <p className="mb-6 mt-2.5 text-sm leading-relaxed text-ink/60">
        Los manda cualquiera desde la web, así que <strong className="font-semibold text-ink/80">compruébalo antes de publicar</strong>.
        Si no lo ves claro, publícalo como rumor o déjalo para otro. Lo que publiques sale en el directo al momento.
      </p>
      {error && <p className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {lista.length === 0 ? (
        <p className="border border-ink/[0.14] bg-paper p-6 text-sm text-ink/55">No hay chivatazos pendientes. 👌</p>
      ) : (
        <ul className="space-y-3">
          {lista.map((c) => (
            <li key={c.id} className="border border-ink/[0.14] bg-paper p-4 sm:p-5">
              <p className="label-mono text-[0.58rem] text-ink/45">🤫 chivatazo · {haceDe(c.creado_en, ahora)}</p>
              <p className="mt-1.5 font-brand text-[1.15rem] font-extrabold leading-tight tracking-tight text-ink">
                {c.atleta}
                {c.genero && <span className="ml-2 label-mono text-[0.55rem] text-ink/45">{c.genero === 'H' ? 'hombres' : 'mujeres'}</span>}
              </p>
              <Movimiento f={c} />
              {(c.fuente || c.nota) && (
                <div className="mt-2.5 border-l-2 border-ink/15 pl-3 text-[0.82rem] leading-relaxed text-ink/65">
                  {c.fuente && <p><span className="label-mono text-[0.55rem] text-ink/45">de dónde sale · </span>{c.fuente}</p>}
                  {c.nota && <p>{c.nota}</p>}
                </div>
              )}
              <Pruebas enlace={c.enlace} adjunto={c.adjunto} />
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={ocupado === c.id} onClick={() => resolver(c, 'confirmado')} className={botonFuerteCls}>publicar confirmado</button>
                <button type="button" disabled={ocupado === c.id} onClick={() => resolver(c, 'rumor')} className={`${botonCls} border-dashed`}>publicar como rumor</button>
                <button type="button" disabled={ocupado === c.id} onClick={() => resolver(c, 'descartar')} className={`${botonPeligroCls} ml-auto`}>descartar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ─── Todo lo publicado + incidencias ─────────────────────────────────────────

type FiltroPub = 'todos' | 'mios' | 'incidencias'
const PAGINA = 15

function Publicado({ lista, onCambio }: { lista: FichajeColab[]; onCambio: () => void }) {
  const [filtro, setFiltro] = useState<FiltroPub>('todos')
  const [busca, setBusca] = useState('')
  const [mostrados, setMostrados] = useState(PAGINA)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setMostrados(PAGINA) }, [filtro, busca])

  const cuenta = useMemo(() => ({
    mios: lista.filter((f) => f.mio).length,
    incidencias: lista.filter((f) => f.incidencias.length > 0).length,
  }), [lista])

  const visibles = useMemo(() => {
    const palabras = normalizar(busca).split(' ').filter(Boolean)
    return lista.filter((f) => {
      if (filtro === 'mios' && !f.mio) return false
      if (filtro === 'incidencias' && f.incidencias.length === 0) return false
      if (!palabras.length) return true
      const texto = normalizar(`${f.atleta} ${f.club_origen ?? ''} ${f.club_destino ?? ''}`)
      return palabras.every((p) => texto.includes(p))
    })
  }, [lista, filtro, busca])

  const chip = (v: FiltroPub, texto: string) => (
    <button type="button" onClick={() => setFiltro(v)} aria-pressed={filtro === v}
      className={`border px-2.5 py-1.5 label-mono text-[0.58rem] transition-colors ${
        filtro === v ? 'border-ink bg-ink text-cream' : 'border-ink/25 text-ink/60 hover:border-ink/50 hover:text-ink'}`}>
      {texto}
    </button>
  )

  return (
    <section>
      <h1 className="font-brand text-[clamp(22px,5vw,28px)] font-extrabold leading-[1.02] tracking-brand text-ink">Lo publicado</h1>
      <p className="mb-5 mt-2.5 text-sm leading-relaxed text-ink/60">
        Todo lo que hay en el directo, lo haya subido quien lo haya subido (no se dice quién). ¿Ves un
        error? <strong className="font-semibold text-ink/80">Marca una incidencia</strong>: le llega a quien lo publicó y a lanedata.
      </p>

      <div className="mb-4 space-y-2.5">
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Busca un atleta o un club…" className={inputCls} />
        <div className="flex flex-wrap gap-1.5">
          {chip('todos', `Todos · ${lista.length}`)}
          {chip('mios', `Los míos · ${cuenta.mios}`)}
          {chip('incidencias', `Con incidencia · ${cuenta.incidencias}`)}
        </div>
      </div>

      {error && <p className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {visibles.length === 0 ? (
        <p className="border border-ink/[0.14] bg-paper p-6 text-sm text-ink/55">Nada por aquí.</p>
      ) : (
        <ul className="border border-ink/[0.14] bg-paper">
          {visibles.slice(0, mostrados).map((f) => (
            <FilaPublicado key={f.id} f={f} onCambio={onCambio} onError={setError} />
          ))}
        </ul>
      )}
      {visibles.length > mostrados && (
        <button type="button" onClick={() => setMostrados((n) => n + PAGINA)}
          className="mt-3 w-full border border-ink/25 py-3 label-mono text-ink/70 transition-colors hover:border-ink hover:bg-ink hover:text-mint">
          Ver {Math.min(PAGINA, visibles.length - mostrados)} más
        </button>
      )}
    </section>
  )
}

function FilaPublicado({ f, onCambio, onError }: { f: FichajeColab; onCambio: () => void; onError: (e: string | null) => void }) {
  const [ocupado, setOcupado] = useState(false)
  const [escribiendo, setEscribiendo] = useState(false)
  const [texto, setTexto] = useState('')
  const rumor = f.estado === 'rumor'
  const yaMarcada = f.incidencias.some((i) => i.mia)

  async function llamar(fn: string, args: Record<string, unknown>) {
    setOcupado(true); onError(null)
    const { error } = await createClient().rpc(fn, args)
    setOcupado(false)
    if (error) { onError(error.message); return false }
    onCambio()
    return true
  }

  async function marcar(e: React.FormEvent) {
    e.preventDefault()
    if (await llamar('colab_incidencia', { p_fichaje: f.id, p_texto: texto.trim() })) {
      setTexto(''); setEscribiendo(false)
    }
  }

  const corregir = (cambios: { p_estado?: string; p_retirar?: boolean }, confirmar?: string) => {
    if (confirmar && !window.confirm(confirmar)) return
    llamar('colab_corregir', { p_fichaje: f.id, ...cambios })
  }

  return (
    <li className={`border-b border-ink/[0.09] p-4 last:border-0 ${f.visible ? '' : 'bg-cream/50 opacity-70'} ${
      f.incidencias.length ? 'shadow-[inset_4px_0_0_#fbbf24]' : ''}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className={`px-1.5 py-0.5 label-mono text-[0.55rem] ${rumor ? 'border border-dashed border-ink/40 text-ink/60' : 'bg-ink text-mint'}`}>
          {rumor ? 'rumor' : 'confirmado'}
        </span>
        {f.mio && <span className="bg-mint px-1.5 py-0.5 label-mono text-[0.55rem] text-ink">tuyo</span>}
        {f.bomba && <span className="label-mono text-[0.55rem] text-ink/55">💥 bomba</span>}
        {!f.visible && <span className="border border-ink/25 px-1.5 py-0.5 label-mono text-[0.55rem] text-ink/55">retirado</span>}
        <time dateTime={f.informado_en} className="ml-auto font-mono text-[0.72rem] tabular-nums text-ink/45">
          {diaDe(f.informado_en)} · {horaDe(f.informado_en)}
        </time>
      </div>
      <p className="mt-1.5 font-brand text-[1.05rem] font-extrabold leading-tight tracking-tight text-ink">{f.atleta}</p>
      <Movimiento f={f} />
      {(f.nota || f.fuente) && (
        <p className="mt-1 text-[0.78rem] text-ink/50">{[f.nota, f.fuente].filter(Boolean).join(' · ')}</p>
      )}

      {f.incidencias.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {f.incidencias.map((i) => (
            <li key={i.id} className="border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-[0.82rem] leading-snug text-ink/80">
              <span className="label-mono text-[0.55rem] text-amber-700">incidencia{i.mia ? ' · la marcaste tú' : ''} · </span>
              {i.texto}
            </li>
          ))}
        </ul>
      )}

      {f.visible && (
        <div className="mt-3 flex flex-wrap gap-2">
          {f.mio ? (
            <>
              <button type="button" disabled={ocupado} onClick={() => corregir({ p_estado: rumor ? 'confirmado' : 'rumor' })} className={botonCls}>
                {rumor ? 'pasar a confirmado' : 'pasar a rumor'}
              </button>
              <button type="button" disabled={ocupado} className={botonPeligroCls}
                onClick={() => corregir({ p_retirar: true }, `¿Retirar del directo el fichaje de ${f.atleta}? Si era un error, podrás publicarlo otra vez bien.`)}>
                retirar
              </button>
              {f.incidencias.length > 0 && (
                <button type="button" disabled={ocupado} onClick={() => corregir({})} className={`${botonCls} ml-auto`}>
                  está bien · cerrar incidencia
                </button>
              )}
            </>
          ) : !escribiendo && !yaMarcada ? (
            <button type="button" onClick={() => setEscribiendo(true)} className={botonCls}>⚑ marcar incidencia</button>
          ) : null}
        </div>
      )}

      {escribiendo && (
        <form onSubmit={marcar} className="mt-3 space-y-2">
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} maxLength={400} autoFocus
            placeholder="¿Qué está mal? Ej.: no ficha por ese club, es su hermano, aún no es oficial…"
            className={`${inputCls} resize-y`} />
          <div className="flex gap-2">
            <button type="submit" disabled={ocupado || texto.trim().length < 5} className={botonFuerteCls}>enviar incidencia</button>
            <button type="button" onClick={() => { setEscribiendo(false); setTexto('') }} className={botonCls}>cancelar</button>
          </div>
        </form>
      )}
    </li>
  )
}
