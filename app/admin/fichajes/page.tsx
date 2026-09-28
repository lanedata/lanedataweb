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
          Pon la clave que quieras y pásasela a quien vaya a avisarte de fichajes: con ella
          podrán publicarlos desde el enlace de colaborador. Abajo tienes todo lo que ha
          entrado al directo de /test, por si hay que ocultar o borrar algo.
        </p>
      </div>
      <FichajesPanel />
    </div>
  )
}
