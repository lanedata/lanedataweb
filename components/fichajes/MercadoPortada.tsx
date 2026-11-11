'use client'

// TEMPORAL — Hueco del mercado de fichajes en la portada. La portada es
// estática; este componente lee al cargar dónde quieres el mercado
// (/admin/fichajes → «En la portada») y solo se pinta en el hueco elegido.
// Mientras el ajuste sea «oculto», no aparece nada.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FichajesEnVivo } from './FichajesEnVivo'
import { posicionMercado, type PosicionMercado } from '@/lib/fichajes/estilos'

export function MercadoPortada({ hueco }: { hueco: Exclude<PosicionMercado, 'oculto'> }) {
  const [pos, setPos] = useState<PosicionMercado | null>(null)
  useEffect(() => { posicionMercado().then(setPos) }, [])
  if (pos !== hueco) return null

  return (
    <section className={hueco === 'arriba' ? 'mb-20' : 'mt-20'}>
      <div className="section-label">mercado · en vivo</div>
      <h2 className="section-title mb-3">Mercado de fichajes</h2>
      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-ink/55">
        Quién se mueve, de dónde a dónde y a qué hora se supo. Rumores y confirmados, al momento.
      </p>
      <FichajesEnVivo limite={hueco === 'arriba' ? 15 : 8} />
      <Link href="/mercado/"
        className="mt-6 inline-flex items-center gap-2 border border-ink/[0.14] px-6 py-3 label-mono text-ink/55 transition-colors hover:border-ink hover:bg-ink hover:text-mint">
        Todo el mercado y el tablón de atletas y clubes &rarr;
      </Link>
    </section>
  )
}
