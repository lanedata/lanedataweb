// Suscripción a los avisos push del panel móvil (ver supabase/functions/fichajes-push).

import { createClient } from '@/lib/supabase/client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
export const FUNCION_URL = `${SUPABASE_URL}/functions/v1/fichajes-push`

export type EstadoPush = 'no-soportado' | 'instalar' | 'denegado' | 'apagado' | 'activo'

function esIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}
function instalada() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
}

export async function registrarSW() {
  if (!('serviceWorker' in navigator)) return null
  return navigator.serviceWorker.register('/sw-admin.js', { scope: '/admin/' })
}

export async function estadoPush(): Promise<EstadoPush> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return esIOS() && !instalada() ? 'instalar' : 'no-soportado'
  }
  if (Notification.permission === 'denied') return 'denegado'
  const reg = await registrarSW()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'activo' : 'apagado'
}

function claveBytes(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function activarPush(etiqueta: string): Promise<void> {
  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') throw new Error('Sin permiso para notificaciones.')
  const reg = await registrarSW()
  if (!reg) throw new Error('Este navegador no admite avisos.')
  await navigator.serviceWorker.ready

  const r = await fetch(FUNCION_URL).catch(() => null)
  const { publicKey } = r?.ok ? await r.json() : { publicKey: null }
  if (!publicKey) throw new Error('La función de avisos no está desplegada todavía (ver supabase/functions/fichajes-push/README.md).')

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: claveBytes(publicKey) as BufferSource,
  })
  const j = sub.toJSON()
  const sb = createClient()
  const { error } = await sb.from('push_suscripciones').upsert({
    endpoint: j.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth, etiqueta,
  })
  if (error) throw new Error(error.message)
  // Conecta el trigger con la función (idempotente).
  const { error: e2 } = await sb.rpc('avisos_configurar', { p_url: FUNCION_URL })
  if (e2) throw new Error(e2.message)
}

export async function desactivarPush() {
  const reg = await registrarSW()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await createClient().from('push_suscripciones').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

export async function probarPush() {
  // Aviso local, para comprobar que el móvil los enseña.
  const reg = await registrarSW()
  await reg?.showNotification('lanedata · prueba', { body: 'Así te llegarán los avisos del mercado.', icon: '/favicon-256.png' })
}
