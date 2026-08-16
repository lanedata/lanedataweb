# Errores, analíticas y textos legales

Guía de puesta en marcha de las tres piezas que se añadieron a la vez. Hay
**dos cosas que tienes que hacer tú** antes de que esto funcione del todo; están
marcadas con ⚠️.

---

## ⚠️ 1. Crear las tablas en Supabase

Nada de esto guarda un solo dato hasta que exista el esquema.

1. Entra en tu proyecto de Supabase → **SQL Editor** → **New query**.
2. Copia y pega el contenido completo de [`supabase/telemetry-schema.sql`](../supabase/telemetry-schema.sql).
3. Pulsa **Run**.

Es idempotente: si lo lanzas dos veces no rompe nada.

Crea dos tablas (`error_logs` y `analytics_events`) y seis funciones de agregado.
Los permisos quedan así:

| Quién | Puede |
|---|---|
| Visitante anónimo | **Solo insertar.** No puede leer ni borrar nada de lo que se guarda. |
| Tú (autenticado) | Leer, editar y borrar, y ejecutar las funciones del panel. |

### Limpieza periódica

La política de privacidad promete borrar las analíticas a los 14 meses y los
errores a los 90 días. Para cumplirlo, ejecuta de vez en cuando:

```sql
SELECT telemetry_purge();
```

O actívalo de forma automática si habilitas `pg_cron` (Database → Extensions):

```sql
SELECT cron.schedule('telemetry-purge', '0 4 * * 0', 'SELECT telemetry_purge()');
```

---

## ⚠️ 2. Rellenar los datos del titular

Abre [`lib/legal.ts`](../lib/legal.ts) y sustituye todo lo que está entre
corchetes:

```ts
titular:   '[NOMBRE Y APELLIDOS O RAZÓN SOCIAL]',
nif:       '[NIF / CIF]',
domicilio: '[DIRECCIÓN COMPLETA, CP, LOCALIDAD, PROVINCIA]',
```

Los cuatro documentos legales leen de ese fichero, así que se actualizan todos a
la vez. Mientras queden corchetes, el panel de administración muestra un aviso en
la portada recordándotelo.

El artículo 10 de la LSSI exige que nombre, NIF y una vía de contacto directa
estén visibles. Si no quieres publicar tu domicilio particular, vale una dirección
profesional o un apartado de correos.

Revisa también `email` (tiene que estar operativo y atendido) y `actualizado`
cada vez que cambies algo de fondo.

---

## Cómo funciona el registro de errores

Se capturan solos, sin tocar nada:

- excepciones de JavaScript (`window.onerror`);
- promesas que se rechazan sin `catch`;
- errores de renderizado de React (a través de `app/error.tsx` y `app/global-error.tsx`);
- imágenes, scripts y hojas de estilo que no cargan.

Para registrar uno a mano cuando sepas que algo puede fallar:

```ts
import { logError } from '@/lib/telemetry/errors'

try {
  await exportarStory()
} catch (e) {
  logError({
    error: e,
    action: 'exportando la story',      // qué estaba haciendo la persona
    context: { formato: '9:16' },       // lo que ayude a reproducirlo
  })
}
```

Salvaguardas para que la tabla no se llene de basura:

- el mismo fallo se manda **una vez por sesión**, no una por repetición;
- tope de **25 errores distintos por sesión**;
- una lista de ruido conocido que se descarta entero (extensiones del navegador,
  `ResizeObserver loop`, cortes de red del visitante…);
- **en desarrollo no se envía nada**: solo se avisa por consola.

### Exportar el CSV

`/admin/errores` → filtras por fecha, estado o texto → **CSV agrupado** o **CSV
detallado**.

- **Agrupado** es el que quieres pasarle a alguien para que lo arregle: una fila
  por fallo distinto, con cuántas veces ha pasado, en qué navegadores y la traza.
- **Detallado** trae cada ocurrencia por separado, para cuando hay que investigar
  un caso concreto.

Los CSV salen con separador `;` y BOM UTF-8, así que Excel en español los abre
bien y con los acentos correctos.

---

## Cómo funciona la analítica

Medición propia, en tu Supabase, sin terceros y sin cookies.

| Qué se mide | Cómo |
|---|---|
| Visitas y páginas | Un evento `page_view` por navegación, también en el enrutado del cliente. |
| Tiempo de lectura | Solo cuenta con la pestaña **visible**: dejarla abierta de fondo no suma. |
| País | Deducido de la zona horaria del navegador, **nunca de la IP**. |
| Dispositivo, navegador, sistema | Del user agent. |
| Procedencia | Dominio del referrer; el tráfico directo no aparece. |
| Funcionalidades | Calculadoras de LaneLab, búsquedas, compartir… |

«Sesión» es una pestaña, no una persona: el identificador vive en
`sessionStorage` y desaparece al cerrarla. Quien vuelva mañana cuenta como sesión
nueva. Es menos preciso que un seguimiento con cookies, y es exactamente por eso
que no hace falta pedir permiso para ello.

### Medir una funcionalidad nueva

```ts
import { EVENTS, trackEvent } from '@/lib/telemetry/analytics'

trackEvent(EVENTS.labTool, 'puntos-iaaf')
trackEvent('mi_evento_nuevo', 'etiqueta legible')
```

Si añades un nombre de evento nuevo, dale su etiqueta en `FEATURE_LABELS`
(`lib/telemetry/types.ts`) para que el panel lo muestre en castellano.

Ya están instrumentados: LaneLab (qué calculadora se abre), el buscador, la
búsqueda del archivo, el botón de compartir y la respuesta al aviso de cookies.

> **En desarrollo no se envía nada.** El panel solo se llena con el sitio
> publicado.

---

## Las cuatro páginas legales

| Ruta | Qué cubre | ¿Obligatoria? |
|---|---|---|
| `/legal/aviso-legal/` | Identidad del titular, propiedad intelectual, responsabilidad | **Sí** — art. 10 LSSI-CE |
| `/legal/privacidad/` | Tratamientos, bases jurídicas, plazos, derechos | **Sí** — arts. 13-14 RGPD |
| `/legal/cookies/` | Qué se guarda en el navegador y cómo cambiarlo | **Sí** — art. 22.2 LSSI-CE |
| `/legal/condiciones/` | Reglas de uso, límites de LaneLab | Muy recomendable |

Se enlazan desde el pie de todas las páginas y desde `/legal/`.

### El banner de cookies

Cumple lo que pide la Guía de cookies de la AEPD: **Aceptar** y **Rechazar** con
el mismo peso visual y al mismo nivel, panel de ajustes sin casillas premarcadas,
y ninguna forma de cerrarlo por descarte.

**Google Analytics no se descarga siquiera hasta que alguien lo acepta.** Si
retira el consentimiento, se desactiva en el acto y sus cookies se borran.

La respuesta se guarda 24 meses; después se vuelve a preguntar.

### La decisión que puede que quieras revisar

La medición propia funciona **sin consentimiento previo**, apoyada en la excepción
de medición de audiencia de la Guía de cookies de la AEPD: es de primera parte,
anónima, agregada y no se comparte con nadie.

Si prefieres la lectura más estricta y pedir permiso también para ella, cambia una
línea en `lib/telemetry/consent.ts`:

```ts
export const MEDICION_REQUIERE_CONSENTIMIENTO = true
```

El banner pasará a ofrecerla como categoría desactivable y dejará de medir a quien
la rechace. El coste es que perderás de vista a una parte de la audiencia.

> Esto es una implementación técnica razonada, no un dictamen jurídico. Si el
> proyecto crece o empieza a monetizarse, que lo revise alguien con firma.

---

## Ficheros

```
lib/telemetry/
├── analytics.ts   Envío de eventos y medición del tiempo
├── consent.ts     Estado del consentimiento de cookies
├── context.ts     Sesión, dispositivo, navegador
├── csv.ts         Serializador y descarga de CSV
├── errors.ts      Captura y registro de errores
├── geo.ts         Zona horaria → país
└── types.ts       Formas de fila y etiquetas del panel

components/telemetry/
├── Telemetry.tsx        Engancha todo (montado en el layout raíz)
├── CookieBanner.tsx     Banner y panel de preferencias
└── GoogleAnalytics.tsx  GA condicionado al consentimiento

components/admin/
├── analiticas/  Panel de audiencia y sus gráficos
└── errores/     Panel de errores y exportación

app/legal/       Los cuatro documentos + índice
lib/legal.ts     ⚠️ Datos del titular — rellénalos
supabase/telemetry-schema.sql   ⚠️ Ejecútalo en Supabase
```
