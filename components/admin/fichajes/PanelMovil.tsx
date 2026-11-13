'use client'

// Panel móvil del mercado (/admin/movil). Pensado para abrirse desde un aviso
// push con el pulgar: lo pendiente arriba, botones grandes y una acción por
// toque. Se refresca solo al volver a la app.

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FICHAJE_COLUMNS, esChivatazo, haceDe,
  type Colaborador, type EstadoFichaje, type Fichaje, type Propuesta,
} from '@/lib/fichajes/types'
import { activarPush, desactivarPush, estadoPush, probarPush, registrarSW, type EstadoPush } from '@/lib/fichajes/push'
import { BloqueTablon } from './TablonAdmin'

type FichajeAdmin = Fichaje & { visible: boolean; colaborador_id: string | null }

const grande = 'flex-1 min-h-[48px] px-3 py-3 font-brand text-[0.95rem] font-bold transition-colors active:scale-[0.98] disabled:opacity-40'

export function PanelMovil() {
  const [fichajes, setFichajes] = useState<FichajeAdmin[]>([])
  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [nombres, setNombres] = useState<Record<string, string>>({})
  const [foco, setFoco] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const sb = createClient()
    const [f, p, c] = await Promise.all([
      sb.from('fichajes').select(`${FICHAJE_COLUMNS}, visible, colaborador_id`).order('informado_en', { ascending: false }).limit(40),
      sb.from('fichajes_propuestas').select('*').order('creado_en', { ascending: true }),
      sb.from('fichajes_colaboradores').select('id, nombre'),
    ])
    setFichajes((f.data as unknown as FichajeAdmin[]) ?? [])
    setPropuestas((p.data as Propuesta[]) ?? [])
    setNombres(Object.fromEntries(((c.data as Pick<Colaborador, 'id' | 'nombre'>[]) ?? []).map((x) => [x.id, x.nombre])))
  }, [])

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    setFoco(q.get('id') ?? q.get('p'))
    cargar()
    registrarSW().catch(() => {})
    const alVolver = () => { if (document.visibilityState === 'visible') cargar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [cargar])

  useEffect(() => {
    if (foco) setTimeout(() => document.getElementById(`m-${foco}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
  }, [foco, fichajes, propuestas])

  async function hacer(id: string, fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) {
    setOcupado(id); setMsg(null)
    const { error } = await fn()
    setOcupado(null)
    setMsg(error ? `Error: ${error.message}` : ok)
    setTimeout(() => setMsg(null), 2500)
    cargar()
  }

  const sb = () => createClient()
  const aprobar = (p: Propuesta, estado: EstadoFichaje) =>
    hacer(p.id, () => sb().rpc('fichajes_aprobar', { p_id: p.id, p_estado: estado }), `Publicado: ${p.atleta}`)
  const descartar = (p: Propuesta) => {
    if (window.confirm(`¿Descartar a ${p.atleta}?`)) hacer(p.id, () => sb().from('fichajes_propuestas').delete().eq('id', p.id), 'Descartado')
  }
  const cambiar = (f: FichajeAdmin, c: Partial<FichajeAdmin>, ok: string) =>
    hacer(f.id, () => sb().from('fichajes').update(c).eq('id', f.id), ok)

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-24">
      <AvisosPush />

      {msg && (
        <div className="fixed inset-x-4 bottom-4 z-50 bg-ink px-4 py-3 text-center text-sm font-semibold text-mint shadow-lg">{msg}</div>
      )}

      {/* ── Pendientes ── */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 font-brand text-lg font-extrabold text-ink">
          Por aprobar
          <span className={`px-2 py-0.5 label-mono text-[0.6rem] ${propuestas.length ? 'bg-mint text-ink' : 'bg-ink/10 text-ink/50'}`}>{propuestas.length}</span>
        </h2>
        {propuestas.length === 0 && <p className="text-sm text-ink/50">Nada pendiente. 👌</p>}
        <div className="space-y-3">
          {propuestas.map((p) => (
            <article key={p.id} id={`m-${p.id}`} className={`border-2 bg-paper p-4 ${foco === p.id ? 'border-ink' : 'border-ink/15'}`}>
              <p className="label-mono text-[0.58rem] text-ink/45">{esChivatazo(p) ? '🤫 chivatazo' : 'lo cuenta el atleta'} · {haceDe(p.creado_en)}{p.descartada_en ? ` · descartado por ${p.descartada_por ? nombres[p.descartada_por] ?? '¿?' : '¿?'}` : ''}</p>
              <p className="mt-1 font-brand text-xl font-extrabold leading-tight text-ink">{p.atleta}</p>
              <p className="mt-1 text-[0.95rem] text-ink/75">{p.club_origen ?? '¿?'} <span className="text-ink/35">→</span> <strong className="text-ink">{p.club_destino ?? '¿?'}</strong></p>
              {p.nota && <p className="mt-1 text-sm text-ink/55">{p.nota}</p>}
              {p.fuente && <p className="mt-1 text-sm text-ink/55">Fuente: {p.fuente}</p>}
              <p className="mt-2 bg-cream/70 px-2 py-1.5 text-sm text-ink/80">📇 {p.contacto || 'sin contacto'}</p>
              <div className="mt-3 flex gap-2">
                <button disabled={ocupado === p.id} onClick={() => aprobar(p, 'confirmado')} className={`${grande} bg-ink text-mint`}>✓ Confirmado</button>
                <button disabled={ocupado === p.id} onClick={() => aprobar(p, 'rumor')} className={`${grande} border-2 border-dashed border-ink/40 text-ink`}>Rumor</button>
                <button disabled={ocupado === p.id} onClick={() => descartar(p)} className={`${grande} max-w-[3.5rem] border-2 border-red-300 text-red-700`} aria-label="Descartar">✕</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div id="tablon"><BloqueTablon compacto /></div>

      {/* ── Últimos publicados ── */}
      <section>
        <h2 className="mb-2 font-brand text-lg font-extrabold text-ink">Últimos en el directo</h2>
        <div className="space-y-3">
          {fichajes.map((f) => {
            const rumor = f.estado === 'rumor'
            return (
              <article key={f.id} id={`m-${f.id}`}
                className={`border-2 p-4 ${f.bomba ? 'bg-mint/30' : 'bg-paper'} ${foco === f.id ? 'border-ink' : 'border-ink/15'} ${f.visible ? '' : 'opacity-50'}`}>
                <p className="flex flex-wrap gap-x-2 label-mono text-[0.58rem] text-ink/50">
                  <span className={rumor ? '' : 'text-ink'}>{rumor ? 'rumor' : 'confirmado'}</span>
                  {f.bomba && <span className="text-ink">💥 bomba</span>}
                  {!f.visible && <span>oculto</span>}
                  <span>· {haceDe(f.informado_en)}</span>
                  <span>· {f.colaborador_id ? nombres[f.colaborador_id] ?? '¿?' : f.origen_envio === 'atleta' ? 'atleta' : f.origen_envio === 'chivatazo' ? 'chivatazo' : f.origen_envio === 'admin' ? 'tú' : 'clave antigua'}</span>
                </p>
                <p className="mt-1 font-brand text-lg font-extrabold leading-tight text-ink">{f.atleta}</p>
                <p className="mt-0.5 text-sm text-ink/70">{f.club_origen ?? '¿?'} → <strong className="text-ink">{f.club_destino ?? '¿?'}</strong></p>
                {f.fuente && <p className="mt-0.5 text-[0.78rem] italic text-ink/45">{f.fuente}</p>}
                <div className="mt-3 flex gap-2">
                  <button disabled={ocupado === f.id} onClick={() => cambiar(f, { estado: rumor ? 'confirmado' : 'rumor' }, rumor ? 'Confirmado ✓' : 'Pasado a rumor')}
                    className={`${grande} ${rumor ? 'bg-ink text-mint' : 'border-2 border-ink/25 text-ink'}`}>
                    {rumor ? '✓ Confirmar' : 'A rumor'}
                  </button>
                  <button disabled={ocupado === f.id} onClick={() => cambiar(f, { bomba: !f.bomba }, f.bomba ? 'Ya no es bomba' : '💥 Marcado como bomba')}
                    className={`${grande} ${f.bomba ? 'bg-mint text-ink' : 'border-2 border-ink/25 text-ink'}`}>
                    💥 {f.bomba ? 'Quitar' : 'Bomba'}
                  </button>
                  <button disabled={ocupado === f.id} onClick={() => cambiar(f, { visible: !f.visible }, f.visible ? 'Oculto' : 'Visible otra vez')}
                    className={`${grande} border-2 border-ink/25 text-ink`}>
                    {f.visible ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
        <a href="/admin/fichajes/" className="mt-4 block text-center label-mono text-ink/50 underline">panel completo</a>
      </section>
    </div>
  )
}

function AvisosPush() {
  const [estado, setEstado] = useState<EstadoPush | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [trabajando, setTrabajando] = useState(false)

  useEffect(() => { estadoPush().then(setEstado).catch(() => setEstado('no-soportado')) }, [])

  async function activar() {
    setTrabajando(true); setError(null)
    try {
      await activarPush(/iphone|ipad/i.test(navigator.userAgent) ? 'iPhone' : /android/i.test(navigator.userAgent) ? 'Android' : 'Ordenador')
      setEstado('activo')
    } catch (e) { setError((e as Error).message) }
    setTrabajando(false)
  }

  if (!estado) return null
  if (estado === 'activo') {
    return (
      <div className="flex items-center gap-3 border border-mint bg-mint/20 px-4 py-3">
        <span className="text-sm text-ink">🔔 Avisos activados en este dispositivo</span>
        <button onClick={() => probarPush()} className="ml-auto label-mono text-ink/60 underline">probar</button>
        <button onClick={async () => { await desactivarPush(); setEstado('apagado') }} className="label-mono text-ink/40 underline">quitar</button>
      </div>
    )
  }
  return (
    <div className="border-2 border-ink bg-ink p-4 text-cream">
      <p className="font-brand text-lg font-extrabold">🔔 Avisos al móvil</p>
      {estado === 'instalar' && (
        <p className="mt-1 text-sm text-cream/80">
          En iPhone primero instala esta página: botón <strong>Compartir</strong> → <strong>Añadir a pantalla de inicio</strong>. Ábrela desde el icono y vuelve aquí.
        </p>
      )}
      {estado === 'denegado' && (
        <p className="mt-1 text-sm text-cream/80">Bloqueaste las notificaciones. Actívalas en los ajustes del navegador/app para lanedata.es.</p>
      )}
      {estado === 'no-soportado' && <p className="mt-1 text-sm text-cream/80">Este navegador no admite avisos push. Prueba con Chrome o con la app instalada.</p>}
      {estado === 'apagado' && (
        <>
          <p className="mt-1 text-sm text-cream/80">Te aviso cada vez que un colaborador publique, un atleta proponga su fichaje o llegue algo al tablón.</p>
          <button onClick={activar} disabled={trabajando} className="mt-3 w-full bg-mint py-3 font-brand font-bold text-ink disabled:opacity-50">
            {trabajando ? 'Activando…' : 'Activar avisos en este dispositivo'}
          </button>
        </>
      )}
      {error && <p className="mt-2 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  )
}
