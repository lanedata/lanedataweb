import { PanelMovil } from '@/components/admin/fichajes/PanelMovil'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mercado · móvil' }

export default function MovilPage() {
  return <PanelMovil />
}
