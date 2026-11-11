'use client'

// TEMPORAL — Tablón del mercado: atletas que buscan club y clubes que buscan
// atletas. Todo pasa por la revisión de lanedata antes de salir aquí, y el
// contacto nunca se publica: quien se interesa deja sus datos y lanedata pone
// a las dos partes en contacto.
//
// Los atletas pueden enlazar su perfil de mundoatletismo.es, que se ve
// embebido con la skin «lane» (la de lanedata).

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buscarAtletas, buscarClubes, type Atleta, type Club } from '@/lib/fichajes/datos'
import { ANUNCIO_COLUMNS_PUBLICAS, haceDe, perfilLane, type Anuncio, type TipoAnuncio } from '@/lib/fichajes/types'
import { Autocompletar } from './Autocompletar'

const inputCls =
  'w-full border border-ink/[0.15] bg-cream/60 px-4 py-3 text-sm text-ink placeholder:text-ink/30 focus:border-ink/30 focus:bg-cream focus:outline-none focus:ring-2 focus:ring-mint/40'

export function Tablon() {
  const [anuncios, setAnuncios] = useState<Anuncio[] | null>(null)
  const [filtro, setFiltro] = useState<TipoAnuncio | 'todos'>('todos')
  const [formulario, setFormulario] = useState<TipoAnuncio | null>(null)

  const cargar = useCallback(async () => {
    const { data, error } = await createClient().from('mercado_anuncios')
      .select(ANUNCIO_COLUMNS_PUBLICAS).eq('estado', 'publicado')
      .order('publicado_en', { ascending: false }).limit(100)
    setAnuncios(error ? [] : (data as unknown as Anuncio[]))
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const visibles = (anuncios ?? []).filter((a) => filtro === 'todos' || a.tipo === filtro)
  const n = (t: TipoAnuncio) => (anuncios ?? []).filter((a) => a.tipo === t).length

  return (
    <div>
      {/* Llamadas a anunciarse */}
      <div className="grid gap-px border border-ink/[0.14] bg-ink/[0.14] sm:grid-cols-2">
        <button type="button" onClick={() => setFormulario('atleta')}
          className={`p-5 text-left transition-colors ${formulario === 'atleta' ? 'bg-ink text-cream' : 'bg-paper hover:bg-mint/25'}`}>
          <p className="font-brand text-lg font-extrabold tracking-tight">🏃 Soy atleta y busco club</p>
          <p className={`mt-1 text-[0.82rem] ${formulario === 'atleta' ? 'text-cream/70' : 'text-ink/55'}`}>Cuenta qué buscas y enseña tu perfil de Mundo Atletismo.</p>
        </button>
        <button type="button" onClick={() => setFormulario('club')}
          className={`p-5 text-left transition-colors ${formulario === 'club' ? 'bg-ink text-cream' : 'bg-paper hover:bg-mint/25'}`}>
          <p className="font-brand text-lg font-extrabold tracking-tight">🏟️ Soy un club y busco atletas</p>
          <p className={`mt-1 text-[0.82rem] ${formulario === 'club' ? 'text-cream/70' : 'text-ink/55'}`}>Pruebas, nivel, lo que ofrecéis… y que te encuentren.</p>
        </button>
      </div>
      {formulario && <FormularioAnuncio key={formulario} tipo={formulario} onCerrar={() => setFormulario(null)} />}

      {/* Filtro */}
      <div className="mt-8 flex flex-wrap gap-2">
        {([['todos', `Todo · ${(anuncios ?? []).length}`], ['atleta', `Atletas que buscan club · ${n('atleta')}`], ['club', `Clubes que buscan atletas · ${n('club')}`]] as const).map(([v, l]) => (
          <button key={v} type="button" onClick={() => setFiltro(v)} aria-pressed={filtro === v}
            className={`border px-2.5 py-1 label-mono text-[0.58rem] ${filtro === v ? 'border-ink bg-ink text-cream' : 'border-ink/25 text-ink/60 hover:text-ink'}`}>
            {l}
          </button>
        ))}
      </div>

      {anuncios === null ? (
        <div className="mt-4 h-40 animate-pulse border border-ink/[0.14] bg-cream/50" />
      ) : visibles.length === 0 ? (
        <p className="mt-4 border border-ink/[0.14] bg-cream/40 p-6 text-sm text-ink/55">
          Todavía no hay anuncios publicados aquí. ¡Sé el primero!
        </p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {visibles.map((a) => <TarjetaAnuncio key={a.id} a={a} />)}
        </div>
      )}
    </div>
  )
}

// ─── Una tarjeta ─────────────────────────────────────────────────────────────
function TarjetaAnuncio({ a }: { a: Anuncio }) {
  const [verPerfil, setVerPerfil] = useState(false)
  const [interes, setInteres] = useState(false)
  const perfil = perfilLane(a.perfil_url)
  const esAtleta = a.tipo === 'atleta'
  const genero = a.genero === 'H' ? 'Hombres' : a.genero === 'M' ? 'Mujeres' : a.genero === 'X' ? 'Hombres y mujeres' : null

  return (
    <article className={`flex flex-col border bg-paper ${esAtleta ? 'border-ink/[0.14]' : 'border-ink/30'}`}>
      <div className="flex-1 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-1.5 py-0.5 label-mono text-[0.55rem] ${esAtleta ? 'bg-ink text-mint' : 'bg-mint text-ink'}`}>
            {esAtleta ? 'Atleta busca club' : 'Club busca atletas'}
          </span>
          {a.publicado_en && <span className="ml-auto label-mono text-[0.55rem] text-ink/40">{haceDe(a.publicado_en)}</span>}
        </div>
        <h3 className="mt-2.5 font-brand text-[1.3rem] font-extrabold leading-tight tracking-tight text-ink">{a.autor}</h3>
        {a.club_actual && esAtleta && <p className="text-[0.82rem] text-ink/55">Ahora en {a.club_actual}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[genero, a.pruebas, a.zona && `📍 ${a.zona}`].filter(Boolean).map((t) => (
            <span key={t as string} className="border border-ink/15 bg-cream/50 px-2 py-0.5 text-[0.75rem] text-ink/70">{t}</span>
          ))}
        </div>
        <p className="mt-3 whitespace-pre-line text-[0.9rem] leading-relaxed text-ink/80">{a.texto}</p>
      </div>

      {perfil && verPerfil && (
        <div className="border-t border-ink/[0.14] bg-cream/30">
          <iframe src={perfil} title={`Perfil de ${a.autor} en Mundo Atletismo`} loading="lazy"
            className="block h-[520px] w-full" referrerPolicy="no-referrer" />
          <a href={perfil} target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-right label-mono text-[0.55rem] text-ink/50 underline">
            abrir en mundoatletismo.es ↗
          </a>
        </div>
      )}

      <div className="flex border-t border-ink/[0.14]">
        {perfil && (
          <button type="button" onClick={() => setVerPerfil((v) => !v)}
            className="flex-1 border-r border-ink/[0.14] px-4 py-3 label-mono text-[0.6rem] text-ink/70 hover:bg-cream/60">
            {verPerfil ? 'ocultar perfil' : '📊 ver perfil y marcas'}
          </button>
        )}
        <button type="button" onClick={() => setInteres((v) => !v)}
          className="flex-1 bg-ink px-4 py-3 label-mono text-[0.6rem] text-mint hover:bg-mint hover:text-ink">
          {esAtleta ? '¿Lo quieres en tu club? →' : 'Me interesa →'}
        </button>
      </div>
      {interes && <FormularioInteres anuncio={a} />}
    </article>
  )
}

// ─── «Me interesa» ───────────────────────────────────────────────────────────
function FormularioInteres({ anuncio }: { anuncio: Anuncio }) {
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [estado, setEstado] = useState<'libre' | 'enviando' | 'ok'>('libre')
  const [error, setError] = useState<string | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEstado('enviando'); setError(null)
    const { error: err } = await createClient().rpc('mercado_interes', {
      p_anuncio: anuncio.id, p_nombre: nombre, p_contacto: contacto, p_mensaje: mensaje || null,
    })
    if (err) { setError(err.message); setEstado('libre'); return }
    setEstado('ok')
  }

  if (estado === 'ok') {
    return <p className="border-t border-mint bg-mint/20 p-4 text-sm text-ink">✓ Recibido. lanedata os pone en contacto en cuanto lo revise.</p>
  }
  return (
    <form onSubmit={enviar} className="space-y-3 border-t border-ink/[0.14] bg-cream/40 p-4">
      <p className="text-[0.8rem] text-ink/60">Déjanos tus datos y os ponemos en contacto. No se publican.</p>
      <input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={anuncio.tipo === 'atleta' ? 'Tu nombre y club' : 'Tu nombre'} className={inputCls} />
      <input required value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Email, teléfono o Instagram" className={inputCls} />
      <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={2} placeholder="Mensaje (opcional)" className={inputCls} maxLength={600} />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={estado === 'enviando' || !nombre.trim() || !contacto.trim()}
        className="w-full bg-ink py-3 font-brand font-bold text-cream hover:bg-mint hover:text-ink disabled:opacity-40">
        {estado === 'enviando' ? 'Enviando…' : 'Enviar'}
      </button>
    </form>
  )
}

// ─── Publicar un anuncio (va a revisión) ─────────────────────────────────────
function FormularioAnuncio({ tipo, onCerrar }: { tipo: TipoAnuncio; onCerrar: () => void }) {
  const esAtleta = tipo === 'atleta'
  const [autor, setAutor] = useState('')
  const [clubActual, setClubActual] = useState('')
  const [genero, setGenero] = useState<'H' | 'M' | 'X' | ''>('')
  const [pruebas, setPruebas] = useState('')
  const [zona, setZona] = useState('')
  const [texto, setTexto] = useState('')
  const [perfil, setPerfil] = useState('')
  const [contacto, setContacto] = useState('')
  const [trampa, setTrampa] = useState('')
  const [estado, setEstado] = useState<'libre' | 'enviando' | 'ok'>('libre')
  const [error, setError] = useState<string | null>(null)

  const perfilOk = !perfil.trim() || !!perfilLane(perfil)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (trampa) { setEstado('ok'); return }
    setEstado('enviando'); setError(null)
    const { error: err } = await createClient().rpc('mercado_anunciar', {
      p_tipo: tipo, p_autor: autor, p_texto: texto,
      p_club_actual: clubActual || null, p_genero: genero || null, p_pruebas: pruebas || null,
      p_zona: zona || null, p_perfil_url: perfil.trim() || null, p_contacto: contacto,
    })
    if (err) { setError(err.message); setEstado('libre'); return }
    setEstado('ok')
  }

  if (estado === 'ok') {
    return (
      <div className="border border-t-0 border-mint bg-mint/20 p-5">
        <p className="font-brand text-lg font-extrabold text-ink">✓ Recibido</p>
        <p className="mt-1 text-sm text-ink/70">Lo verificamos con el contacto que nos has dejado y, si todo cuadra, sale publicado en el tablón.</p>
        <button type="button" onClick={onCerrar} className="mt-3 label-mono text-ink/60 underline">cerrar</button>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="space-y-4 border border-t-0 border-ink/[0.14] bg-paper p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block label-mono text-ink/60">{esAtleta ? 'Tu nombre y apellidos' : 'Club'} · obligatorio</span>
          {esAtleta ? (
            <Autocompletar<Atleta> value={autor} onChange={setAutor}
              onPick={(a) => { setAutor(a.nombre); setGenero(a.genero); if (a.club) setClubActual(a.club.n) }}
              buscar={buscarAtletas} clave={(a) => `${a.nombre}|${a.club?.n ?? ''}`}
              pintar={(a) => <span className="text-sm text-ink">{a.nombre} <span className="text-ink/45">· {a.club?.n ?? 'sin club'}</span></span>}
              placeholder="Escribe tu nombre…" className={inputCls} />
          ) : (
            <Autocompletar<Club> value={autor} onChange={setAutor} onPick={(c) => setAutor(c.n)}
              buscar={buscarClubes} clave={(c) => c.n} pintar={(c) => <span className="text-sm text-ink">{c.n}</span>}
              placeholder="Busca el club…" className={inputCls} />
          )}
        </label>
        {esAtleta && (
          <label className="block">
            <span className="mb-1.5 block label-mono text-ink/60">Club actual</span>
            <Autocompletar<Club> value={clubActual} onChange={setClubActual} onPick={(c) => setClubActual(c.n)}
              buscar={buscarClubes} clave={(c) => c.n} pintar={(c) => <span className="text-sm text-ink">{c.n}</span>}
              placeholder="Si tienes" className={inputCls} />
          </label>
        )}
        <label className="block">
          <span className="mb-1.5 block label-mono text-ink/60">{esAtleta ? 'Compites en' : 'Buscáis para'}</span>
          <select value={genero} onChange={(e) => setGenero(e.target.value as typeof genero)} className={inputCls}>
            <option value="">—</option>
            <option value="H">Hombres</option>
            <option value="M">Mujeres</option>
            {!esAtleta && <option value="X">Hombres y mujeres</option>}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block label-mono text-ink/60">Pruebas</span>
          <input value={pruebas} onChange={(e) => setPruebas(e.target.value)} maxLength={160}
            placeholder={esAtleta ? '800, 1500, cross…' : 'Velocidad, lanzamientos, fondo…'} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1.5 block label-mono text-ink/60">Zona</span>
          <input value={zona} onChange={(e) => setZona(e.target.value)} maxLength={80} placeholder="Ciudad o comunidad" className={inputCls} />
        </label>
        {esAtleta && (
          <label className="block">
            <span className="mb-1.5 block label-mono text-ink/60">Tu perfil en Mundo Atletismo</span>
            <input value={perfil} onChange={(e) => setPerfil(e.target.value)} placeholder="https://mundoatletismo.es/#/…" className={inputCls} />
            {!perfilOk && <span className="mt-1 block text-[0.75rem] text-red-700">Tiene que ser un enlace de mundoatletismo.es</span>}
            <span className="mt-1 block text-[0.72rem] text-ink/40">Busca tu nombre en mundoatletismo.es y copia el enlace de tu ficha. Se verá aquí con tus marcas.</span>
          </label>
        )}
      </div>
      <label className="block">
        <span className="mb-1.5 block label-mono text-ink/60">{esAtleta ? '¿Qué buscas?' : '¿Qué buscáis y qué ofrecéis?'} · obligatorio</span>
        <textarea required value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} maxLength={800}
          placeholder={esAtleta
            ? 'Ej.: Busco club de División de Honor o Primera para competir en 1500. Puedo moverme por Madrid…'
            : 'Ej.: Buscamos atletas de velocidad sub-23 para la liga. Ofrecemos entrenador, fisio y desplazamientos…'}
          className={inputCls} />
      </label>
      <label className="block">
        <span className="mb-1.5 block label-mono text-ink/60">Contacto para verificarlo · obligatorio</span>
        <input required value={contacto} onChange={(e) => setContacto(e.target.value)} maxLength={160}
          placeholder="Email, teléfono o Instagram" className={inputCls} />
        <span className="mt-1 block text-[0.72rem] text-ink/40">Solo lo ve lanedata. Nunca se publica: si alguien se interesa, os ponemos en contacto nosotros.</span>
      </label>
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Web <input tabIndex={-1} autoComplete="off" value={trampa} onChange={(e) => setTrampa(e.target.value)} /></label>
      </div>
      {error && <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={estado === 'enviando' || !autor.trim() || texto.trim().length < 10 || !contacto.trim() || !perfilOk}
        className="w-full bg-ink py-4 font-brand text-base font-bold text-cream hover:bg-mint hover:text-ink disabled:opacity-35">
        {estado === 'enviando' ? 'Enviando…' : 'Enviar para revisión'}
      </button>
    </form>
  )
}
