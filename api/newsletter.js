/**
 * api/newsletter.js
 * Endpoint para suscripción al newsletter
 * POST /api/newsletter → inserta en tabla suscriptores de Supabase
 */

export default async function handler(req, res) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { email, nombre, fuente, articulo_origen, utm_source, utm_medium, utm_campaign } = req.body;

  // Validación básica
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  const SUPABASE_URL  = process.env.SUPABASE_URL;
  const SUPABASE_KEY  = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase env vars');
    return res.status(500).json({ error: 'Error de configuración' });
  }

  try {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/suscriptores`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=ignore-duplicates',
    },
    body: JSON.stringify({
      email:           email.toLowerCase().trim(),
      nombre:          nombre?.trim() || null,
      fuente:          fuente || 'newsletter',
      articulo_origen: articulo_origen || null,
      utm_source:      utm_source || null,
      utm_medium:      utm_medium || null,
      utm_campaign:    utm_campaign || null,
      estado:          'activo',
    }),
  });

  if (!response.ok && response.status !== 409) {
    const errBody = await response.text();
    console.error('Supabase status:', response.status);
    console.error('Supabase error:', errBody);
    return res.status(500).json({ error: 'Error al guardar', detail: errBody });
  }

  return res.status(200).json({ ok: true, message: '¡Suscripción registrada!' });

} catch (err) {
  console.error('Newsletter handler error:', err.message);
  return res.status(500).json({ error: 'Error interno', detail: err.message });
}

    return res.status(200).json({ ok: true, message: '¡Suscripción registrada!' });

  } catch (err) {
    console.error('Newsletter handler error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
