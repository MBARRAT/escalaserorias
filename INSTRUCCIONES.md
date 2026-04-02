# Instrucciones de instalación

## Qué agregar al repo (solo 2 archivos)

Copia `build-blog.js` y `package.json` a la raíz del repo `MBARRAT/escalaserorias`.

**NO toques nada más** — todo lo demás (admin/, api/, blog/*.html, vercel.json) queda igual.

## Configurar Vercel

En el dashboard de Vercel → tu proyecto → Settings → General:

- **Build Command:** `npm install && node build-blog.js`
- **Output Directory:** `.` (punto — el directorio raíz)
- **Install Command:** (dejar vacío)

## Cómo funciona

Cada vez que publicas en Sveltia CMS:
1. Sveltia guarda el .md en `_posts/`
2. GitHub hace commit automático → Vercel detecta el cambio
3. Vercel corre `npm install && node build-blog.js`
4. El script genera `blog/[slug]/index.html` por cada artículo
5. Actualiza el contador y las cards en `blog/index.html`
6. El artículo aparece en vorenconsultores.cl/blog/[slug]

## Frontmatter que usa el CMS (ya configurado correctamente)

El CMS ya guarda los campos correctos:
- `title`, `slug`, `date`, `category`, `readtime`, `excerpt`
- `featured` (boolean) — el artículo marcado featured aparece primero
- `thumbnail` — imagen destacada (opcional)
- `seo.meta_title`, `seo.meta_description`, `seo.keywords`

## Prueba local

```bash
npm install
node build-blog.js
```
