import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/legal/LegalPage'
import { CookiePrefsButton } from '@/components/legal/CookiePrefsButton'
import { COOKIES, LEGAL } from '@/lib/legal'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lanedata.es'

export const metadata: Metadata = {
  title: 'Política de cookies',
  description:
    'Qué guarda lanedata en tu navegador, con qué finalidad y durante cuánto tiempo, y cómo cambiar o retirar tu consentimiento en cualquier momento.',
  alternates: { canonical: `${siteUrl}/legal/cookies/` },
  robots: { index: true, follow: true },
}

export default function CookiesPage() {
  return (
    <LegalPage
      titulo="Política de cookies"
      entradilla="lanedata usa lo mínimo imprescindible: almacenamiento técnico para que la web funcione y una medición propia anónima. Todo lo demás depende de que tú lo aceptes."
      activo="/legal/cookies/"
    >
      <h2>1. Qué son las cookies</h2>
      <p>
        Una cookie es un pequeño fichero que un sitio web guarda en tu navegador para recordar
        información entre visitas. La normativa española (art. 22.2 de la LSSI-CE) aplica el
        mismo régimen a cualquier otra forma de almacenamiento en el dispositivo, como el{' '}
        <em>localStorage</em> o el <em>sessionStorage</em>, que es lo que utiliza
        principalmente esta web.
      </p>

      <h2>2. Qué usa lanedata</h2>
      <p>Esta es la lista completa y actualizada:</p>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Titular</th>
            <th>Finalidad</th>
            <th>Duración</th>
          </tr>
        </thead>
        <tbody>
          {COOKIES.map((c) => (
            <tr key={c.nombre}>
              <td>
                <code>{c.nombre}</code>
              </td>
              <td>{c.tipo}</td>
              <td>{c.titularidad}</td>
              <td>{c.finalidad}</td>
              <td>{c.duracion}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>3. Por categorías</h2>

      <h3>3.1. Técnicas o necesarias</h3>
      <p>
        Son imprescindibles para que la web funcione y están exentas de consentimiento. Aquí
        entran la que recuerda tu respuesta a este mismo aviso (para no repetírtelo en cada
        página) y la que mantiene abierta la sesión del panel de administración, que solo se
        crea si eres parte de la redacción.
      </p>

      <h3>3.2. Medición de audiencia propia</h3>
      <p>
        {LEGAL.marca} mide su audiencia con un sistema propio que no comparte datos con nadie.
        Guarda en la pestaña un número aleatorio (<code>ld_sid</code>) que permite contar una
        visita de varias páginas como una sola, y que desaparece al cerrar la pestaña. No hay
        cookie, no hay dirección IP y no hay seguimiento entre sitios.
      </p>
      <p>
        Por ese diseño, esta medición se acoge a la excepción de medición de audiencia que
        recoge la Guía sobre el uso de cookies de la Agencia Española de Protección de Datos y
        funciona sin consentimiento previo. Aun así, puedes desactivarla desde el panel de
        preferencias.
      </p>

      <h3>3.3. Analítica de terceros</h3>
      <p>
        Google Analytics 4 (Google Ireland Ltd.) elabora estadísticas de uso mediante cookies
        propias del dominio. <strong>No se carga mientras no lo aceptes</strong>: el script ni
        siquiera se descarga. Si retiras el consentimiento, se desactiva de inmediato y sus
        cookies se eliminan. Puedes consultar la{' '}
        <a
          href="https://policies.google.com/technologies/cookies"
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          información de Google sobre cookies
        </a>{' '}
        y su{' '}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          política de privacidad
        </a>
        .
      </p>
      <p>
        No se usan cookies publicitarias, ni de personalización de anuncios, ni de redes
        sociales, ni píxeles de seguimiento de terceros.
      </p>

      <h2>4. Cómo cambiar tu decisión</h2>
      <p>
        Puedes aceptar, rechazar o ajustar categoría por categoría cuando quieras, sin que ello
        afecte al funcionamiento de la web. Rechazar es tan fácil como aceptar y no tiene
        ninguna consecuencia para ti.
      </p>
      <p>
        <CookiePrefsButton />
      </p>
      <p>
        Tu respuesta se recuerda durante 24 meses. Pasado ese plazo se te vuelve a preguntar,
        tal y como recomienda la Agencia Española de Protección de Datos.
      </p>

      <h2>5. Cómo gestionarlas desde el navegador</h2>
      <p>
        Con independencia de este panel, puedes bloquear o borrar el almacenamiento de
        cualquier sitio desde la configuración de tu navegador:
      </p>
      <ul>
        <li>
          <a
            href="https://support.google.com/chrome/answer/95647"
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            Google Chrome
          </a>
        </li>
        <li>
          <a
            href="https://support.mozilla.org/es/kb/Borrar%20cookies"
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            Mozilla Firefox
          </a>
        </li>
        <li>
          <a
            href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            Safari
          </a>
        </li>
        <li>
          <a
            href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            Microsoft Edge
          </a>
        </li>
      </ul>
      <p>
        Bloquear todo el almacenamiento no impide leer {LEGAL.marca}, pero hará que el aviso de
        cookies vuelva a aparecer en cada visita, porque no habrá dónde recordar tu respuesta.
      </p>

      <h2>6. Más información</h2>
      <p>
        El detalle de los tratamientos, los plazos de conservación y tus derechos está en la{' '}
        <Link href="/legal/privacidad/">política de privacidad</Link>. Para cualquier duda,
        escribe a <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>
    </LegalPage>
  )
}
