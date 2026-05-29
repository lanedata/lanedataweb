import type { Metadata } from 'next'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lanedata.es'  // custom domain

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'lanedata',
    template: '%s · lanedata',
  },
  description: 'Análisis, estadísticas y contexto del atletismo español.',
  openGraph: {
    siteName: 'lanedata',
    type: 'website',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@lanedata',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
