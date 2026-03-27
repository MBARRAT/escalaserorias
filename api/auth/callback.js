export default async function handler(req, res) {
  const { code, state } = req.query;

  const clientId     = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send('Missing environment variables.');
  }

  if (!code) {
    return res.status(400).send('Missing code parameter.');
  }

  // Decode origin from state
  let origin;
  try {
    origin = Buffer.from(state, 'base64').toString('utf8');
    if (!origin.startsWith('http')) throw new Error('invalid');
  } catch {
    const host = req.headers.host;
    origin = `https://${host}`;
  }

  // Exchange code for token
  let token;
  try {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${origin}/api/auth/callback`,
      }),
    });
    const data = await r.json();
    if (data.error) {
      return renderMessage(res, origin, 'error', { message: data.error_description || data.error });
    }
    token = data.access_token;
  } catch (err) {
    return renderMessage(res, origin, 'error', { message: err.message });
  }

  return renderMessage(res, origin, 'success', { token, provider: 'github' });
}

function renderMessage(res, origin, status, data) {
  // Decap CMS expects this exact postMessage format:
  // "authorization:github:success:{"token":"..."}"
  const content = JSON.stringify(data);
  const message = `authorization:github:${status}:${content}`;

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html>
<head><title>Authenticating...</title></head>
<body>
<script>
(function() {
  var msg = ${JSON.stringify(message)};
  var origin = ${JSON.stringify(origin)};
  function send() {
    if (window.opener) {
      window.opener.postMessage(msg, origin);
      setTimeout(function() { window.close(); }, 500);
    } else {
      // No opener — redirect back to admin
      window.location.replace('/admin');
    }
  }
  // Try immediately, then again after a short delay
  send();
  setTimeout(send, 500);
})();
</script>
<p style="font-family:sans-serif;padding:2rem;text-align:center">
  Autenticando... <a href="/admin">Volver al panel</a>
</p>
</body>
</html>`);
}
