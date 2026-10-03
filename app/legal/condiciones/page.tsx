import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/legal/LegalPage'
import { LEGAL } from '@/lib/legal'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lanedata.es'

export const metadata: Metadata = {
  title: 'Condiciones de uso',
  description:
    'Reglas de uso de lanedata: qué puedes hacer con los artículos y las calculadoras de LaneLab, y qué límites de responsabilidad se aplican.',
  alternates: { canonical: `${siteUrl}/legal/condiciones/` },
  robots: { index: true, follow: true },
}

export default function CondicionesPage() {
  return (
    <LegalPage
      titulo="Condiciones de uso"
      entradilla="Las reglas del juego: qué se puede hacer con lo que se publica en lanedata, cómo hay que interpretar los resultados de LaneLab y hasta dónde llega la responsabilidad de cada parte."
      activo="/legal/condiciones/"
    >
      <h2>1. Aceptación</h2>
      <p>
        Estas condiciones regulan el acceso y el uso de {LEGAL.dominio}, titularidad de{' '}
        {LEGAL.titular}. Navegar por el sitio implica aceptarlas en su totalidad, junto con el{' '}
        <Link href="/legal/aviso-legal/">aviso legal</Link>, la{' '}
        <Link href="/legal/privacidad/">política de privacidad</Link> y la{' '}
        <Link href="/legal/cookies/">política de cookies</Link>. Si no estás de acuerdo con
        alguna de ellas, no utilices el sitio.
      </p>

      <h2>2. Qué se ofrece</h2>
      <p>
        {LEGAL.marca} es un medio editorial gratuito sobre atletismo español. Ofrece artículos
        de análisis, un archivo de contenidos, un calendario de competiciones y LaneLab, un
        conjunto de calculadoras deportivas. Todo el contenido se presta de forma gratuita y
        sin necesidad de registro.
      </p>
      <p>
        El servicio se ofrece <em>tal cual</em> y en función de su disponibilidad. {LEGAL.marca}{' '}
        puede modificar, suspender o retirar cualquier sección o funcionalidad en cualquier
        momento, sin que ello genere derecho a indemnización.
      </p>

      <h2>3. Uso permitido</h2>
      <p>Como usuario te comprometes a:</p>
      <ul>
        <li>usar el sitio conforme a la ley, la buena fe y estas condiciones;</li>
        <li>no interferir en su funcionamiento normal ni sobrecargar la infraestructura;</li>
        <li>
          no extraer el contenido de forma masiva y automatizada (<em>scraping</em>,{' '}
          <em>crawling</em> intensivo o replicación de la base de datos) sin autorización
          previa;
        </li>
        <li>no intentar acceder a áreas restringidas ni a las credenciales de terceros;</li>
        <li>no introducir código malicioso ni realizar acciones que comprometan la seguridad.</li>
      </ul>
      <p>
        El incumplimiento de estas reglas faculta a {LEGAL.marca} para restringir el acceso, sin
        perjuicio de las acciones legales que correspondan.
      </p>

      <h2>4. Contenido y citas</h2>
      <p>
        Los artículos, gráficos y análisis publicados están protegidos por la Ley de Propiedad
        Intelectual. Se permite citarlos parcialmente con fines informativos, docentes o de
        investigación indicando la fuente («{LEGAL.marca}») y enlazando a la dirección original.
      </p>
      <p>No está permitido, sin autorización previa y por escrito:</p>
      <ul>
        <li>reproducir artículos completos en otro medio, web o boletín;</li>
        <li>explotar comercialmente el contenido o los datos;</li>
        <li>modificar los textos o los gráficos alterando su sentido o su autoría;</li>
        <li>emplear el contenido para entrenar sistemas de inteligencia artificial.</li>
      </ul>
      <p>
        Los resultados, marcas y calendarios citados proceden de fuentes oficiales (RFEA,
        federaciones autonómicas, World Athletics) y pertenecen a sus titulares.
      </p>

      <h2>5. Uso de las calculadoras de LaneLab</h2>
      <p>
        Las herramientas de LaneLab aplican las tablas oficiales de puntuación de World
        Athletics (edición 2025) y modelos publicados y reconocidos en la literatura del
        atletismo, como la fórmula de Riegel, el VDOT de Daniels y Gilbert o el modelo de
        corrección de viento de Mureika.
      </p>
      <p>
        <strong>Sus resultados son orientativos y no tienen ningún valor oficial.</strong>{' '}
        Sirven para entrenar, comparar y entender, no para acreditar nada ante un organismo
        deportivo. Las puntuaciones, mínimas, homologaciones y categorías que reconozca la
        RFEA, World Athletics o la federación correspondiente prevalecen siempre sobre lo que
        muestre esta web.
      </p>
      <p>
        Los ritmos y cargas de entrenamiento que puedan derivarse de estas herramientas no
        constituyen asesoramiento médico ni deportivo personalizado. Antes de seguir cualquier
        plan de entrenamiento, consulta con un profesional cualificado. {LEGAL.marca} no
        responde de las lesiones o perjuicios derivados de decisiones tomadas exclusivamente a
        partir de estos cálculos.
      </p>

      <h2>6. Exactitud de la información</h2>
      <p>
        El contenido se elabora contrastando fuentes oficiales, pero puede contener errores,
        omisiones o quedar desactualizado, especialmente en calendarios y resultados en curso.
        {' '}{LEGAL.marca} corrige los errores en cuanto los detecta o se le comunican, pero no
        garantiza la exactitud, integridad ni vigencia permanente de la información.
      </p>
      <p>
        Si detectas un error, avísanos en{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>: se agradece.
      </p>

      <h2>7. Límite de responsabilidad</h2>
      <p>
        {LEGAL.marca} no responde de los daños derivados de la falta de disponibilidad del
        servicio, de interrupciones, fallos de la red o del alojamiento, ni de la presencia de
        virus u otros elementos lesivos introducidos por terceros. Tampoco responde del uso que
        cada persona haga de la información publicada.
      </p>
      <p>
        Nada de lo anterior limita la responsabilidad en los casos en que la ley no lo permita,
        en particular frente a consumidores por dolo o culpa grave.
      </p>

      <h2>8. Enlaces</h2>
      <p>
        El sitio enlaza a webs de terceros sobre las que {LEGAL.marca} no tiene control. El
        acceso a esos sitios se realiza bajo la responsabilidad del usuario y con sujeción a
        sus propias condiciones y políticas.
      </p>

      <h2>9. Modificación de las condiciones</h2>
      <p>
        Estas condiciones pueden actualizarse en cualquier momento. La versión aplicable es la
        publicada en esta página en el momento del acceso, con la fecha de actualización que
        figura arriba.
      </p>

      <h2>10. Ley aplicable y resolución de conflictos</h2>
      <p>
        Estas condiciones se rigen por la legislación española. Si eres consumidor, podrás
        acudir a los tribunales de tu domicilio y, si lo prefieres, a la{' '}
        <a
          href="https://ec.europa.eu/consumers/odr"
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          plataforma europea de resolución de litigios en línea
        </a>
        . En los demás casos, las partes se someten a los juzgados y tribunales del domicilio
        del titular.
      </p>
    </LegalPage>
  )
}
