import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { IaafCalculator } from '@/components/IaafCalculator'
import { PaceCalculator } from '@/components/PaceCalculator'
import { RacePredictor } from '@/components/RacePredictor'
import { CombinedEventsCalculator } from '@/components/CombinedEventsCalculator'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lanedata.es'

export const metadata: Metadata = {
  title: 'LaneLab · Calculadoras de atletismo',
  description:
    'Herramientas gratuitas de atletismo: conversor de puntos World Athletics (IAAF), calculadora de ritmo y parciales, predictor de marcas y calculadora de puntos de decatlón y heptatlón. Tablas oficiales 2025.',
  keywords: [
    'calculadora atletismo',
    'puntos IAAF',
    'puntos World Athletics',
    'calculadora de ritmo running',
    'calculadora de pace',
    'predictor de marcas atletismo',
    'calculadora decatlón puntos',
    'calculadora heptatlón',
    'tablas de puntuación atletismo 2025',
    'convertir marca a puntos',
    'herramientas para corredores',
    'lanedata',
  ],
  alternates: { canonical: `${siteUrl}/lanelab/` },
  openGraph: {
    title: 'LaneLab · Calculadoras de atletismo',
    description:
      'Conversor de puntos IAAF, calculadora de ritmo, predictor de marcas y puntos de pruebas combinadas. Gratis.',
    url: `${siteUrl}/lanelab/`,
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LaneLab · Calculadoras de atletismo',
    description: 'Conversor de puntos IAAF, ritmo, predictor de marcas y combinadas. Gratis.',
    images: ['/og-image.png'],
  },
}

const TOOLS = [
  { id: 'puntos-iaaf', n: 'Conversor de puntos IAAF', d: 'Marca ⇄ puntos World Athletics' },
  { id: 'ritmo', n: 'Calculadora de ritmo', d: 'Pace, velocidad y parciales' },
  { id: 'predictor', n: 'Predictor de marcas', d: 'Estima tu tiempo en otra distancia' },
  { id: 'combinadas', n: 'Puntos de combinadas', d: 'Decatlón y heptatlón' },
]

const webAppLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'LaneLab · Calculadoras de atletismo',
  url: `${siteUrl}/lanelab/`,
  applicationCategory: 'SportsApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  inLanguage: 'es',
  featureList: TOOLS.map(t => t.n),
  description:
    'Suite gratuita de calculadoras de atletismo: puntos World Athletics (IAAF), ritmo de carrera, predictor de marcas y puntuación de pruebas combinadas.',
  publisher: { '@type': 'Organization', name: 'lanedata', url: siteUrl },
}

const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${siteUrl}/` },
    { '@type': 'ListItem', position: 2, name: 'LaneLab', item: `${siteUrl}/lanelab/` },
  ],
}

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Qué son los puntos World Athletics (IAAF)?',
      acceptedAnswer: { '@type': 'Answer', text: 'Un sistema oficial que asigna una puntuación a cada marca de atletismo para comparar resultados de pruebas distintas en una misma escala.' },
    },
    {
      '@type': 'Question',
      name: '¿Cómo predice mi marca la calculadora?',
      acceptedAnswer: { '@type': 'Answer', text: 'Usa la fórmula de Peter Riegel (T2 = T1 × (D2/D1)^1.06), el estándar para estimar el tiempo en una distancia a partir de tu marca en otra.' },
    },
    {
      '@type': 'Question',
      name: '¿Cómo se puntúan el decatlón y el heptatlón?',
      acceptedAnswer: { '@type': 'Answer', text: 'Con las fórmulas oficiales de pruebas combinadas de World Athletics, que asignan puntos a cada prueba mediante constantes específicas. LaneLab suma automáticamente el total.' },
    },
  ],
}

export default function LaneLabPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16">

        {/* Header */}
        <header className="mb-8">
          <p className="label-mono text-ink/40 mb-2">lanedata · herramientas</p>
          <h1 className="font-brand text-4xl sm:text-5xl font-extrabold tracking-brand text-ink leading-none">
            LaneLab
          </h1>
          <p className="mt-3 text-sm text-ink/55 max-w-xl leading-relaxed">
            Calculadoras gratuitas para atletas, entrenadores y aficionados: puntos World Athletics,
            ritmo de carrera, predicción de marcas y puntuación de pruebas combinadas.
          </p>
        </header>

        {/* Tool index */}
        <nav aria-label="Herramientas" className="mb-12 grid gap-2 sm:grid-cols-2">
          {TOOLS.map((t, i) => (
            <a key={t.id} href={`#${t.id}`}
              className="group flex items-center gap-3 rounded-xl border border-ink/[0.1] bg-paper px-4 py-3 hover:border-ink/25 hover:bg-cream/40 transition-colors">
              <span className="font-mono text-[0.7rem] text-mint tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink leading-tight">{t.n}</p>
                <p className="font-mono text-[0.58rem] tracking-wider text-ink/35 uppercase mt-0.5 truncate">{t.d}</p>
              </div>
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true"
                className="ml-auto shrink-0 text-ink/25 group-hover:text-ink/50 transition-colors">
                <path d="M1 5h12M9 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-14">
          <Tool id="puntos-iaaf" title="Conversor de puntos IAAF" badge="Tablas 2025"
            desc="Convierte cualquier marca a puntos World Athletics y al revés, con marcas equivalentes en pruebas de la misma familia.">
            <IaafCalculator />
          </Tool>

          <Tool id="ritmo" title="Calculadora de ritmo"
            desc="Calcula tu ritmo por kilómetro y milla, la velocidad y los parciales acumulados a partir de tu tiempo objetivo (o al revés).">
            <PaceCalculator />
          </Tool>

          <Tool id="predictor" title="Predictor de marcas" badge="Fórmula de Riegel"
            desc="Estima tu tiempo en otra distancia a partir de una marca reciente, con la fórmula estándar de Peter Riegel.">
            <RacePredictor />
          </Tool>

          <Tool id="combinadas" title="Puntos de pruebas combinadas"
            desc="Suma la puntuación del decatlón (hombres) y el heptatlón (mujeres) con las fórmulas oficiales de World Athletics.">
            <CombinedEventsCalculator />
          </Tool>
        </div>

        <p className="mt-12 text-xs text-ink/40 leading-relaxed">
          Cálculos basados en las tablas y fórmulas oficiales de World Athletics (edición 2025) y en la
          fórmula de Riegel para la predicción de marcas. Herramientas orientativas de uso libre.
        </p>
      </main>
      <Footer />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </>
  )
}

function Tool({ id, title, badge, desc, children }: {
  id: string; title: string; badge?: string; desc: string; children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-2">
        <h2 id={`${id}-h`} className="font-brand text-xl font-extrabold tracking-brand text-ink">{title}</h2>
        {badge && (
          <span className="inline-flex items-center rounded-full bg-mint/20 px-2.5 py-0.5 font-mono text-[0.56rem] tracking-widest uppercase text-ink/55">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm text-ink/50 mb-4 max-w-2xl leading-relaxed">{desc}</p>
      {children}
    </section>
  )
}
