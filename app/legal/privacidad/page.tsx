import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/legal/LegalPage'
import { ENCARGADOS, LEGAL } from '@/lib/legal'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lanedata.es'

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description:
    'Qué datos trata lanedata, con qué finalidad y base jurídica, durante cuánto tiempo, quién más interviene y cómo ejercer tus derechos.',
  alternates: { canonical: `${siteUrl}/legal/privacidad/` },
  robots: { index: true, follow: true },
}

export default function PrivacidadPage() {
  return (
    <LegalPage
      titulo="Política de privacidad"
      entradilla="lanedata no pide registro, no vende datos y no perfila a nadie. Aquí está, con detalle, todo lo que sí se trata y por qué."
      activo="/legal/privacidad/"
    >
      <div className="ld-claves">
        <div className="ld-claves-titulo">En corto</div>
        <ul>
          <li>No hace falta registrarse ni dar ningún dato para leer la web.</li>
          <li>
            La medición propia es anónima y agregada: no guarda tu IP, ni cookies, ni ningún
            identificador que dure más que la pestaña abierta.
          </li>
          <li>Google Analytics solo se activa si lo aceptas, y puedes retirarlo cuando quieras.</li>
          <li>Los errores técnicos se registran sin datos personales, solo para poder arreglarlos.</li>
          <li>
            Si inicias sesión con Google (solo colaboradores), se usan únicamente tu nombre, tu
            correo y tu foto de perfil para identificarte. Nada más de tu cuenta de Google.
          </li>
          <li>
            En el mercado de fichajes, los datos de contacto que dejes en un formulario solo los
            ve {LEGAL.marca}: nunca se publican.
          </li>
          <li>Nunca se ceden ni se venden datos a terceros con fines comerciales.</li>
        </ul>
      </div>

      <h2>1. Responsable del tratamiento</h2>
      <dl className="ld-ficha">
        <dt>Responsable</dt>
        <dd>{LEGAL.titular}</dd>
        <dt>NIF</dt>
        <dd>{LEGAL.nif}</dd>
        <dt>Domicilio</dt>
        <dd>{LEGAL.domicilio}</dd>
        <dt>Correo</dt>
        <dd>
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
        </dd>
      </dl>
      <p>
        Esta política se ajusta al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018
        de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).
      </p>
      <p>
        No se ha designado un delegado de protección de datos porque el tratamiento realizado
        no encaja en ninguno de los supuestos del artículo 37 del RGPD. Para cualquier asunto
        de privacidad, el contacto es el correo indicado arriba.
      </p>

      <h2>2. Qué datos se tratan y para qué</h2>

      <h3>2.1. Navegación por la web</h3>
      <p>
        Para leer {LEGAL.marca} no hay que registrarse ni facilitar ningún dato. El propio
        alojamiento (GitHub Pages) registra de forma automática y transitoria los datos
        técnicos habituales de cualquier servidor, incluida la dirección IP, con la única
        finalidad de servir las páginas y protegerse frente a abusos. Esos registros los
        gestiona el proveedor y {LEGAL.marca} no accede a ellos ni los conserva.
      </p>

      <h3>2.2. Medición de audiencia propia</h3>
      <p>
        {LEGAL.marca} mide su propia audiencia con un sistema desarrollado a medida, alojado en
        su propia base de datos y que no comparte nada con terceros. De cada visita se guarda:
      </p>
      <ul>
        <li>la página vista, su título y el tiempo que ha estado abierta;</li>
        <li>el dominio desde el que se ha llegado, si procede de un enlace externo;</li>
        <li>
          el país aproximado, deducido de la zona horaria y el idioma del navegador,{' '}
          <strong>nunca de la dirección IP</strong>;
        </li>
        <li>tipo de dispositivo, sistema operativo, navegador y resolución de pantalla;</li>
        <li>qué funcionalidades se usan: qué calculadora de LaneLab se abre, qué se busca en el archivo o si se comparte un artículo.</li>
      </ul>
      <p>
        No se guarda la dirección IP, no se instala ninguna cookie y el identificador que
        permite contar una visita como una sola es un número aleatorio que vive en la memoria
        de la pestaña y desaparece al cerrarla. El resultado son estadísticas agregadas que no
        permiten identificar a ninguna persona ni seguirla entre sitios web.
      </p>
      <p>
        <strong>Base jurídica:</strong> interés legítimo del responsable (art. 6.1.f RGPD) en
        conocer de forma agregada cómo se usa su propio medio para mejorarlo. Al tratarse de
        una medición de audiencia estrictamente de primera parte, anónima y no compartida,
        queda amparada por la excepción de medición de audiencia que recoge la Guía sobre el
        uso de cookies de la Agencia Española de Protección de Datos, por lo que no requiere
        consentimiento previo. Aun así, puedes revisar y desactivar esta medición desde el{' '}
        <Link href="/legal/cookies/">panel de cookies</Link>.
      </p>

      <h3>2.3. Google Analytics</h3>
      <p>
        Solo si lo aceptas expresamente en el aviso de cookies se carga Google Analytics 4,
        que utiliza cookies propias del dominio para elaborar estadísticas de uso. Mientras no
        des tu consentimiento, el script de Google ni siquiera se descarga.
      </p>
      <p>
        <strong>Base jurídica:</strong> tu consentimiento (art. 6.1.a RGPD y art. 22.2
        LSSI-CE), que puedes retirar en cualquier momento sin que ello afecte a la licitud del
        tratamiento anterior. Al retirarlo, Google Analytics se desactiva y sus cookies se
        eliminan.
      </p>

      <h3>2.4. Registro de errores técnicos</h3>
      <p>
        Cuando algo falla en la web (un cálculo que revienta, una imagen que no carga, un
        script que da error), se registra automáticamente el mensaje de error, su traza
        técnica, la página en la que ocurrió y el navegador y sistema operativo empleados. Es
        el equivalente digital del parte de avería: sirve exclusivamente para localizar y
        corregir el fallo.
      </p>
      <p>
        No se registra la dirección IP ni ningún dato que hayas introducido en los
        formularios o calculadoras.
      </p>
      <p>
        <strong>Base jurídica:</strong> interés legítimo (art. 6.1.f RGPD) en mantener el
        servicio seguro y en funcionamiento, tal y como contempla el considerando 49 del RGPD.
      </p>

      <h3>2.5. Comunicaciones por correo</h3>
      <p>
        Si nos escribes, se tratan los datos que incluyas en el mensaje (nombre, dirección de
        correo y contenido) con la única finalidad de atender tu consulta.
      </p>
      <p>
        <strong>Base jurídica:</strong> tu consentimiento al enviar el mensaje y el interés
        legítimo en responder (arts. 6.1.a y 6.1.f RGPD).
      </p>

      <h3>2.6. Panel de administración</h3>
      <p>
        El acceso a la zona de redacción trata la dirección de correo del administrador y sus
        registros de acceso, con la finalidad de controlar quién publica en el medio.
      </p>
      <p>
        <strong>Base jurídica:</strong> ejecución de la relación entre el responsable y su
        redacción, e interés legítimo en la seguridad del sistema (arts. 6.1.b y 6.1.f RGPD).
      </p>

      <h3>2.7. Inicio de sesión con Google</h3>
      <p>
        Leer {LEGAL.marca} nunca requiere cuenta. Solo los colaboradores del mercado de
        fichajes y la redacción pueden iniciar sesión, y lo hacen con su cuenta de Google
        («Iniciar sesión con Google»). El acceso lo gestiona Supabase, nuestro proveedor de
        autenticación, por eso la pantalla de Google muestra su dominio.
      </p>
      <p>Al iniciar sesión, Google nos facilita exclusivamente:</p>
      <ul>
        <li>tu nombre y tu foto de perfil;</li>
        <li>tu dirección de correo electrónico;</li>
        <li>un identificador interno de tu cuenta, para reconocerte la próxima vez.</li>
      </ul>
      <p>
        Esos datos se usan <strong>solo</strong> para identificarte, saber qué permisos tienes
        (colaborador o administración) y que conste quién ha publicado cada fichaje. No
        pedimos acceso a tu Gmail, contactos, Drive, calendario ni a ningún otro servicio de
        Google, y no publicamos tu correo en ningún sitio.
      </p>
      <p>
        El uso que hace {LEGAL.marca} de la información recibida de las API de Google se
        ajusta a la{' '}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer nofollow">
          Política de datos de usuario de los servicios de API de Google
        </a>
        , incluidos sus requisitos de uso limitado: no se venden, no se usan para publicidad,
        no se ceden a terceros y no se usan para entrenar modelos de inteligencia artificial.
      </p>
      <p>
        Puedes retirar el acceso cuando quieras desde{' '}
        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer nofollow">
          la configuración de seguridad de tu cuenta de Google
        </a>{' '}
        y pedirnos que borremos tu cuenta escribiendo a{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>
      <p>
        <strong>Base jurídica:</strong> la relación de colaboración que aceptas al iniciar
        sesión (art. 6.1.b RGPD) y el interés legítimo en la seguridad del sistema (art. 6.1.f).
      </p>

      <h3>2.8. Mercado de fichajes y tablón</h3>
      <p>
        En el mercado de fichajes puedes contarnos un fichaje, enviar un chivatazo, publicar un
        anuncio en el tablón («atleta busca club» o «club busca atletas») o mostrar interés en
        un anuncio. En esos formularios se tratan los datos que tú escribes:
      </p>
      <ul>
        <li>nombre del atleta o del club, clubes, pruebas, zona y el texto del anuncio o la nota;</li>
        <li>
          un dato de contacto (correo, teléfono o usuario de redes sociales) para que podamos
          verificar la información antes de publicarla o poneros en contacto.
        </li>
      </ul>
      <p>
        Nada se publica sin revisarlo antes. El dato de contacto <strong>nunca se publica</strong>:
        solo lo ve la administración de {LEGAL.marca}, y si alguien se interesa por un anuncio
        somos nosotros quienes ponemos a las dos partes en contacto.
      </p>
      <p>
        Los fichajes publicados muestran el nombre del atleta y sus clubes, que son información
        deportiva de interés público. Junto a ellos pueden mostrarse datos ya publicados por la
        Real Federación Española de Atletismo (la compensación por cambio de club que figura en
        sus circulares) y las marcas públicas del atleta en Mundo Atletismo. Nunca se muestran
        fechas de nacimiento, y de los menores de edad no se muestran marcas.
      </p>
      <p>
        Si eres el atleta y quieres corregir o retirar un fichaje, un anuncio o tu ficha,
        escríbenos a <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> y lo atendemos.
      </p>
      <p>
        <strong>Base jurídica:</strong> tu consentimiento al enviar el formulario (art. 6.1.a
        RGPD) y el interés legítimo en informar sobre la actualidad deportiva (art. 6.1.f RGPD).
      </p>

      <h3>2.9. Avisos al móvil</h3>
      <p>
        La administración puede activar avisos en su propio móvil para enterarse de los
        envíos. Para ello se guarda la dirección técnica de suscripción que genera el navegador,
        que no identifica a la persona y se borra al desactivar los avisos. Los lectores de la
        web no reciben notificaciones ni se les pide permiso para ello.
      </p>

      <h2>3. Cuánto tiempo se conservan</h2>
      <table>
        <thead>
          <tr>
            <th>Tratamiento</th>
            <th>Conservación</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Medición de audiencia propia</td>
            <td>14 meses desde la visita, con borrado automático posterior</td>
          </tr>
          <tr>
            <td>Google Analytics</td>
            <td>14 meses, según la configuración de retención de la propiedad</td>
          </tr>
          <tr>
            <td>Registro de errores</td>
            <td>90 días desde el incidente</td>
          </tr>
          <tr>
            <td>Consentimiento de cookies</td>
            <td>24 meses, tras los cuales se vuelve a preguntar</td>
          </tr>
          <tr>
            <td>Cuenta de colaborador (inicio de sesión con Google)</td>
            <td>Mientras colabores; se borra cuando lo pides o tras 12 meses sin uso</td>
          </tr>
          <tr>
            <td>Datos de contacto de los formularios del mercado</td>
            <td>Hasta resolver el envío o cerrar el anuncio, y como máximo 12 meses</td>
          </tr>
          <tr>
            <td>Fichajes y anuncios publicados</td>
            <td>Mientras sigan teniendo interés informativo; se retiran si el atleta lo pide</td>
          </tr>
          <tr>
            <td>Correos recibidos</td>
            <td>Mientras dure la consulta y, después, durante los plazos legales de prescripción</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Quién más interviene</h2>
      <p>
        No se venden, alquilan ni ceden datos a terceros con fines comerciales. Sí intervienen
        los siguientes proveedores, en calidad de encargados del tratamiento y con el contrato
        del artículo 28 del RGPD suscrito:
      </p>
      <table>
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Para qué</th>
            <th>Dónde y con qué garantía</th>
          </tr>
        </thead>
        <tbody>
          {ENCARGADOS.map((e) => (
            <tr key={e.nombre}>
              <td>
                <a href={e.web} target="_blank" rel="noopener noreferrer nofollow">
                  {e.nombre}
                </a>
              </td>
              <td>{e.finalidad}</td>
              <td>
                {e.ubicacion} {e.garantia}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Además, los datos podrán comunicarse a jueces, tribunales y administraciones públicas
        cuando exista una obligación legal.
      </p>

      <h2>5. Transferencias internacionales</h2>
      <p>
        La base de datos de {LEGAL.marca} está alojada en la Unión Europea. El alojamiento
        estático y, si lo aceptas, Google Analytics, implican transferencias a Estados Unidos
        amparadas en las Cláusulas Contractuales Tipo aprobadas por la Comisión Europea y en la
        adhesión de dichos proveedores al Marco de Privacidad de Datos UE-EE. UU.
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes ejercer en cualquier momento los derechos de acceso, rectificación, supresión,
        limitación del tratamiento, portabilidad y oposición, así como retirar el
        consentimiento prestado. Basta con escribir a{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> indicando el derecho que ejerces.
        La solicitud se responde en el plazo máximo de un mes.
      </p>
      <p>
        Ten en cuenta que la medición de audiencia propia es anónima: al no conservarse ningún
        identificador que permita vincular las estadísticas contigo, no es posible localizar
        «tus» datos dentro de ellas (art. 11 RGPD). Sí puedes desactivar la medición hacia el
        futuro desde el panel de cookies.
      </p>
      <p>
        Si consideras que tus derechos no han sido atendidos correctamente, puedes presentar
        una reclamación ante la{' '}
        <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer nofollow">
          Agencia Española de Protección de Datos
        </a>{' '}
        (C/ Jorge Juan 6, 28001 Madrid).
      </p>

      <h2>7. Menores</h2>
      <p>
        Los contenidos de {LEGAL.marca} son aptos para todos los públicos y no se recaban datos
        de forma directa, por lo que el sitio no está dirigido específicamente a menores ni
        solicita su información personal.
      </p>

      <h2>8. Seguridad</h2>
      <p>
        Se aplican medidas técnicas y organizativas proporcionadas al riesgo: cifrado en
        tránsito (HTTPS), control de acceso al panel mediante autenticación, permisos de base
        de datos restringidos por filas de forma que los datos de medición solo pueden ser
        leídos por la administración, minimización del dato desde el diseño y borrado
        automático al cumplirse los plazos.
      </p>

      <h2>9. Contacto</h2>
      <p>
        Para cualquier duda sobre esta política o sobre tus datos, escribe a{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <h2>10. Cambios en esta política</h2>
      <p>
        Esta política puede actualizarse para reflejar cambios legales o técnicos. La versión
        vigente es la publicada en esta página, con su fecha de actualización. Si el cambio
        afecta de forma sustancial a un tratamiento basado en tu consentimiento, se te volverá
        a preguntar.
      </p>
      <p>Última actualización: 28 de noviembre de 2026.</p>
    </LegalPage>
  )
}
