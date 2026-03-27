export default function handler(req, res) {
  const host = req.headers.host;
  const proto = host.includes('localhost') ? 'http' : 'https';
  const origin = `${proto}://${host}`;

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send('Missing GITHUB_CLIENT_ID environment variable.');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/callback`,
    scope: 'repo,user',
    state: Buffer.from(origin).toString('base64'),
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
