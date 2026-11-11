'use client'

// TEMPORAL — Huecos del mercado en la portada. La portada es estática; este
// componente lee al cargar dónde quieres cada bloque (/admin/fichajes → «En la
// portada»): los últimos fichajes y el tablón se colocan por separado. Mientras
// un bloque esté «oculto», no aparece.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FichajesEnVivo } from './FichajesEnVivo'
import { Tablon } from './Tablon'
import { posicionMercado, type BloqueMercado, type PosicionMercado } from '@/lib/fichajes/estilos'

const enlaceCls =
  'mt-6 inline-flex items-center gap-2 border border-ink/[0.14] px-6 py-3 label-mono text-ink/55 transition-colors hover:border-ink hover:bg-ink hover:text-mint'

export function MercadoPortada({ hueco, bloque = 'fichajes' }: {
  hueco: Exclude<PosicionMercado, 'oculto'>
  bloque?: BloqueMercado
}) {
  const [pos, setPos] = useState<PosicionMercado | null>(null)
  useEffect(() => { posicionMercado(bloque).then(setPos) }, [bloque])
  if (pos !== hueco) return null

  if (bloque === 'tablon') {
    return (
      <section className={hueco === 'arriba' ? 'mb-20' : 'mt-20'}>
        <div className="section-label">mercado · tablón</div>
        <h2 className="section-title mb-3">Atletas que buscan club, clubes que buscan atletas</h2>
        <p className="mb-8 max-w-2xl text-sm leading-relaxed text-ink/55">
          Anúnciate y te encontrarán. Revisamos cada anuncio antes de publicarlo y nunca enseñamos tu contacto.
        </p>
        <Tablon />
      </section>
    )
  }

  return (
    <section className={hueco === 'arriba' ? 'mb-20' : 'mt-20'}>
      <div className="section-label">mercado · en vivo</div>
      <h2 className="section-title mb-3">Mercado de fichajes</h2>
      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-ink/55">
        Quién se mueve, de dónde a dónde y a qué hora se supo. Rumores y confirmados, al momento.
      </p>
      <FichajesEnVivo limite={hueco === 'arriba' ? 15 : 8} />
      <Link href="/mercado/" className={enlaceCls}>
        Todo el mercado y el tablón de atletas y clubes &rarr;
      </Link>
    </section>
  )
}
