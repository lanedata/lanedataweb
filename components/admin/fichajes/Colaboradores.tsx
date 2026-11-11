'use client'

// Colaboradores con token personal: cada uno tiene su enlace, puedes ver
// cuántos fichajes ha subido y cortarle el acceso sin tocar al resto.

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { enlaceColaborador, haceDe, nuevoToken, type Colaborador } from '@/lib/fichajes/types'
import { Aviso, Caja, botonCls, botonFuerteCls, botonPeligroCls, copiarTexto, inputCls } from './ui'

export function BloqueColaboradores({
  colaboradores, cuentas, onCambio,
}: { colaboradores: Colaborador[]; cuentas: Record<string, number>; onCambio: () => void }) {
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    if (nombre.trim().length < 2) return
    setError(null); setTrabajando('nuevo')
    const { data, error: err } = await createClient().from('fichajes_colaboradores')
      .insert({ nombre: nombre.trim(), token: nuevoToken() }).select('token').single()
    setTrabajando(null)
    if (err) { setError(err.message); return }
    setNombre('')
    if (data?.token && await copiarTexto(enlaceColaborador(data.token))) setCopiado('nuevo')
    onCambio()
  }

  async function cambiar(c: Colaborador, cambios: Partial<Colaborador>, confirmar?: string) {
    if (confirmar && !window.confirm(confirmar)) return
    setTrabajando(c.id); setError(null)
    const { error: err } = await createClient().from('fichajes_colaboradores').update(cambios).eq('id', c.id)
    setTrabajando(null)
    if (err) setError(err.message)
    onCambio()
  }

  async function borrar(c: Colaborador) {
    if (!window.confirm(`¿Borrar a ${c.nombre}? Sus fichajes se quedan publicados, pero ya no constará quién los subió.`)) return
    setTrabajando(c.id)
    const { error: err } = await createClient().from('fichajes_colaboradores').delete().eq('id', c.id)
    setTrabajando(null)
    if (err) setError(err.message)
    onCambio()
  }

  async function copiar(c: Colaborador) {
    if (await copiarTexto(enlaceColaborador(c.token))) {
      setCopiado(c.id); setTimeout(() => setCopiado(null), 2500)
    }
  }

  const activos = colaboradores.filter((c) => c.activo).length

  return (
    <Caja
      titulo="Colaboradores"
      extra={`${activos} con acceso`}
      texto="Cada colaborador tiene su enlace personal: al abrirlo ya entra con su token, sin clave. Si alguien se pasa, revócale y deja de poder publicar al momento."
    >
      <form onSubmit={crear} className="flex flex-wrap gap-2 border-b border-ink/[0.09] p-4">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del colaborador (solo lo ves tú)"
          className={`${inputCls} min-w-0 flex-1`} maxLength={80} />
        <button type="submit" disabled={nombre.trim().length < 2 || trabajando === 'nuevo'} className={botonFuerteCls}>
          + crear y copiar enlace
        </button>
      </form>
      {copiado === 'nuevo' && <div className="p-4 pb-0"><Aviso tono="ok">Enlace copiado. Pásaselo por privado: quien lo tenga puede publicar en su nombre.</Aviso></div>}
      {error && <div className="p-4 pb-0"><Aviso tono="error">{error}</Aviso></div>}

      {colaboradores.length === 0 ? (
        <p className="p-5 text-sm text-ink/55">Aún no hay colaboradores con token.</p>
      ) : (
        <ul className="divide-y divide-ink/[0.09]">
          {colaboradores.map((c) => (
            <li key={c.id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${c.activo ? '' : 'bg-cream/40'}`}>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-brand text-[1rem] font-extrabold text-ink">
                  {c.nombre}
                  {!c.activo && <span className="border border-red-300 px-1.5 py-0.5 label-mono text-[0.55rem] text-red-700">revocado</span>}
                </p>
                <p className="mt-0.5 text-[0.78rem] text-ink/50">
                  {cuentas[c.id] ?? 0} fichajes
                  {c.ultimo_envio_en ? ` · último ${haceDe(c.ultimo_envio_en)}` : ' · aún no ha publicado'}
                  <span className="ml-2 font-mono text-ink/35">{c.token.slice(0, 6)}…</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.activo && (
                  <button type="button" onClick={() => copiar(c)} className={botonCls}>
                    {copiado === c.id ? 'copiado ✓' : 'copiar enlace'}
                  </button>
                )}
                <button type="button" disabled={trabajando === c.id}
                  onClick={() => cambiar(c, { token: nuevoToken() }, `¿Cambiar el enlace de ${c.nombre}? El anterior deja de funcionar.`)}
                  className={botonCls}>nuevo enlace</button>
                {c.activo ? (
                  <button type="button" disabled={trabajando === c.id}
                    onClick={() => cambiar(c, { activo: false, revocado_en: new Date().toISOString() }, `¿Revocar el acceso de ${c.nombre}?`)}
                    className={botonPeligroCls}>revocar</button>
                ) : (
                  <button type="button" disabled={trabajando === c.id}
                    onClick={() => cambiar(c, { activo: true, revocado_en: null })} className={botonCls}>reactivar</button>
                )}
                <button type="button" disabled={trabajando === c.id} onClick={() => borrar(c)} className={botonPeligroCls}>borrar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Caja>
  )
}
