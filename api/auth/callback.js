// api/auth/callback.js
// Paso 2 del flujo OAuth: GitHub redirige aquí con un `code`,
// lo intercambiamos por un token de acceso y se lo pasamos al CMS.

export default async function handler(req, res) {
  const { code, state } = req.query;

  const clientId     = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  // ── Validaciones básicas ──────────────────────────────────────────────
  if (!clientId || !clientSecret) {
    return sendError(res, 'Variables de entorno GITHUB_CLIENT_ID o GITHUB_CLIENT_SECRET no configuradas en Vercel.');
  }

  if (!code) {
    return sendError(res, 'No se recibió el código de autorización de GitHub.');
  }

  // Recuperar el origin desde el state
  let origin;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    origin = decoded.origin;
  } catch {
    origin = req.headers.origin || `https://${req.headers.host}`;
  }

  // ── Intercambiar code por access_token ───────────────────────────────
  let token;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
      },
      body: JSON.stringify({
        client_id:     clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${origin}/api/auth/callback`,
      }),
    });

    const data = await tokenRes.json();

    if (data.error) {
      return sendError(res, `GitHub OAuth error: ${data.error_description || data.error}`);
    }

    token = data.access_token;
  } catch (err) {
    return sendError(res, `Error al contactar GitHub: ${err.message}`);
  }

  // ── Devolver el token al CMS via postMessage ──────────────────────────
  // Decap CMS escucha este mensaje en el popup para completar el login
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html>
<head><title>Autenticando — Vōren CMS</title></head>
<body>
<script>
  (function() {
    // Envía el token a la ventana padre (el panel /admin)
    const token   = ${JSON.stringify(token)};
    const message = 'authorization:github:success:' + JSON.stringify({
      token,
      provider: 'github',
    });

    // Vercel puede abrir esto en popup o redirect — cubrimos ambos casos
    if (window.opener) {
      window.opener.postMessage(message, ${JSON.stringify(origin)});
      window.close();
    } else {
      // Fallback: redirect de vuelta al admin
      document.body.innerHTML = '<p style="font-family:sans-serif;padding:2rem">Login exitoso. <a href="/admin">Volver al panel</a></p>';
      setTimeout(function() { window.location.href = '/admin'; }, 1500);
    }
  })();
</script>
<noscript>
  <p style="font-family:sans-serif;padding:2rem">
    Login completado. <a href="/admin">Volver al panel CMS</a>
  </p>
</noscript>
</body>
</html>`);
}

// ── Helper ────────────────────────────────────────────────────────────────
function sendError(res, message) {
  res.setHeader('Content-Type', 'text/html');
  res.status(400).send(`<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;padding:2rem;color:#1A2540;max-width:500px">
  <h2 style="color:#A32D2D">Error de autenticación</h2>
  <p>${message}</p>
  <p><a href="/admin">Volver al panel</a></p>
  <script>
    if (window.opener) {
      window.opener.postMessage(
        'authorization:github:error:' + JSON.stringify({ message: ${JSON.stringify(message)} }),
        '*'
      );
      window.close();
    }
  </script>
</body>
</html>`);
}
