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

  let origin;
  try {
    origin = Buffer.from(state, 'base64').toString('utf8');
    if (!origin.startsWith('http')) throw new Error('invalid');
  } catch {
    const host = req.headers.host;
    origin = `https://${host}`;
  }

  let token;
  try {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${origin}/api/auth/callback`,
      }),
    });
    const data = await r.json();
    if (data.error) {
      return renderMessage(res, origin, 'error', data.error_description || data.error);
    }
    token = data.access_token;
  } catch (err) {
    return renderMessage(res, origin, 'error', err.message);
  }

  return renderMessage(res, origin, 'success', token);
}

function renderMessage(res, origin, status, tokenOrError) {
  // Decap 3.x espera exactamente este formato de postMessage
  const data = status === 'success'
    ? JSON.stringify({ token: tokenOrError, provider: 'github' })
    : JSON.stringify({ message: tokenOrError });

  const message = `authorization:github:${status}:${data}`;

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html>
<head><title>Autenticando...</title></head>
<body>
<script>
(function() {
  var msg    = ${JSON.stringify(message)};
  var origin = ${JSON.stringify(origin)};

  console.log('[auth callback] sending postMessage:', msg);
  console.log('[auth callback] target origin:', origin);

  function send() {
    if (window.opener) {
      window.opener.postMessage(msg, '*');
      console.log('[auth callback] postMessage sent');
      setTimeout(function() { window.close(); }, 1000);
    } else {
      console.log('[auth callback] no opener found, redirecting');
      window.location.replace('/admin');
    }
  }

  if (document.readyState === 'complete') {
    send();
  } else {
    window.addEventListener('load', send);
  }
})();
</script>
<p style="font-family:sans-serif;padding:2rem;text-align:center">
  Autenticando... si no cierra solo, <a href="/admin">vuelve al panel</a>.
</p>
</body>
</html>`);
}
