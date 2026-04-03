#!/usr/bin/env node
/**
 * build-blog.js
 * Lee todos los .md de _posts/, genera:
 *   - blog/[slug]/index.html  para cada artículo
 *   - Actualiza blog/index.html con las cards dinámicas
 *
 * Ejecutar: node build-blog.js
 * En Vercel: configurar Build Command como "node build-blog.js"
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { marked } from 'marked';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POSTS_DIR  = join(__dirname, '_posts');
const BLOG_DIR   = join(__dirname, 'blog');
const INDEX_FILE = join(BLOG_DIR, 'index.html');

// ── Category label map ───────────────────────────────────────────────────────
const CAT_LABEL = {
  estrategia: 'Estrategia',
  tecnologia: 'Tecnología',
  gestion:    'Gestión',
  procesos:   'Procesos',
  datos:      'Inteligencia de Negocios',
  crm:        'CRM & Growth',
};

// ── Date formatter ────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

// ── Read all posts ────────────────────────────────────────────────────────────
function readPosts() {
  if (!existsSync(POSTS_DIR)) return [];
  const files = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const posts = files.map(file => {
    const raw  = readFileSync(join(POSTS_DIR, file), 'utf8');
    const { data, content } = matter(raw);
    return { ...data, content, _file: file };
  });
  // Sort by date descending
  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ── Shared CSS (extracted verbatim from existing article HTMLs) ───────────────
const SHARED_CSS = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--navy:#0D2B5E;--navy-d:#071428;--navy-m:#1a4fa0;--navy-l:#2563cc;--copper:#C8A96E;--copper-l:#E8C98E;--copper-d:#A07840;--ink:#1A2540;--ink2:#2D3A52;--muted:#6B7794;--bg:#F4F6FA;--bg2:#ECF0F8;--bg3:#E0E6F0;--white:#FFFFFF;--ff-d:'DM Serif Display',serif;--ff-s:'Cormorant Garamond',serif;--ff:'DM Sans',sans-serif}
    html{scroll-behavior:smooth}
    body{font-family:var(--ff);background:var(--bg);color:var(--ink);font-weight:300;-webkit-font-smoothing:antialiased;overflow-x:hidden}
    nav{position:fixed;top:0;left:0;right:0;z-index:100;height:70px;display:flex;align-items:center;justify-content:space-between;padding:0 3.5rem;transition:background .4s,box-shadow .4s}
    nav.scrolled{background:rgba(244,246,250,.97);backdrop-filter:blur(24px);box-shadow:0 1px 0 rgba(13,43,94,.08)}
    .nlogo{display:flex;align-items:center;gap:10px;text-decoration:none}
    .nmark{width:34px;height:34px;background:var(--navy);border-radius:6px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
    .nmark::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:var(--copper)}
    .nmark svg{width:16px;height:16px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round}
    .nword{font-family:var(--ff-s);font-size:1.25rem;font-weight:600;color:var(--white);letter-spacing:.03em;transition:color .4s}
    .nword span{color:var(--copper)}
    nav.scrolled .nword{color:var(--navy)}
    .nlinks{display:flex;align-items:center;gap:.2rem}
    .nlinks a{font-size:.78rem;color:rgba(255,255,255,.7);text-decoration:none;padding:.45rem .9rem;border-radius:3px;transition:background .18s,color .18s;letter-spacing:.03em}
    .nlinks a:hover{background:rgba(255,255,255,.1);color:#fff}
    nav.scrolled .nlinks a{color:var(--muted)}
    nav.scrolled .nlinks a:hover{background:var(--bg2);color:var(--navy)}
    .ncta{border:1px solid rgba(200,169,110,.6)!important;color:var(--copper-l)!important}
    .ncta:hover{background:var(--copper)!important;color:var(--navy-d)!important;border-color:var(--copper)!important}
    nav.scrolled .ncta{border-color:var(--copper-d)!important;color:var(--copper-d)!important;background:transparent!important}
    nav.scrolled .ncta:hover{background:var(--navy)!important;color:#fff!important;border-color:var(--navy)!important}
    .pw{max-width:1240px;margin:0 auto;padding:0 3.5rem}
    .reveal{opacity:0;transform:translateY(28px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}
    .reveal.visible{opacity:1;transform:none}
    .rd1{transition-delay:.1s}.rd2{transition-delay:.2s}
    footer{background:#040e1f;padding:4rem 0 2rem}
    .footer-top{display:grid;grid-template-columns:2.5fr 1fr 1fr 1fr;gap:4rem;margin-bottom:3.5rem}
    .fbrand{font-family:var(--ff-s);font-size:1.3rem;font-weight:600;color:#fff;margin-bottom:.85rem}
    .fbrand span{color:var(--copper)}
    .ftagline{font-size:.76rem;color:rgba(255,255,255,.2);line-height:1.75;max-width:240px}
    .fcol-title{font-size:.58rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.18);margin-bottom:1.1rem}
    .fcol a{display:block;font-size:.74rem;color:rgba(255,255,255,.33);text-decoration:none;margin-bottom:.55rem;transition:color .18s}
    .fcol a:hover{color:var(--copper-l)}
    .footer-bottom{display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,.05);padding-top:1.75rem}
    .fcopy{font-size:.67rem;color:rgba(255,255,255,.14)}
    .flegal{display:flex;gap:1.5rem}
    .flegal a{font-size:.67rem;color:rgba(255,255,255,.14);text-decoration:none}
    @keyframes fadeUp{to{opacity:1;transform:none}}
    @keyframes slideUp{to{opacity:1;transform:none}}
`;

const ARTICLE_CSS = `
    .art-hero{min-height:70vh;background:var(--navy-d);display:flex;flex-direction:column;justify-content:flex-end;position:relative;overflow:hidden}
    .art-hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);background-size:50px 50px}
    .art-hero-glow{position:absolute;top:-150px;right:-100px;width:550px;height:550px;border-radius:50%;background:radial-gradient(circle,rgba(200,169,110,.1) 0%,transparent 65%)}
    .art-hero-accent{position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--copper),var(--navy-l),transparent)}
    .art-hero-inner{position:relative;z-index:2;max-width:1240px;margin:0 auto;width:100%;padding:0 3.5rem 4.5rem}
    .back{display:inline-flex;align-items:center;gap:7px;font-size:.7rem;color:rgba(255,255,255,.35);text-decoration:none;margin-bottom:2.5rem;transition:color .2s;letter-spacing:.04em;text-transform:uppercase;opacity:0;transform:translateY(12px);animation:fadeUp .6s .1s forwards}
    .back:hover{color:var(--copper-l)}
    .back svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .art-tag{display:inline-flex;align-items:center;gap:8px;margin-bottom:1.5rem;opacity:0;transform:translateY(12px);animation:fadeUp .6s .25s forwards}
    .art-tag-line{width:18px;height:1px;background:var(--copper)}
    .art-tag span{font-size:.65rem;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--copper-l)}
    .art-hero h1{font-family:var(--ff-d);color:#fff;line-height:1.08;letter-spacing:-.025em;font-size:clamp(2rem,4vw,3.6rem);max-width:820px;margin-bottom:1.75rem;opacity:0;transform:translateY(20px);animation:fadeUp .8s .4s cubic-bezier(.16,1,.3,1) forwards}
    .art-meta-row{display:flex;align-items:center;gap:2rem;opacity:0;animation:fadeUp .6s .6s forwards}
    .art-meta-item{font-size:.7rem;color:rgba(255,255,255,.3);letter-spacing:.04em}
    .art-meta-dot{width:3px;height:3px;border-radius:50%;background:rgba(200,169,110,.4)}
    .progress-bar{position:fixed;top:0;left:0;height:2px;background:var(--copper);z-index:200;width:0;transition:width .1s linear}
    .art-layout{display:grid;grid-template-columns:1fr 300px;gap:5rem;max-width:1240px;margin:0 auto;padding:5rem 3.5rem 6rem;align-items:start}
    .art-body{max-width:680px}
    .art-body p{font-size:.97rem;color:var(--ink2);line-height:1.95;margin-bottom:1.6rem}
    .art-body h2{font-family:var(--ff-d);font-size:1.7rem;font-weight:400;color:var(--navy);margin:3rem 0 1rem;letter-spacing:-.015em}
    .art-body h3{font-family:var(--ff-d);font-size:1.25rem;font-weight:400;color:var(--navy);margin:2rem 0 .75rem}
    .art-body ul{padding-left:1.25rem;margin-bottom:1.6rem}
    .art-body li{font-size:.95rem;color:var(--ink2);line-height:1.9;margin-bottom:.45rem}
    .art-body li::marker{color:var(--copper)}
    .art-body strong{font-weight:500;color:var(--navy)}
    .art-body em{font-style:italic}
    .art-body hr{border:none;border-top:1px solid var(--bg3);margin:2.5rem 0}
    .art-body blockquote{border-left:3px solid var(--copper);padding:1.1rem 1.75rem;margin:2.75rem 0;background:rgba(200,169,110,.04);border-radius:0 3px 3px 0}
    .art-body blockquote p{font-family:var(--ff-s);font-size:1.3rem;font-style:italic;color:var(--navy);line-height:1.5;margin:0}
    .art-sidebar{position:sticky;top:100px;display:flex;flex-direction:column;gap:1.5rem}
    .sidebar-card{background:var(--white);border:1px solid var(--bg3);border-radius:2px;padding:1.5rem}
    .sidebar-card-title{font-size:.62rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--copper-d);margin-bottom:1.1rem;display:flex;align-items:center;gap:7px}
    .sidebar-card-title::before{content:'';width:14px;height:1px;background:var(--copper)}
    .sidebar-toc a{display:block;font-size:.78rem;color:var(--muted);text-decoration:none;padding:.35rem 0;border-bottom:1px solid var(--bg2);transition:color .2s;line-height:1.4}
    .sidebar-toc a:last-child{border-bottom:none}
    .sidebar-toc a:hover{color:var(--navy-m)}
    .sidebar-cta{background:var(--navy);border:none;position:relative;overflow:hidden}
    .sidebar-cta::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--copper),var(--navy-l))}
    .sidebar-cta .sidebar-card-title{color:var(--copper-l)}
    .sidebar-cta .sidebar-card-title::before{background:var(--copper)}
    .sidebar-cta p{font-size:.78rem;color:rgba(255,255,255,.45);line-height:1.65;margin-bottom:1.25rem}
    .sidebar-cta a.cta-btn{display:block;background:var(--copper);color:var(--navy-d);padding:.7rem 1rem;border-radius:2px;font-size:.72rem;font-weight:500;text-decoration:none;letter-spacing:.06em;text-transform:uppercase;text-align:center;transition:background .2s}
    .sidebar-cta a.cta-btn:hover{background:var(--copper-l)}
    .sidebar-share{display:flex;flex-direction:column;gap:.5rem}
    .share-btn{display:flex;align-items:center;gap:.6rem;font-size:.75rem;color:var(--muted);text-decoration:none;padding:.5rem .65rem;border-radius:2px;transition:background .2s,color .2s;cursor:pointer;border:none;background:transparent;font-family:var(--ff);width:100%;text-align:left}
    .share-btn:hover{background:var(--bg2);color:var(--navy)}
    .share-btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;flex-shrink:0}
    .art-cta-block{background:var(--navy);padding:3rem;margin:3rem 0;position:relative;overflow:hidden;border-radius:2px}
    .art-cta-block::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--copper),var(--navy-l))}
    .art-cta-block p{font-size:.9rem;color:rgba(255,255,255,.5);line-height:1.7;margin-bottom:1.5rem;max-width:520px}
    .art-cta-block a{display:inline-flex;align-items:center;gap:8px;background:var(--copper);color:var(--navy-d);padding:.8rem 1.75rem;border-radius:2px;font-size:.75rem;font-weight:500;text-decoration:none;letter-spacing:.07em;text-transform:uppercase;transition:background .2s}
    .art-cta-block a:hover{background:var(--copper-l)}
    .art-nav-row{display:flex;justify-content:space-between;align-items:center;padding:2rem 0;border-top:1px solid var(--bg3);margin-top:1rem}
    .art-nav-row a{font-size:.74rem;font-weight:500;color:var(--navy-m);text-decoration:none;display:flex;align-items:center;gap:6px;letter-spacing:.03em}
    .related-section{background:var(--white);padding:5rem 0;border-top:1px solid var(--bg3)}
    .related-header{display:flex;align-items:center;gap:10px;margin-bottom:2.5rem}
    .related-line{width:22px;height:1px;background:var(--copper)}
    .related-label{font-size:.67rem;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--copper-d)}
    .related-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5px;background:var(--bg3)}
    .related-card{background:var(--white);text-decoration:none;display:flex;align-items:center;gap:1.5rem;padding:1.75rem;transition:background .2s}
    .related-card:hover{background:var(--bg)}
    .related-card-visual{width:64px;height:64px;background:var(--navy);border-radius:2px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
    .related-card-visual span{font-family:var(--ff-s);font-size:1.4rem;font-weight:300;color:rgba(255,255,255,.25)}
    .related-card-tag{font-size:.6rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--copper-d);margin-bottom:.4rem}
    .related-card-title{font-size:.85rem;font-weight:400;color:var(--navy);line-height:1.35;transition:color .2s}
    .related-card:hover .related-card-title{color:var(--navy-m)}
    .related-card-arrow{margin-left:auto;opacity:0;transform:translateX(-4px);transition:opacity .2s,transform .2s;font-size:.85rem;color:var(--navy-m)}
    .related-card:hover .related-card-arrow{opacity:1;transform:none}
    @media(max-width:1024px){
      nav{padding:0 1.75rem}.pw{padding:0 1.75rem}
      .art-hero-inner{padding:0 1.75rem 3.5rem}
      .art-layout{grid-template-columns:1fr;padding:3.5rem 1.75rem 5rem;gap:3rem}
      .art-sidebar{position:static}
      .related-grid{grid-template-columns:1fr}
      .footer-top{grid-template-columns:1fr 1fr}
      .nlinks a:not(.ncta){display:none}
    }
`;

const SHARED_JS = `
<script>
window.addEventListener('scroll',()=>{
  document.getElementById('nav').classList.toggle('scrolled',window.scrollY>60);
});
const obs=new IntersectionObserver(e=>e.forEach(el=>{if(el.isIntersecting)el.target.classList.add('visible');}),{threshold:0.08});
document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));
</script>`;

const NAV_HTML = `
<nav id="nav">
  <a href="/" class="nlogo"><div class="nmark"><svg viewBox="0 0 24 24"><polyline points="4 16 9 11 13 15 20 7"/></svg></div><span class="nword">Vō<span>ren</span></span></a>
  <div class="nlinks">
    <a href="/#servicios">Servicios</a>
    <a href="/#metodo">Método</a>
    <a href="/blog">Perspectivas</a>
    <a href="/#contacto" class="ncta">Agendar sesión</a>
  </div>
</nav>`;

const FOOTER_HTML = `
<footer>
  <div class="pw">
    <div class="footer-top">
      <div><div class="fbrand">Vō<span>ren</span></div><div class="ftagline">Inteligencia estratégica para empresas que crecen con orden y propósito.</div></div>
      <div class="fcol"><div class="fcol-title">Servicios</div><a href="/#servicios">Inteligencia de Negocios</a><a href="/#servicios">Plan Estratégico</a><a href="/#servicios">Procesos</a><a href="/#servicios">CRM y Growth</a></div>
      <div class="fcol"><div class="fcol-title">Empresa</div><a href="/#metodo">Método</a><a href="/blog">Perspectivas</a><a href="/#contacto">Contacto</a></div>
      <div class="fcol"><div class="fcol-title">Contacto</div><a href="mailto:hola@vorenconsultores.cl">hola@voren.cl</a><a href="#">LinkedIn</a><a href="#">Santiago, Chile</a></div>
    </div>
    <div class="footer-bottom"><div class="fcopy">© 2025 Vōren · Todos los derechos reservados</div><div class="flegal"><a href="#">Privacidad</a><a href="#">Términos</a></div></div>
  </div>
</footer>`;

// ── Generate article HTML ─────────────────────────────────────────────────────
function generateArticleHTML(post, allPosts) {
  const catLabel  = CAT_LABEL[post.category] || post.category;
  const dateLabel = formatDate(post.date);
  const metaTitle = post.seo?.meta_title || `${post.title} — Vōren`;
  const metaDesc  = post.seo?.meta_description || post.excerpt;
  const keywords  = Array.isArray(post.seo?.keywords)
    ? post.seo.keywords.join(', ')
    : (post.seo?.keywords || '');

  // Convert markdown body → HTML
  const bodyHTML = marked.parse(post.content || '');

  // Auto-generate TOC from h2 tags
  const h2matches = [...bodyHTML.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)];
  const tocHTML = h2matches.map((m, i) => {
    const id   = `section-${i}`;
    const text = m[1].replace(/<[^>]+>/g, '');
    return `<a href="#${id}">${text}</a>`;
  }).join('\n');

  // Inject IDs into h2s
  let bodyWithIds = bodyHTML;
  h2matches.forEach((m, i) => {
    bodyWithIds = bodyWithIds.replace(m[0], `<h2 id="section-${i}">${m[1]}</h2>`);
  });

  // Related posts (up to 2, excluding current)
  const related = allPosts.filter(p => p.slug !== post.slug).slice(0, 2);
  const relatedHTML = related.map((r, i) => `
      <a href="/blog/${r.slug}" class="related-card reveal rd${i}">
        <div class="related-card-visual"><span>${String(i+1).padStart(2,'0')}</span></div>
        <div>
          <div class="related-card-tag">${CAT_LABEL[r.category] || r.category}</div>
          <div class="related-card-title">${r.title}</div>
        </div>
        <div class="related-card-arrow">→</div>
      </a>`).join('\n');

  const ogImage = post.thumbnail
    ? `https://vorenconsultores.cl${post.thumbnail}`
    : 'https://vorenconsultores.cl/assets/img/og-default.png';
  const thumbnailMeta = `<meta property="og:image" content="${ogImage}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:image" content="${ogImage}"/>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${metaTitle}</title>
  <meta name="description" content="${metaDesc}"/>
  ${keywords ? `<meta name="keywords" content="${keywords}"/>` : ''}
  <link rel="canonical" href="https://vorenconsultores.cl/blog/${post.slug}"/>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
  <meta property="og:type" content="article"/>
  <meta property="og:title" content="${metaTitle}"/>
  <meta property="og:description" content="${metaDesc}"/>
  <meta property="og:locale" content="es_CL"/>
  <meta property="og:url" content="https://vorenconsultores.cl/blog/${post.slug}"/>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${post.title.replace(/"/g, '\\"')}",
    "description": "${metaDesc.replace(/"/g, '\\"')}",
    "datePublished": "${new Date(post.date).toISOString()}",
    "author": {
      "@type": "Organization",
      "name": "Vōren",
      "url": "https://vorenconsultores.cl"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Vōren",
      "url": "https://vorenconsultores.cl"
    },
    "mainEntityOfPage": "https://vorenconsultores.cl/blog/${post.slug}"
  }
  </script>

  ${thumbnailMeta}
  <link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300;1,400&display=swap" rel="stylesheet"/>
  <style>${SHARED_CSS}${ARTICLE_CSS}</style>
</head>
<body>

<div class="progress-bar" id="progress"></div>
${NAV_HTML}

<div class="art-hero">
  <div class="art-hero-grid"></div>
  <div class="art-hero-glow"></div>
  <div class="art-hero-accent"></div>
  <div class="art-hero-inner">
    <a href="/blog" class="back">
      <svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      Perspectivas
    </a>
    <div class="art-tag"><div class="art-tag-line"></div><span>${catLabel}</span></div>
    <h1>${post.title}</h1>
    <div class="art-meta-row">
      <div class="art-meta-item">${dateLabel}</div>
      <div class="art-meta-dot"></div>
      <div class="art-meta-item">${post.readtime} min de lectura</div>
      <div class="art-meta-dot"></div>
      <div class="art-meta-item">Vōren</div>
    </div>
  </div>
</div>

<div class="art-layout">
  <div class="art-body reveal">
    ${bodyWithIds}

    <div class="art-cta-block reveal">
      <p>¿Quieres aplicar estas ideas en tu organización? Conversemos sobre cómo hacerlo.</p>
      <a href="/#contacto">Agendar sesión gratuita <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
    </div>

    <div class="art-nav-row reveal">
      <a href="/blog">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Todas las perspectivas
      </a>
    </div>
  </div>

  <aside class="art-sidebar reveal rd1">
    <div class="sidebar-card">
      <div class="sidebar-card-title">En este artículo</div>
      <div class="sidebar-toc">
        ${tocHTML || '<a href="#">Introducción</a>'}
      </div>
    </div>
    <div class="sidebar-card sidebar-cta">
      <div class="sidebar-card-title">Sesión gratuita</div>
      <p>¿Tu organización necesita una mirada estratégica externa? Conversemos.</p>
      <a href="/#contacto" class="cta-btn">Agendar ahora →</a>
    </div>
    <div class="sidebar-card">
      <div class="sidebar-card-title">Compartir</div>
      <div class="sidebar-share">
        <button class="share-btn" onclick="navigator.clipboard.writeText(window.location.href)">
          <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          Copiar enlace
        </button>
        <a href="https://www.linkedin.com/sharing/share-offsite/?url=https://vorenconsultores.cl/blog/${post.slug}" target="_blank" class="share-btn">
          <svg viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
          LinkedIn
        </a>
      </div>
    </div>
  </aside>
</div>

${related.length > 0 ? `
<section class="related-section">
  <div class="pw">
    <div class="related-header"><div class="related-line"></div><div class="related-label">Seguir leyendo</div></div>
    <div class="related-grid">${relatedHTML}</div>
  </div>
</section>` : ''}

${FOOTER_HTML}

${SHARED_JS}
<script>
window.addEventListener('scroll',()=>{
  const d=document.documentElement,b=document.body;
  const p=(d.scrollTop||b.scrollTop)/((d.scrollHeight||b.scrollHeight)-d.clientHeight)*100;
  document.getElementById('progress').style.width=p+'%';
});
</script>
</body>
</html>`;
}

// ── Update blog/index.html dynamic section ────────────────────────────────────
function updateBlogIndex(posts) {
  if (!existsSync(INDEX_FILE)) {
    console.log('⚠️  blog/index.html not found — skipping index update');
    return;
  }

  let html = readFileSync(INDEX_FILE, 'utf8');

  // 1. Remove custom cursor HTML divs and JS
  html = html.replace(/<div class="cursor"[^>]*><\/div>\s*/g, '');
  html = html.replace(/<div class="cursor-ring"[^>]*><\/div>\s*/g, '');
  // Remove the full cursor JS block from /* Cursor */ through the IIFE closing
  html = html.replace(/\/\* Cursor \*\/[\s\S]*?\}\)\(\);\s*\n/g, '\n');
  // Remove cursor hover listeners block
  html = html.replace(/document\.querySelectorAll\('a,button[\s\S]{0,300}borderColor='rgba\(200,169,110,\.4\)';\s*\}\);\s*\}\);\s*\n/g, '');

  // 2. Update article count
  html = html.replace(
    /(<div class="hero-count"[^>]*>)[^<]*(<\/div>)/,
    `$1${String(posts.length).padStart(2,'0')}$2`
  );
  html = html.replace(
    /(<span id="count-num">)[^<]*(< \/span>|<\/span>)/,
    `$1${posts.length}$2`
  );

  // 3. Featured card
  const featured = posts.find(p => p.featured) || posts[0];
  if (featured) {
    const catLabel  = CAT_LABEL[featured.category] || featured.category;
    const dateLabel = formatDate(featured.date);

    // Thumbnail: show as background image on the visual panel if present
    const visualStyle = featured.thumbnail
      ? ` style="background:url('${featured.thumbnail}') center/cover no-repeat, var(--navy)"`
      : '';

    const featuredCard = `<a href="/blog/${featured.slug}" class="featured-card reveal" data-cat="${featured.category}">
        <div class="featured-visual"${visualStyle}>
          <div class="featured-visual-grid"></div>
          <div class="featured-visual-glow"></div>
          <div class="featured-visual-label">01</div>
          <div class="featured-visual-tag">Destacado</div>
        </div>
        <div class="featured-body">
          <div class="featured-eyebrow"><div class="featured-eyebrow-line"></div><span>${catLabel} · ${dateLabel} · ${featured.readtime} min</span></div>
          <div class="featured-title">${featured.title}</div>
          <div class="featured-excerpt">${featured.excerpt}</div>
          <div class="featured-foot">
            <div class="featured-meta">${dateLabel}</div>
            <div class="featured-cta">Leer artículo <span class="featured-cta-arrow">→</span></div>
          </div>
        </div>
      </a>`;

    // Replace everything between <section class="featured-section"> and </section>
    html = html.replace(
      /(<section class="featured-section">)([\s\S]*?)(<\/section>)/,
      `$1\n    ${featuredCard}\n  $3`
    );
  }

  // 4. Grid cards (all posts except featured, sorted by date)
  const featured_slug = featured?.slug;
  const gridPosts = posts.filter(p => p.slug !== featured_slug);

  const gridCards = gridPosts.map((post, i) => {
    const catLabel  = CAT_LABEL[post.category] || post.category;
    const dateLabel = formatDate(post.date);
    // Card visual: use thumbnail as background if present
    const visualStyle = post.thumbnail
      ? ` style="background:url('${post.thumbnail}') center/cover no-repeat, var(--navy)"`
      : '';
    return `
      <a href="/blog/${post.slug}" class="art-card reveal rd${i+1}" data-cat="${post.category}">
        <div class="art-card-visual"${visualStyle}>
          <div class="art-card-visual-grid"></div>
          <div class="art-card-visual-num">${String(i+2).padStart(2,'0')}</div>
          <div class="art-card-tag">${catLabel}</div>
        </div>
        <div class="art-card-body">
          <div class="art-card-title">${post.title}</div>
          <div class="art-card-excerpt">${post.excerpt}</div>
          <div class="art-card-foot">
            <span class="art-card-date">${dateLabel} · ${post.readtime} min</span>
            <span class="art-card-read">Leer <span class="art-card-arrow">→</span></span>
          </div>
        </div>
      </a>`;
  }).join('\n');

  // Replace articles-grid content using id anchor
  html = html.replace(
    /(<div class="articles-grid"[^>]*id="articles-grid"[^>]*>)([\s\S]*?)(<\/div>\s*\n\s*<\/section>)/,
    `$1\n${gridCards}\n\n    </div>\n  </section>`
  );

  writeFileSync(INDEX_FILE, html, 'utf8');
  console.log(`✅ blog/index.html updated — ${posts.length} posts, cursor removed, thumbnails injected`);
}


// ── Update sitemap.xml ────────────────────────────────────────────────────────
function updateSitemap(posts) {
  const SITEMAP = join(__dirname, 'sitemap.xml');
  if (!existsSync(SITEMAP)) {
    console.log('⚠️  sitemap.xml not found — skipping');
    return;
  }

  const today = new Date().toISOString().split('T')[0];

  // Static pages — always present
  const staticUrls = `  <!-- Home -->
  <url>
    <loc>https://vorenconsultores.cl/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- Blog index -->
  <url>
    <loc>https://vorenconsultores.cl/blog/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;

  // Dynamic blog posts
  const postUrls = posts.map(post => {
    const lastmod = new Date(post.date).toISOString().split('T')[0];
    return `  <url>
    <loc>https://vorenconsultores.cl/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${staticUrls}
  <!-- Blog posts -->
${postUrls}
</urlset>`;

  writeFileSync(SITEMAP, sitemap, 'utf8');
  console.log(`✅ sitemap.xml updated — ${posts.length} posts indexed`);
}


// ── Patch blog/index.html: compact hero + card images + newsletter ────────────
function patchBlogIndex(posts) {
  const INDEX_FILE = join(__dirname, 'blog', 'index.html');
  if (!existsSync(INDEX_FILE)) return;
  let html = readFileSync(INDEX_FILE, 'utf8');

  // A) Compact hero — center vertically, compensate for fixed nav
  html = html.replace(
    '.hero{min-height:90vh;background:var(--navy-d);display:flex;flex-direction:column;justify-content:flex-end;padding:0;position:relative;overflow:hidden}',
    '.hero{min-height:60vh;background:var(--navy-d);display:flex;flex-direction:column;justify-content:center;padding-top:70px;position:relative;overflow:hidden}'
  );
  html = html.replace(
    '.hero-content{position:relative;z-index:2;padding:0 3.5rem 5rem;max-width:1240px;margin:0 auto;width:100%}',
    '.hero-content{position:relative;z-index:2;padding:2rem 3.5rem 3rem;max-width:1240px;margin:0 auto;width:100%}'
  );
  html = html.replace(
    '.hero-eyebrow{display:inline-flex;align-items:center;gap:8px;margin-bottom:2rem;',
    '.hero-eyebrow{display:inline-flex;align-items:center;gap:8px;margin-bottom:1.25rem;'
  );
  html = html.replace(
    '.hero-headline{font-family:var(--ff-d);color:#fff;line-height:1.05;letter-spacing:-.025em;margin-bottom:2rem}',
    '.hero-headline{font-family:var(--ff-d);color:#fff;line-height:1.05;letter-spacing:-.025em;margin-bottom:0}'
  );

  // B) Card images — inject thumbnail as background on art-card-visual
  // This is handled per-card in updateBlogIndex already via visualStyle
  // Just ensure the CSS supports background-size:cover on art-card-visual
  html = html.replace(
    '.art-card-visual{height:180px;background:var(--navy);position:relative;overflow:hidden}',
    '.art-card-visual{height:180px;background:var(--navy);position:relative;overflow:hidden;background-size:cover;background-position:center}'
  );

  // C) Newsletter — replace static form with connected version
  const newNewsletter = `<section class="newsletter-section">
  <div class="pw">
    <div class="newsletter-inner">
      <div class="reveal">
        <div class="nl-eyebrow"><div class="nl-eyebrow-line"></div><span>Perspectivas directas</span></div>
        <h2 class="nl-title">Ideas que llegan<br><em>a tu bandeja</em></h2>
        <p class="nl-sub">Una perspectiva por semana. Sin ruido, sin ventas. Solo ideas accionables sobre estrategia, datos y procesos para empresas que crecen.</p>
      </div>
      <div class="reveal rd2">
        <div class="nl-form" id="nl-form">
          <input class="nl-input" type="email" id="nl-email" placeholder="tu@empresa.cl" autocomplete="email"/>
          <button class="nl-btn" id="nl-btn" onclick="suscribir()">Suscribirse</button>
        </div>
        <p id="nl-msg" style="font-size:.67rem;color:rgba(255,255,255,.2);margin-top:.85rem;line-height:1.6">Sin spam. Puedes darte de baja cuando quieras.</p>
      </div>
    </div>
  </div>
</section>`;

  html = html.replace(
    /(<section class="newsletter-section">)[\s\S]*?(<\/section>)/,
    newNewsletter
  );

  // D) Add newsletter JS before closing </script>
  const nlScript = `
function suscribir() {
  const email = document.getElementById('nl-email').value.trim();
  const btn   = document.getElementById('nl-btn');
  const msg   = document.getElementById('nl-msg');
  if (!email || !email.includes('@')) {
    msg.textContent = 'Por favor ingresa un email válido.';
    msg.style.color = 'rgba(200,169,110,.8)';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Enviando...';
  fetch('/api/newsletter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      fuente: 'blog',
      utm_source: new URLSearchParams(window.location.search).get('utm_source'),
      utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
      utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
    })
  })
  .then(r => r.json())
  .then(data => {
    if (data.ok) {
      document.getElementById('nl-form').innerHTML = '<p style="font-size:.9rem;color:var(--copper-l);font-weight:500;">¡Listo! Te escribimos pronto.</p>';
      msg.style.display = 'none';
    } else {
      msg.textContent = data.error || 'Hubo un error. Intenta de nuevo.';
      msg.style.color = 'rgba(200,169,110,.8)';
      btn.disabled = false;
      btn.textContent = 'Suscribirse';
    }
  })
  .catch(() => {
    msg.textContent = 'Error de conexión. Intenta de nuevo.';
    msg.style.color = 'rgba(200,169,110,.8)';
    btn.disabled = false;
    btn.textContent = 'Suscribirse';
  });
}`;

  // Insert before last </script>
  const lastScript = html.lastIndexOf('</script>');
  if (lastScript !== -1) {
    html = html.slice(0, lastScript) + nlScript + '\n</script>' + html.slice(lastScript + 9);
  }

  writeFileSync(INDEX_FILE, html, 'utf8');
  console.log('✅ blog/index.html patched — compact hero, card images CSS, newsletter connected');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📚 Reading posts from _posts/...');
  const posts = readPosts();
  console.log(`   Found ${posts.length} post(s)`);

  if (posts.length === 0) {
    console.log('   No posts found. Skipping generation.');
    return;
  }

  // Generate individual article pages
  for (const post of posts) {
    if (!post.slug) {
      console.warn(`⚠️  Skipping post without slug: ${post._file}`);
      continue;
    }

    const outDir  = join(BLOG_DIR, post.slug);
    const outFile = join(outDir, 'index.html');

    mkdirSync(outDir, { recursive: true });
    const html = generateArticleHTML(post, posts);
    writeFileSync(outFile, html, 'utf8');
    console.log(`✅ Generated: blog/${post.slug}/index.html`);
  }

  // Update blog index
  updateBlogIndex(posts);

  // Patch blog index extras
  patchBlogIndex(posts);

  // Update root index.html blog preview
  updateRootIndex(posts);

  // Update sitemap.xml
  updateSitemap(posts);

  console.log('\n🎉 Build complete!');
}

// ── Update root index.html blog preview section ──────────────────────────────
function updateRootIndex(posts) {
  const ROOT_INDEX = join(__dirname, 'index.html');
  if (!existsSync(ROOT_INDEX)) {
    console.log('⚠️  root index.html not found — skipping');
    return;
  }

  let html = readFileSync(ROOT_INDEX, 'utf8');

  // Show 3 most recent posts
  const recent = posts.slice(0, 3);

  const cards = recent.map((post, i) => {
    const catLabel = CAT_LABEL[post.category] || post.category;
    const d = new Date(post.date);
    const shortDate = d.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })
      .replace(/^./, c => c.toUpperCase());
    const delay = ((i + 1) * 0.1).toFixed(1);
    return `<a href="/blog/${post.slug}" class="blog-card reveal" style="transition-delay:${delay}s"><div class="bc-bar"></div><div class="bc-body"><span class="bc-tag">${catLabel}</span><div class="bc-title">${post.title}</div><div class="bc-exc">${post.excerpt}</div><div class="bc-foot"><span class="bc-date">${shortDate} · ${post.readtime} min</span><span class="bc-read">Leer <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span></div></div></a>`;
  }).join('\n    ');

  // Replace the blog-grid content
  html = html.replace(
    /(<div class="blog-grid">)([\s\S]*?)(<\/div>\s*\n<\/div><\/section>)/,
    `$1\n    ${cards}\n  $3`
  );

  writeFileSync(ROOT_INDEX, html, 'utf8');
  console.log(`✅ root index.html updated — showing ${recent.length} recent posts`);
}

main().catch(err => { console.error('❌ Build failed:', err); process.exit(1); });
