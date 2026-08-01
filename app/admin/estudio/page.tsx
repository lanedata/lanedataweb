import { EstudioIG } from '@/components/admin/estudio/EstudioIG'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Estudio IG' }

export default function EstudioPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-brand text-2xl font-bold tracking-tight text-ink">Estudio IG</h1>
        <p className="mt-1 label-mono text-ink/40">
          Carruseles 1080×1350 con la identidad de lanedata · exporta PNGs y caption
        </p>
      </div>
      <EstudioIG />
    </div>
  )
}
