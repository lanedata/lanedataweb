import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { LabTools } from '@/components/LabTools'
import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lanedata.es'

export const metadata: Metadata = {
  title: 'LaneLab · Calculadoras de atletismo',
  description:
    'Herramientas gratuitas de atletismo: conversor de puntos World Athletics (IAAF) en aire libre y pista cubierta, calculadora de ritmo y parciales, predictor de marcas y VDOT, puntos de decatlón y heptatlón, corrección de viento, relevos y categorías RFEA. Tablas oficiales 2025.',
  keywords: [
    'calculadora atletismo',
    'puntos IAAF',
    'puntos World Athletics',
    'puntos pista cubierta',
    'tabla puntuación pista cubierta',
    'diferencia puntos aire libre pista cubierta',
    'calculadora de ritmo running',
    'calculadora de pace',
    'equivalencia marcas atletismo',
    'predictor de marcas',
    'calculadora VDOT',
    'ritmos de entrenamiento Daniels',
    'calculadora decatlón puntos',
    'calculadora heptatlón',
    'corrección de viento 100m 200m',
    'corrección viento longitud triple salto',
    'marca corregida viento altitud',
    'calculadora relevos 4x100 4x400',
    'estimar tiempo relevo',
    'categorías RFEA por año de nacimiento',
    'sub 20 sub 23 atletismo',
    'grupos máster atletismo',
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

const FEATURES = [
  'Conversor de puntos World Athletics (IAAF) en aire libre y pista cubierta',
  'Calculadora de ritmo y parciales',
  'Predictor de marcas y ritmos de entrenamiento (Riegel y VDOT)',
  'Puntos de decatlón y heptatlón',
  'Corrección de viento del 100 m (modelo Mureika)',
  'Calculadora de relevos',
  'Categorías RFEA por año de nacimiento y grupos máster',
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
      name: '¿Una misma marca vale los mismos puntos en pista cubierta que al aire libre?',
      acceptedAnswer: { '@type': 'Answer', text: 'No. World Athletics publica dos tablas distintas y la de pista cubierta es más generosa en las pruebas que se corren en cuerda de 200 m: 20.00 en 200 m son 1220 puntos al aire libre y 1290 bajo techo. LaneLab aplica la tabla del entorno que elijas y te muestra la equivalencia entre ambos. Los concursos (saltos y peso) sí comparten tabla.' },
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
    {
      '@type': 'Question',
      name: '¿Cómo se corrige una marca por el viento?',
      acceptedAnswer: { '@type': 'Answer', text: 'LaneLab ajusta la marca a viento nulo en las pruebas donde se mide el viento (100, 200, 110/100 m vallas, longitud y triple). El 100 m usa el modelo físico de Mureika (2001) e incluye la altitud; el resto son estimaciones ancladas al efecto típico del viento. Son aproximaciones, no correcciones oficiales; el límite legal para récords es +2.0 m/s.' },
    },
    {
      '@type': 'Question',
      name: '¿Cómo se predice mi marca en otra distancia?',
      acceptedAnswer: { '@type': 'Answer', text: 'Con dos modelos: la fórmula de Riegel, que escala el tiempo con el exponente 1,06, y el VDOT de Daniels y Gilbert, que estima el VO₂máx equivalente de tu marca y busca qué tiempo daría en otra distancia. Ambos asumen que estás igual de entrenado para todas las distancias, así que la predicción se vuelve optimista cuanto más te alejes de tu marca de referencia.' },
    },
    {
      '@type': 'Question',
      name: '¿En qué categoría de la RFEA compito?',
      acceptedAnswer: { '@type': 'Answer', text: 'La categoría depende del año de nacimiento, no del cumpleaños: eres Sub-X durante toda la temporada si la edad que cumples ese año es menor que X. En 2026, por ejemplo, son Sub-23 los nacidos en 2004, 2005 y 2006. Los grupos máster (M35, M40, M45…) funcionan al revés: se entra en ellos el mismo día que se cumplen los años.' },
    },
  ],
}

export default function LaneLabPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">

        <header className="mb-9">
          <p className="label-mono text-ink/40 mb-2">lanedata · herramientas</p>
          <h1 className="font-brand text-4xl sm:text-5xl font-extrabold tracking-brand text-ink leading-none">
            LaneLab
          </h1>
          <p className="mt-3 text-sm text-ink/55 max-w-xl leading-relaxed">
            Calculadoras gratuitas para atletas, entrenadores y aficionados: puntos World Athletics
            (aire libre y pista cubierta), ritmo de carrera, predictor de marcas, pruebas combinadas
            y categorías RFEA. Elige una herramienta.
          </p>
        </header>

        <LabTools />

        <p className="mt-12 text-xs text-ink/40 leading-relaxed">
          Cálculos basados en las tablas y fórmulas oficiales de World Athletics (edición 2025).
          Herramientas orientativas de uso libre.
        </p>
      </main>
      <Footer />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </>
  )
}
