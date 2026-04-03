/**
 * api/unsubscribe.js
 * Maneja cancelación de suscripción al newsletter
 * GET /api/unsubscribe?email=xxx  → muestra página de confirmación
 * POST /api/unsubscribe           → procesa la baja
 *
 * Env vars: SUPABASE_URL, SUPABASE_ANON_KEY
 */

export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).send(errorPage('Error de configuración del servidor.'));
  }

  // ── GET: mostrar página de confirmación ─────────────────────────────────
  if (req.method === 'GET') {
    const email = req.query?.email || '';
    return res.status(200).setHeader('Content-Type', 'text/html').send(confirmPage(email));
  }

  // ── POST: procesar la baja ───────────────────────────────────────────────
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    const email = (body.email || '').toLowerCase().trim();

    if (!email || !email.includes('@')) {
      return res.status(400).send(errorPage('Email inválido.'));
    }

    try {
      // Marcar como estado='baja' en vez de eliminar (para auditoría)
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/suscriptores?email=eq.${encodeURIComponent(email)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            estado:  'baja',
            baja_at: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.error('Supabase unsubscribe error:', err);
        return res.status(500).send(errorPage('Error al procesar tu solicitud. Intenta de nuevo.'));
      }

      return res.status(200).setHeader('Content-Type', 'text/html').send(successPage(email));

    } catch (err) {
      console.error('Unsubscribe handler error:', err);
      return res.status(500).send(errorPage('Error interno del servidor.'));
    }
  }

  return res.status(405).send(errorPage('Método no permitido.'));
}

// ── HTML helpers ─────────────────────────────────────────────────────────────

function confirmPage(email) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Cancelar suscripción — Vōren</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:#F5F6F8;color:#111827;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;font-weight:300;}
    .card{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:10px;padding:3rem;max-width:440px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.06);}
    .logo{font-family:'DM Serif Display',serif;font-size:1.6rem;color:#111827;margin-bottom:.25rem;}
    .logo span{color:#8B6020;}
    .icon{width:52px;height:52px;background:rgba(239,68,68,.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:1.5rem auto 1rem;}
    .icon svg{width:24px;height:24px;stroke:#ef4444;fill:none;stroke-width:2;stroke-linecap:round;}
    h1{font-family:'DM Serif Display',serif;font-size:1.4rem;font-weight:400;color:#111827;margin-bottom:.75rem;}
    p{font-size:.88rem;color:#6B7280;line-height:1.7;margin-bottom:1.5rem;}
    .email{font-weight:500;color:#111827;}
    .btn-danger{width:100%;background:#ef4444;color:#fff;border:none;padding:.85rem;border-radius:6px;font-size:.82rem;font-weight:500;letter-spacing:.04em;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background .2s;margin-bottom:.75rem;}
    .btn-danger:hover{background:#dc2626;}
    .btn-cancel{width:100%;background:transparent;color:#6B7280;border:1px solid rgba(0,0,0,.1);padding:.85rem;border-radius:6px;font-size:.82rem;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;}
    .btn-cancel:hover{border-color:rgba(0,0,0,.2);color:#111827;}
    .footer{margin-top:2rem;font-size:.72rem;color:#9CA3AF;}
    .footer a{color:#8B6020;text-decoration:none;}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Vō<span>ren</span></div>
    <div class="icon">
      <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
    </div>
    <h1>¿Cancelar suscripción?</h1>
    <p>Dejarás de recibir <strong>Perspectivas Vōren</strong> en <span class="email">${escapeHtml(email)}</span>.<br>Puedes volver a suscribirte cuando quieras.</p>
    <form method="POST" action="/api/unsubscribe">
      <input type="hidden" name="email" value="${escapeHtml(email)}"/>
      <button type="submit" class="btn-danger">Sí, cancelar mi suscripción</button>
    </form>
    <button class="btn-cancel" onclick="history.back()">No, quiero seguir recibiendo emails</button>
  </div>
  <div class="footer">
    <a href="https://vorenconsultores.cl">vorenconsultores.cl</a>
  </div>
</body>
</html>`;
}

function successPage(email) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Suscripción cancelada — Vōren</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:#F5F6F8;color:#111827;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;font-weight:300;}
    .card{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:10px;padding:3rem;max-width:440px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.06);}
    .logo{font-family:'DM Serif Display',serif;font-size:1.6rem;color:#111827;margin-bottom:.25rem;}
    .logo span{color:#8B6020;}
    .icon{width:52px;height:52px;background:rgba(34,197,94,.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:1.5rem auto 1rem;}
    .icon svg{width:24px;height:24px;stroke:#22c55e;fill:none;stroke-width:2;stroke-linecap:round;}
    h1{font-family:'DM Serif Display',serif;font-size:1.4rem;font-weight:400;color:#111827;margin-bottom:.75rem;}
    p{font-size:.88rem;color:#6B7280;line-height:1.7;margin-bottom:1.75rem;}
    .btn-home{display:inline-block;background:#0D2B5E;color:#fff;border:none;padding:.85rem 2rem;border-radius:6px;font-size:.82rem;font-weight:500;letter-spacing:.04em;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background .2s;text-decoration:none;}
    .btn-home:hover{background:#1a4fa0;}
    .footer{margin-top:2rem;font-size:.72rem;color:#9CA3AF;}
    .footer a{color:#8B6020;text-decoration:none;}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Vō<span>ren</span></div>
    <div class="icon">
      <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <h1>Suscripción cancelada</h1>
    <p><span style="font-weight:500;color:#111827">${escapeHtml(email)}</span> ha sido eliminado de nuestra lista.<br>No recibirás más emails de Vōren Perspectivas.</p>
    <a href="https://vorenconsultores.cl" class="btn-home">Volver al sitio</a>
  </div>
  <div class="footer">
    <a href="https://vorenconsultores.cl">vorenconsultores.cl</a>
  </div>
</body>
</html>`;
}

function errorPage(msg) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Error — Vōren</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:#F5F6F8;color:#111827;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;font-weight:300;}
    .card{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:10px;padding:3rem;max-width:440px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.06);}
    .logo{font-family:'DM Serif Display',serif;font-size:1.6rem;color:#111827;margin-bottom:.25rem;}
    .logo span{color:#8B6020;}
    h1{font-family:'DM Serif Display',serif;font-size:1.3rem;font-weight:400;color:#111827;margin:1.5rem 0 .75rem;}
    p{font-size:.88rem;color:#6B7280;line-height:1.7;margin-bottom:1.75rem;}
    a{color:#8B6020;}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Vō<span>ren</span></div>
    <h1>Algo salió mal</h1>
    <p>${escapeHtml(msg)}<br>Si el problema persiste, escríbenos a <a href="mailto:hola@vorenconsultores.cl">hola@vorenconsultores.cl</a></p>
    <a href="https://vorenconsultores.cl">← Volver al sitio</a>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
