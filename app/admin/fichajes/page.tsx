import { FichajesPanel } from '@/components/admin/fichajes/FichajesPanel'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mercado de fichajes' }

export default function FichajesAdminPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="section-label">08 · temporal</div>
        <h1 className="section-title text-ink">Mercado de fichajes</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/55">
          Reparte los dos enlaces: el de colaboradores (con la clave que pongas abajo) publica al
          momento; el de atletas llega aquí para que lo apruebes. Desde aquí cambias rumor ⇄
          confirmado, ocultas o borras, y cada fichaje sale solo en Historias.
        </p>
      </div>
      <FichajesPanel />
    </div>
  )
}
