# Textos legales y cookies

Los cuatro documentos que necesita una web editorial española, más el banner de
consentimiento que decide si se carga Google Analytics.

> ⚠️ **Paso obligatorio antes de publicar.** Abre [`lib/legal.ts`](../lib/legal.ts)
> y sustituye todo lo que está entre corchetes:
>
> ```ts
> titular:   '[NOMBRE Y APELLIDOS O RAZÓN SOCIAL]',
> nif:       '[NIF / CIF]',
> domicilio: '[DIRECCIÓN COMPLETA, CP, LOCALIDAD, PROVINCIA]',
> ```
>
> Los cuatro documentos leen de ese fichero, así que se actualizan todos a la vez.
> Mientras queden corchetes, el panel muestra un aviso en su portada.

El artículo 10 de la LSSI exige que nombre, NIF y una vía de contacto directa
estén visibles de forma permanente y gratuita. Si no quieres publicar tu
domicilio particular, vale una dirección profesional o un apartado de correos.

Revisa también `email` (tiene que estar operativo y atendido) y actualiza
`actualizado` cada vez que cambies algo de fondo.

---

## Los cuatro documentos

| Ruta | Qué cubre | ¿Obligatoria? |
|---|---|---|
| `/legal/aviso-legal/` | Identidad del titular, propiedad intelectual, responsabilidad | **Sí** — art. 10 LSSI-CE |
| `/legal/privacidad/` | Tratamientos, bases jurídicas, plazos, derechos | **Sí** — arts. 13-14 RGPD |
| `/legal/cookies/` | Qué se guarda en el navegador y cómo cambiarlo | **Sí** — art. 22.2 LSSI-CE |
| `/legal/condiciones/` | Reglas de uso, límites de LaneLab | Muy recomendable |

Se enlazan desde el pie de todas las páginas, desde el índice `/legal/` y desde
el sitemap.

---

## El banner de cookies

Cumple lo que pide la Guía sobre el uso de cookies de la AEPD:

- **Aceptar** y **Rechazar** con el mismo peso visual y en el primer nivel. Nada
  de esconder el rechazo detrás de dos clics.
- Panel de ajustes sin ninguna casilla marcada por defecto.
- No se puede cerrar por descarte: no hay aspa que valga por un «sí».
- Enlace visible a la política de cookies antes de decidir.

**Google Analytics no se descarga siquiera hasta que alguien lo acepta.** Si
retira el consentimiento, se desactiva en el acto y sus cookies se borran.

La respuesta se guarda 24 meses en `localStorage`; después se vuelve a preguntar.
Se puede reabrir desde el pie de cualquier página o desde `/legal/`.

---

## La decisión que puede que quieras revisar

La medición propia (ver [telemetria.md](telemetria.md)) funciona **sin
consentimiento previo**, apoyada en la excepción de medición de audiencia de la
Guía de cookies de la AEPD: es de primera parte, anónima, agregada y no se
comparte con nadie.

Si prefieres la lectura más estricta y pedir permiso también para ella, cambia
una línea en `lib/telemetry/consent.ts`:

```ts
export const MEDICION_REQUIERE_CONSENTIMIENTO = true
```

El banner pasará a ofrecerla como categoría desactivable y dejará de medir a
quien la rechace. El coste es que perderás de vista a una parte de la audiencia.

> Esto es una implementación técnica razonada, no un dictamen jurídico. Si el
> proyecto crece o empieza a monetizarse, que lo revise alguien con firma.

---

## Ficheros

```
app/legal/                            Los cuatro documentos + índice
components/legal/LegalPage.tsx        Marco común de los documentos
components/legal/CookiePrefsButton.tsx  Reabre el panel de preferencias
components/telemetry/CookieBanner.tsx   Banner y panel de ajustes
components/telemetry/GoogleAnalytics.tsx  GA condicionado al consentimiento
lib/telemetry/consent.ts              Estado del consentimiento
lib/legal.ts                          ⚠️ Datos del titular — rellénalos
```
