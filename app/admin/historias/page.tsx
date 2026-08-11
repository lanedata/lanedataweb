import { Historias } from '@/components/admin/historias/Historias'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Historias' }

export default function HistoriasPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="section-label">04 · redes</div>
        <h1 className="section-title text-ink">Historias</h1>
        <p className="mt-4 max-w-xl text-sm text-ink/55 leading-relaxed">
          Historias 1080×1920 del resumen semanal: portada, récords, top 5, mínimas y un destacado
          por atleta. Carga el CSV, encuadra las fotos y exporta los PNG.
        </p>
      </div>
      <Historias />
    </div>
  )
}
