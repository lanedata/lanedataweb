import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { LabTools } from '@/components/LabTools'
import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lanedata.es'

export const metadata: Metadata = {
  title: 'LaneLab · Calculadoras de atletismo',
  description:
    'Herramientas gratuitas de atletismo: conversor de puntos World Athletics (IAAF), calculadora de ritmo y parciales, predictor de marcas (de 60 m a maratón) y calculadora de puntos de decatlón y heptatlón. Tablas oficiales 2025.',
  keywords: [
    'calculadora atletismo',
    'puntos IAAF',
    'puntos World Athletics',
    'calculadora de ritmo running',
    'calculadora de pace',
    'predictor de marcas atletismo',
    'predictor tiempo 5k 10k media maratón',
    'equivalencia marcas atletismo',
    'calculadora decatlón puntos',
    'calculadora heptatlón',
    'tablas de puntuación atletismo 2025',
    'convertir marca a puntos',
    'fórmula de Riegel',
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

const FEATURES = [
  'Conversor de puntos World Athletics (IAAF)',
  'Calculadora de ritmo y parciales',
  'Predictor de marcas (fórmula de Riegel)',
  'Puntos de decatlón y heptatlón',
]

const webAppLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'LaneLab · Calculadoras de atletismo',
  url: `${siteUrl}/lanelab/`,
  applicationCategory: 'SportsApplication',
  operatingSystem: 'Web',
  browserRequirements: 'Requires JavaScript',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  inLanguage: 'es',
  isAccessibleForFree: true,
  featureList: FEATURES,
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
      acceptedAnswer: { '@type': 'Answer', text: 'Usa la fórmula de Peter Riegel (T2 = T1 × (D2/D1)^1.06), el estándar para estimar el tiempo en una distancia a partir de tu marca en otra. Es más fiable entre distancias cercanas y de fondo.' },
    },
    {
      '@type': 'Question',
      name: '¿Cómo calculo mi ritmo de carrera?',
      acceptedAnswer: { '@type': 'Answer', text: 'Introduce la distancia y tu tiempo objetivo (o tu ritmo) y la calculadora devuelve el ritmo por kilómetro y milla, la velocidad en km/h y los parciales acumulados.' },
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

        <header className="mb-9">
          <p className="label-mono text-ink/40 mb-2">lanedata · herramientas</p>
          <h1 className="font-brand text-4xl sm:text-5xl font-extrabold tracking-brand text-ink leading-none">
            LaneLab
          </h1>
          <p className="mt-3 text-sm text-ink/55 max-w-xl leading-relaxed">
            Calculadoras gratuitas para atletas, entrenadores y aficionados: puntos World Athletics,
            ritmo de carrera, predicción de marcas y puntuación de pruebas combinadas. Elige una herramienta.
          </p>
        </header>

        <LabTools />

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
