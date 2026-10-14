'use client'

// TEMPORAL — Formulario del mercado de fichajes, en dos modos:
//
//   · colaborador (/fichajes/enviar/): con la clave que pone el admin en
//     /admin/fichajes. Elige rumor o confirmado y se publica AL MOMENTO.
//   · atleta (/fichajes/mi-fichaje/): el propio atleta cuenta su fichaje, sin
//     clave. Como cualquiera podría decir que es cualquiera, NO se publica: va a
//     revisión y el admin lo aprueba. El contacto que deje solo lo ve el admin.
//
// Para rellenar rápido: al elegir al atleta en el buscador se ponen solos su
// sexo y su club 2026; el destino tiene a mano los equipos de División de Honor
// y Primera de ese sexo; y la división de cada club se resuelve sola.
//
// SOBRE LA CLAVE: no está en este código ni en el bundle. La valida Postgres
// contra un hash bcrypt (función `fichajes_enviar`, ver supabase/fichajes-schema.sql).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  buscarAtletas, buscarClubes, cargarDatos, clubPorNombre, divisionDe,
  type Atleta, type Club,
} from '@/lib/fichajes/datos'
import {
  DIVISIONES, DIVISION_NOMBRE, divisionCorta,
  type EstadoFichaje, type Genero,
} from '@/lib/fichajes/types'
import { Autocompletar } from './Autocompletar'

type Modo = 'colaborador' | 'atleta'
const CLAVE_KEY = 'lanedata-fichajes-clave'

/** "2026-10-14T16:40" — valor que espera <input type="datetime-local">. */
function ahoraLocal(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

interface Enviado {
  atleta: string
  origen: string
  destino: string
  estado?: EstadoFichaje
  hora: string
}

export function FormularioFichaje({ modo }: { modo: Modo }) {
  const esColab = modo === 'colaborador'

  const [clave, setClave] = useState('')
  const [claveRecordada, setClaveRecordada] = useState(false)

  const [atleta, setAtleta] = useState('')
  const [genero, setGenero] = useState<Genero | null>(null)
  const [origen, setOrigen] = useState('')
  const [destino, setDestino] = useState('')
  const [sinOrigen, setSinOrigen] = useState(false)
  const [sinDestino, setSinDestino] = useState(false)
  const [divOrigen, setDivOrigen] = useState('')
  const [divDestino, setDivDestino] = useState('')
  // Si la división se toca a mano, cambiar de club ya no la sobrescribe.
  const [divOrigenManual, setDivOrigenManual] = useState(false)
  const [divDestinoManual, setDivDestinoManual] = useState(false)

  const [estado, setEstado] = useState<EstadoFichaje>('rumor')
  const [informado, setInformado] = useState(ahoraLocal)
  const [fuente, setFuente] = useState('')
  const [nota, setNota] = useState('')
  const [contacto, setContacto] = useState('')
  const [trampa, setTrampa] = useState('') // honeypot: los bots lo rellenan

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviados, setEnviados] = useState<Enviado[]>([])
  const [clubesDivision, setClubesDivision] = useState<Club[]>([])

  // Clave recordada de esta pestaña (solo colaboradores).
  useEffect(() => {
    if (!esColab) return
    try {
      const guardada = sessionStorage.getItem(CLAVE_KEY)
      if (guardada) { setClave(guardada); setClaveRecordada(true) }
    } catch { /* modo privado */ }
  }, [esColab])

  // Clubes de DH y Primera, para elegir el destino de un toque.
  useEffect(() => {
    cargarDatos()
      .then((d) => setClubesDivision(d.clubes.filter((c) => c.d)))
      .catch(() => setClubesDivision([]))
  }, [])

  // División automática según club + sexo.
  useEffect(() => {
    if (divOrigenManual) return
    let vivo = true
    clubPorNombre(sinOrigen ? '' : origen)
      .then((c) => vivo && setDivOrigen(divisionDe(c, genero) ?? ''))
      .catch(() => {})
    return () => { vivo = false }
  }, [origen, sinOrigen, genero, divOrigenManual])

  useEffect(() => {
    if (divDestinoManual) return
    let vivo = true
    clubPorNombre(sinDestino ? '' : destino)
      .then((c) => vivo && setDivDestino(divisionDe(c, genero) ?? ''))
      .catch(() => {})
    return () => { vivo = false }
  }, [destino, sinDestino, genero, divDestinoManual])

  const elegirAtleta = useCallback((a: Atleta) => {
    setAtleta(a.nombre)
    setGenero(a.genero)
    if (a.club) {
      setOrigen(a.club.n)
      setSinOrigen(false)
      setDivOrigenManual(false)
    }
  }, [])

  const faltaClub = (sinOrigen || !origen.trim()) && (sinDestino || !destino.trim())
  const puedeEnviar =
    (!esColab || clave.trim().length > 0) && atleta.trim().length >= 3 && !faltaClub && !enviando

  function limpiar() {
    setAtleta(''); setGenero(null)
    setOrigen(''); setDestino(''); setSinOrigen(false); setSinDestino(false)
    setDivOrigen(''); setDivDestino(''); setDivOrigenManual(false); setDivDestinoManual(false)
    setEstado('rumor'); setInformado(ahoraLocal())
    setFuente(''); setNota(''); setContacto('')
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!puedeEnviar) return
    setError(null)

    const base = {
      atleta: atleta.trim(),
      origen: sinOrigen ? null : origen.trim() || null,
      destino: sinDestino ? null : destino.trim() || null,
      divOrigen: sinOrigen ? null : divOrigen.trim() || null,
      divDestino: sinDestino ? null : divDestino.trim() || null,
    }

    // Bot: se finge que ha ido bien y no se manda nada.
    if (!esColab && trampa) { registrarEnviado(base); limpiar(); return }

    setEnviando(true)
    const supabase = createClient()
    const { error: err } = esColab
      ? await supabase.rpc('fichajes_enviar', {
          p_clave: clave,
          p_atleta: base.atleta,
          p_estado: estado,
          p_genero: genero,
          p_club_origen: base.origen,
          p_club_destino: base.destino,
          p_division_origen: base.divOrigen,
          p_division_destino: base.divDestino,
          p_informado_en: (() => { const m = new Date(informado); return isNaN(m.getTime()) ? null : m.toISOString() })(),
          p_fuente: fuente.trim() || null,
          p_nota: nota.trim() || null,
        })
      : await supabase.rpc('fichajes_proponer', {
          p_atleta: base.atleta,
          p_genero: genero,
          p_club_origen: base.origen,
          p_club_destino: base.destino,
          p_division_origen: base.divOrigen,
          p_division_destino: base.divDestino,
          p_nota: nota.trim() || null,
          p_contacto: contacto.trim() || null,
        })
    setEnviando(false)

    if (err) {
      setError(err.message || 'No se ha podido enviar. Inténtalo de nuevo.')
      return
    }
    if (esColab) {
      try { sessionStorage.setItem(CLAVE_KEY, clave); setClaveRecordada(true) } catch { /* modo privado */ }
    }
    registrarEnviado(base)
    limpiar()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function registrarEnviado(b: { atleta: string; origen: string | null; destino: string | null }) {
    setEnviados((prev) => [{
      atleta: b.atleta,
      origen: b.origen ?? '?',
      destino: b.destino ?? '?',
      estado: esColab ? estado : undefined,
      hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    }, ...prev])
  }

  // Equipos de división del sexo elegido, para el destino de un toque.
  const destinosRapidos = useMemo(() => {
    if (!genero) return { dh: [] as Club[], pd: [] as Club[] }
    const del = (cod: 'DH' | '1D') =>
      clubesDivision.filter((c) => c.d?.[genero] === cod).sort((a, b) => a.n.localeCompare(b.n, 'es'))
    return { dh: del('DH'), pd: del('1D') }
  }, [clubesDivision, genero])

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-9">
        <p className="font-brand text-2xl font-extrabold tracking-brand text-ink">lanedata</p>
        <p className="mt-1 label-mono text-ink/40">
          Mercado de fichajes · {esColab ? 'colaboradores' : 'atletas'}
        </p>
        <h1 className="mt-5 font-brand text-[clamp(28px,6vw,40px)] font-extrabold leading-[1.02] tracking-brand text-ink">
          {esColab ? 'Avisa de un fichaje' : '¿Cambias de club? Cuéntanoslo'}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/60">
          {esColab ? (
            <>Busca al atleta y se rellenan solos su club y su sexo. Se publica en el directo{' '}
              <strong className="font-semibold text-ink/80">al momento</strong>, así que marca bien si es
              rumor o confirmado.</>
          ) : (
            <>Si vas a competir con otro club la próxima temporada, mándanoslo aquí. Lo revisamos antes
              de publicarlo en el mercado de fichajes de lanedata.</>
          )}
        </p>
      </header>

      {enviados.length > 0 && <Enviados lista={enviados} esColab={esColab} />}

      <form onSubmit={enviar} className="space-y-8">
        {/* ── Clave ── */}
        {esColab && (
          <Bloque titulo="Clave de colaborador">
            {claveRecordada ? (
              <div className="flex items-center gap-3 border border-ink/[0.14] bg-cream/40 px-4 py-3">
                <span className="text-sm text-ink/60">Clave recordada en esta pestaña</span>
                <button
                  type="button"
                  onClick={() => { setClaveRecordada(false); setClave(''); try { sessionStorage.removeItem(CLAVE_KEY) } catch { /* */ } }}
                  className="ml-auto label-mono text-ink/45 transition-colors hover:text-ink"
                >
                  cambiar
                </button>
              </div>
            ) : (
              <input
                type="password" required autoComplete="current-password"
                value={clave} onChange={(e) => { setClave(e.target.value); setError(null) }}
                placeholder="La que te ha pasado lanedata" className={inputCls}
              />
            )}
          </Bloque>
        )}

        {/* ── Atleta ── */}
        <Bloque titulo={esColab ? '¿Quién se mueve?' : '¿Quién eres?'}>
          <Etiqueta texto={esColab ? 'Atleta' : 'Tu nombre y apellidos'} obligatorio />
          <Autocompletar<Atleta>
            value={atleta}
            onChange={setAtleta}
            onPick={elegirAtleta}
            buscar={buscarAtletas}
            clave={(a) => `${a.nombre}|${a.club?.n ?? ''}`}
            pintar={(a) => (
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-ink">{a.nombre}</span>
                <span className="truncate text-[0.75rem] text-ink/50">
                  {a.club?.n ?? 'sin club'}{a.genero === 'H' ? ' · H' : ' · M'}
                </span>
              </div>
            )}
            placeholder="Escribe nombre o apellidos…"
            className={inputCls}
          />
          <p className="mt-1.5 text-[0.75rem] text-ink/40">
            Si no aparece en la lista, escríbelo completo igualmente.
          </p>

          <div className="mt-4">
            <Etiqueta texto="Compite en" />
            <Segmentado
              valor={genero ?? ''}
              opciones={[{ v: 'H', l: 'Hombres' }, { v: 'M', l: 'Mujeres' }]}
              onCambio={(v) => setGenero(v as Genero)}
            />
            <p className="mt-1.5 text-[0.75rem] text-ink/40">
              Decide la división: un club puede estar en DH en hombres y en Primera en mujeres.
            </p>
          </div>
        </Bloque>

        {/* ── Movimiento ── */}
        <Bloque titulo="¿De dónde a dónde?">
          <div className="grid gap-6 sm:grid-cols-2">
            <ClubCampo
              etiqueta={esColab ? 'Club que deja' : 'Tu club actual'}
              valor={origen} onValor={setOrigen}
              sin={sinOrigen} onSin={setSinOrigen}
              division={divOrigen}
              onDivision={(v) => { setDivOrigen(v); setDivOrigenManual(true) }}
              aviso="No se sabe de dónde viene"
            />
            <ClubCampo
              etiqueta={esColab ? 'Club que lo ficha' : 'Tu club nuevo'}
              valor={destino} onValor={setDestino}
              sin={sinDestino} onSin={setSinDestino}
              division={divDestino}
              onDivision={(v) => { setDivDestino(v); setDivDestinoManual(true) }}
              aviso={esColab ? 'Se va, pero no se sabe a dónde' : 'Aún no lo puedo decir'}
            />
          </div>

          {faltaClub && (
            <p className="mt-4 border-l-2 border-ink/25 bg-cream/40 px-3 py-2 text-[0.8rem] text-ink/60">
              Hace falta al menos uno de los dos clubes. Si solo se sabe que se va, rellena el de origen
              y marca la incógnita en el destino.
            </p>
          )}

          {/* Destino de un toque */}
          {!sinDestino && (
            <div className="mt-6 border-t border-ink/[0.1] pt-5">
              {genero ? (
                <>
                  <ChipsDivision
                    titulo={`${DIVISION_NOMBRE.DH} · ${genero === 'H' ? 'hombres' : 'mujeres'}`}
                    clubes={destinosRapidos.dh} actual={destino}
                    onElegir={(n) => { setDestino(n); setDivDestinoManual(false) }}
                  />
                  <ChipsDivision
                    titulo={`${DIVISION_NOMBRE['1D']} · ${genero === 'H' ? 'hombres' : 'mujeres'}`}
                    clubes={destinosRapidos.pd} actual={destino}
                    onElegir={(n) => { setDestino(n); setDivDestinoManual(false) }}
                  />
                </>
              ) : (
                <p className="text-[0.78rem] text-ink/45">
                  Elige si compite en hombres o mujeres y aquí aparecen los equipos de División de Honor
                  y Primera para elegir el destino de un toque.
                </p>
              )}
            </div>
          )}
        </Bloque>

        {/* ── Estado ── */}
        {esColab && (
          <Bloque titulo="¿Cómo de seguro es?">
            <div className="grid gap-3 sm:grid-cols-2">
              <OpcionEstado
                activo={estado === 'rumor'} onClick={() => setEstado('rumor')}
                titulo="Rumor" texto="Se comenta, pero nadie lo ha anunciado." discontinuo
              />
              <OpcionEstado
                activo={estado === 'confirmado'} onClick={() => setEstado('confirmado')}
                titulo="Confirmado" texto="Lo ha anunciado el club, el atleta o es oficial."
              />
            </div>
          </Bloque>
        )}

        {/* ── Detalles ── */}
        <Bloque titulo="Detalles" opcional>
          {esColab && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Etiqueta texto="Hora a la que se supo" />
                <input
                  type="datetime-local" value={informado}
                  onChange={(e) => setInformado(e.target.value)}
                  max={ahoraLocal()} className={inputCls}
                />
              </div>
              <div>
                <Etiqueta texto="Fuente" />
                <input
                  type="text" value={fuente} onChange={(e) => setFuente(e.target.value)}
                  placeholder="Comunicado del club, X…" className={inputCls}
                />
              </div>
            </div>
          )}

          <div className={esColab ? 'mt-5' : ''}>
            <Etiqueta texto="Nota" />
            <textarea
              value={nota} onChange={(e) => setNota(e.target.value)} rows={2}
              placeholder={esColab ? 'Pendiente de firma, llega cedida hasta junio…' : 'Cualquier detalle que quieras contar'}
              className={`${inputCls} resize-y`}
            />
          </div>

          {!esColab && (
            <div className="mt-5">
              <Etiqueta texto="Cómo contactarte para confirmarlo" />
              <input
                type="text" value={contacto} onChange={(e) => setContacto(e.target.value)}
                placeholder="Tu Instagram o tu email" className={inputCls}
              />
              <p className="mt-1.5 text-[0.75rem] text-ink/40">
                Solo lo ve lanedata para comprobar que eres tú. No se publica nunca.
              </p>
            </div>
          )}

          {/* Honeypot: invisible para personas, irresistible para bots. */}
          {!esColab && (
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>Web <input tabIndex={-1} autoComplete="off" value={trampa} onChange={(e) => setTrampa(e.target.value)} /></label>
            </div>
          )}
        </Bloque>

        {error && (
          <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit" disabled={!puedeEnviar}
          className="w-full bg-ink py-4 font-brand text-base font-bold tracking-tight text-cream transition-colors hover:bg-mint hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-ink disabled:hover:text-cream"
        >
          {enviando ? 'Enviando…' : esColab ? `Publicar como ${estado}` : 'Enviar para revisión'}
        </button>
      </form>
    </div>
  )
}

// ─── Piezas ──────────────────────────────────────────────────────────────────
const inputCls =
  'w-full border border-ink/[0.15] bg-cream/60 px-4 py-3 text-sm text-ink placeholder:text-ink/30 transition-colors focus:border-ink/30 focus:bg-cream focus:outline-none focus:ring-2 focus:ring-mint/40 disabled:opacity-40'

function Bloque({ titulo, opcional, children }: { titulo: string; opcional?: boolean; children: React.ReactNode }) {
  return (
    <fieldset className="border border-ink/[0.14] bg-paper p-5 sm:p-6">
      <legend className="-ml-1 px-1 font-brand text-base font-extrabold tracking-tight text-ink">
        {titulo}{opcional && <span className="ml-2 label-mono text-[0.55rem] text-ink/35">opcional</span>}
      </legend>
      {children}
    </fieldset>
  )
}

function Etiqueta({ texto, obligatorio }: { texto: string; obligatorio?: boolean }) {
  return (
    <span className="mb-1.5 block label-mono text-ink/60">
      {texto}{obligatorio && <span className="text-ink/35"> · obligatorio</span>}
    </span>
  )
}

function Segmentado({
  valor, opciones, onCambio,
}: { valor: string; opciones: { v: string; l: string }[]; onCambio: (v: string) => void }) {
  return (
    <div className="inline-flex w-full border border-ink/[0.15] bg-cream/60 p-1 sm:w-auto">
      {opciones.map((o) => (
        <button
          key={o.v} type="button" onClick={() => onCambio(o.v)} aria-pressed={valor === o.v}
          className={`flex-1 px-5 py-2 label-mono transition-colors sm:flex-none ${
            valor === o.v ? 'bg-ink text-cream' : 'text-ink/55 hover:text-ink'
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

function ClubCampo({
  etiqueta, valor, onValor, sin, onSin, division, onDivision, aviso,
}: {
  etiqueta: string
  valor: string
  onValor: (v: string) => void
  sin: boolean
  onSin: (v: boolean) => void
  division: string
  onDivision: (v: string) => void
  aviso: string
}) {
  const corta = divisionCorta(division)
  return (
    <div>
      <Etiqueta texto={etiqueta} />
      <Autocompletar<Club>
        value={sin ? '' : valor}
        onChange={onValor}
        onPick={(c) => onValor(c.n)}
        buscar={buscarClubes}
        clave={(c) => `${c.n}|${c.f}`}
        pintar={(c) => (
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-ink">{c.n}</span>
            <span className="shrink-0 label-mono text-[0.55rem] text-ink/45">
              {c.f}{c.d?.H ? ` · H ${c.d.H === 'DH' ? 'DH' : '1ª'}` : ''}{c.d?.M ? ` · M ${c.d.M === 'DH' ? 'DH' : '1ª'}` : ''}
            </span>
          </div>
        )}
        placeholder={sin ? '?' : 'Busca el club…'}
        disabled={sin}
        className={inputCls}
      />
      <label className="mt-2 flex items-center gap-2 text-[0.78rem] text-ink/55">
        <input
          type="checkbox" checked={sin}
          onChange={(e) => { onSin(e.target.checked); if (e.target.checked) onValor('') }}
          className="h-3.5 w-3.5 accent-ink"
        />
        {aviso} <span className="font-brand font-extrabold text-ink/45">?</span>
      </label>
      {!sin && (
        <div className="mt-2.5 flex items-center gap-2">
          <span className="label-mono text-[0.55rem] text-ink/40">División</span>
          <select
            value={division}
            onChange={(e) => onDivision(e.target.value)}
            className="min-w-0 flex-1 border border-ink/[0.12] bg-cream/40 px-2 py-1 text-[0.78rem] text-ink focus:outline-none focus:ring-2 focus:ring-mint/40"
          >
            <option value="">—</option>
            {DIVISIONES.map((d) => <option key={d} value={d}>{d}</option>)}
            {division && !DIVISIONES.includes(division) && <option value={division}>{division}</option>}
          </select>
          {corta && <span className="bg-ink px-1.5 py-0.5 label-mono text-[0.55rem] text-mint">{corta}</span>}
        </div>
      )}
    </div>
  )
}

function ChipsDivision({
  titulo, clubes, actual, onElegir,
}: { titulo: string; clubes: Club[]; actual: string; onElegir: (n: string) => void }) {
  if (clubes.length === 0) return null
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-2 label-mono text-[0.58rem] text-ink/45">{titulo}</p>
      <div className="flex flex-wrap gap-1.5">
        {clubes.map((c) => {
          const activo = c.n === actual
          return (
            <button
              key={c.n} type="button" onClick={() => onElegir(c.n)} aria-pressed={activo}
              className={`border px-2.5 py-1.5 text-[0.78rem] transition-colors ${
                activo
                  ? 'border-ink bg-ink text-cream'
                  : 'border-ink/[0.15] bg-cream/40 text-ink/75 hover:border-ink/40 hover:text-ink'
              }`}
            >
              {c.n}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function OpcionEstado({
  activo, onClick, titulo, texto, discontinuo,
}: { activo: boolean; onClick: () => void; titulo: string; texto: string; discontinuo?: boolean }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={activo}
      className={`p-4 text-left transition-colors ${discontinuo ? 'border-2 border-dashed' : 'border-2'} ${
        activo ? 'border-ink bg-ink text-cream' : 'border-ink/[0.18] bg-paper text-ink hover:border-ink/45'
      }`}
    >
      <p className="font-brand text-lg font-extrabold tracking-tight">{titulo}</p>
      <p className={`mt-1 text-[0.8rem] leading-snug ${activo ? 'text-cream/70' : 'text-ink/55'}`}>{texto}</p>
    </button>
  )
}

function Enviados({ lista, esColab }: { lista: Enviado[]; esColab: boolean }) {
  return (
    <section className="mb-8 border border-mint bg-mint/15">
      <p className="border-b border-mint/60 px-4 py-2.5 text-sm font-semibold text-ink">
        {esColab
          ? `Publicado ✓ · llevas ${lista.length} desde esta pestaña`
          : 'Recibido ✓ · lo revisamos y, si todo cuadra, sale publicado en breve'}
      </p>
      <ul className="divide-y divide-mint/40">
        {lista.map((e, i) => (
          <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5 text-sm">
            <span className="font-mono text-[0.75rem] tabular-nums text-ink/45">{e.hora}</span>
            <strong className="font-semibold text-ink">{e.atleta}</strong>
            <span className="text-ink/60">{e.origen} &rarr; {e.destino}</span>
            {e.estado && <span className="label-mono text-[0.55rem] text-ink/50">{e.estado}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
