import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { IaafCalculator } from '@/components/IaafCalculator'
import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lanedata.es'

export const metadata: Metadata = {
  title: 'LaneLab · Herramientas para atletas',
  description:
    'Calculadora de puntos World Athletics (IAAF): convierte cualquier marca de atletismo a puntos y viceversa. Tablas de puntuación 2025 para pista, ruta y concursos, hombres y mujeres. Herramientas gratuitas de lanedata.',
  keywords: [
    'puntos IAAF',
    'puntos World Athletics',
    'calculadora puntos atletismo',
    'tablas de puntuación atletismo',
    'conversor marca a puntos',
    'World Athletics scoring tables',
    'puntuación atletismo 2025',
    'lanedata',
  ],
  alternates: { canonical: `${siteUrl}/lanelab/` },
  openGraph: {
    title: 'LaneLab · Herramientas para atletas',
    description:
      'Convierte cualquier marca de atletismo a puntos World Athletics (IAAF) y al revés. Tablas oficiales 2025.',
    url: `${siteUrl}/lanelab/`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LaneLab · Herramientas para atletas',
    description:
      'Calculadora de puntos World Athletics (IAAF) para todas las pruebas de atletismo.',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'LaneLab · Conversor de puntos World Athletics (IAAF)',
  url: `${siteUrl}/lanelab/`,
  applicationCategory: 'SportsApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  inLanguage: 'es',
  description:
    'Calculadora gratuita que convierte marcas de atletismo a puntos World Athletics (IAAF) y viceversa, usando las tablas de puntuación oficiales 2025.',
  publisher: {
    '@type': 'Organization',
    name: 'lanedata',
    url: siteUrl,
  },
}

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Qué son los puntos World Athletics (IAAF)?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Son un sistema oficial que asigna una puntuación a cada marca de atletismo, permitiendo comparar resultados de pruebas distintas (por ejemplo, un 100 m con un salto de longitud) en una misma escala.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Cómo se calculan los puntos de una marca?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'World Athletics publica unas tablas de puntuación con una fórmula cuadrática por prueba y sexo. LaneLab usa los coeficientes de la edición 2025 para convertir tu marca en puntos al instante.',
      },
    },
  ],
}

export default function LaneLabPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16">

        {/* Header */}
        <section className="mb-10">
          <p className="label-mono text-ink/40 mb-2">lanedata · herramientas</p>
          <h1 className="font-brand text-4xl sm:text-5xl font-extrabold tracking-brand text-ink leading-none">
            LaneLab
          </h1>
          <p className="mt-3 text-sm text-ink/55 max-w-xl leading-relaxed">
            Herramientas prácticas para atletas, entrenadores y aficionados al atletismo.
            Empezamos con el conversor de puntos World Athletics.
          </p>
          <div className="mt-8 h-px bg-ink/[0.1]" />
        </section>

        {/* Tool: IAAF points converter */}
        <section aria-labelledby="conversor-puntos">
          <div className="flex items-center gap-3 mb-4">
            <h2 id="conversor-puntos" className="font-brand text-xl font-extrabold tracking-brand text-ink">
              Conversor de puntos IAAF
            </h2>
            <span className="inline-flex items-center rounded-full bg-mint/20 px-2.5 py-0.5 font-mono text-[0.58rem] tracking-widest uppercase text-ink/55">
              Tablas 2025
            </span>
          </div>

          <IaafCalculator />

          <p className="mt-4 text-xs text-ink/40 leading-relaxed">
            Cálculo basado en las tablas de puntuación oficiales de World Athletics (edición 2025).
            Los valores son una referencia muy aproximada a la tabla oficial y pueden variar en ±1 punto por redondeo.
          </p>
        </section>

        {/* Coming soon */}
        <section className="mt-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-ink/[0.08]" />
            <span className="label-mono text-ink/30">Próximamente</span>
            <div className="h-px flex-1 bg-ink/[0.08]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {['Calculadora de ritmos', 'Predictor de marcas', 'Conversor de vallas'].map(t => (
              <div key={t} className="rounded-xl border border-dashed border-ink/[0.12] bg-cream/30 px-4 py-5 text-center">
                <p className="font-mono text-[0.7rem] tracking-wider text-ink/35 uppercase">{t}</p>
              </div>
            ))}
          </div>
        </section>

      </main>
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
    </>
  )
}
