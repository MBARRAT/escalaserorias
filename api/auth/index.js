export default function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send('Missing GITHUB_CLIENT_ID environment variable.');
  }

  // Forzar siempre el dominio de producción como origin
  // Evita que Sveltia CMS use localhost:3000 como redirect
  const host = req.headers.host;
  const proto = host.includes('localhost') ? 'http' : 'https';
  const origin = host.includes('localhost')
    ? `${proto}://${host}`
    : 'https://vorenconsultores.cl';

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/callback`,
    scope: 'repo,user',
    state: Buffer.from(origin).toString('base64'),
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
