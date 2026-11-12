'use client'

// Dos bloques pequeños del panel:
//   · Portada: dónde sale el mercado en la home (se lee al cargar, sin desplegar).
//   · Clubes: color principal, secundario y escudo de cada club, que se usan en
//     el directo y en las historias.

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buscarClubes, type Club } from '@/lib/fichajes/datos'
import {
  POSICION_NOMBRE, cargarEstilos, guardarPosicionMercado, posicionMercado, tintaSobre,
  BLOQUE_NOMBRE, type BloqueMercado, type EstiloClub, type PosicionMercado,
} from '@/lib/fichajes/estilos'
import { Autocompletar } from '@/components/fichajes/Autocompletar'
import { Aviso, Caja, botonCls, botonFuerteCls, botonPeligroCls, inputCls } from './ui'

// ─── Portada ─────────────────────────────────────────────────────────────────
export function BloquePortada() {
  return (
    <Caja titulo="En la portada" texto="Dónde sale cada parte del mercado en lanedata.es, por separado. El cambio es inmediato para quien entre, sin volver a desplegar.">
      <SelectorPortada bloque="fichajes" />
      <SelectorPortada bloque="tablon" />
    </Caja>
  )
}

function SelectorPortada({ bloque }: { bloque: BloqueMercado }) {
  const [pos, setPos] = useState<PosicionMercado | null>(null)
  const [estado, setEstado] = useState<'ok' | 'error' | null>(null)

  useEffect(() => { posicionMercado(bloque).then(setPos) }, [bloque])

  async function elegir(p: PosicionMercado) {
    setPos(p); setEstado(null)
    const { error } = await guardarPosicionMercado(p, bloque)
    setEstado(error ? 'error' : 'ok')
  }

  return (
    <div className="border-b border-ink/[0.08] last:border-b-0">
      <p className="px-4 pt-4 label-mono text-[0.6rem] text-ink/60">{BLOQUE_NOMBRE[bloque]}</p>
      <div className="grid gap-2 p-4 sm:grid-cols-4">
        {(Object.keys(POSICION_NOMBRE) as PosicionMercado[]).map((p) => (
          <button key={p} type="button" onClick={() => elegir(p)} aria-pressed={pos === p}
            className={`border-2 px-3 py-3 text-left text-sm transition-colors ${
              pos === p ? 'border-ink bg-ink text-cream' : 'border-ink/[0.15] text-ink/70 hover:border-ink/40'}`}>
            <span className="block label-mono text-[0.55rem] opacity-60">{p === 'arriba' ? '↑ protagonista' : p === 'oculto' ? 'solo /test' : 'portada'}</span>
            {POSICION_NOMBRE[p]}
          </button>
        ))}
      </div>
      {estado && (
        <div className="px-4 pb-4">
          <Aviso tono={estado}>{estado === 'ok' ? 'Guardado. Recarga la portada para verlo.' : 'No se ha podido guardar (¿has relanzado el SQL v3?).'}</Aviso>
        </div>
      )}
    </div>
  )
}

// ─── Clubes ──────────────────────────────────────────────────────────────────
export function BloqueClubes() {
  const [lista, setLista] = useState<EstiloClub[]>([])
  const [club, setClub] = useState('')
  const [color, setColor] = useState('#0D2A14')
  const [color2, setColor2] = useState('#9FE88D')
  const [logo, setLogo] = useState<string | null>(null)
  const [mantenerFondo, setMantenerFondo] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function recargar() {
    const m = await cargarEstilos(true)
    setLista([...m.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
  }
  useEffect(() => { recargar() }, [])

  function editar(e: EstiloClub) {
    setClub(e.nombre); setColor(e.color ?? '#0D2A14'); setColor2(e.color2 ?? '#9FE88D'); setLogo(e.logo_url); setMantenerFondo(e.logo_fondo ?? false)
    window.scrollTo({ top: (document.getElementById('bloque-clubes')?.offsetTop ?? 0) - 80, behavior: 'smooth' })
  }

  async function subirLogo(file: File) {
    if (!club.trim()) { setError('Elige primero el club.'); return }
    if (file.size > 1_500_000) { setError('El escudo pesa demasiado (máx. 1,5 MB).'); return }
    setSubiendo(true); setError(null)
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const slug = club.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const ruta = `${slug}-${Date.now().toString(36)}.${ext}`
    const sb = createClient()
    const { error: err } = await sb.storage.from('clubes').upload(ruta, file, { upsert: true, contentType: file.type })
    setSubiendo(false)
    if (err) { setError(err.message); return }
    setLogo(sb.storage.from('clubes').getPublicUrl(ruta).data.publicUrl)
  }

  async function guardar() {
    if (!club.trim()) return
    setError(null)
    const { error: err } = await createClient().from('clubes_estilo').upsert({
      nombre: club.trim(), color, color2, logo_url: logo, logo_fondo: mantenerFondo, actualizado_en: new Date().toISOString(),
    })
    if (err) { setError(err.message); return }
    setClub(''); setLogo(null); setMantenerFondo(false)
    recargar()
  }

  async function quitar(e: EstiloClub) {
    if (!window.confirm(`¿Quitar los colores y el escudo de ${e.nombre}?`)) return
    await createClient().from('clubes_estilo').delete().eq('nombre', e.nombre)
    recargar()
  }

  return (
    <div id="bloque-clubes">
      <Caja titulo="Colores y escudos de clubes" extra={`${lista.length} clubes`}
        texto="Salen en el directo (borde de color y escudo) y en las historias (panel con los colores del club). Escudo en PNG/SVG con fondo transparente, mejor.">
        <div className="space-y-4 p-4">
          <Autocompletar<Club>
            value={club} onChange={setClub} onPick={(c) => setClub(c.n)} buscar={buscarClubes}
            clave={(c) => c.n} pintar={(c) => <span className="text-sm text-ink">{c.n}</span>}
            placeholder="Busca el club…" className={inputCls}
          />
          <div className="flex flex-wrap items-end gap-4">
            <label className="block">
              <span className="mb-1 block label-mono text-[0.55rem] text-ink/50">Color principal</span>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-16 cursor-pointer border border-ink/20" />
            </label>
            <label className="block">
              <span className="mb-1 block label-mono text-[0.55rem] text-ink/50">Secundario</span>
              <input type="color" value={color2} onChange={(e) => setColor2(e.target.value)} className="h-10 w-16 cursor-pointer border border-ink/20" />
            </label>
            <label className={`${botonCls} cursor-pointer`}>
              {subiendo ? 'subiendo…' : logo ? 'cambiar escudo' : 'subir escudo'}
              <input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) subirLogo(f); e.target.value = '' }} />
            </label>
            {logo && <button type="button" onClick={() => setLogo(null)} className={botonCls}>sin escudo</button>}
            {logo && (
              <label className="flex cursor-pointer items-center gap-2 text-[0.8rem] text-ink/70" title="Por defecto, la web quita el fondo liso de los escudos. Márcalo si este lo necesita.">
                <input type="checkbox" checked={mantenerFondo} onChange={(e) => setMantenerFondo(e.target.checked)} className="h-4 w-4 accent-ink" />
                mantener el fondo del escudo
              </label>
            )}
            <button type="button" onClick={guardar} disabled={!club.trim() || subiendo} className={botonFuerteCls}>guardar</button>
          </div>
          {/* Vista previa como en las historias */}
          {club.trim() && (
            <div className="flex items-center gap-3 p-4" style={{ background: color, color: tintaSobre(color), borderBottom: `6px solid ${color2}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logo && <img src={logo} alt="" className="h-12 w-12 object-contain" />}
              <span className="font-brand text-xl font-extrabold">{club}</span>
            </div>
          )}
          {error && <Aviso tono="error">{error}</Aviso>}
        </div>
        {lista.length > 0 && (
          <ul className="grid gap-px border-t border-ink/[0.09] bg-ink/[0.09] sm:grid-cols-2">
            {lista.map((e) => (
              <li key={e.nombre} className="flex items-center gap-3 bg-paper px-4 py-2.5">
                <span className="h-6 w-6 shrink-0 border border-ink/10" style={{ background: `linear-gradient(135deg, ${e.color ?? '#ccc'} 50%, ${e.color2 ?? '#eee'} 50%)` }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {e.logo_url && <img src={e.logo_url} alt="" className="h-6 w-6 object-contain" />}
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{e.nombre}</span>
                <button type="button" onClick={() => editar(e)} className={botonCls}>editar</button>
                <button type="button" onClick={() => quitar(e)} className={botonPeligroCls}>×</button>
              </li>
            ))}
          </ul>
        )}
      </Caja>
    </div>
  )
}
