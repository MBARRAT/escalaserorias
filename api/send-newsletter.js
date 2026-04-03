/**
 * api/send-newsletter.js
 * Envía una campaña de newsletter via Resend
 * POST /api/send-newsletter
 *
 * Body:
 *   { asunto, body, segmento?, prueba?, email_prueba?, from_name? }
 *
 * Headers:
 *   Authorization: Bearer <supabase_user_token>
 *
 * Env vars necesarias en Vercel:
 *   RESEND_API_KEY        — API key de Resend
 *   SUPABASE_URL          — URL de tu proyecto Supabase
 *   SUPABASE_SERVICE_KEY  — Service role key (para leer suscriptores sin RLS)
 *   FROM_EMAIL            — Email remitente verificado en Resend (ej: hola@vorenconsultores.cl)
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // ── Auth: verificar token Supabase ──────────────────────────────────────
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const SB_URL = process.env.SUPABASE_URL;
  const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || 'hola@vorenconsultores.cl';

  if (!SB_URL || !SB_SERVICE_KEY || !RESEND_KEY) {
    console.error('Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY');
    return res.status(500).json({ error: 'Configuración incompleta en el servidor' });
  }

  // Verificar usuario autenticado
  try {
    const userRes = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${token}` }
    });
    if (!userRes.ok) return res.status(401).json({ error: 'Sesión inválida' });
  } catch {
    return res.status(401).json({ error: 'Error al verificar sesión' });
  }

  const { asunto, body, segmento = 'todos', prueba = false, email_prueba, from_name = 'Vōren Perspectivas' } = req.body;

  if (!asunto || !body) {
    return res.status(400).json({ error: 'Faltan campos: asunto y body son requeridos' });
  }

  // ── Modo prueba ─────────────────────────────────────────────────────────
  if (prueba) {
    if (!email_prueba || !email_prueba.includes('@')) {
      return res.status(400).json({ error: 'Email de prueba inválido' });
    }
    const result = await enviarEmail({
      to: email_prueba,
      from: `${from_name} <${FROM_EMAIL}>`,
      subject: `[PRUEBA] ${asunto}`,
      html: buildEmailHTML(asunto, body),
      resendKey: RESEND_KEY,
    });
    if (!result.ok) return res.status(500).json({ error: result.error });
    return res.status(200).json({ ok: true, message: `Prueba enviada a ${email_prueba}` });
  }

  // ── Obtener suscriptores según segmento ─────────────────────────────────
  let query = `${SB_URL}/rest/v1/suscriptores?select=email,nombre&activo=neq.false`;
  if (segmento !== 'todos') {
    query += `&fuente=eq.${encodeURIComponent(segmento)}`;
  }

  let suscriptores = [];
  try {
    const sbRes = await fetch(query, {
      headers: {
        'apikey': SB_SERVICE_KEY,
        'Authorization': `Bearer ${SB_SERVICE_KEY}`,
      }
    });
    if (!sbRes.ok) throw new Error('Error al consultar suscriptores');
    suscriptores = await sbRes.json();
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener suscriptores: ' + err.message });
  }

  if (!suscriptores.length) {
    return res.status(400).json({ error: 'No hay suscriptores activos para este segmento' });
  }

  // ── Enviar en batch via Resend ──────────────────────────────────────────
  // Resend soporta hasta 100 destinatarios por llamada en el plan gratuito
  const BATCH_SIZE = 50;
  let enviados = 0;
  let errores = 0;

  for (let i = 0; i < suscriptores.length; i += BATCH_SIZE) {
    const batch = suscriptores.slice(i, i + BATCH_SIZE);

    // Enviar uno por uno para permitir personalización futura (nombre, unsubscribe link)
    const promises = batch.map(s => enviarEmail({
      to: s.nombre ? `${s.nombre} <${s.email}>` : s.email,
      from: `${from_name} <${FROM_EMAIL}>`,
      subject: asunto,
      html: buildEmailHTML(asunto, body, s),
      resendKey: RESEND_KEY,
    }));

    const results = await Promise.allSettled(promises);
    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value.ok) enviados++;
      else errores++;
    });

    // Pequeña pausa entre batches para no saturar la API
    if (i + BATCH_SIZE < suscriptores.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // ── Registrar en historial ──────────────────────────────────────────────
  try {
    await fetch(`${SB_URL}/rest/v1/envios_newsletter`, {
      method: 'POST',
      headers: {
        'apikey': SB_SERVICE_KEY,
        'Authorization': `Bearer ${SB_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        asunto,
        segmento,
        enviados,
        errores,
        estado: errores === 0 ? 'enviado' : errores === suscriptores.length ? 'fallido' : 'parcial',
        created_at: new Date().toISOString(),
      })
    });
  } catch (err) {
    // No crítico — el envío ya ocurrió
    console.error('Error al registrar historial:', err);
  }

  return res.status(200).json({
    ok: true,
    enviados,
    errores,
    message: `Campaña enviada a ${enviados} suscriptores${errores > 0 ? ` (${errores} errores)` : ''}`,
  });
}

// ── Helper: enviar un email via Resend ──────────────────────────────────────
async function enviarEmail({ to, from, subject, html, resendKey }) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Resend error:', data);
      return { ok: false, error: data.message || 'Error Resend' };
    }
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Helper: construir HTML del email ────────────────────────────────────────
function buildEmailHTML(asunto, body, suscriptor = {}) {
  const isHtml = body.trim().startsWith('<');
  const content = isHtml ? body : body.split('\n').map(l => l ? `<p>${l}</p>` : '<br>').join('');
  const nombre = suscriptor.nombre ? `, ${suscriptor.nombre.split(' ')[0]}` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${asunto}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f6fa; font-family: 'DM Sans', Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    .header { background: #071428; padding: 28px 36px; border-bottom: 3px solid #C8A055; }
    .brand { font-family: Georgia, 'Times New Roman', serif; font-size: 1.4rem; color: #ffffff; letter-spacing: .02em; }
    .brand span { color: #C8A055; }
    .header-sub { font-size: .7rem; color: rgba(255,255,255,.3); margin-top: .3rem; letter-spacing: .06em; text-transform: uppercase; }
    .body { padding: 36px; color: #1A2540; font-size: .93rem; line-height: 1.85; }
    .body h1, .body h2 { font-family: Georgia, serif; color: #0D2B5E; margin: 1.5rem 0 .75rem; }
    .body h1 { font-size: 1.5rem; }
    .body h2 { font-size: 1.2rem; }
    .body p { margin: 0 0 1rem; }
    .body a { color: #1557B0; }
    .body blockquote { border-left: 3px solid #C8A055; margin: 1.5rem 0; padding: .75rem 1.25rem; background: rgba(200,160,85,.05); font-style: italic; color: #2D3A52; }
    .cta-wrap { padding: 0 36px 32px; text-align: center; }
    .cta { display: inline-block; background: #C8A055; color: #071428; padding: .8rem 2.25rem; border-radius: 4px; text-decoration: none; font-size: .8rem; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; }
    .footer { background: #0A0F1A; padding: 20px 36px; text-align: center; }
    .footer p { font-size: .68rem; color: rgba(255,255,255,.22); margin: .3rem 0; line-height: 1.6; }
    .footer a { color: rgba(200,160,85,.5); text-decoration: none; }
    @media (max-width: 600px) {
      .wrapper { margin: 0; border-radius: 0; }
      .header, .body, .cta-wrap, .footer { padding-left: 20px; padding-right: 20px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="brand">V&#x14D;<span>ren</span></div>
      <div class="header-sub">Perspectivas estratégicas</div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="cta-wrap">
      <a href="https://vorenconsultores.cl/blog/" class="cta">Ver todas las perspectivas →</a>
    </div>
    <div class="footer">
      <p><strong style="color:rgba(255,255,255,.4)">Vōren Perspectivas</strong> · Santiago, Chile</p>
      <p>Recibiste este email porque te suscribiste en <a href="https://vorenconsultores.cl">vorenconsultores.cl</a></p>
      <p><a href="https://vorenconsultores.cl/api/unsubscribe?email=${suscriptor.email || ''}">Cancelar suscripción</a></p>
    </div>
  </div>
</body>
</html>`;
}
