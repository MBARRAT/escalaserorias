/**
 * api/newsletter-stats.js
 * Retorna estadísticas del newsletter
 * GET /api/newsletter-stats
 *
 * Env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const SB_URL = process.env.SUPABASE_URL;
  const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SB_URL || !SB_SERVICE_KEY) {
    return res.status(500).json({ error: 'Configuración incompleta' });
  }

  const headers = {
    'apikey': SB_SERVICE_KEY,
    'Authorization': `Bearer ${SB_SERVICE_KEY}`,
  };

  try {
    const [susRes, envRes] = await Promise.all([
      fetch(`${SB_URL}/rest/v1/suscriptores?select=id,activo,fuente,created_at`, { headers }),
      fetch(`${SB_URL}/rest/v1/envios_newsletter?select=*&order=created_at.desc&limit=10`, { headers }),
    ]);

    const suscriptores = susRes.ok ? await susRes.json() : [];
    const envios = envRes.ok ? await envRes.json() : [];

    const activos = suscriptores.filter(s => s.activo !== false).length;
    const avgOpen = envios.filter(e => e.tasa_apertura).length
      ? envios.filter(e => e.tasa_apertura).reduce((a, e) => a + e.tasa_apertura, 0) / envios.filter(e => e.tasa_apertura).length
      : null;

    return res.status(200).json({
      ok: true,
      total: suscriptores.length,
      activos,
      envios_totales: envios.length,
      tasa_apertura_avg: avgOpen ? parseFloat(avgOpen.toFixed(1)) : null,
      ultimo_envio: envios[0] || null,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
