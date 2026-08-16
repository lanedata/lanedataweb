# lanedata

**El atletismo español con datos.**

Web editorial de análisis, estadísticas y contexto del atletismo español.  
Stack: Next.js 15 · Tailwind CSS · Supabase (auth + DB + storage).

---

## Estructura del proyecto

```
lanedata/
├── app/
│   ├── page.tsx                    # Portada (artículo destacado + grid)
│   ├── articulo/[slug]/page.tsx    # Lectura de artículo
│   ├── buscar/page.tsx             # Buscador
│   ├── login/page.tsx              # Login admin
│   ├── auth/callback/route.ts      # OAuth callback
│   ├── admin/
│   │   ├── layout.tsx              # Layout protegido
│   │   ├── page.tsx                # Dashboard de artículos
│   │   ├── nuevo/page.tsx          # Crear artículo
│   │   └── editar/[id]/page.tsx    # Editar artículo
│   ├── sitemap.ts                  # Sitemap automático
│   ├── not-found.tsx               # 404
│   ├── layout.tsx                  # Layout raíz
│   └── globals.css
├── components/
│   ├── NavBar.tsx
│   ├── Footer.tsx
│   ├── HeroArticle.tsx             # Artículo destacado (portada)
│   ├── ArticleCard.tsx             # Tarjeta de artículo
│   ├── SearchBar.tsx               # Barra de búsqueda
│   ├── ArticleContent.tsx          # Renderiza HTML del artículo
│   ├── TableOfContents.tsx         # TOC flotante (desktop)
│   ├── ShareButton.tsx
│   ├── CategoryBadge.tsx
│   └── admin/
│       ├── AdminNav.tsx
│       ├── ArticleForm.tsx         # Formulario crear/editar
│       └── DeleteButton.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Cliente browser
│   │   └── server.ts               # Cliente server (SSR)
│   ├── sanitize.ts                 # Sanitización HTML
│   └── utils.ts
├── types/index.ts
├── supabase/
│   ├── schema.sql                  # DDL + RLS + Storage
│   └── seed.sql                    # 3 artículos de ejemplo
├── middleware.ts                   # Protección de rutas /admin
└── README.md
```

---

## Instalación paso a paso

### 0. Copiar assets de marca al directorio público

```bash
# Desde la raíz del proyecto:
mkdir -p public/brand
cp infotrack/lanedata-brand/*.png public/brand/
cp infotrack/lanedata-brand/*.svg public/brand/
```

Estos archivos se usan como favicon y podrás referenciarlos desde cualquier página como `/brand/mark-circle.svg`.

### 1. Clonar e instalar dependencias

```bash
git clone <tu-repo>
cd lanedata
npm install
```

### 2. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto nuevo.
2. Anota la **URL del proyecto** y la **clave anon** (Settings > API).
3. Anota también la **Service Role Key** (Settings > API — mantenla secreta).

### 3. Ejecutar el esquema SQL

En tu proyecto de Supabase, ve a **SQL Editor > New query** y ejecuta:

```sql
-- Primero el esquema
```

Copia y pega el contenido de `supabase/schema.sql` y ejecuta.

Luego, si quieres datos de ejemplo:

```sql
-- Seed con 3 artículos de muestra
```

Copia y pega `supabase/seed.sql` y ejecuta.

### 4. Crear el usuario administrador

En Supabase ve a **Authentication > Users > Add user** y crea un usuario con email y contraseña. Ese será el único acceso al panel `/admin`.

Alternativamente, desde SQL Editor:

```sql
-- No es posible crear usuarios desde SQL directamente en Supabase Auth.
-- Usa el panel: Authentication > Users > Invite user
```

### 5. Variables de entorno

Copia el fichero de ejemplo:

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus valores reales:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJ...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJ...
NEXT_PUBLIC_SITE_URL=https://lanedata.es
```

### 6. Arrancar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## Flujo de publicación

1. Ve a `/login` con tus credenciales.
2. En el panel `/admin`, pulsa **"+ Nuevo artículo"**.
3. Rellena:
   - **Título** → el slug se genera automáticamente.
   - **Descripción corta** → aparece en la portada y en el SEO.
   - **Categoría** y **fecha de publicación**.
   - **Imagen de portada** (URL o sube un fichero — máx. 5 MB).
   - **HTML del artículo** → pega el HTML completo. Se sanea automáticamente al guardar.
4. Selecciona estado **Publicado** y pulsa **"Publicar artículo"**.
5. El artículo aparece en portada. Si es el más reciente, ocupa el lugar destacado.

### Actualizar un artículo

Desde el dashboard, pulsa **Editar** en cualquier fila.

### Eliminar un artículo

Pulsa **Borrar** en el dashboard. Se pide confirmación.

---

## Búsqueda

La búsqueda usa `ILIKE` de PostgreSQL sobre título, descripción y contenido HTML.  
Es instantánea para volúmenes de hasta cientos de artículos.  
Para implementar full-text search nativo con ranking, el campo `search_vector` (generado por Postgres) ya está creado — solo hay que ajustar la query en `app/buscar/page.tsx`.

---

## Despliegue en Vercel (recomendado)

```bash
npm install -g vercel
vercel
```

Vercel detecta Next.js automáticamente. Añade las variables de entorno en el dashboard de Vercel (Settings > Environment Variables).

### Despliegue en Netlify

```bash
npm install -g netlify-cli
netlify deploy --build
```

Configura las variables de entorno en Netlify > Site configuration > Environment variables.

---

## SEO y rendimiento

- **Slugs limpios**: `/articulo/katir-5000m-evolucion-espanol`
- **Metadatos automáticos**: título, descripción, Open Graph y Twitter Card por artículo.
- **Sitemap** generado en `/sitemap.xml` (actualizado en build).
- **ISR** (Incremental Static Regeneration): portada se revalida cada 60s, artículos cada hora.
- Imágenes optimizadas con `next/image`.

---

## Errores, analíticas y legal

La web registra sus propios errores, mide su audiencia sin cookies ni terceros y
publica los cuatro documentos legales obligatorios en España.

Para dejarlo operativo hay **dos pasos manuales**:

1. Ejecutar `supabase/telemetry-schema.sql` en el SQL Editor de Supabase.
2. Rellenar los datos del titular en `lib/legal.ts` (nombre, NIF y domicilio).

Los paneles quedan en `/admin/analiticas` y `/admin/errores`; este último exporta
los fallos a CSV para poder pasárselos a quien los tenga que corregir.

Todo el detalle está en **[docs/telemetria-y-legal.md](docs/telemetria-y-legal.md)**.

---

## Seguridad

- El panel `/admin` está protegido por middleware de Supabase Auth.
- El HTML subido se sanea con `sanitize-html` antes de guardarse: se eliminan `<script>`, iframes y event handlers (`onclick`, `onerror`, etc.), pero se preserva todo el CSS, tablas, imágenes y estructura de maquetación.
- Row Level Security de Supabase: los visitantes solo pueden leer artículos publicados; solo usuarios autenticados pueden escribir.
- Las rutas de API no exponen la Service Role Key al navegador.
- Las tablas de telemetría solo aceptan escrituras anónimas: leerlas o borrarlas
  exige estar autenticado, y los agregados del panel son funciones `SECURITY
  DEFINER` que anon no puede ejecutar.

---

## Paleta de marca

| Token   | Hex       | Uso                              |
|---------|-----------|----------------------------------|
| Ink     | `#0D2A14` | Texto principal, fondos oscuros  |
| Mint    | `#9FE88D` | Acento, badges, CTA principal    |
| Cream   | `#F4F1EA` | Fondos secundarios, tarjetas     |
| Paper   | `#FBFAF6` | Fondo base de la web             |

Tipografías: **Bricolage Grotesque** (800) para titulares y wordmark · **IBM Plex Mono** para etiquetas y metadatos · **Inter** para el cuerpo.
