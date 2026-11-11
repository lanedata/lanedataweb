// Service worker del panel móvil (/admin/). Solo recibe avisos push y abre el
// panel al tocarlos. No cachea nada: el panel siempre va en directo.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch { d = { titulo: 'lanedata', cuerpo: event.data && event.data.text() } }
  event.waitUntil(
    self.registration.showNotification(d.titulo || 'lanedata · mercado', {
      body: d.cuerpo || '',
      icon: '/favicon-256.png',
      badge: '/favicon-256.png',
      tag: d.tag || undefined,
      renotify: !!d.tag,
      data: { url: d.url || '/admin/movil/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/admin/movil/'
  event.waitUntil((async () => {
    const abiertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of abiertas) {
      if (c.url.includes('/admin/')) { await c.focus(); c.navigate(url); return }
    }
    await self.clients.openWindow(url)
  })())
})
