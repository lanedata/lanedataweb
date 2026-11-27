'use client'

// TEMPORAL — Tablón del mercado: atletas que buscan club y clubes que buscan
// atletas. Todo pasa por la revisión de lanedata antes de salir aquí, y el
// contacto nunca se publica: quien se interesa deja sus datos y lanedata pone
// a las dos partes en contacto.
//
// Al elegirse en el buscador, el atleta queda enlazado solo a su ficha de
// mundoatletismo.es (embebida con la skin «lane») y su prueba principal se
// rellena con los datos de Mundo Atletismo (scripts/gen_fichajes_pruebas.py).

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buscarAtletas, buscarClubes, type Atleta, type Club } from '@/lib/fichajes/datos'
import { ANUNCIO_COLUMNS_PUBLICAS, haceDe, perfilMA, type Anuncio, type TipoAnuncio } from '@/lib/fichajes/types'
import { Autocompletar } from './Autocompletar'
import { FichaAtleta } from './FichaAtleta'
import { CompensacionRFEA } from './CompensacionRFEA'
import { compensacionDe } from '@/lib/fichajes/compensaciones'
import { GRUPOS_PRUEBAS, ZONAS, encajaPrueba, pruebaDesdeMA, separarPruebas } from '@/lib/fichajes/tablon'

type FiltroComp = 'todas' | 'sin' | '500' | '1000' | '2000'
const selCls = 'border border-ink/25 bg-paper px-2.5 py-1.5 text-[0.8rem] text-ink focus:outline-none focus:ring-2 focus:ring-mint/40'

const inputCls =
  'w-full border border-ink/[0.15] bg-cream/60 px-4 py-3 text-sm text-ink placeholder:text-ink/30 focus:border-ink/30 focus:bg-cream focus:outline-none focus:ring-2 focus:ring-mint/40'

export function Tablon() {
  const [anuncios, setAnuncios] = useState<Anuncio[] | null>(null)
  const [filtro, setFiltro] = useState<TipoAnuncio | 'todos'>('todos')
  const [formulario, setFormulario] = useState<TipoAnuncio | null>(null)
  const [fPrueba, setFPrueba] = useState('')
  const [fZona, setFZona] = useState('')
  const [fGenero, setFGenero] = useState('')
  const [fComp, setFComp] = useState<FiltroComp>('todas')
  // Compensación RFEA de cada atleta anunciado (null = no tiene).
  const [comp, setComp] = useState<Record<string, number | null>>({})

  const cargar = useCallback(async () => {
    // La vista se ve igual con o sin sesión; si la base aún no la tiene (SQL v5
    // sin aplicar), se lee la tabla como antes.
    const leer = (de: string) => createClient().from(de)
      .select(ANUNCIO_COLUMNS_PUBLICAS).eq('estado', 'publicado')
      .order('publicado_en', { ascending: false }).limit(100)
    let { data, error } = await leer('mercado_anuncios_publicos')
    if (error) ({ data, error } = await leer('mercado_anuncios'))
    setAnuncios(error ? [] : (data as unknown as Anuncio[]))
  }, [])
  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    const atletas = (anuncios ?? []).filter((a) => a.tipo === 'atleta')
    Promise.all(atletas.map(async (a) => [a.id, (await compensacionDe(a.autor))?.euros ?? null] as const))
      .then((pares) => setComp(Object.fromEntries(pares)))
  }, [anuncios])

  const visibles = (anuncios ?? []).filter((a) => {
    if (filtro !== 'todos' && a.tipo !== filtro) return false
    if (fPrueba && !encajaPrueba(a.pruebas, fPrueba)) return false
    if (fZona && a.zona !== fZona && a.zona !== 'Cualquier zona') return false
    if (fGenero && a.genero && a.genero !== 'X' && a.genero !== fGenero) return false
    if (fComp !== 'todas') {
      if (a.tipo !== 'atleta') return false
      const e = comp[a.id] ?? null
      if (fComp === 'sin' ? e !== null : e !== null && e > Number(fComp)) return false
    }
    return true
  })
  const hayFiltros = Boolean(fPrueba || fZona || fGenero || fComp !== 'todas')
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
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select aria-label="Filtrar por prueba" value={fPrueba} onChange={(e) => setFPrueba(e.target.value)} className={selCls}>
          <option value="">Todas las pruebas</option>
          {GRUPOS_PRUEBAS.map((g) => (
            <optgroup key={g.grupo} label={g.grupo}>
              {g.pruebas.length > 1 && <option value={g.grupo}>{g.grupo} (todas)</option>}
              {g.pruebas.map((p) => <option key={p} value={p}>{p}</option>)}
            </optgroup>
          ))}
        </select>
        <select aria-label="Filtrar por zona" value={fZona} onChange={(e) => setFZona(e.target.value)} className={selCls}>
          <option value="">Todas las zonas</option>
          {ZONAS.filter((z) => z !== 'Cualquier zona').map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        <select aria-label="Filtrar por categoría" value={fGenero} onChange={(e) => setFGenero(e.target.value)} className={selCls}>
          <option value="">Hombres y mujeres</option>
          <option value="H">Hombres</option>
          <option value="M">Mujeres</option>
        </select>
        {filtro !== 'club' && (
          <select aria-label="Filtrar por compensación" value={fComp} onChange={(e) => setFComp(e.target.value as FiltroComp)} className={selCls}>
            <option value="todas">Cualquier compensación</option>
            <option value="sin">Sin compensación</option>
            <option value="500">Hasta 500 €</option>
            <option value="1000">Hasta 1.000 €</option>
            <option value="2000">Hasta 2.000 €</option>
          </select>
        )}
        {hayFiltros && (
          <button type="button" onClick={() => { setFPrueba(''); setFZona(''); setFGenero(''); setFComp('todas') }}
            className="label-mono text-[0.58rem] text-ink/50 underline hover:text-ink">quitar filtros</button>
        )}
      </div>

      {anuncios === null ? (
        <div className="mt-4 h-40 animate-pulse border border-ink/[0.14] bg-cream/50" />
      ) : visibles.length === 0 ? (
        <p className="mt-4 border border-ink/[0.14] bg-cream/40 p-6 text-sm text-ink/55">
          {hayFiltros ? 'Ningún anuncio encaja con estos filtros.' : 'Todavía no hay anuncios publicados aquí. ¡Sé el primero!'}
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
        {esAtleta && <CompensacionRFEA nombre={a.autor} detalle />}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[genero, ...separarPruebas(a.pruebas), a.zona && `📍 ${a.zona}`].filter(Boolean).map((t) => (
            <span key={t as string} className="border border-ink/15 bg-cream/50 px-2 py-0.5 text-[0.75rem] text-ink/70">{t}</span>
          ))}
        </div>
        {a.busca || a.ofrece ? (
          <dl className="mt-3 space-y-2.5">
            {a.busca && <Bloque titulo={esAtleta ? 'Busca' : 'Buscamos'} texto={a.busca} />}
            {a.ofrece && <Bloque titulo={esAtleta ? 'Ofrece' : 'Ofrecemos'} texto={a.ofrece} />}
          </dl>
        ) : !a.pruebas && a.texto ? (
          <p className="mt-3 whitespace-pre-line text-[0.9rem] leading-relaxed text-ink/80">{a.texto}</p>
        ) : null}
      </div>

      {esAtleta && verPerfil && (
        <div className="border-t border-ink/[0.14] bg-cream/30 p-4">
          <FichaAtleta nombre={a.autor} club={a.club_actual} perfilUrl={a.perfil_url} />
        </div>
      )}

      <div className="flex border-t border-ink/[0.14]">
        {esAtleta && (
          <button type="button" onClick={() => setVerPerfil((v) => !v)}
            className="flex-1 border-r border-ink/[0.14] px-4 py-3 label-mono text-[0.6rem] text-ink/70 hover:bg-cream/60">
            {verPerfil ? 'ocultar marcas' : '📊 ver marcas y ficha'}
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

function Bloque({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <dt className="label-mono text-[0.55rem] text-ink/45">{titulo}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-[0.9rem] leading-relaxed text-ink/80">{texto}</dd>
    </div>
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
  const [pruebas, setPruebas] = useState<string[]>([])
  const [zona, setZona] = useState('')
  const [busca, setBusca] = useState('')
  const [ofrece, setOfrece] = useState('')
  const alternar = (p: string) => setPruebas((l) => (l.includes(p) ? l.filter((x) => x !== p) : [...l, p]))
  // Ficha de Mundo Atletismo: se genera sola al elegir al atleta del buscador.
  const [perfil, setPerfil] = useState<string | null>(null)
  const [verFicha, setVerFicha] = useState(false)
  const [contacto, setContacto] = useState('')
  const [trampa, setTrampa] = useState('')
  const [estado, setEstado] = useState<'libre' | 'enviando' | 'ok'>('libre')
  const [error, setError] = useState<string | null>(null)


  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (trampa) { setEstado('ok'); return }
    setEstado('enviando'); setError(null)
    const { error: err } = await createClient().rpc('mercado_anunciar', {
      p_tipo: tipo, p_autor: autor, p_busca: busca || null, p_ofrece: ofrece || null,
      p_club_actual: clubActual || null, p_genero: genero || null, p_pruebas: pruebas.join(', ') || null,
      p_zona: zona || null, p_perfil_url: perfil, p_contacto: contacto,
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
            <Autocompletar<Atleta> value={autor}
              onChange={(v) => { setAutor(v); setPerfil(null); setVerFicha(false) }}
              onPick={(a) => {
                setAutor(a.nombre); setGenero(a.genero)
                if (a.club) setClubActual(a.club.n)
                const pr = pruebaDesdeMA(a.prueba)
                if (pr) setPruebas((l) => (l.length ? l : [pr]))
                setPerfil(perfilMA(a.nombre, a.club?.n))
              }}
              buscar={buscarAtletas} clave={(a) => `${a.nombre}|${a.club?.n ?? ''}`}
              pintar={(a) => (
                <span className="text-sm text-ink">{a.nombre}{' '}
                  <span className="text-ink/45">· {a.club?.n ?? 'sin club'}{a.prueba ? ` · ${a.prueba}` : ''}</span>
                </span>
              )}
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
          <span className="mb-1.5 block label-mono text-ink/60">Zona</span>
          <select value={zona} onChange={(e) => setZona(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {ZONAS.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </label>
      </div>

      <div>
        <span className="mb-1.5 block label-mono text-ink/60">Pruebas{pruebas.length ? ` · ${pruebas.length}` : ''}</span>
        <div className="space-y-2 border border-ink/[0.15] bg-cream/40 p-3">
          {GRUPOS_PRUEBAS.map((g) => (
            <div key={g.grupo} className="flex flex-wrap items-center gap-1.5">
              <span className="w-24 shrink-0 label-mono text-[0.52rem] text-ink/40">{g.grupo}</span>
              {(g.pruebas.length > 1 && !esAtleta ? [g.grupo, ...g.pruebas] : g.pruebas).map((p) => (
                <button key={p} type="button" onClick={() => alternar(p)} aria-pressed={pruebas.includes(p)}
                  className={`border px-2 py-0.5 text-[0.75rem] ${pruebas.includes(p) ? 'border-ink bg-ink text-cream' : 'border-ink/20 bg-paper text-ink/70 hover:border-ink/50'}`}>
                  {p === g.grupo && g.pruebas.length > 1 ? `${p} (cualquiera)` : p}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      {esAtleta && (perfil ? (
        <div className="border border-mint bg-mint/15">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <p className="flex-1 text-[0.85rem] text-ink/80">
              ✓ Tu ficha de <strong className="font-semibold">Mundo Atletismo</strong> se enlaza sola, con tus marcas.
            </p>
            <button type="button" onClick={() => setVerFicha((v) => !v)} className="label-mono text-[0.6rem] text-ink underline">
              {verFicha ? 'ocultar' : '¿es la tuya? míralo'}
            </button>
            <button type="button" onClick={() => { setPerfil(null); setVerFicha(false) }} className="label-mono text-[0.6rem] text-ink/50 underline">
              no es mi ficha
            </button>
          </div>
          {verFicha && <iframe src={perfil} title="Tu ficha en Mundo Atletismo" className="block h-[420px] w-full border-t border-mint" />}
        </div>
      ) : (
        <p className="text-[0.75rem] text-ink/45">
          Elige tu nombre en la lista de arriba y enlazamos solo tu ficha de Mundo Atletismo y tu prueba.
        </p>
      ))}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block label-mono text-ink/60">{esAtleta ? '¿Qué buscas?' : '¿Qué buscáis?'} · opcional</span>
          <textarea value={busca} onChange={(e) => setBusca(e.target.value)} rows={4} maxLength={800}
            placeholder={esAtleta
              ? 'Ej.: Club de División de Honor o Primera, con grupo de entrenamiento en Madrid…'
              : 'Ej.: Atletas sub-23 que puedan puntuar en la liga de Primera…'}
            className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1.5 block label-mono text-ink/60">{esAtleta ? '¿Qué ofreces?' : '¿Qué ofrecéis?'} · opcional</span>
          <textarea value={ofrece} onChange={(e) => setOfrece(e.target.value)} rows={4} maxLength={800}
            placeholder={esAtleta
              ? 'Ej.: Puntuar en liga y relevos, disponibilidad para el Cto. de España de clubes…'
              : 'Ej.: Entrenador, fisio, desplazamientos y premios por puntos…'}
            className={inputCls} />
        </label>
      </div>
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
      <button type="submit" disabled={estado === 'enviando' || !autor.trim() || !contacto.trim() || (!pruebas.length && !busca.trim() && !ofrece.trim())}
        className="w-full bg-ink py-4 font-brand text-base font-bold text-cream hover:bg-mint hover:text-ink disabled:opacity-35">
        {estado === 'enviando' ? 'Enviando…' : 'Enviar para revisión'}
      </button>
    </form>
  )
}
