'use client'

// Caja «Sube una captura y lo relleno yo». Admite elegir archivo, arrastrar o
// pegar (Ctrl+V / mantener pulsado → pegar en el móvil). Ver lib/fichajes/lector.ts.

import { useCallback, useEffect, useRef, useState } from 'react'
import { interpretar, leerTexto, type Lectura } from '@/lib/fichajes/lector'

export function LectorCaptura({ onLectura }: { onLectura: (l: Lectura) => void }) {
  const [fase, setFase] = useState<'libre' | 'leyendo' | 'hecho' | 'error'>('libre')
  const [progreso, setProgreso] = useState(0)
  const [vista, setVista] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [resumen, setResumen] = useState<string>('')
  const input = useRef<HTMLInputElement>(null)

  const procesar = useCallback(async (file: Blob) => {
    if (!file.type.startsWith('image/')) return
    setFase('leyendo'); setProgreso(0)
    setVista((v) => { if (v) URL.revokeObjectURL(v); return URL.createObjectURL(file) })
    try {
      const bruto = await leerTexto(file, setProgreso)
      const l = await interpretar(bruto)
      setTexto(l.texto)
      const partes = [
        l.atletas[0] ? `atleta: ${l.atletas[0].nombre}` : 'no he reconocido al atleta',
        l.origen && `de ${l.origen}`, l.destino && `a ${l.destino}`, l.estado,
      ].filter(Boolean)
      setResumen(partes.join(' · '))
      onLectura(l)
      setFase('hecho')
    } catch {
      setFase('error')
    }
  }, [onLectura])

  // Pegar una imagen en cualquier parte de la página.
  useEffect(() => {
    const alPegar = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'))
      const f = item?.getAsFile()
      if (f) { e.preventDefault(); procesar(f) }
    }
    window.addEventListener('paste', alPegar)
    return () => window.removeEventListener('paste', alPegar)
  }, [procesar])

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) procesar(f) }}
      className="mb-8 border-2 border-dashed border-ink/25 bg-mint/10 p-5"
    >
      <div className="flex flex-wrap items-center gap-4">
        {vista && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vista} alt="Captura subida" className="h-20 w-20 shrink-0 border border-ink/15 object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-brand text-base font-extrabold tracking-tight text-ink">📸 ¿Tienes una captura? Súbela y lo relleno yo</p>
          <p className="mt-0.5 text-[0.8rem] text-ink/55">
            De Instagram, X, una web o un WhatsApp. Leo la imagen, busco al atleta y los clubes y te dejo el formulario hecho para revisar.
            También puedes pegarla (Ctrl+V).
          </p>
        </div>
        <button type="button" onClick={() => input.current?.click()} disabled={fase === 'leyendo'}
          className="bg-ink px-4 py-2.5 label-mono text-mint transition-colors hover:bg-mint hover:text-ink disabled:opacity-40">
          {fase === 'leyendo' ? 'leyendo…' : vista ? 'otra captura' : 'subir captura'}
        </button>
        <input ref={input} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) procesar(f); e.target.value = '' }} />
      </div>

      {fase === 'leyendo' && (
        <div className="mt-4">
          <div className="h-1.5 w-full bg-ink/10"><div className="h-full bg-ink transition-all" style={{ width: `${Math.round(progreso * 100)}%` }} /></div>
          <p className="mt-1.5 label-mono text-[0.58rem] text-ink/50">
            {progreso === 0 ? 'Preparando el lector (la primera vez tarda unos segundos)…' : `Leyendo la imagen · ${Math.round(progreso * 100)}%`}
          </p>
        </div>
      )}
      {fase === 'hecho' && (
        <p className="mt-4 border-l-2 border-mint bg-paper px-3 py-2 text-[0.82rem] text-ink/75">
          ✓ {resumen}. <strong className="font-semibold">Revisa los campos antes de publicar.</strong>
        </p>
      )}
      {fase === 'error' && (
        <p className="mt-4 border-l-2 border-red-300 bg-red-50 px-3 py-2 text-[0.82rem] text-red-700">
          No he podido leer la imagen. Rellénalo a mano o prueba con otra captura más nítida.
        </p>
      )}
      {texto && fase !== 'leyendo' && (
        <details className="mt-3">
          <summary className="cursor-pointer label-mono text-[0.58rem] text-ink/40">texto leído</summary>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap bg-paper p-2 text-[0.72rem] text-ink/60">{texto}</pre>
        </details>
      )}
    </div>
  )
}
