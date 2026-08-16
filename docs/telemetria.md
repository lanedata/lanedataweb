# Errores y analíticas

Dos piezas que comparten base técnica: la web es estática (GitHub Pages), así que
el navegador escribe directo en Supabase y el panel lee de ahí.

> ⚠️ **Paso obligatorio.** Nada de esto guarda un solo dato hasta que ejecutes
> [`supabase/telemetry-schema.sql`](../supabase/telemetry-schema.sql) en el SQL
> Editor de Supabase (Dashboard → SQL Editor → New query → pegar → Run). Es
> idempotente: puedes lanzarlo dos veces sin romper nada.

Crea `error_logs` y `analytics_events` y seis funciones de agregado. Permisos:

| Quién | Puede |
|---|---|
| Visitante anónimo | **Solo insertar.** No puede leer ni borrar nada. |
| Tú (autenticado) | Leer, editar, borrar y ejecutar las funciones del panel. |

---

## Errores — `/admin/errores`

Se capturan solos, sin tocar nada:

- excepciones de JavaScript (`window.onerror`);
- promesas que se rechazan sin `catch`;
- errores de renderizado de React (`app/error.tsx` y `app/global-error.tsx`);
- imágenes, scripts y hojas de estilo que no cargan.

Para registrar uno a mano donde sepas que algo puede fallar:

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
- lista de ruido conocido que se descarta entero (extensiones del navegador,
  `ResizeObserver loop`, cortes de red del visitante…);
- **en desarrollo no se envía nada**: solo se avisa por consola.

### Exportar el CSV

Filtras por fecha, estado o texto y descargas:

- **CSV agrupado** — una fila por fallo distinto, con cuántas veces ha pasado, en
  qué navegadores y la traza. Es el que le pasas a alguien para que lo arregle.
- **CSV detallado** — cada ocurrencia por separado, para investigar un caso
  concreto.

Salen con separador `;` y BOM UTF-8, así que Excel en español los abre bien y con
los acentos correctos.

---

## Analíticas — `/admin/analiticas`

Medición propia, en tu Supabase, sin cookies y sin terceros.

| Qué se mide | Cómo |
|---|---|
| Visitas y páginas | Un evento por navegación, también en el enrutado del cliente. |
| Tiempo de lectura | Solo cuenta con la pestaña **visible**: dejarla abierta de fondo no suma. |
| País | Deducido de la zona horaria del navegador, **nunca de la IP**. |
| Dispositivo, navegador, sistema | Del user agent. |
| Procedencia | Dominio del referrer; el tráfico directo no aparece. |
| Funcionalidades | Calculadoras de LaneLab, búsquedas, compartir… |

«Sesión» es una pestaña, no una persona: el identificador vive en
`sessionStorage` y desaparece al cerrarla. Quien vuelva mañana cuenta como sesión
nueva. Es menos preciso que un seguimiento con cookies y es exactamente por eso
que puede funcionar sin pedir permiso.

Los agregados los calcula Postgres con funciones `SECURITY DEFINER` que `anon` no
puede ejecutar, en vez de traerse miles de filas al navegador.

### Medir una funcionalidad nueva

```ts
import { EVENTS, trackEvent } from '@/lib/telemetry/analytics'

trackEvent(EVENTS.labTool, 'puntos-iaaf')
trackEvent('mi_evento_nuevo', 'etiqueta legible')
```

Si añades un nombre de evento nuevo, dale su etiqueta en `FEATURE_LABELS`
(`lib/telemetry/types.ts`) para que el panel lo muestre en castellano.

Ya están instrumentados LaneLab (qué calculadora se abre), el buscador, la
búsqueda del archivo y el botón de compartir.

> **En desarrollo no se envía nada.** El panel solo se llena con el sitio
> publicado.

---

## Limpieza periódica

Para no acumular datos indefinidamente:

```sql
SELECT telemetry_purge();
```

Borra analíticas de más de 14 meses y errores de más de 90 días. Si activas
`pg_cron` (Database → Extensions) puede ir solo:

```sql
SELECT cron.schedule('telemetry-purge', '0 4 * * 0', 'SELECT telemetry_purge()');
```

---

## Cookies y consentimiento

Google Analytics **ya no se carga siempre**: solo se descarga si la persona lo
acepta en el banner, y se desactiva (borrando sus cookies) si retira el permiso.
Lo gobierna `lib/telemetry/consent.ts`.

La medición propia descrita arriba sigue funcionando sin consentimiento previo,
apoyada en la excepción de medición de audiencia de la Guía de cookies de la
AEPD: es de primera parte, anónima, agregada y no se comparte con nadie. Si
prefieres la lectura estricta, pon `MEDICION_REQUIERE_CONSENTIMIENTO = true` y
pasará a pedirse como cualquier otra categoría.

El detalle de los documentos legales está en [legal.md](legal.md).

---

## Ficheros

```
lib/telemetry/
├── analytics.ts   Envío de eventos y medición del tiempo
├── consent.ts     Estado del consentimiento (a la espera del banner)
├── context.ts     Sesión, dispositivo, navegador
├── csv.ts         Serializador y descarga de CSV
├── errors.ts      Captura y registro de errores
├── geo.ts         Zona horaria → país
└── types.ts       Formas de fila y etiquetas del panel

components/telemetry/Telemetry.tsx   Engancha todo (en el layout raíz)
components/admin/analiticas/         Panel de audiencia y sus gráficos
components/admin/errores/            Panel de errores y exportación
supabase/telemetry-schema.sql        ⚠️ Ejecútalo en Supabase
```
