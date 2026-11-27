// GitHub Pages sirve ficheros estáticos: este middleware nunca corre en producción.
// La sesión vive en el navegador (localStorage), así que aquí no se puede saber
// quién ha entrado: el acceso a /admin se comprueba en app/admin/layout.tsx y,
// de verdad, en la base de datos (supabase/roles-schema.sql). Antes redirigía
// /admin → /login mirando cookies que ya no existen, y en `next dev` eso hacía
// un bucle con el inicio de sesión de Google.

import { NextResponse } from 'next/server'

export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
}
