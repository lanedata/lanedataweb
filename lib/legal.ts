// ─────────────────────────────────────────────────────────────────────────────
// Datos del titular de la web.
//
//  ⚠️  RELLENA ESTO ANTES DE PUBLICAR.
//
// Todo lo que hay entre corchetes es un hueco. El artículo 10 de la LSSI-CE
// obliga a que el nombre/razón social, el NIF y una vía de contacto directa
// sean accesibles "de forma permanente, fácil, directa y gratuita": si dejas
// los corchetes puestos, el aviso legal no cumple.
//
// Los cuatro documentos legales (/legal/*) leen de aquí, así que con cambiarlo
// en este fichero se actualizan todos a la vez.
// ─────────────────────────────────────────────────────────────────────────────

export const LEGAL = {
  /** Nombre y apellidos si eres autónomo/particular, o razón social si es una sociedad. */
  titular: '[NOMBRE Y APELLIDOS O RAZÓN SOCIAL]',

  /** NIF, NIE o CIF del titular. */
  nif: '[NIF / CIF]',

  /**
   * Domicilio a efectos de notificaciones. Si no quieres publicar tu casa,
   * usa una dirección profesional o un apartado de correos: la ley pide un
   * domicilio válido, no necesariamente el particular.
   */
  domicilio: '[DIRECCIÓN COMPLETA, CP, LOCALIDAD, PROVINCIA]',

  /** Correo de contacto. Tiene que estar operativo y atendido. */
  email: 'hola@lanedata.es',

  /**
   * Solo si el titular es una sociedad mercantil. Déjalo vacío si eres
   * particular o autónomo y la línea no se mostrará.
   */
  registroMercantil: '',

  /** Dominio y nombre comercial. */
  dominio: 'lanedata.es',
  sitio: 'https://lanedata.es',
  marca: 'lanedata',

  /**
   * Fecha de la última revisión de los textos legales. Actualízala cada vez
   * que cambies algo con fondo (nuevo tratamiento, nueva herramienta, etc.).
   */
  actualizado: '16 de agosto de 2026',

  /** Legislación aplicable y fuero. */
  jurisdiccion: 'España',
} as const

/** Encargados de tratamiento: quién toca datos por cuenta nuestra. */
export const ENCARGADOS = [
  {
    nombre: 'Supabase, Inc.',
    finalidad: 'Base de datos y alojamiento del contenido, de la medición propia y del registro de errores.',
    ubicacion: 'Unión Europea (región de Fráncfort, Alemania).',
    garantia: 'Tratamiento dentro del EEE. Contrato de encargo de tratamiento (art. 28 RGPD).',
    web: 'https://supabase.com/privacy',
  },
  {
    nombre: 'GitHub, Inc. (GitHub Pages)',
    finalidad: 'Alojamiento y entrega de los ficheros estáticos de la web.',
    ubicacion: 'Estados Unidos.',
    garantia: 'Cláusulas Contractuales Tipo de la Comisión Europea y Data Privacy Framework.',
    web: 'https://docs.github.com/es/site-policy/privacy-policies/github-general-privacy-statement',
  },
  {
    nombre: 'Google Ireland Ltd. (Google Analytics)',
    finalidad: 'Analítica de audiencia. Solo se activa si lo consientes expresamente.',
    ubicacion: 'Irlanda, con transferencias a Estados Unidos.',
    garantia: 'Cláusulas Contractuales Tipo y adhesión al EU-US Data Privacy Framework.',
    web: 'https://policies.google.com/privacy',
  },
] as const

/** Cookies y almacenamiento local que usa la web, para la tabla de la política. */
export const COOKIES = [
  {
    nombre: 'lanedata_consent_v1',
    tipo: 'Técnica (localStorage)',
    titularidad: 'Propia',
    finalidad: 'Recordar qué has respondido en el aviso de cookies para no volver a preguntártelo.',
    duracion: '24 meses',
  },
  {
    nombre: 'ld_sid',
    tipo: 'Técnica de medición (sessionStorage)',
    titularidad: 'Propia',
    finalidad:
      'Identificador aleatorio de sesión que permite contar una visita como una sola aunque veas varias páginas. No identifica a la persona.',
    duracion: 'Hasta cerrar la pestaña',
  },
  {
    nombre: 'sb-<proyecto>-auth-token',
    tipo: 'Técnica (localStorage)',
    titularidad: 'Propia (Supabase)',
    finalidad:
      'Mantener la sesión iniciada en el panel de administración. Solo se crea si te identificas como administrador.',
    duracion: '1 hora, renovable',
  },
  {
    nombre: '_ga, _ga_<id>',
    tipo: 'Analítica de terceros',
    titularidad: 'Google Ireland Ltd.',
    finalidad:
      'Distinguir usuarios y sesiones para las estadísticas de Google Analytics. Solo se instalan si las aceptas.',
    duracion: '24 meses',
  },
] as const

/** Documentos legales, en el orden en que se enlazan en el pie. */
export const DOCUMENTOS = [
  { href: '/legal/aviso-legal/', titulo: 'Aviso legal', resumen: 'Quién está detrás de lanedata y en qué condiciones se ofrece la web.' },
  { href: '/legal/privacidad/', titulo: 'Política de privacidad', resumen: 'Qué datos se tratan, para qué, cuánto tiempo y qué derechos tienes.' },
  { href: '/legal/cookies/', titulo: 'Política de cookies', resumen: 'Qué se guarda en tu navegador, por qué, y cómo cambiarlo cuando quieras.' },
  { href: '/legal/condiciones/', titulo: 'Condiciones de uso', resumen: 'Reglas de uso del contenido, de las calculadoras y límites de responsabilidad.' },
] as const

/** True mientras queden huecos por rellenar. Lo usa el aviso en el panel. */
export function legalIncompleto(): boolean {
  return [LEGAL.titular, LEGAL.nif, LEGAL.domicilio].some((v) => v.includes('['))
}
