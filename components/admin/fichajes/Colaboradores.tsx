'use client'

// Colaboradores: la LISTA BLANCA de quién puede entrar en /fichajes/enviar/.
// Cada uno entra con su cuenta de Google; aquí se da de alta su correo, se ve
// cuánto ha subido y se le corta el acceso sin tocar al resto. El enlace es el
// mismo para todos.

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RUTA_COLABORADORES, haceDe, type Colaborador } from '@/lib/fichajes/types'
import { Aviso, Caja, botonCls, botonFuerteCls, botonPeligroCls, copiarTexto, inputCls } from './ui'

const limpio = (correo: string) => correo.trim().toLowerCase()
const esCorreo = (correo: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(limpio(correo))

export function BloqueColaboradores({
  colaboradores, cuentas, onCambio,
}: { colaboradores: Colaborador[]; cuentas: Record<string, number>; onCambio: () => void }) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  const explicar = (m: string) =>
    /colaboradores_email_idx|duplicate key/i.test(m) ? 'Ese correo ya está dado de alta.' : m

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    if (nombre.trim().length < 2 || !esCorreo(email)) return
    setError(null); setTrabajando('nuevo')
    const { error: err } = await createClient().from('fichajes_colaboradores')
      .insert({ nombre: nombre.trim(), email: limpio(email) })
    setTrabajando(null)
    if (err) { setError(explicar(err.message)); return }
    setNombre(''); setEmail('')
    onCambio()
  }

  async function cambiar(c: Colaborador, cambios: Partial<Colaborador>, confirmar?: string) {
    if (confirmar && !window.confirm(confirmar)) return
    setTrabajando(c.id); setError(null)
    const { error: err } = await createClient().from('fichajes_colaboradores').update(cambios).eq('id', c.id)
    setTrabajando(null)
    if (err) setError(explicar(err.message))
    onCambio()
  }

  function ponerCorreo(c: Colaborador) {
    const nuevo = window.prompt(`Correo de Google de ${c.nombre}:`, c.email ?? '')
    if (nuevo === null) return
    if (!esCorreo(nuevo)) { setError('Ese correo no parece válido.'); return }
    // Cambiar de correo desliga la cuenta anterior: entra quien tenga el nuevo.
    cambiar(c, { email: limpio(nuevo), user_id: null })
  }

  async function borrar(c: Colaborador) {
    if (!window.confirm(`¿Borrar a ${c.nombre}? Sus fichajes se quedan publicados, pero ya no constará quién los subió.`)) return
    setTrabajando(c.id)
    const { error: err } = await createClient().from('fichajes_colaboradores').delete().eq('id', c.id)
    setTrabajando(null)
    if (err) setError(err.message)
    onCambio()
  }

  async function copiar() {
    if (await copiarTexto(`${window.location.origin}${RUTA_COLABORADORES}`)) {
      setCopiado(true); setTimeout(() => setCopiado(false), 2500)
    }
  }

  const activos = colaboradores.filter((c) => c.activo && c.email).length
  const sinCorreo = colaboradores.filter((c) => !c.email).length

  return (
    <Caja
      titulo="Colaboradores"
      extra={`${activos} con acceso`}
      texto="Lista blanca: solo entran los correos que des de alta aquí, con su cuenta de Google. El enlace es el mismo para todos. Si alguien se pasa, revócale y deja de poder publicar al momento."
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-ink/[0.09] bg-cream/30 p-4">
        <span className="label-mono text-[0.58rem] text-ink/45">enlace para todos</span>
        <code className="min-w-0 flex-1 truncate border border-ink/[0.14] bg-paper px-3 py-2 font-mono text-[0.78rem] text-ink/75">{RUTA_COLABORADORES}</code>
        <button type="button" onClick={copiar} className={botonCls}>{copiado ? 'copiado ✓' : 'copiar enlace'}</button>
      </div>

      <form onSubmit={crear} className="flex flex-wrap gap-2 border-b border-ink/[0.09] p-4">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre (solo lo ves tú)"
          className={`${inputCls} min-w-0 flex-1 basis-40`} maxLength={80} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Su correo de Google"
          className={`${inputCls} min-w-0 flex-1 basis-56`} maxLength={160} autoComplete="off" />
        <button type="submit" disabled={nombre.trim().length < 2 || !esCorreo(email) || trabajando === 'nuevo'} className={botonFuerteCls}>
          + dar de alta
        </button>
      </form>
      {sinCorreo > 0 && (
        <div className="p-4 pb-0">
          <Aviso tono="pendiente">
            {sinCorreo === 1 ? 'Hay 1 colaborador' : `Hay ${sinCorreo} colaboradores`} de antes sin correo: los enlaces con
            token ya no valen. Ponles su correo de Google para que puedan volver a entrar.
          </Aviso>
        </div>
      )}
      {error && <div className="p-4 pb-0"><Aviso tono="error">{error}</Aviso></div>}

      {colaboradores.length === 0 ? (
        <p className="p-5 text-sm text-ink/55">Aún no hay colaboradores.</p>
      ) : (
        <ul className="divide-y divide-ink/[0.09]">
          {colaboradores.map((c) => (
            <li key={c.id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${c.activo ? '' : 'bg-cream/40'}`}>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-brand text-[1rem] font-extrabold text-ink">
                  {c.nombre}
                  {!c.activo && <span className="border border-red-300 px-1.5 py-0.5 label-mono text-[0.55rem] text-red-700">revocado</span>}
                  {!c.email && <span className="border border-amber-400 px-1.5 py-0.5 label-mono text-[0.55rem] text-amber-700">sin correo</span>}
                </p>
                <p className="mt-0.5 break-all text-[0.82rem] text-ink/70">{c.email ?? '—'}</p>
                <p className="mt-0.5 text-[0.78rem] text-ink/50">
                  {cuentas[c.id] ?? 0} fichajes
                  {c.ultimo_envio_en ? ` · último ${haceDe(c.ultimo_envio_en)}` : ' · aún no ha publicado'}
                  {c.email && (c.ultimo_acceso_en ? ` · entró ${haceDe(c.ultimo_acceso_en)}` : ' · aún no ha entrado')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={trabajando === c.id} onClick={() => ponerCorreo(c)} className={botonCls}>
                  {c.email ? 'cambiar correo' : 'poner correo'}
                </button>
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
