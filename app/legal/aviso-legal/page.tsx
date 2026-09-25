import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/legal/LegalPage'
import { LEGAL } from '@/lib/legal'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lanedata.es'

export const metadata: Metadata = {
  title: 'Aviso legal',
  description:
    'Datos identificativos del titular de lanedata, condiciones de acceso al sitio, propiedad intelectual y régimen de responsabilidad.',
  alternates: { canonical: `${siteUrl}/legal/aviso-legal/` },
  robots: { index: true, follow: true },
}

export default function AvisoLegalPage() {
  return (
    <LegalPage
      titulo="Aviso legal"
      entradilla="Quién está detrás de lanedata, en qué condiciones se ofrece el sitio y qué se puede y no se puede hacer con lo que se publica aquí."
      activo="/legal/aviso-legal/"
    >
      <h2>1. Datos identificativos</h2>
      <p>
        En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la
        Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se hacen constar los
        siguientes datos del titular de este sitio web:
      </p>
      <dl className="ld-ficha">
        <dt>Titular</dt>
        <dd>{LEGAL.titular}</dd>
        <dt>NIF</dt>
        <dd>{LEGAL.nif}</dd>
        <dt>Domicilio</dt>
        <dd>{LEGAL.domicilio}</dd>
        <dt>Correo</dt>
        <dd>
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
        </dd>
        <dt>Sitio web</dt>
        <dd>{LEGAL.dominio}</dd>
        {LEGAL.registroMercantil ? (
          <>
            <dt>Registro</dt>
            <dd>{LEGAL.registroMercantil}</dd>
          </>
        ) : null}
      </dl>

      <h2>2. Objeto del sitio</h2>
      <p>
        {LEGAL.marca} es un medio editorial sin ánimo de lucro dedicado al análisis, la
        estadística y el contexto del atletismo español. A través de {LEGAL.dominio} se
        ofrecen de forma gratuita artículos de análisis, un archivo de contenidos, un
        calendario de competiciones y un conjunto de calculadoras deportivas (LaneLab).
      </p>
      <p>
        El acceso al sitio es libre y gratuito y no exige registro previo. Únicamente el panel
        de administración, reservado a la redacción, requiere identificación.
      </p>

      <h2>3. Condiciones de acceso y uso</h2>
      <p>
        El acceso a {LEGAL.dominio} atribuye la condición de usuario e implica la aceptación
        de este aviso legal y de las{' '}
        <Link href="/legal/condiciones/">condiciones de uso</Link>. El usuario se compromete a
        hacer un uso diligente del sitio y a no emplearlo para actividades contrarias a la ley,
        a la buena fe o al orden público.
      </p>
      <p>
        Queda prohibido, en particular, intentar acceder a áreas restringidas, introducir
        código malicioso, extraer sistemáticamente el contenido mediante procedimientos
        automatizados que comprometan el funcionamiento del servicio, o suplantar la identidad
        de {LEGAL.marca} o de terceros.
      </p>

      <h2>4. Propiedad intelectual e industrial</h2>
      <p>
        Los textos, análisis, gráficos, tablas, marcas, logotipos, tipografías, código fuente y
        el diseño de {LEGAL.dominio} son titularidad de {LEGAL.titular} o se utilizan con la
        autorización correspondiente, y están protegidos por el Real Decreto Legislativo 1/1996
        (Ley de Propiedad Intelectual) y por la normativa de marcas.
      </p>
      <p>
        Se permite la cita y la reproducción parcial de fragmentos con fines informativos,
        docentes o de investigación, siempre que se indique la fuente y se enlace a la
        dirección original del contenido, conforme al artículo 32 de la Ley de Propiedad
        Intelectual. No se autoriza la reproducción íntegra de artículos, su explotación
        comercial, su transformación, ni su uso para el entrenamiento de sistemas
        automatizados sin permiso previo y por escrito.
      </p>
      <p>
        Los datos deportivos citados (marcas, resultados, calendarios y clasificaciones)
        proceden de fuentes oficiales como la Real Federación Española de Atletismo, las
        federaciones autonómicas y World Athletics, y pertenecen a sus respectivos titulares.
        {LEGAL.marca} los reproduce con finalidad informativa y de análisis.
      </p>

      <h2>5. Responsabilidad sobre los contenidos</h2>
      <p>
        {LEGAL.marca} elabora sus contenidos con el mayor cuidado posible y contrasta los datos
        con fuentes oficiales, pero no puede garantizar la ausencia total de errores,
        omisiones o desactualizaciones. La información publicada tiene carácter divulgativo y
        no constituye asesoramiento deportivo, médico ni profesional de ningún tipo.
      </p>
      <p>
        Las calculadoras de LaneLab aplican fórmulas y tablas públicas de World Athletics y
        modelos ampliamente aceptados en la literatura del atletismo. Sus resultados son
        orientativos y no tienen validez oficial: la puntuación, la homologación o la
        categoría que reconoce un organismo federativo siempre prevalece sobre lo que muestre
        esta web.
      </p>
      <p>
        El titular no se responsabiliza de los daños derivados de interrupciones del servicio,
        fallos de la red, virus o de un uso inadecuado del sitio por parte del usuario, en los
        términos permitidos por la legislación aplicable.
      </p>

      <h2>6. Enlaces a terceros</h2>
      <p>
        Este sitio contiene enlaces a páginas externas (federaciones, medios, redes sociales y
        servicios de resultados). {LEGAL.marca} no controla ni asume responsabilidad alguna
        sobre sus contenidos, sus políticas de privacidad o su disponibilidad. La existencia de
        un enlace no implica recomendación ni vínculo con el sitio enlazado.
      </p>
      <p>
        Cualquier persona puede enlazar libremente a {LEGAL.dominio} siempre que no se
        reproduzca el contenido en un marco que induzca a confusión sobre su origen ni se
        realicen manifestaciones falsas sobre {LEGAL.marca}.
      </p>

      <h2>7. Protección de datos y cookies</h2>
      <p>
        El tratamiento de datos personales se detalla en la{' '}
        <Link href="/legal/privacidad/">política de privacidad</Link>, y el uso de
        almacenamiento en el dispositivo, en la{' '}
        <Link href="/legal/cookies/">política de cookies</Link>.
      </p>

      <h2>8. Modificaciones</h2>
      <p>
        {LEGAL.marca} se reserva el derecho a modificar este aviso legal, así como la
        presentación, la configuración y los contenidos del sitio, en cualquier momento y sin
        aviso previo. La versión vigente es siempre la publicada en esta página, con la fecha
        de actualización indicada arriba.
      </p>

      <h2>9. Legislación aplicable y jurisdicción</h2>
      <p>
        Este aviso legal se rige por la legislación española. Para la resolución de cualquier
        controversia, y salvo que la normativa de consumidores establezca un fuero imperativo
        distinto, las partes se someten a los juzgados y tribunales del domicilio del titular.
      </p>

      <p className="ld-nota">
        <strong>Contacto</strong> Para cualquier cuestión relacionada con este aviso legal
        puedes escribir a <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>
    </LegalPage>
  )
}
