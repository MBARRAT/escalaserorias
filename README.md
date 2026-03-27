# Vōren — Guía de configuración completa

## Qué incluye esta versión

- ✅ URLs limpias sin `.html` (via Vercel `cleanUrls`)
- ✅ Panel CMS visual en `/admin` (Decap CMS)
- ✅ SEO técnico completo (meta tags, Open Graph, Schema.org, sitemap, robots.txt)
- ✅ Headers de seguridad HTTP
- ✅ Redirects automáticos de URLs antiguas

---

## Paso 1 — Subir el sitio a GitHub

Si aún no tienes el sitio en GitHub:

```bash
# En la carpeta del proyecto
git init
git add .
git commit -m "Vōren inicial"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

---

## Paso 2 — Conectar GitHub a Vercel

1. Entra a [vercel.com](https://vercel.com)
2. **Add New Project** → importa tu repositorio de GitHub
3. En la configuración: `Framework Preset = Other`, `Output Directory = .`
4. Deploy

Las URLs limpias se activan automáticamente gracias a `"cleanUrls": true` en `vercel.json`.

---

## Paso 3 — Activar el CMS (Decap CMS)

### 3a. Registrar OAuth App en GitHub

1. GitHub → Settings → Developer settings → **OAuth Apps** → New OAuth App
2. Rellena:
   - **Application name:** `Vōren CMS`
   - **Homepage URL:** `https://voren.cl`
   - **Authorization callback URL:** `https://api.netlify.com/auth/done`
3. Guarda el **Client ID** y genera un **Client Secret**

### 3b. Crear sitio en Netlify (solo para autenticación — gratis)

> Aunque el sitio vive en Vercel, Netlify se usa únicamente como servidor de OAuth.
> Es gratuito y tarda 2 minutos.

1. Entra a [netlify.com](https://netlify.com) → New site → Deploy manually (sube cualquier archivo HTML)
2. Site settings → **Access control → OAuth** → Install provider → GitHub
3. Pega el Client ID y Client Secret del paso anterior

### 3c. Editar config.yml

Abre `admin/config.yml` y cambia la línea:

```yaml
backend:
  name: github
  repo: TU-USUARIO/TU-REPO   # ← pon aquí tu usuario y repo de GitHub
  branch: main
```

### 3d. Usar el panel

1. Ve a `https://voren.cl/admin`
2. Haz clic en **Login with GitHub**
3. ¡Listo! Tienes un panel visual para escribir artículos

---

## Cómo publicar un artículo nuevo

1. Ve a `voren.cl/admin`
2. Click en **"Blog — Perspectivas"** → **"Nuevo Artículo"**
3. Rellena los campos:
   - **Título** (máx. 70 caracteres)
   - **Slug** (URL del artículo, ej: `mi-nuevo-articulo`)
   - **Categoría**, **Tiempo de lectura**, **Extracto**
   - **Contenido** — editor visual con soporte Markdown
   - **SEO** — meta título, descripción, palabras clave
4. Click **"Publicar"** → el artículo se guarda en GitHub → Vercel hace el deploy en ~30 segundos

### Actualizar el sitemap

Cada vez que publiques un artículo nuevo, añade su URL en `sitemap.xml`:

```xml
<url>
  <loc>https://voren.cl/blog/TU-NUEVO-SLUG</loc>
  <lastmod>2025-XX-XX</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
```

---

## SEO — Qué tiene cada página

Cada página HTML incluye:

| Elemento | Descripción |
|---|---|
| `<title>` | Título optimizado con nombre de marca |
| `meta description` | 140-160 caracteres descriptivos |
| `meta keywords` | Palabras clave relevantes |
| `canonical` | URL canónica para evitar duplicados |
| `og:title / og:description / og:image` | Open Graph para redes sociales |
| `twitter:card` | Tarjeta enriquecida para Twitter/X |
| `Schema.org JSON-LD` | Datos estructurados para Google |
| `robots` | Index/follow en páginas públicas, noindex en /admin |
| `sitemap.xml` | Mapa del sitio para Google Search Console |
| `robots.txt` | Instrucciones para rastreadores |

### Registrar en Google Search Console

1. Ve a [search.google.com/search-console](https://search.google.com/search-console)
2. Añade propiedad → URL prefix → `https://voren.cl`
3. Verifica via HTML tag (añade el meta tag a `<head>` de `index.html`)
4. Enviar sitemap: `https://voren.cl/sitemap.xml`

---

## Estructura de archivos

```
voren/
├── index.html              ← Homepage
├── vercel.json             ← URLs limpias + headers + redirects
├── robots.txt              ← Instrucciones para Google
├── sitemap.xml             ← Mapa del sitio
├── admin/
│   ├── index.html          ← Panel CMS (accede en /admin)
│   └── config.yml          ← Configuración del CMS
├── blog/
│   ├── index.html          ← Índice del blog
│   ├── adherencia-procesos.html
│   ├── ia-vs-orden.html
│   └── importancia-documentar.html
└── _posts/                 ← Artículos creados desde el CMS (se crean solos)
```

---

## Preguntas frecuentes

**¿Por qué Netlify si el sitio está en Vercel?**
Netlify solo se usa como servidor OAuth (autenticación). El sitio vive en Vercel. Es la forma más simple de activar el login de GitHub en Decap CMS sin escribir código de backend.

**¿Puedo usar mi dominio personalizado?**
Sí. En Vercel → Settings → Domains → añade `voren.cl`. Vercel configura el SSL automáticamente.

**¿Los artículos del CMS aparecen automáticamente en el blog?**
Depende de si el sitio está configurado como sitio estático puro (HTML) o como generador de sitios. Con la configuración actual (HTML puro), tendrás que añadir las cards manualmente a `blog/index.html`. Para automatización total, el siguiente paso sería migrar a **Astro** o **Eleventy** — frameworks que leen los archivos del CMS y generan las páginas automáticamente.
