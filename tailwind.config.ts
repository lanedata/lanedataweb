import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0D2A14',
        mint: '#9FE88D',
        cream: '#F4F1EA',
        paper: '#FBFAF6',
      },
      fontFamily: {
        brand: ['Bricolage Grotesque', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        brand: '-0.04em',
        label: '0.22em',
      },
      maxWidth: {
        reading: '680px',
        wide: '860px',
      },
      typography: {},
    },
  },
  plugins: [],
}

export default config
