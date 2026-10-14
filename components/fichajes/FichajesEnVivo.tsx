'use client'

// TEMPORAL — Mercado de fichajes en vivo (sección de /test).
//
// Quién se mueve, a qué hora se supo, de qué club a cuál, en qué división y si
// es rumor o está confirmado. Cuando se sabe que un atleta deja su club pero no
// a dónde va, el destino se pinta como una INCÓGNITA (?).
//
// "En vivo" por sondeo cada 30 s: el sitio es estático y Realtime habría que
// activarlo aparte. Los tiempos relativos avanzan solos y lo que llega nuevo se
// resalta unos segundos.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FICHAJE_COLUMNS, diaDe, divisionCorta, haceDe, horaDe, tipoDe,
  type Fichaje,
} from '@/lib/fichajes/types'

const REFRESCO_MS = 30_000
const ENVIAR_URL = '/fichajes/enviar/'
const ATLETAS_URL = '/fichajes/mi-fichaje/'

type Estado = 'cargando' | 'listo' | 'sin-tabla' | 'error'
type Filtro = 'todos' | 'confirmado' | 'rumor'
type FiltroSexo = 'todos' | 'H' | 'M'

export function FichajesEnVivo({ limite = 80 }: { limite?: number }) {
  const [fichajes, setFichajes] = useState<Fichaje[]>([])
  const [estado, setEstado] = useState<Estado>('cargando')
  const [ultimo, setUltimo] = useState<number>(Date.now())
  const [ahora, setAhora] = useState<number>(Date.now())
  const [nuevos, setNuevos] = useState<Set<string>>(new Set())
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [sexo, setSexo] = useState<FiltroSexo>('todos')
  const vistos = useRef<Set<string> | null>(null)

  const cargar = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('fichajes')
      .select(FICHAJE_COLUMNS)
      .order('informado_en', { ascending: false })
      .limit(limite)

    if (error) {
      // 42P01: falta la tabla · 42703: falta una columna (SQL v1 sin actualizar).
      setEstado(error.code === '42P01' || error.code === '42703' ? 'sin-tabla' : 'error')
      return
    }

    const lista = (data as unknown as Fichaje[]) ?? []
    if (vistos.current) {
      const previos = vistos.current
      const recien = lista.filter((f) => !previos.has(f.id)).map((f) => f.id)
      if (recien.length) {
        setNuevos(new Set(recien))
        setTimeout(() => setNuevos(new Set()), 6000)
      }
    }
    vistos.current = new Set(lista.map((f) => f.id))
    setFichajes(lista)
    setUltimo(Date.now())
    setEstado('listo')
  }, [limite])

  useEffect(() => {
    cargar()
    const sondeo = setInterval(cargar, REFRESCO_MS)
    const alVolver = () => { if (document.visibilityState === 'visible') cargar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      clearInterval(sondeo)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [cargar])

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 15_000)
    return () => clearInterval(t)
  }, [])

  const cuenta = useMemo(() => ({
    total: fichajes.length,
    confirmado: fichajes.filter((f) => f.estado === 'confirmado').length,
    rumor: fichajes.filter((f) => f.estado === 'rumor').length,
  }), [fichajes])

  const visibles = useMemo(
    () => fichajes.filter((f) =>
      (filtro === 'todos' || f.estado === filtro) &&
      (sexo === 'todos' || f.genero === sexo)),
    [fichajes, filtro, sexo],
  )

  if (estado === 'cargando') {
    return <div className="h-[260px] animate-pulse border border-ink/[0.14] bg-cream/50" aria-hidden="true" />
  }
  if (estado === 'sin-tabla') return <AvisoSinTabla />
  if (estado === 'error') {
    return (
      <Marco>
        <p className="p-6 text-sm text-ink/55">
          No se ha podido cargar el mercado de fichajes. Vuelve a intentarlo en un momento.
        </p>
      </Marco>
    )
  }

  return (
    <Marco>
      <Cabecera cuenta={cuenta} ultimo={ultimo} ahora={ahora} onRefrescar={cargar} />

      {fichajes.length > 0 && (
        <div className="scrollbar-none flex items-center gap-2 overflow-x-auto border-t border-ink/[0.14] px-4 py-3 sm:flex-wrap sm:overflow-visible sm:px-6">
          <Chip activo={filtro === 'todos'} onClick={() => setFiltro('todos')}>Todos · {cuenta.total}</Chip>
          <Chip activo={filtro === 'confirmado'} onClick={() => setFiltro('confirmado')}>Confirmados · {cuenta.confirmado}</Chip>
          <Chip activo={filtro === 'rumor'} onClick={() => setFiltro('rumor')} discontinuo>Rumores · {cuenta.rumor}</Chip>
          <span className="mx-1 hidden h-4 w-px bg-ink/15 sm:block" aria-hidden="true" />
          <Chip activo={sexo === 'todos'} onClick={() => setSexo('todos')}>H + M</Chip>
          <Chip activo={sexo === 'H'} onClick={() => setSexo('H')}>Hombres</Chip>
          <Chip activo={sexo === 'M'} onClick={() => setSexo('M')}>Mujeres</Chip>
        </div>
      )}

      {fichajes.length === 0 ? (
        <p className="border-t border-ink/[0.14] p-6 text-sm text-ink/55">
          Todavía no hay fichajes anunciados. En cuanto llegue el primero aparecerá aquí.
        </p>
      ) : visibles.length === 0 ? (
        <p className="border-t border-ink/[0.14] p-6 text-sm text-ink/55">
          Nada con este filtro todavía.
        </p>
      ) : (
        <ol className="border-t border-ink/[0.14]">
          {visibles.map((f, i) => {
            const dia = diaDe(f.informado_en)
            const abreDia = i === 0 || diaDe(visibles[i - 1].informado_en) !== dia
            return (
              <Fila key={f.id} fichaje={f} dia={abreDia ? dia : null} nuevo={nuevos.has(f.id)} ahora={ahora} />
            )
          })}
        </ol>
      )}

      <Pie />
    </Marco>
  )
}

// ─── Chasis ──────────────────────────────────────────────────────────────────
function Marco({ children }: { children: React.ReactNode }) {
  return <section className="border border-ink/[0.14] bg-paper">{children}</section>
}

function Cabecera({
  cuenta, ultimo, ahora, onRefrescar,
}: {
  cuenta: { total: number; confirmado: number; rumor: number }
  ultimo: number
  ahora: number
  onRefrescar: () => void
}) {
  const segundos = Math.max(0, Math.round((ahora - ultimo) / 1000))
  return (
    <header className="flex flex-wrap items-center gap-x-5 gap-y-2 bg-ink px-4 py-3.5 sm:px-6">
      <span className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-mint" />
        </span>
        <span className="label-mono text-mint">En vivo</span>
      </span>
      <span className="label-mono text-cream/60">
        {cuenta.total} {cuenta.total === 1 ? 'movimiento' : 'movimientos'}
      </span>
      <button
        type="button" onClick={onRefrescar}
        className="ml-auto label-mono text-cream/45 transition-colors hover:text-cream"
      >
        {segundos < 45 ? 'actualizado ahora' : `hace ${Math.round(segundos / 60)} min`} · refrescar
      </button>
    </header>
  )
}

function Chip({
  activo, onClick, discontinuo, children,
}: { activo: boolean; onClick: () => void; discontinuo?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={activo}
      className={`shrink-0 whitespace-nowrap px-2.5 py-1 label-mono text-[0.58rem] transition-colors ${discontinuo ? 'border border-dashed' : 'border'} ${
        activo ? 'border-ink bg-ink text-cream' : 'border-ink/25 text-ink/60 hover:border-ink/50 hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function Pie() {
  return (
    <footer className="grid gap-px border-t border-ink/[0.14] bg-ink/[0.14] sm:grid-cols-2">
      <a href={ATLETAS_URL} className="group bg-cream/50 px-4 py-4 transition-colors hover:bg-mint/30 sm:px-6">
        <p className="font-brand text-[0.95rem] font-extrabold tracking-tight text-ink">¿Cambias de club?</p>
        <p className="mt-0.5 text-[0.78rem] text-ink/55">Cuéntanoslo tú y lo publicamos &rarr;</p>
      </a>
      <a href={ENVIAR_URL} className="group bg-cream/50 px-4 py-4 transition-colors hover:bg-mint/30 sm:px-6">
        <p className="font-brand text-[0.95rem] font-extrabold tracking-tight text-ink">¿Te has enterado de uno?</p>
        <p className="mt-0.5 text-[0.78rem] text-ink/55">Colaboradores, con su clave &rarr;</p>
      </a>
    </footer>
  )
}

// ─── Una fila del directo ────────────────────────────────────────────────────
function Fila({
  fichaje, dia, nuevo, ahora,
}: { fichaje: Fichaje; dia: string | null; nuevo: boolean; ahora: number }) {
  const tipo = tipoDe(fichaje)
  const rumor = fichaje.estado === 'rumor'

  return (
    <li className={`border-b border-ink/[0.09] last:border-0 transition-colors duration-1000 ${nuevo ? 'bg-mint/25' : ''}`}>
      {dia && (
        <p className="border-b border-ink/[0.09] bg-cream/40 px-4 py-1.5 label-mono text-ink/40 sm:px-6">{dia}</p>
      )}
      <div className="flex gap-4 px-4 py-4 sm:gap-5 sm:px-6">
        {/* Banda de estado: continua = confirmado, discontinua = rumor */}
        <span
          aria-hidden="true"
          className={`w-1 shrink-0 self-stretch ${rumor ? 'border-l-[3px] border-dashed border-ink/30' : 'bg-mint'}`}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className={`px-1.5 py-0.5 label-mono text-[0.55rem] ${
              rumor ? 'border border-dashed border-ink/40 text-ink/60' : 'bg-ink text-mint'
            }`}>
              {rumor ? 'Rumor' : 'Confirmado'}
            </span>
            {fichaje.origen_envio === 'atleta' && (
              <span className="border border-ink/20 px-1.5 py-0.5 label-mono text-[0.55rem] text-ink/50">lo cuenta el atleta</span>
            )}
            {nuevo && <span className="bg-mint px-1.5 py-0.5 label-mono text-[0.55rem] text-ink">nuevo</span>}
            <time dateTime={fichaje.informado_en} className="ml-auto shrink-0 font-mono text-[0.75rem] tabular-nums text-ink/45">
              {horaDe(fichaje.informado_en)} · {haceDe(fichaje.informado_en, ahora)}
            </time>
          </div>

          <p className="mt-2 font-brand text-[1.15rem] font-extrabold leading-tight tracking-tight text-ink sm:text-[1.25rem]">
            {fichaje.atleta}
          </p>

          {/* En móvil, uno encima de otro: el nombre del club es el dato y no se corta. */}
          <div className="mt-2.5 grid grid-cols-1 items-stretch gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-3">
            <Club nombre={fichaje.club_origen} division={fichaje.division_origen} rol="origen" />
            <span aria-hidden="true" className="text-center font-brand text-lg leading-none text-ink/30">
              <span className="sm:hidden">&darr;</span><span className="hidden sm:inline">&rarr;</span>
            </span>
            <Club nombre={fichaje.club_destino} division={fichaje.division_destino} rol="destino" />
          </div>

          {tipo !== 'completo' && (
            <p className="mt-2 label-mono text-[0.56rem] text-ink/40">
              {tipo === 'destino-incognito' ? 'Destino por confirmar' : 'Procedencia por confirmar'}
            </p>
          )}

          {(fichaje.nota || fichaje.fuente) && (
            <p className="mt-2 text-[0.78rem] leading-relaxed text-ink/50">
              {fichaje.nota}
              {fichaje.nota && fichaje.fuente ? ' · ' : ''}
              {fichaje.fuente && <span className="italic">{fichaje.fuente}</span>}
            </p>
          )}
        </div>
      </div>
    </li>
  )
}

/** Un club con su división, o la incógnita cuando no se sabe. */
function Club({ nombre, division, rol }: { nombre: string | null; division: string | null; rol: 'origen' | 'destino' }) {
  if (!nombre) {
    return (
      <div
        className="flex h-full min-h-[2.75rem] items-center justify-center border border-dashed border-ink/30 bg-cream/50 font-brand text-2xl font-extrabold text-ink/40"
        title={rol === 'destino' ? 'Se va, pero aún no se sabe a qué club' : 'Llega, pero aún no se sabe de qué club'}
      >
        ?
      </div>
    )
  }
  const corta = divisionCorta(division)
  return (
    <div className={`min-w-0 border px-3 py-2 ${rol === 'destino' ? 'border-ink/25 bg-cream/50' : 'border-ink/[0.12] bg-paper'}`}>
      <p className="label-mono text-[0.58rem] text-ink/45">{rol === 'origen' ? 'Sale de' : 'Ficha por'}</p>
      <p className={`mt-0.5 break-words text-[0.88rem] leading-snug ${rol === 'destino' ? 'font-semibold text-ink' : 'text-ink/70'}`}>
        {nombre}
      </p>
      {corta && <p className="mt-0.5 label-mono text-[0.58rem] text-ink/50">{division}</p>}
    </div>
  )
}

// ─── Falta aplicar / actualizar el SQL ───────────────────────────────────────
function AvisoSinTabla() {
  return (
    <Marco>
      <div className="p-6">
        <p className="label-mono text-ink/45">Falta un paso</p>
        <p className="mt-2.5 text-sm leading-relaxed text-ink/70">
          La base de datos del mercado no está al día. Ejecuta{' '}
          <Codigo>supabase/fichajes-schema.sql</Codigo> en el SQL Editor de Supabase (si ya lo habías
          ejecutado antes, vuelve a hacerlo: se actualiza solo) y pon la clave en{' '}
          <Codigo>/admin/fichajes</Codigo>.
        </p>
      </div>
    </Marco>
  )
}

function Codigo({ children }: { children: React.ReactNode }) {
  return <code className="bg-ink/[0.06] px-1 py-0.5 font-mono text-[0.8rem]">{children}</code>
}
