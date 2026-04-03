export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Vercel a veces no parsea el body automáticamente
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const { email, nombre, fuente, articulo_origen, utm_source, utm_medium, utm_campaign } = body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing env vars - URL:', !!SUPABASE_URL, 'KEY:', !!SUPABASE_KEY);
    return res.status(500).json({ error: 'Error de configuración' });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/suscriptores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=ignore-duplicates,return=minimal',
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

    const text = await response.text();
    console.log('Supabase response:', response.status, text);

    if (!response.ok && response.status !== 409) {
      return res.status(500).json({ error: 'Error al guardar', detail: text });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
