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
  FICHAJE_COLUMNS, diaDe, divisionCorta, haceDe, horaDe, normalizar,
  type Fichaje,
} from '@/lib/fichajes/types'
import { cargarEstilos, estiloDe, tintaSobre, type EstiloClub } from '@/lib/fichajes/estilos'
import { tratarLogo, type LogoTratado } from '@/lib/fichajes/logo'
import { compensacionDe, euros, type Compensacion } from '@/lib/fichajes/compensaciones'
import { FichaAtleta } from './FichaAtleta'
import { CompensacionRFEA } from './CompensacionRFEA'

const REFRESCO_MS = 30_000
// El enlace de colaboradores NO se enseña al público: cada colaborador recibe
// el suyo personal desde /admin/fichajes.
// Una sola página para avisar de un fichaje: un chivatazo o el tuyo propio.
const CHIVATAZO_URL = '/fichajes/chivatazo/'
const TABLON_URL = '/mercado/#tablon'

type Estado = 'cargando' | 'listo' | 'sin-tabla' | 'error'
type Filtro = 'todos' | 'confirmado' | 'rumor' | 'bomba'
type FiltroSexo = 'todos' | 'H' | 'M'
type FiltroDivision = 'todas' | 'DH' | '1ª' | '2ª'
type FiltroCuando = 'todo' | 'hoy' | 'semana'

const ESTADO_TXT: Record<Filtro, string> = { todos: 'Todos', bomba: '💥 Bombas', confirmado: 'Confirmados', rumor: 'Rumores' }
const SEXO_TXT: Record<FiltroSexo, string> = { todos: 'Todos', H: 'Hombres', M: 'Mujeres' }
const DIVISION_TXT: Record<FiltroDivision, string> = { todas: 'Todas', DH: 'División de Honor', '1ª': 'Primera', '2ª': 'Segunda' }
const CUANDO_TXT: Record<FiltroCuando, string> = { todo: 'Siempre', hoy: 'Hoy', semana: 'Últimos 7 días' }

/**
 * `limite`: cuántos movimientos se piden como mucho a la base de datos.
 * `pagina`: cuántos se enseñan de entrada y cuántos añade cada «Ver más».
 */
export function FichajesEnVivo({ limite = 300, pagina = 10 }: { limite?: number; pagina?: number }) {
  const [fichajes, setFichajes] = useState<Fichaje[]>([])
  const [estado, setEstado] = useState<Estado>('cargando')
  const [ultimo, setUltimo] = useState<number>(Date.now())
  const [ahora, setAhora] = useState<number>(Date.now())
  const [nuevos, setNuevos] = useState<Set<string>>(new Set())
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [sexo, setSexo] = useState<FiltroSexo>('todos')
  const [division, setDivision] = useState<FiltroDivision>('todas')
  const [cuando, setCuando] = useState<FiltroCuando>('todo')
  const [busca, setBusca] = useState('')
  const [panel, setPanel] = useState(false)
  const [mostrados, setMostrados] = useState(pagina)
  const vistos = useRef<Set<string> | null>(null)
  const [estilos, setEstilos] = useState<Map<string, EstiloClub> | null>(null)

  useEffect(() => { cargarEstilos().then(setEstilos).catch(() => {}) }, [])

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

  // Al cambiar lo que se busca, la lista vuelve a su primera página.
  useEffect(() => { setMostrados(pagina) }, [filtro, sexo, division, cuando, busca, pagina])

  const cuenta = useMemo(() => ({
    total: fichajes.length,
    confirmado: fichajes.filter((f) => f.estado === 'confirmado').length,
    rumor: fichajes.filter((f) => f.estado === 'rumor').length,
    bomba: fichajes.filter((f) => f.bomba).length,
    segunda: fichajes.some((f) => divisionCorta(f.division_origen) === '2ª' || divisionCorta(f.division_destino) === '2ª'),
  }), [fichajes])

  const visibles = useMemo(() => {
    const palabras = normalizar(busca).split(' ').filter(Boolean)
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const desde = cuando === 'hoy' ? hoy.getTime() : cuando === 'semana' ? Date.now() - 7 * 86_400_000 : 0
    return fichajes.filter((f) => {
      if (filtro !== 'todos' && !(filtro === 'bomba' ? f.bomba : f.estado === filtro)) return false
      if (sexo !== 'todos' && f.genero !== sexo) return false
      if (division !== 'todas' &&
          divisionCorta(f.division_origen) !== division && divisionCorta(f.division_destino) !== division) return false
      if (desde && new Date(f.informado_en).getTime() < desde) return false
      if (palabras.length) {
        const texto = normalizar(`${f.atleta} ${f.club_origen ?? ''} ${f.club_destino ?? ''}`)
        if (!palabras.every((p) => texto.includes(p))) return false
      }
      return true
    })
  }, [fichajes, filtro, sexo, division, cuando, busca])

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

  // Filtros puestos, para enseñarlos resumidos con el panel cerrado.
  const activos: { texto: string; quitar: () => void }[] = []
  if (filtro !== 'todos') activos.push({ texto: ESTADO_TXT[filtro], quitar: () => setFiltro('todos') })
  if (sexo !== 'todos') activos.push({ texto: SEXO_TXT[sexo], quitar: () => setSexo('todos') })
  if (division !== 'todas') activos.push({ texto: DIVISION_TXT[division], quitar: () => setDivision('todas') })
  if (cuando !== 'todo') activos.push({ texto: CUANDO_TXT[cuando], quitar: () => setCuando('todo') })
  const filtrando = activos.length > 0 || busca.trim().length > 0
  const limpiar = () => { setFiltro('todos'); setSexo('todos'); setDivision('todas'); setCuando('todo'); setBusca('') }

  const pagina_ = visibles.slice(0, mostrados)
  const quedan = visibles.length - pagina_.length

  return (
    <Marco>
      <Cabecera cuenta={cuenta} ultimo={ultimo} ahora={ahora} onRefrescar={cargar} />

      {fichajes.length > 0 && (
        <div className="border-t border-ink/[0.14]">
          {/* Una sola línea: buscar y abrir los filtros. Todo lo demás, plegado. */}
          <div className="flex items-stretch gap-2 px-4 py-3 sm:px-6">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Buscar atleta o club</span>
              <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4.5 4.5" strokeLinecap="round" />
              </svg>
              <input
                type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder="Busca un atleta o un club…" autoComplete="off" enterKeyHint="search"
                className="h-10 w-full border border-ink/[0.15] bg-cream/60 pl-9 pr-3 text-base text-ink sm:text-sm placeholder:text-ink/35 transition-colors focus:border-ink/30 focus:bg-cream focus:outline-none focus:ring-2 focus:ring-mint/40"
              />
            </label>
            <button
              type="button" onClick={() => setPanel((v) => !v)} aria-expanded={panel} aria-controls="filtros-directo"
              className={`flex h-10 shrink-0 items-center gap-2 border px-3.5 label-mono transition-colors ${
                panel || activos.length ? 'border-ink bg-ink text-cream' : 'border-ink/25 text-ink/65 hover:border-ink/50 hover:text-ink'
              }`}
            >
              Filtros
              {activos.length > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-mint px-1 font-mono text-[0.62rem] font-semibold leading-none tracking-normal text-ink">
                  {activos.length}
                </span>
              )}
              <span aria-hidden="true" className={`text-[0.6rem] transition-transform ${panel ? 'rotate-180' : ''}`}>▾</span>
            </button>
          </div>

          {panel && (
            <div id="filtros-directo" className="panel-enter grid gap-x-8 gap-y-4 border-t border-ink/[0.09] bg-cream/40 px-4 py-4 sm:grid-cols-2 sm:px-6">
              <Grupo titulo="Qué">
                <Chip activo={filtro === 'todos'} onClick={() => setFiltro('todos')}>Todos · {cuenta.total}</Chip>
                {cuenta.bomba > 0 && (
                  <Chip activo={filtro === 'bomba'} onClick={() => setFiltro('bomba')}>💥 Bombas · {cuenta.bomba}</Chip>
                )}
                <Chip activo={filtro === 'confirmado'} onClick={() => setFiltro('confirmado')}>Confirmados · {cuenta.confirmado}</Chip>
                <Chip activo={filtro === 'rumor'} onClick={() => setFiltro('rumor')} discontinuo>Rumores · {cuenta.rumor}</Chip>
              </Grupo>
              <Grupo titulo="División">
                <Chip activo={division === 'todas'} onClick={() => setDivision('todas')}>Todas</Chip>
                <Chip activo={division === 'DH'} onClick={() => setDivision('DH')}>División de Honor</Chip>
                <Chip activo={division === '1ª'} onClick={() => setDivision('1ª')}>Primera</Chip>
                {(cuenta.segunda || division === '2ª') && (
                  <Chip activo={division === '2ª'} onClick={() => setDivision('2ª')}>Segunda</Chip>
                )}
              </Grupo>
              <Grupo titulo="Categoría">
                <Chip activo={sexo === 'todos'} onClick={() => setSexo('todos')}>H + M</Chip>
                <Chip activo={sexo === 'H'} onClick={() => setSexo('H')}>Hombres</Chip>
                <Chip activo={sexo === 'M'} onClick={() => setSexo('M')}>Mujeres</Chip>
              </Grupo>
              <Grupo titulo="Cuándo">
                <Chip activo={cuando === 'todo'} onClick={() => setCuando('todo')}>Siempre</Chip>
                <Chip activo={cuando === 'hoy'} onClick={() => setCuando('hoy')}>Hoy</Chip>
                <Chip activo={cuando === 'semana'} onClick={() => setCuando('semana')}>Últimos 7 días</Chip>
              </Grupo>
            </div>
          )}

          {filtrando && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-ink/[0.09] px-4 py-2.5 sm:px-6">
              <span className="label-mono text-[0.58rem] text-ink/50">
                {visibles.length} de {cuenta.total}
              </span>
              {!panel && activos.map((a) => (
                <button key={a.texto} type="button" onClick={a.quitar}
                  className="flex items-center gap-1.5 bg-ink/[0.07] px-2 py-1 label-mono text-[0.56rem] text-ink/75 transition-colors hover:bg-ink/[0.14]"
                  aria-label={`Quitar filtro ${a.texto}`}>
                  {a.texto} <span aria-hidden="true" className="text-ink/40">✕</span>
                </button>
              ))}
              <button type="button" onClick={limpiar}
                className="ml-auto label-mono text-[0.56rem] text-ink/45 underline decoration-ink/20 underline-offset-4 transition-colors hover:text-ink">
                quitar todo
              </button>
            </div>
          )}
        </div>
      )}

      {fichajes.length === 0 ? (
        <p className="border-t border-ink/[0.14] p-6 text-sm text-ink/55">
          Todavía no hay fichajes anunciados. En cuanto llegue el primero aparecerá aquí.
        </p>
      ) : visibles.length === 0 ? (
        <div className="border-t border-ink/[0.14] px-4 py-8 text-center sm:px-6">
          <p className="font-brand text-base font-extrabold tracking-tight text-ink">
            {busca.trim() ? <>Nada sobre «{busca.trim()}» todavía</> : 'Nada con estos filtros todavía'}
          </p>
          <p className="mt-1.5 text-[0.82rem] text-ink/55">
            ¿Sabes algo que aquí no sale?{' '}
            <a href={CHIVATAZO_URL} className="font-semibold text-ink underline decoration-mint decoration-2 underline-offset-4 hover:decoration-ink">
              Danos el chivatazo
            </a>
          </p>
          <button type="button" onClick={limpiar} className="mt-4 border border-ink/25 px-3 py-1.5 label-mono text-[0.58rem] text-ink/60 transition-colors hover:border-ink hover:text-ink">
            Ver todos los fichajes
          </button>
        </div>
      ) : (
        <>
          <ol className="border-t border-ink/[0.14]">
            {pagina_.map((f, i) => {
              const dia = diaDe(f.informado_en)
              const abreDia = i === 0 || diaDe(pagina_[i - 1].informado_en) !== dia
              return (
                <Fila key={f.id} fichaje={f} dia={abreDia ? dia : null} nuevo={nuevos.has(f.id)} ahora={ahora} estilos={estilos} />
              )
            })}
          </ol>
          {quedan > 0 && (
            <div className="border-t border-ink/[0.14] px-4 py-4 sm:px-6">
              <button
                type="button" onClick={() => setMostrados((n) => n + pagina)}
                className="flex w-full items-center justify-center gap-3 border border-ink/25 py-3 label-mono text-ink/70 transition-colors hover:border-ink hover:bg-ink hover:text-mint"
              >
                Ver {Math.min(pagina, quedan)} más
                <span className="font-mono text-[0.62rem] tracking-normal opacity-60">quedan {quedan}</span>
              </button>
            </div>
          )}
        </>
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
    <header className="flex flex-wrap items-center gap-x-5 gap-y-2.5 bg-ink px-4 py-3 sm:px-6">
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
        className="label-mono text-cream/45 transition-colors hover:text-cream"
      >
        {segundos < 45 ? 'actualizado ahora' : `hace ${Math.round(segundos / 60)} min`} · refrescar
      </button>
      <a href={CHIVATAZO_URL}
        className="ml-auto bg-mint px-3 py-1.5 label-mono text-[0.62rem] font-semibold text-ink transition-colors hover:bg-cream">
        Dar un chivatazo
      </a>
    </header>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={titulo}>
      <p className="mb-2 label-mono text-[0.56rem] text-ink/45">{titulo}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Chip({
  activo, onClick, discontinuo, children,
}: { activo: boolean; onClick: () => void; discontinuo?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={activo}
      className={`shrink-0 whitespace-nowrap px-2.5 py-1.5 label-mono text-[0.58rem] transition-colors ${discontinuo ? 'border border-dashed' : 'border'} ${
        activo ? 'border-ink bg-ink text-cream' : 'border-ink/25 bg-paper text-ink/60 hover:border-ink/50 hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function Pie() {
  const [busca, setBusca] = useState(false)
  return (
    <footer className="border-t border-ink/[0.14]">
      {/* El chivatazo es la llamada principal: cuanta más gente avise, mejor directo. */}
      <a href={CHIVATAZO_URL} className="group flex flex-wrap items-center gap-x-5 gap-y-3 bg-ink px-4 py-5 transition-colors sm:px-6">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mint text-xl">🤫</span>
        <span className="min-w-0 flex-1 basis-56">
          <span className="block font-brand text-[1.15rem] font-extrabold leading-tight tracking-tight text-cream">
            ¿Te has enterado de un fichaje?
          </span>
          <span className="mt-1 block text-[0.8rem] leading-snug text-cream/60">
            Danos el chivatazo, también si el que cambia de club eres tú. Es anónimo, se tarda medio
            minuto y lo comprobamos antes de publicarlo.
          </span>
        </span>
        <span className="shrink-0 bg-mint px-4 py-2.5 font-brand text-[0.9rem] font-extrabold tracking-tight text-ink transition-colors group-hover:bg-cream">
          Dar el chivatazo &rarr;
        </span>
      </a>
      <button type="button" onClick={() => setBusca(true)} aria-haspopup="dialog"
        className="group flex w-full flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink/[0.14] bg-cream/50 px-4 py-4 text-left transition-colors hover:bg-mint/30 sm:px-6">
        <span className="min-w-0 flex-1 basis-56">
          <span className="block font-brand text-[1rem] font-extrabold tracking-tight text-ink">¿Buscas club o atletas?</span>
          <span className="mt-0.5 block text-[0.8rem] text-ink/55">Dinos si eres atleta o club y te decimos por dónde empezar.</span>
        </span>
        <span className="shrink-0 border border-ink/25 px-3.5 py-2 label-mono text-[0.6rem] text-ink/70 transition-colors group-hover:border-ink group-hover:text-ink">
          Atleta o club &rarr;
        </span>
      </button>
      {busca && <VentanaBusca onCerrar={() => setBusca(false)} />}
    </footer>
  )
}

/**
 * «¿Buscas club o atletas?»: primero se elige qué eres. El atleta va al
 * buscador de clubes de Mundo Atletismo; al club se le ofrece un dossier a
 * medida por correo.
 */
function VentanaBusca({ onCerrar }: { onCerrar: () => void }) {
  const [soy, setSoy] = useState<'atleta' | 'club' | null>(null)

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    document.addEventListener('keydown', tecla)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = antes }
  }, [onCerrar])

  const opcion = (v: 'atleta' | 'club', titulo: string, texto: string) => (
    <button type="button" onClick={() => setSoy(v)} aria-pressed={soy === v}
      className={`border-2 p-4 text-left transition-colors ${
        soy === v ? 'border-ink bg-ink text-cream' : 'border-ink/[0.18] bg-paper text-ink hover:border-ink/45'}`}>
      <span className="block font-brand text-lg font-extrabold tracking-tight">{titulo}</span>
      <span className={`mt-1 block text-[0.8rem] leading-snug ${soy === v ? 'text-cream/70' : 'text-ink/55'}`}>{texto}</span>
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-6" onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-labelledby="busca-titulo" onClick={(e) => e.stopPropagation()}
        className="panel-enter max-h-[90dvh] w-full max-w-md overflow-y-auto border border-ink/[0.14] bg-paper p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <h3 id="busca-titulo" className="font-brand text-[1.4rem] font-extrabold leading-tight tracking-tight text-ink">
            ¿Eres atleta o club?
          </h3>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center text-xl text-ink/45 transition-colors hover:text-ink">
            ✕
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {opcion('atleta', 'Soy atleta', 'Busco club para competir')}
          {opcion('club', 'Soy un club', 'Busco atletas que fichar')}
        </div>

        {soy === 'atleta' && (
          <div className="panel-enter mt-5 border-l-2 border-mint bg-mint/15 p-4">
            <p className="text-sm leading-relaxed text-ink/80">
              En Mundo Atletismo tienes un buscador de clubes para atletas: mira cuáles encajan contigo.
            </p>
            <a href="https://mundoatletismo.es/atletas" target="_blank" rel="noopener noreferrer"
              className="mt-4 inline-block bg-ink px-4 py-3 font-brand text-[0.92rem] font-extrabold tracking-tight text-mint transition-colors hover:bg-mint hover:text-ink">
              Ir al buscador de clubes &rarr;
            </a>
            <p className="mt-2.5 label-mono text-[0.55rem] text-ink/45">mundoatletismo.es/atletas · se abre en otra pestaña</p>
          </div>
        )}

        {soy === 'club' && (
          <div className="panel-enter mt-5 border-l-2 border-mint bg-mint/15 p-4">
            <p className="text-sm leading-relaxed text-ink/80">
              ¿Quieres un dossier detallado de qué atletas puede fichar tu club? Escríbenos y te lo preparamos.
            </p>
            <a href="mailto:info@mundoatletismo.es?subject=Dossier%20de%20fichajes%20para%20mi%20club"
              className="mt-4 inline-block bg-ink px-4 py-3 font-brand text-[0.92rem] font-extrabold tracking-tight text-mint transition-colors hover:bg-mint hover:text-ink">
              Escribir a info@mundoatletismo.es
            </a>
            <p className="mt-2.5 select-all font-mono text-[0.8rem] text-ink/60">info@mundoatletismo.es</p>
          </div>
        )}

        <p className="mt-6 border-t border-ink/[0.1] pt-4 text-[0.78rem] text-ink/50">
          También puedes{' '}
          <a href={TABLON_URL} onClick={onCerrar} className="font-semibold text-ink/75 underline decoration-ink/25 underline-offset-4 hover:text-ink">
            anunciarte en el tablón del mercado
          </a>.
        </p>
      </div>
    </div>
  )
}

// ─── Una fila del directo ────────────────────────────────────────────────────
function Fila({
  fichaje, dia, nuevo, ahora, estilos,
}: { fichaje: Fichaje; dia: string | null; nuevo: boolean; ahora: number; estilos: Map<string, EstiloClub> | null }) {
  const rumor = fichaje.estado === 'rumor'
  const bomba = fichaje.bomba
  // Ficha del atleta: se abre pulsando su nombre. Discreta a propósito: el
  // directo va de movimientos, la ficha es un extra para quien la busque.
  const [ficha, setFicha] = useState(false)

  return (
    <li className="border-b border-ink/[0.09] last:border-0">
      {dia && (
        <p className="flex items-center gap-3 border-b border-ink/[0.09] bg-cream/60 px-4 py-2 sm:px-6">
          <span className="label-mono text-[0.62rem] font-semibold text-ink/60">{dia}</span>
          <span aria-hidden="true" className="h-px flex-1 bg-ink/[0.1]" />
        </p>
      )}
      {/* Borde de estado: continuo = confirmado, discontinuo = rumor */}
      <article className={`grid gap-x-5 gap-y-2 border-l-4 px-4 py-4 transition-colors duration-1000 sm:grid-cols-[4.75rem_minmax(0,1fr)] sm:px-6 sm:py-5 ${
        rumor ? 'border-dashed border-l-ink/25' : 'border-l-mint'} ${
        bomba ? 'bg-mint/25' : nuevo ? 'bg-mint/20' : ''}`}>
        {/* La hora: columna propia en pantallas anchas, línea suelta en móvil */}
        <time dateTime={fichaje.informado_en} className="flex items-baseline gap-2 sm:block sm:pt-0.5">
          <span className="font-mono text-[0.95rem] font-semibold tabular-nums leading-none text-ink sm:block sm:text-[1.05rem]">
            {horaDe(fichaje.informado_en)}
          </span>
          <span className="font-mono text-[0.68rem] tabular-nums leading-tight text-ink/45 sm:mt-1.5 sm:block">
            {haceDe(fichaje.informado_en, ahora)}
          </span>
        </time>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className={`px-1.5 py-0.5 label-mono text-[0.55rem] ${
              rumor ? 'border border-dashed border-ink/40 text-ink/60' : 'bg-ink text-mint'
            }`}>
              {rumor ? 'Rumor' : 'Confirmado'}
            </span>
            {bomba && (
              <span className="bg-ink px-2 py-0.5 font-brand text-[0.72rem] font-extrabold uppercase tracking-wide text-mint">
                💥 Bomba
              </span>
            )}
            {fichaje.origen_envio === 'atleta' && (
              <span className="border border-ink/20 px-1.5 py-0.5 label-mono text-[0.55rem] text-ink/50">lo cuenta el atleta</span>
            )}
            <CompensacionRFEA nombre={fichaje.atleta} />
            {nuevo && <span className="bg-mint px-1.5 py-0.5 label-mono text-[0.55rem] text-ink">nuevo</span>}
          </div>

          <p className={`mt-2 font-brand font-extrabold leading-[1.05] tracking-tight text-ink ${bomba ? 'text-[1.6rem] uppercase sm:text-[2rem]' : 'text-[1.25rem] sm:text-[1.4rem]'}`}>
            <button type="button" onClick={() => setFicha((v) => !v)} aria-expanded={ficha}
              className="group text-left decoration-ink/25 decoration-dotted underline-offset-4 hover:underline"
              title="Ver sus marcas">
              {fichaje.atleta}
              <span aria-hidden="true"
                className={`ml-2 align-middle font-mono text-[0.6rem] font-normal normal-case tracking-normal text-ink/30 transition-opacity group-hover:text-ink/55 ${ficha ? 'opacity-100' : 'opacity-70'}`}>
                {ficha ? '▴ marcas' : '▾ marcas'}
              </span>
            </button>
          </p>

          {/* En móvil, uno encima de otro: el nombre del club es el dato y no se corta. */}
          <div className="mt-3 grid grid-cols-1 items-stretch gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-3">
            <Club nombre={fichaje.club_origen} division={fichaje.division_origen} rol="origen" estilo={estiloDe(estilos, fichaje.club_origen)} atleta={fichaje.atleta} />
            <span aria-hidden="true" className="justify-self-center font-brand text-lg leading-none text-ink/40">
              <span className="sm:hidden">&darr;</span><span className="hidden sm:inline">&rarr;</span>
            </span>
            <Club nombre={fichaje.club_destino} division={fichaje.division_destino} rol="destino" estilo={estiloDe(estilos, fichaje.club_destino)} atleta={fichaje.atleta} />
          </div>

          {(fichaje.nota || fichaje.fuente) && (
            <div className="mt-3 border-l-2 border-ink/15 pl-3">
              {fichaje.nota && <p className="text-[0.82rem] leading-relaxed text-ink/65">{fichaje.nota}</p>}
              {fichaje.fuente && (
                <p className={`label-mono text-[0.55rem] text-ink/45 ${fichaje.nota ? 'mt-1' : ''}`}>
                  fuente · <span className="text-ink/65">{fichaje.fuente}</span>
                </p>
              )}
            </div>
          )}

          {ficha && <FichaAtleta nombre={fichaje.atleta} club={fichaje.club_origen ?? fichaje.club_destino} discreta />}
        </div>
      </article>
    </li>
  )
}

/** Un club con su división, o la incógnita cuando no se sabe. */
function Club({ nombre, division, rol, estilo, atleta }: {
  nombre: string | null; division: string | null; rol: 'origen' | 'destino'; estilo: EstiloClub | null; atleta?: string
}) {
  if (!nombre) return <Misterio rol={rol} atleta={atleta} />
  const corta = divisionCorta(division)
  const color = estilo?.color ?? null
  const color2 = estilo?.color2 ?? null
  const destino = rol === 'destino'

  // Tarjeta de siempre (papel y tinta) con un difuminado muy suave de los
  // colores del club desde la izquierda. Sin colores, queda neutra.
  const fondo = color
    ? [
        `radial-gradient(120% 140% at 0% 50%, ${alfa(color, destino ? 0.3 : 0.22)} 0%, transparent 65%)`,
        color2 ? `radial-gradient(90% 120% at 100% 100%, ${alfa(color2, 0.17)} 0%, transparent 60%)` : null,
      ].filter(Boolean).join(', ')
    : undefined

  return (
    <div
      className={`flex h-full min-h-[4.5rem] min-w-0 items-center gap-3 border px-3 py-2.5 text-ink ${destino ? 'border-ink/25 bg-cream' : 'border-ink/[0.12] bg-paper'}`}
      style={fondo ? { backgroundImage: fondo } : undefined}
    >
      <Escudo logo={estilo?.logo_url ?? null} color={color} mantenerFondo={estilo?.logo_fondo ?? false} />
      <div className="min-w-0 flex-1">
        <p className="label-mono text-[0.56rem] text-ink/45">{destino ? 'Ficha por' : 'Sale de'}</p>
        <p className={`mt-0.5 break-words font-brand leading-tight tracking-tight ${destino ? 'text-[1.02rem] font-extrabold text-ink' : 'text-[0.94rem] font-bold text-ink/75'}`}>
          {nombre}
        </p>
        {division && !corta && <p className="mt-0.5 label-mono text-[0.55rem] text-ink/50">{division}</p>}
      </div>
      {corta && (
        <span title={division ?? undefined}
          className={`shrink-0 self-start px-1.5 py-0.5 font-mono text-[0.62rem] font-semibold leading-tight ${destino ? 'bg-ink text-mint' : 'border border-ink/25 text-ink/60'}`}>
          {corta}<span className="sr-only"> · {division}</span>
        </span>
      )}
    </div>
  )
}

/**
 * Club que aún no se sabe. Destino desconocido: «¿Quién lo ficha?» y, si el
 * atleta tiene compensación RFEA, lo que tendrá que pagar el club que lo fiche.
 */
function Misterio({ rol, atleta }: { rol: 'origen' | 'destino'; atleta?: string }) {
  const [comp, setComp] = useState<Compensacion | null>(null)
  useEffect(() => {
    if (rol !== 'destino' || !atleta) return
    let vivo = true
    compensacionDe(atleta).then((c) => { if (vivo) setComp(c) })
    return () => { vivo = false }
  }, [rol, atleta])

  const destino = rol === 'destino'
  return (
    <div
      className="relative flex h-full min-h-[4.5rem] min-w-0 items-center gap-3 overflow-hidden border border-dashed border-ink/30 px-3 py-2.5 text-ink"
      style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(13,42,20,0.035) 0 8px, transparent 8px 16px)' }}
      title={destino ? 'Se va, pero aún no se sabe a qué club' : 'Llega, pero aún no se sabe de qué club'}
    >
      <span aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-dashed border-ink/25 font-brand text-[1.4rem] font-extrabold text-ink/35">
        ?
      </span>
      <div className="min-w-0">
        <p className="label-mono text-[0.56rem] text-ink/45">{destino ? 'Ficha por' : 'Sale de'}</p>
        <p className="mt-0.5 font-brand text-[0.95rem] font-bold leading-tight tracking-tight text-ink/55">
          {destino ? '¿Quién lo ficha?' : 'Procedencia por confirmar'}
        </p>
        {comp ? (
          <p className="mt-0.5 label-mono text-[0.55rem] text-ink/55">
            <span title={`Para ${comp.club} · ${comp.tipo}`}>compensación <span className="font-semibold text-ink">{euros(comp.euros)}</span></span>
          </p>
        ) : destino ? (
          <p className="mt-0.5 label-mono text-[0.55rem] text-ink/40">destino por confirmar</p>
        ) : null}
      </div>
    </div>
  )
}

/** #RRGGBB + opacidad → rgba(). */
function alfa(hex: string, a: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 'transparent'
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

/**
 * Escudo del club, respetando su forma (alto fijo, ancho según proporción).
 * Si el logo trae fondo liso se le quita en el navegador (lib/fichajes/logo),
 * salvo que en el admin se haya marcado «mantener el fondo»: entonces se
 * redondea como una chapa. Si es blanco, va sobre el color del club.
 * Sin logo, no se pinta nada.
 */
function Escudo({ logo, color, mantenerFondo }: { logo: string | null; color: string | null; mantenerFondo: boolean }) {
  const [t, setT] = useState<LogoTratado | null>(null)

  useEffect(() => {
    if (!logo) return
    let vivo = true
    tratarLogo(logo, !mantenerFondo).then((r) => { if (vivo) setT(r) })
    return () => { vivo = false }
  }, [logo, mantenerFondo])

  if (!logo || !t) return null

  const r = t.proporcion
  const ancho = r <= 1.15 ? 44 : Math.min(44 * r * 0.82, 104)
  const claro = t.tipo === 'claro'
  const chapa = claro ? (color && tintaSobre(color) === '#ffffff' ? color : '#0c2a18') : undefined
  const conFondo = t.teniaFondo && mantenerFondo

  return (
    <span className={`flex h-11 shrink-0 items-center justify-center ${claro ? 'rounded-md px-1.5 py-1' : ''}`}
      style={{ width: ancho, background: chapa, animation: 'cardFadeIn 280ms var(--ease-out) both' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={t.url} alt="" className={`max-h-full max-w-full object-contain ${conFondo ? 'rounded-md shadow-[0_0_0_1px_rgba(13,42,20,0.08)]' : ''}`} />
    </span>
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
