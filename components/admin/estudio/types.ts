// Modelo de datos del Estudio IG — un carrusel es una lista de Slides.

export type SlideTheme = 'ink' | 'paper' | 'mint'

export type SlideType = 'portada' | 'dato' | 'lista' | 'texto' | 'cita' | 'cierre'

export interface ListaItem {
  pos: string
  nombre: string
  valor: string
}

export interface Slide {
  id: string
  type: SlideType
  theme: SlideTheme
  kicker: string
  title: string
  subtitle: string
  stat: string
  statLabel: string
  body: string
  quote: string
  author: string
  items: ListaItem[]
  imageUrl: string
  titleSize: 'S' | 'M' | 'L'
}

export const SLIDE_TYPE_LABELS: Record<SlideType, string> = {
  portada: 'Portada',
  dato: 'Dato',
  lista: 'Ranking',
  texto: 'Texto',
  cita: 'Cita',
  cierre: 'Cierre',
}

let counter = 0
function uid() {
  counter += 1
  return `s${Date.now().toString(36)}${counter}`
}

export function newSlide(type: SlideType): Slide {
  const base: Slide = {
    id: uid(),
    type,
    theme: type === 'portada' || type === 'cierre' ? 'ink' : 'paper',
    kicker: '',
    title: '',
    subtitle: '',
    stat: '',
    statLabel: '',
    body: '',
    quote: '',
    author: '',
    items: [],
    imageUrl: '',
    titleSize: 'M',
  }
  switch (type) {
    case 'portada':
      return { ...base, kicker: 'Análisis', title: 'Titular del carrusel', subtitle: '' }
    case 'dato':
      return { ...base, stat: '00.00', statLabel: 'Qué mide este dato', body: '' }
    case 'lista':
      return {
        ...base,
        title: 'Top marcas',
        items: [
          { pos: '1', nombre: 'Atleta', valor: '00.00' },
          { pos: '2', nombre: 'Atleta', valor: '00.00' },
          { pos: '3', nombre: 'Atleta', valor: '00.00' },
        ],
      }
    case 'texto':
      return { ...base, title: 'Subtítulo', body: 'Texto de contexto del análisis.' }
    case 'cita':
      return { ...base, theme: 'mint', quote: 'La frase que resume la historia.', author: 'lanedata' }
    case 'cierre':
      return {
        ...base,
        title: 'El análisis completo, en la web',
        subtitle: 'lanedata.es',
        body: 'Enlace en bio',
      }
  }
}
