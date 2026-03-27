# Vōren — Guía de configuración

## Stack completo (todo en Vercel, sin Netlify)

- ✅ Sitio estático en Vercel
- ✅ URLs limpias sin `.html`
- ✅ Panel CMS visual en `/admin` (Decap CMS)
- ✅ Autenticación OAuth con GitHub via funciones serverless en Vercel
- ✅ SEO técnico completo
- ✅ Sin dependencias externas de terceros

---

## Estructura de archivos

```
voren/
├── index.html
├── vercel.json              ← URLs limpias + API routes + headers
├── robots.txt
├── sitemap.xml
├── api/
│   └── auth/
│       ├── index.js         ← Paso 1 OAuth: redirige a GitHub
│       └── callback.js      ← Paso 2 OAuth: recibe token y lo pasa al CMS
├── admin/
│   ├── index.html           ← Panel CMS en /admin
│   └── config.yml           ← Configuración del CMS
├── blog/
│   ├── index.html
│   ├── adherencia-procesos.html
│   ├── ia-vs-orden.html
│   └── importancia-documentar.html
└── _posts/                  ← Artículos creados desde el CMS (se crean solos)
```

---

## Configuración en 3 pasos

### Paso 1 — Subir a GitHub

```bash
git init
git add .
git commit -m "Vōren inicial"
git branch -M main
git remote add origin https://github.com/MBARRAT/escalaserorias.git
git push -u origin main
```

### Paso 2 — Variables de entorno en Vercel

En Vercel → tu proyecto → **Settings → Environment Variables**, añade:

| Variable                | Valor                          |
|-------------------------|--------------------------------|
| `GITHUB_CLIENT_ID`      | El Client ID que ya tienes     |
| `GITHUB_CLIENT_SECRET`  | El Client Secret de GitHub     |

> ⚠️ El Client Secret lo generas en GitHub → Settings → Developer settings →
> OAuth Apps → tu app → "Generate a new client secret"

Después de añadir las variables: **Redeploy** (Vercel → Deployments → botón Redeploy).

### Paso 3 — Verificar la URL de callback en GitHub

En GitHub → Settings → Developer settings → OAuth Apps → tu app, asegúrate de que:

```
Authorization callback URL: https://voren.cl/api/auth/callback
```

> Si estás probando en local, añade también:
> `http://localhost:3000/api/auth/callback`

---

## Usar el panel CMS

1. Ve a `https://voren.cl/admin`
2. Clic en **Login with GitHub**
3. Autoriza la app → se abre el panel editorial

### Crear un artículo nuevo

1. Panel → **Blog — Perspectivas** → **Nuevo Artículo**
2. Rellena: título, slug, categoría, extracto, contenido, SEO
3. Clic **Publicar** → se guarda en GitHub → Vercel hace deploy en ~30s

### Actualizar el sitemap

Cada artículo nuevo requiere añadir una entrada en `sitemap.xml`:

```xml
<url>
  <loc>https://voren.cl/blog/TU-SLUG</loc>
  <lastmod>2025-XX-XX</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
```

---

## Prueba en local (opcional)

```bash
npm i -g vercel
vercel dev
```

Esto levanta las funciones serverless localmente en `http://localhost:3000`.

---

## Registrar en Google Search Console

1. [search.google.com/search-console](https://search.google.com/search-console)
2. Añade propiedad → URL prefix → `https://voren.cl`
3. Verifica via HTML tag en el `<head>` de `index.html`
4. Enviar sitemap: `https://voren.cl/sitemap.xml`
