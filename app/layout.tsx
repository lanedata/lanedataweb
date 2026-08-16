import type { Metadata } from 'next'
import Script from 'next/script'
import { Bricolage_Grotesque, IBM_Plex_Mono } from 'next/font/google'
import { Telemetry } from '@/components/telemetry/Telemetry'
import './globals.css'

// Se auto-alojan en el build: sin petición a Google en runtime y sin el
// @import dentro de globals.css, que el navegador descartaba por ir después
// de las reglas de Tailwind (un @import solo vale al principio de la hoja).
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  axes: ['opsz'],
  variable: '--font-brand',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-mono',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lanedata.es'  // custom domain

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'lanedata · El atletismo español con datos',
    template: '%s · lanedata',
  },
  description:
    'Análisis, estadísticas y herramientas del atletismo español. Datos, contexto y calculadoras (puntos World Athletics, ritmo, estimador de marcas) en lanedata.',
  applicationName: 'lanedata',
  authors: [{ name: 'lanedata', url: siteUrl }],
  creator: 'lanedata',
  publisher: 'lanedata',
  category: 'sports',
  keywords: [
    'atletismo español',
    'atletismo',
    'análisis atletismo',
    'estadísticas atletismo',
    'RFEA',
    'World Athletics',
    'calculadora puntos IAAF',
    'rankings atletismo',
    'lanedata',
  ],
  alternates: {
    canonical: '/',
  },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    siteName: 'lanedata',
    type: 'website',
    locale: 'es_ES',
    url: siteUrl,
    title: 'lanedata · El atletismo español con datos',
    description:
      'Análisis, estadísticas y calculadoras del atletismo español.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'lanedata — el atletismo español con datos' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@lanedata',
    creator: '@lanedata',
    title: 'lanedata · El atletismo español con datos',
    description: 'Análisis, estadísticas y calculadoras del atletismo español.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-256.png', sizes: '256x256', type: 'image/png' },
    ],
    shortcut: '/favicon-256.png',
    apple: '/favicon-512.png',
  },
}

const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'lanedata',
  url: siteUrl,
  logo: `${siteUrl}/favicon-512.png`,
  description: 'Medio editorial sobre el atletismo español con datos, análisis y herramientas.',
  sameAs: ['https://www.instagram.com/lanedata/'],
}

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'lanedata',
  url: siteUrl,
  inLanguage: 'es',
  description: 'El atletismo español con datos.',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/buscar?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
}

const GA_ID = 'G-S0941EEQ3L'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${bricolage.variable} ${plexMono.variable}`}>
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }} />

        {/* Medición propia y registro de errores: primera parte, sin cookies. */}
        <Telemetry />

        {/* GA se carga siempre, como hasta ahora. Cuando entren los textos
            legales pasará a depender del consentimiento del banner. */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </body>
    </html>
  )
}
