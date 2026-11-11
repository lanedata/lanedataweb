'use client'

// Tablón del mercado en el panel: anuncios de atletas que buscan club y de
// clubes que buscan atletas. Nada sale en la web hasta que lo publicas aquí.
// Los interesados en cada anuncio solo los ves tú: los pones en contacto.

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { diaDe, horaDe, perfilLane, type Anuncio, type Interesado } from '@/lib/fichajes/types'
import { Aviso, Caja, botonCls, botonFuerteCls, botonPeligroCls } from './ui'

export function BloqueTablon({ compacto = false }: { compacto?: boolean }) {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [interesados, setInteresados] = useState<Interesado[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sinTabla, setSinTabla] = useState(false)

  const cargar = useCallback(async () => {
    const sb = createClient()
    const [a, i] = await Promise.all([
      sb.from('mercado_anuncios').select('*').neq('estado', 'cerrado').order('creado_en', { ascending: false }).limit(200),
      sb.from('mercado_interesados').select('*').order('creado_en', { ascending: false }).limit(300),
    ])
    if (a.error) { setSinTabla(true); return }
    setAnuncios((a.data as Anuncio[]) ?? [])
    setInteresados((i.data as Interesado[]) ?? [])
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function cambiar(id: string, cambios: Record<string, unknown>) {
    setError(null)
    const { error: err } = await createClient().from('mercado_anuncios').update(cambios).eq('id', id)
    if (err) setError(err.message)
    cargar()
  }
  async function borrar(a: Anuncio) {
    if (!window.confirm(`¿Descartar el anuncio de ${a.autor}?`)) return
    await createClient().from('mercado_anuncios').delete().eq('id', a.id)
    cargar()
  }
  async function atender(i: Interesado) {
    await createClient().from('mercado_interesados').update({ atendido: !i.atendido }).eq('id', i.id)
    cargar()
  }

  if (sinTabla) return null

  const pendientes = anuncios.filter((a) => a.estado === 'pendiente')
  const publicados = anuncios.filter((a) => a.estado === 'publicado')
  const sinAtender = interesados.filter((i) => !i.atendido).length

  return (
    <Caja
      titulo="Tablón: buscan club / buscan atletas"
      extra={`${pendientes.length} por revisar · ${sinAtender} interesados sin atender`}
      resaltada={pendientes.length > 0 || sinAtender > 0}
      texto="Verifica con el contacto antes de publicar. El contacto nunca sale en la web."
    >
      {error && <div className="p-4 pb-0"><Aviso tono="error">{error}</Aviso></div>}
      {anuncios.length === 0 && <p className="p-5 text-sm text-ink/55">No hay anuncios.</p>}
      <ul className="divide-y divide-ink/[0.09]">
        {[...pendientes, ...publicados].map((a) => {
          const suyos = interesados.filter((i) => i.anuncio_id === a.id)
          const perfil = perfilLane(a.perfil_url)
          return (
            <li key={a.id} className={`p-4 ${a.estado === 'pendiente' ? 'bg-mint/10' : ''}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-1.5 py-0.5 label-mono text-[0.55rem] ${a.tipo === 'atleta' ? 'bg-ink text-mint' : 'border border-ink/40 text-ink'}`}>
                  {a.tipo === 'atleta' ? 'atleta busca club' : 'club busca atletas'}
                </span>
                <span className="label-mono text-[0.55rem] text-ink/45">
                  {a.estado} · {diaDe(a.creado_en ?? '')} {horaDe(a.creado_en ?? '')}
                </span>
              </div>
              <p className="mt-1.5 font-brand text-[1rem] font-extrabold text-ink">
                {a.autor}{a.club_actual && <span className="font-normal text-ink/50"> · {a.club_actual}</span>}
              </p>
              <p className="text-[0.78rem] text-ink/50">
                {[a.genero === 'H' ? 'hombres' : a.genero === 'M' ? 'mujeres' : a.genero === 'X' ? 'ambos' : null, a.pruebas, a.zona].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-1.5 whitespace-pre-line text-sm text-ink/80">{a.texto}</p>
              {perfil && <a href={perfil} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[0.78rem] font-semibold text-ink underline">perfil en Mundo Atletismo ↗</a>}
              <p className="mt-1.5 text-[0.78rem]">
                <span className="label-mono text-[0.55rem] text-ink/40">contacto · solo tú </span>
                <span className="text-ink/75">{a.contacto}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {a.estado === 'pendiente' ? (
                  <button type="button" className={botonFuerteCls}
                    onClick={() => cambiar(a.id, { estado: 'publicado', publicado_en: new Date().toISOString() })}>verificado · publicar</button>
                ) : (
                  <button type="button" className={botonCls} onClick={() => cambiar(a.id, { estado: 'cerrado' })}>cerrar (ya encontró)</button>
                )}
                <button type="button" className={botonPeligroCls} onClick={() => borrar(a)}>descartar</button>
              </div>
              {suyos.length > 0 && !compacto && (
                <ul className="mt-3 space-y-1.5 border-l-2 border-mint pl-3">
                  {suyos.map((i) => (
                    <li key={i.id} className={`text-[0.8rem] ${i.atendido ? 'opacity-50' : ''}`}>
                      <strong className="text-ink">{i.nombre}</strong> · <span className="text-ink/75">{i.contacto}</span>
                      {i.mensaje && <span className="text-ink/55"> — {i.mensaje}</span>}
                      <button type="button" onClick={() => atender(i)} className="ml-2 label-mono text-[0.55rem] text-ink/50 underline">
                        {i.atendido ? 'pendiente' : 'atendido ✓'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {suyos.length > 0 && compacto && (
                <p className="mt-2 label-mono text-[0.58rem] text-ink/55">{suyos.length} interesados · gestiónalos en el panel</p>
              )}
            </li>
          )
        })}
      </ul>
    </Caja>
  )
}
