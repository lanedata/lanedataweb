import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lanedata.es'  // custom domain

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
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-256.png', sizes: '256x256', type: 'image/png' },
    ],
    shortcut: '/favicon-256.png',
    apple: '/favicon-512.png',
  },
}

const GA_ID = 'G-S0941EEQ3L'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
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
