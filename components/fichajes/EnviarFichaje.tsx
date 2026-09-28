'use client'

// TEMPORAL — Formulario de colaborador para avisar de un fichaje.
// Se comparte el enlace /fichajes/enviar/ con quien colabore, junto a la clave.
//
// SOBRE LA CLAVE: la pone el administrador en /admin/fichajes y se la pasa a
// quien colabore. No está en este fichero ni en el bundle: el navegador manda lo
// que escribe el colaborador y es Postgres quien lo compara contra un hash
// bcrypt (función `fichajes_enviar`, SECURITY DEFINER; ver
// supabase/fichajes-schema.sql). Si la clave fuese una constante de JavaScript
// —como en el portón de /test— cualquiera podría leerla en el código servido.
//
// Tras el primer envío correcto la clave se guarda en sessionStorage para no
// reescribirla en cada aviso; muere al cerrar la pestaña.

import { useEffect, useState } from 'react'
import { DIVISIONES } from '@/lib/fichajes/types'
import { createClient } from '@/lib/supabase/client'

const CLAVE_KEY = 'lanedata-fichajes-clave'

/** "2026-09-28T16:40" — valor que espera <input type="datetime-local">. */
function ahoraLocal(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

interface Enviado {
  atleta: string
  origen: string
  destino: string
  hora: string
}

export function EnviarFichaje() {
  const [clave, setClave] = useState('')
  const [claveRecordada, setClaveRecordada] = useState(false)

  const [atleta, setAtleta] = useState('')
  const [origen, setOrigen] = useState('')
  const [destino, setDestino] = useState('')
  const [sinOrigen, setSinOrigen] = useState(false)
  const [sinDestino, setSinDestino] = useState(false)
  const [division, setDivision] = useState('')
  const [informado, setInformado] = useState(ahoraLocal)
  const [fuente, setFuente] = useState('')
  const [alias, setAlias] = useState('')
  const [nota, setNota] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviados, setEnviados] = useState<Enviado[]>([])

  // La clave guardada solo se recupera al montar, ya en el cliente.
  useEffect(() => {
    try {
      const guardada = sessionStorage.getItem(CLAVE_KEY)
      if (guardada) { setClave(guardada); setClaveRecordada(true) }
    } catch { /* modo privado: se escribe a mano */ }
  }, [])

  const faltaClub = (sinOrigen || !origen.trim()) && (sinDestino || !destino.trim())
  const puedeEnviar = clave.trim().length > 0 && atleta.trim().length >= 3 && !faltaClub && !enviando

  function limpiarFormulario() {
    setAtleta(''); setOrigen(''); setDestino('')
    setSinOrigen(false); setSinDestino(false)
    setDivision(''); setFuente(''); setNota('')
    setInformado(ahoraLocal())
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!puedeEnviar) return
    setEnviando(true)
    setError(null)

    const momento = new Date(informado)
    const supabase = createClient()
    const { error: err } = await supabase.rpc('fichajes_enviar', {
      p_clave: clave,
      p_atleta: atleta.trim(),
      p_club_origen: sinOrigen ? null : origen.trim() || null,
      p_club_destino: sinDestino ? null : destino.trim() || null,
      p_division: division.trim() || null,
      p_informado_en: isNaN(momento.getTime()) ? null : momento.toISOString(),
      p_fuente: fuente.trim() || null,
      p_nota: nota.trim() || null,
      p_enviado_por: alias.trim() || null,
    })

    setEnviando(false)

    if (err) {
      // Los mensajes de la función vienen ya redactados en español.
      setError(err.message || 'No se ha podido enviar el fichaje.')
      return
    }

    // Envío correcto: la clave es buena, se recuerda para los siguientes avisos.
    try { sessionStorage.setItem(CLAVE_KEY, clave); setClaveRecordada(true) } catch { /* modo privado */ }

    setEnviados((prev) => [{
      atleta: atleta.trim(),
      origen: sinOrigen || !origen.trim() ? '?' : origen.trim(),
      destino: sinDestino || !destino.trim() ? '?' : destino.trim(),
      hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    }, ...prev])
    limpiarFormulario()
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <p className="font-brand text-2xl font-extrabold tracking-brand text-ink">lanedata</p>
        <p className="mt-1 label-mono text-ink/40">Colaboradores · avisar de un fichaje</p>
        <p className="mt-4 text-sm leading-relaxed text-ink/60">
          Si te has enterado de un fichaje, mándalo por aquí. Necesitas la clave de
          colaborador. Se publica en el directo <strong className="font-semibold text-ink/75">al momento</strong>,
          así que comprueba el nombre y los clubes antes de enviar.
        </p>
      </header>

      <form onSubmit={enviar} className="space-y-5">
        {/* ── Clave ── */}
        <Campo etiqueta="Clave de colaborador" obligatorio>
          {claveRecordada ? (
            <div className="flex items-center gap-3 border border-ink/[0.14] bg-cream/40 px-4 py-3">
              <span className="text-sm text-ink/60">Clave recordada en esta pestaña</span>
              <button
                type="button"
                onClick={() => { setClaveRecordada(false); setClave(''); sessionStorage.removeItem(CLAVE_KEY) }}
                className="ml-auto label-mono text-ink/45 transition-colors hover:text-ink"
              >
                cambiar
              </button>
            </div>
          ) : (
            <input
              type="password" required autoComplete="current-password"
              value={clave} onChange={(e) => { setClave(e.target.value); setError(null) }}
              placeholder="••••••••" className={inputCls}
            />
          )}
        </Campo>

        <Separador />

        {/* ── Atleta ── */}
        <Campo etiqueta="Nombre y apellidos del atleta" obligatorio>
          <input
            type="text" required value={atleta}
            onChange={(e) => setAtleta(e.target.value)}
            placeholder="p. ej. María Pérez García" className={inputCls}
          />
        </Campo>

        {/* ── Clubes ── */}
        <div className="grid gap-5 sm:grid-cols-2">
          <ClubCampo
            etiqueta="Club de origen" valor={origen} onValor={setOrigen}
            sin={sinOrigen} onSin={setSinOrigen}
            marcador="De qué club sale"
            aviso="No se sabe de dónde viene"
          />
          <ClubCampo
            etiqueta="Club de destino" valor={destino} onValor={setDestino}
            sin={sinDestino} onSin={setSinDestino}
            marcador="A qué club llega"
            aviso="Se va, pero no se sabe a dónde"
          />
        </div>

        {faltaClub && (
          <p className="border-l-2 border-ink/25 bg-cream/40 px-3 py-2 text-[0.8rem] text-ink/60">
            Hace falta al menos uno de los dos clubes. Si solo sabes que se va, rellena el de
            origen y marca la incógnita en el destino.
          </p>
        )}

        {/* ── División ── */}
        <Campo etiqueta="División" ayuda="La del club en el que compite. Puedes escribir otra.">
          <input
            type="text" list="divisiones" value={division}
            onChange={(e) => setDivision(e.target.value)}
            placeholder="p. ej. División de Honor" className={inputCls}
          />
          <datalist id="divisiones">
            {DIVISIONES.map((d) => <option key={d} value={d} />)}
          </datalist>
        </Campo>

        {/* ── Hora ── */}
        <Campo etiqueta="Hora a la que se informó" ayuda="Por defecto, ahora. Cámbiala si te enteraste antes.">
          <input
            type="datetime-local" value={informado}
            onChange={(e) => setInformado(e.target.value)}
            max={ahoraLocal()} className={inputCls}
          />
        </Campo>

        <Separador />

        {/* ── Opcionales ── */}
        <Campo etiqueta="Fuente" ayuda="Opcional: de dónde sale la información.">
          <input
            type="text" value={fuente} onChange={(e) => setFuente(e.target.value)}
            placeholder="p. ej. comunicado del club, X de @..." className={inputCls}
          />
        </Campo>

        <Campo etiqueta="Tu nombre o alias" ayuda="Opcional: para saber de quién viene el aviso.">
          <input
            type="text" value={alias} onChange={(e) => setAlias(e.target.value)}
            placeholder="p. ej. Javi" className={inputCls}
          />
        </Campo>

        <Campo etiqueta="Nota" ayuda="Opcional: cualquier detalle que ayude a entenderlo.">
          <textarea
            value={nota} onChange={(e) => setNota(e.target.value)} rows={3}
            placeholder="p. ej. pendiente de firma, llega cedida hasta junio…"
            className={`${inputCls} resize-y`}
          />
        </Campo>

        {error && (
          <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit" disabled={!puedeEnviar}
          className="w-full bg-ink py-3.5 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enviando ? 'Enviando…' : 'Publicar el fichaje'}
        </button>
      </form>

      {/* ── Lo enviado en esta sesión ── */}
      {enviados.length > 0 && (
        <section className="mt-10 border border-ink/[0.14] bg-cream/40">
          <p className="border-b border-ink/[0.14] px-4 py-2.5 label-mono text-ink/50">
            Enviados desde esta pestaña · {enviados.length}
          </p>
          <ul className="divide-y divide-ink/[0.09]">
            {enviados.map((e, i) => (
              <li key={i} className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
                <span className="font-mono text-[0.75rem] tabular-nums text-ink/40">{e.hora}</span>
                <span className="min-w-0">
                  <strong className="font-semibold text-ink">{e.atleta}</strong>
                  <span className="text-ink/55"> · {e.origen} &rarr; {e.destino}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

// ─── Piezas del formulario ───────────────────────────────────────────────────
const inputCls =
  'w-full border border-ink/[0.15] bg-cream/60 px-4 py-3 text-sm text-ink placeholder:text-ink/30 transition-colors focus:border-ink/30 focus:bg-cream focus:outline-none focus:ring-2 focus:ring-mint/40 disabled:opacity-40'

function Campo({
  etiqueta, ayuda, obligatorio, children,
}: { etiqueta: string; ayuda?: string; obligatorio?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block label-mono text-ink/60">
        {etiqueta}{obligatorio && <span className="text-ink/35"> · obligatorio</span>}
      </span>
      {children}
      {ayuda && <span className="mt-1.5 block text-[0.75rem] text-ink/40">{ayuda}</span>}
    </label>
  )
}

function Separador() {
  return <div className="h-px bg-ink/[0.1]" />
}

function ClubCampo({
  etiqueta, valor, onValor, sin, onSin, marcador, aviso,
}: {
  etiqueta: string
  valor: string
  onValor: (v: string) => void
  sin: boolean
  onSin: (v: boolean) => void
  marcador: string
  aviso: string
}) {
  return (
    <div>
      <span className="mb-1.5 block label-mono text-ink/60">{etiqueta}</span>
      <input
        type="text" value={sin ? '' : valor} disabled={sin}
        onChange={(e) => onValor(e.target.value)}
        placeholder={marcador} className={inputCls}
      />
      <label className="mt-2 flex items-center gap-2 text-[0.78rem] text-ink/55">
        <input
          type="checkbox" checked={sin}
          onChange={(e) => { onSin(e.target.checked); if (e.target.checked) onValor('') }}
          className="h-3.5 w-3.5 accent-ink"
        />
        {aviso} <span className="font-brand font-extrabold text-ink/45">?</span>
      </label>
    </div>
  )
}
