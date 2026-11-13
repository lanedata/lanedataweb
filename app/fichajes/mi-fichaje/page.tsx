'use client'

// La página «mi fichaje» se fundió con la del chivatazo. Este enlace puede
// seguir en bios e historias antiguas: lleva a la nueva, abierta en «Es el mío».

import { useEffect } from 'react'

export default function MiFichajePage() {
  useEffect(() => { window.location.replace('/fichajes/chivatazo/#mio') }, [])
  return <main className="min-h-dvh bg-cream/30" />
}
