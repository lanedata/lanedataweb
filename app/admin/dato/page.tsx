import { DatoStudio } from '@/components/admin/dato/DatoStudio'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dato de la semana' }

export default function DatoPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="section-label">05 · redes</div>
        <h1 className="section-title text-ink">El dato de la semana</h1>
        <p className="mt-4 max-w-xl text-sm text-ink/55 leading-relaxed">
          Carga el CSV semanal (o el del sitio), elige la semana, sube la foto, ajusta la variante
          y el encuadre, retoca los textos y exporta la story 1080×1920 con la estética de lanedata.
        </p>
      </div>
      <DatoStudio />
    </div>
  )
}
