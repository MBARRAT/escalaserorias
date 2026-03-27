// api/auth/index.js
// Paso 1 del flujo OAuth: redirige al usuario a GitHub para que autorice

export default function handler(req, res) {
  const { host } = req.headers;
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const origin = `${protocol}://${host}`;

  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return res.status(500).send(`
      <html><body style="font-family:sans-serif;padding:2rem;color:#1A2540">
        <h2>Error de configuración</h2>
        <p>La variable de entorno <code>GITHUB_CLIENT_ID</code> no está definida en Vercel.</p>
        <p>Ve a Vercel → Settings → Environment Variables y añádela.</p>
      </body></html>
    `);
  }

  // Guarda el origen en el state para verificarlo al volver
  const state = Buffer.from(JSON.stringify({ origin })).toString('base64');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/callback`,
    scope: 'repo,user',
    state,
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
