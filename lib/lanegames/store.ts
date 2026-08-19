'use client'

// Guardado local de la partida en curso.
//
// Los juegos son de una tanda por semana: si recargas a mitad del test no
// deberías perder lo respondido. Se guarda en localStorage con una clave por
// juego y semana, así cambiar de semana (o de nivel) no pisa la partida
// anterior. Nada de esto sale del navegador.

import { useEffect, useRef, useState } from 'react'

const PREFIJO = 'lanedata-lanegames'

export function claveJuego(juego: string, ...partes: (string | number)[]): string {
  return [PREFIJO, juego, ...partes].join(':')
}

/**
 * Estado persistido en localStorage. Devuelve `listo` en false hasta haber
 * leído el valor guardado: hasta entonces no se escribe, para no machacar la
 * partida con el estado inicial durante la hidratación.
 */
export function usePersistente<T>(clave: string, inicial: T) {
  const inicialRef = useRef(inicial)
  const [valor, setValor] = useState<T>(inicial)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    setListo(false)
    let siguiente = inicialRef.current
    try {
      const raw = window.localStorage.getItem(clave)
      if (raw) siguiente = JSON.parse(raw) as T
    } catch {
      // localStorage bloqueado o JSON corrupto: se empieza de cero.
    }
    setValor(siguiente)
    setListo(true)
  }, [clave])

  useEffect(() => {
    if (!listo) return
    try {
      window.localStorage.setItem(clave, JSON.stringify(valor))
    } catch {
      // Modo privado o cuota llena: se juega igual, sólo que sin guardar.
    }
  }, [clave, valor, listo])

  function reiniciar() {
    try {
      window.localStorage.removeItem(clave)
    } catch { /* da igual: el estado en memoria ya se resetea */ }
    setValor(inicialRef.current)
  }

  return { valor, setValor, listo, reiniciar }
}
