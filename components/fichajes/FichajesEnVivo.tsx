'use client'

// TEMPORAL — Últimos fichajes en vivo (sección de /test, mercado de fichajes).
//
// Directo de traspasos entre clubes: quién se mueve, a qué hora se informó, de
// qué club a cuál y en qué división. Cuando se sabe que un atleta deja su club
// pero no a dónde va, el destino se pinta como una INCÓGNITA (?).
//
// "En vivo" sin WebSocket: el sitio es estático y Realtime habría que activarlo
// aparte, así que se refresca por sondeo cada 30 s y los tiempos relativos se
// recalculan solos. Lo que llega nuevo se resalta unos segundos.
//
// Para retirarlo: quitar la sección de app/test/page.tsx (y ver el final de
// supabase/fichajes-schema.sql para borrar también los datos).

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FICHAJE_COLUMNS, diaDe, haceDe, horaDe, tipoDe,
  type Fichaje,
} from '@/lib/fichajes/types'

const REFRESCO_MS = 30_000
const ENVIAR_URL = '/fichajes/enviar/'

type Estado = 'cargando' | 'listo' | 'sin-tabla' | 'error'

export function FichajesEnVivo({ limite = 60 }: { limite?: number }) {
  const [fichajes, setFichajes] = useState<Fichaje[]>([])
  const [estado, setEstado] = useState<Estado>('cargando')
  const [ultimo, setUltimo] = useState<number>(Date.now())
  const [ahora, setAhora] = useState<number>(Date.now())
  const [nuevos, setNuevos] = useState<Set<string>>(new Set())
  const vistos = useRef<Set<string> | null>(null)

  const cargar = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('fichajes')
      .select(FICHAJE_COLUMNS)
      .order('informado_en', { ascending: false })
      .limit(limite)

    if (error) {
      // 42P01 = la tabla no existe todavía (falta aplicar fichajes-schema.sql).
      setEstado(error.code === '42P01' ? 'sin-tabla' : 'error')
      return
    }

    const lista = (data as unknown as Fichaje[]) ?? []
    // En la primera carga no se resalta nada; después, solo lo que no estaba.
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
    // Al volver a la pestaña, refresca sin esperar al siguiente sondeo.
    const alVolver = () => { if (document.visibilityState === 'visible') cargar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      clearInterval(sondeo)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [cargar])

  // Reloj propio para que los "hace X min" avancen sin recargar datos.
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 15_000)
    return () => clearInterval(t)
  }, [])

  if (estado === 'cargando') {
    return <div className="h-[220px] animate-pulse border border-ink/[0.14] bg-cream/50" aria-hidden="true" />
  }
  if (estado === 'sin-tabla') return <AvisoSinTabla />
  if (estado === 'error') {
    return (
      <Marco>
        <p className="p-6 text-sm text-ink/55">
          No se ha podido cargar el directo de fichajes. Vuelve a intentarlo en un momento.
        </p>
      </Marco>
    )
  }

  return (
    <Marco>
      <Cabecera n={fichajes.length} ultimo={ultimo} ahora={ahora} onRefrescar={cargar} />

      {fichajes.length === 0 ? (
        <p className="border-t border-ink/[0.14] p-6 text-sm text-ink/55">
          Todavía no hay fichajes anunciados. En cuanto llegue el primero aparecerá aquí.
        </p>
      ) : (
        <ol className="divide-y divide-ink/[0.09]">
          {fichajes.map((f, i) => {
            const dia = diaDe(f.informado_en)
            const abreDia = i === 0 || diaDe(fichajes[i - 1].informado_en) !== dia
            return (
              <Fila
                key={f.id}
                fichaje={f}
                dia={abreDia ? dia : null}
                nuevo={nuevos.has(f.id)}
                ahora={ahora}
              />
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
  n, ultimo, ahora, onRefrescar,
}: { n: number; ultimo: number; ahora: number; onRefrescar: () => void }) {
  const segundos = Math.max(0, Math.round((ahora - ultimo) / 1000))
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-cream/60 px-4 py-3 sm:px-6">
      <span className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
        </span>
        <span className="label-mono text-ink/70">En vivo</span>
      </span>

      <span className="label-mono text-ink/45">
        {n} {n === 1 ? 'fichaje' : 'fichajes'}
      </span>

      <button
        type="button"
        onClick={onRefrescar}
        className="ml-auto label-mono text-ink/40 transition-colors hover:text-ink/70"
      >
        {segundos < 45 ? 'actualizado ahora' : `actualizado hace ${Math.round(segundos / 60)} min`} · refrescar
      </button>
    </header>
  )
}

function Pie() {
  return (
    <footer className="border-t border-ink/[0.14] bg-cream/40 px-4 py-3 sm:px-6">
      <p className="text-[0.78rem] leading-relaxed text-ink/50">
        ¿Te has enterado de un fichaje?{' '}
        <a href={ENVIAR_URL} className="font-semibold text-ink underline decoration-ink/30 underline-offset-2 hover:decoration-mint">
          Mándalo por aquí
        </a>{' '}
        — necesitas la clave de colaborador. Los movimientos se publican tal como los
        manda quien avisa; los que llevan <span className="font-semibold text-ink/70">?</span> están
        pendientes de confirmar.
      </p>
    </footer>
  )
}

// ─── Una fila del directo ────────────────────────────────────────────────────
function Fila({
  fichaje, dia, nuevo, ahora,
}: { fichaje: Fichaje; dia: string | null; nuevo: boolean; ahora: number }) {
  const tipo = tipoDe(fichaje)

  return (
    <li className={`transition-colors duration-1000 ${nuevo ? 'bg-mint/25' : ''}`}>
      {dia && (
        <p className="border-b border-ink/[0.09] bg-cream/40 px-4 py-1.5 label-mono text-ink/40 sm:px-6">
          {dia}
        </p>
      )}
      <div className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-baseline sm:gap-5 sm:px-6">
        {/* Hora a la que se informó */}
        <div className="flex shrink-0 items-baseline gap-2 sm:w-[7.5rem] sm:flex-col sm:gap-0.5">
          <time
            dateTime={fichaje.informado_en}
            className="font-mono text-sm font-medium tabular-nums text-ink"
          >
            {horaDe(fichaje.informado_en)}
          </time>
          <span className="label-mono text-[0.6rem] text-ink/35">{haceDe(fichaje.informado_en, ahora)}</span>
        </div>

        {/* Atleta y movimiento */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <p className="font-brand text-[1.05rem] font-extrabold leading-tight tracking-tight text-ink">
              {fichaje.atleta}
            </p>
            {nuevo && (
              <span className="bg-ink px-1.5 py-0.5 label-mono text-[0.55rem] text-mint">nuevo</span>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
            <Club nombre={fichaje.club_origen} rol="origen" />
            <span aria-hidden="true" className="text-ink/30">&rarr;</span>
            <Club nombre={fichaje.club_destino} rol="destino" />
            {fichaje.division && (
              <span className="border border-ink/20 px-2 py-0.5 label-mono text-[0.58rem] text-ink/55">
                {fichaje.division}
              </span>
            )}
          </div>

          {tipo !== 'completo' && (
            <p className="mt-1.5 label-mono text-[0.58rem] text-ink/40">
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

/** Un club, o la incógnita cuando no se sabe. */
function Club({ nombre, rol }: { nombre: string | null; rol: 'origen' | 'destino' }) {
  if (!nombre) {
    return (
      <span
        className="inline-flex h-[1.6rem] min-w-[2.2rem] items-center justify-center border border-dashed border-ink/30 bg-cream/60 px-2 font-brand text-base font-extrabold text-ink/45"
        title={rol === 'destino' ? 'Se va, pero aún no se sabe a qué club' : 'Llega, pero aún no se sabe de qué club'}
      >
        ?
      </span>
    )
  }
  return <span className={rol === 'destino' ? 'font-semibold text-ink' : 'text-ink/65'}>{nombre}</span>
}

// ─── Falta aplicar el SQL ────────────────────────────────────────────────────
function AvisoSinTabla() {
  return (
    <Marco>
      <div className="p-6">
        <p className="label-mono text-ink/45">Falta un paso</p>
        <p className="mt-2.5 text-sm leading-relaxed text-ink/70">
          La tabla <Codigo>fichajes</Codigo> todavía no existe en Supabase. Ejecuta{' '}
          <Codigo>supabase/fichajes-schema.sql</Codigo> en el SQL Editor y fija la clave de
          colaborador con <Codigo>SELECT fichajes_set_clave(&apos;tu-clave&apos;);</Codigo>
        </p>
      </div>
    </Marco>
  )
}

function Codigo({ children }: { children: React.ReactNode }) {
  return <code className="bg-ink/[0.06] px-1 py-0.5 font-mono text-[0.8rem]">{children}</code>
}
