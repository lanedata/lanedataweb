'use client'

// Fichajes detectados automáticamente (scripts/detectar_fichajes.py): el
// atleta ya compite esta temporada con otro club en Mundo Atletismo. Aquí
// decides: publicarlo en el directo (como rumor o confirmado) o descartarlo.

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { clubPorNombre, divisionDe } from '@/lib/fichajes/datos'
import { diaDe, perfilMA, type Genero } from '@/lib/fichajes/types'
import { Aviso, Caja, botonCls, botonFuerteCls } from './ui'

interface Detectado {
  id: string
  creado_en: string
  atleta: string
  genero: Genero | null
  club_origen: string | null
  club_destino: string | null
  fuente: string
  evidencia: { slug?: string; temporada?: string; prueba?: string } | null
  estado: 'pendiente' | 'publicado' | 'descartado'
}

export function BloqueDetectados({ onPublicado }: { onPublicado?: () => void }) {
  const [lista, setLista] = useState<Detectado[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const { data, error: err } = await createClient().from('fichajes_detectados')
      .select('*').eq('estado', 'pendiente').order('creado_en', { ascending: false }).limit(200)
    setLista(err ? null : ((data as Detectado[]) ?? []))
  }, [])
  useEffect(() => { cargar() }, [cargar])

  async function publicar(d: Detectado, estado: 'rumor' | 'confirmado') {
    setOcupado(d.id); setError(null)
    const sb = createClient()
    const [co, cd] = await Promise.all([clubPorNombre(d.club_origen ?? ''), clubPorNombre(d.club_destino ?? '')])
    const { data, error: err } = await sb.from('fichajes').insert({
      atleta: d.atleta, estado, genero: d.genero,
      club_origen: d.club_origen, club_destino: d.club_destino,
      division_origen: divisionDe(co, d.genero), division_destino: divisionDe(cd, d.genero),
      fuente: 'Detectado en sus marcas de esta temporada', origen_envio: 'admin',
    }).select('id').single()
    if (err) { setError(err.message); setOcupado(null); return }
    await sb.from('fichajes_detectados').update({ estado: 'publicado', fichaje_id: data?.id ?? null }).eq('id', d.id)
    setOcupado(null)
    cargar(); onPublicado?.()
  }

  async function descartar(d: Detectado) {
    setOcupado(d.id)
    await createClient().from('fichajes_detectados').update({ estado: 'descartado' }).eq('id', d.id)
    setOcupado(null)
    cargar()
  }

  if (lista === null) return null // sin la tabla (falta el SQL v6)

  return (
    <Caja
      titulo="Detectados automáticamente"
      extra={`${lista.length} por revisar`}
      resaltada={lista.length > 0}
      texto="Atletas que ya compiten esta temporada con otro club según sus marcas en Mundo Atletismo. Se revisa a diario. Comprueba antes de publicar: puede ser un error de la base de datos o una ficha de segundo club."
    >
      {error && <div className="p-4 pb-0"><Aviso tono="error">{error}</Aviso></div>}
      {lista.length === 0 && <p className="p-5 text-sm text-ink/55">Nada nuevo. El detector pasa cada mañana.</p>}
      <ul className="divide-y divide-ink/[0.09]">
        {lista.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-brand text-[1.02rem] font-extrabold tracking-tight text-ink">
                {d.atleta}
                {(
                  <a href={(perfilMA(d.atleta, d.club_destino) ?? '').replace('/embed/', '/').split('?')[0]} target="_blank" rel="noopener noreferrer"
                    className="ml-2 label-mono text-[0.55rem] font-normal text-ink/45 underline">ver marcas ↗</a>
                )}
              </p>
              <p className="mt-0.5 text-[0.85rem] text-ink/70">
                {d.club_origen ?? 'sin club'} <span className="text-ink/35">→</span>{' '}
                <strong className="font-semibold text-ink">{d.club_destino ?? 'sin club / independiente'}</strong>
              </p>
              <p className="mt-0.5 label-mono text-[0.55rem] text-ink/40">
                {[d.genero === 'H' ? 'hombre' : d.genero === 'M' ? 'mujer' : null, d.evidencia?.prueba, d.evidencia?.temporada, `detectado ${diaDe(d.creado_en)}`]
                  .filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={ocupado === d.id} onClick={() => publicar(d, 'confirmado')} className={botonFuerteCls}>publicar confirmado</button>
              <button type="button" disabled={ocupado === d.id} onClick={() => publicar(d, 'rumor')} className={botonCls}>como rumor</button>
              <button type="button" disabled={ocupado === d.id} onClick={() => descartar(d)} className={botonCls}>descartar</button>
            </div>
          </li>
        ))}
      </ul>
    </Caja>
  )
}
