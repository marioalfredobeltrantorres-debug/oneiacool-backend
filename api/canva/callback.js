// GET /api/canva/callback  (Canva redirige aquí solo, el usuario nunca
// escribe esta URL a mano)
// Aquí es donde de verdad se usa el Client Secret: se lo mandamos a Canva
// junto con el "code" que llegó por la URL para que nos den el token real
// de acceso. Ese token se guarda en Vercel KV (una base de datos, no en el
// HTML ni en ningún archivo visible), y al navegador solo le damos un id de
// sesión aleatorio en una cookie — nunca el token en sí.
const { kv } = require('@vercel/kv');
const { parseCookies, crypto } = require('./_utils');

module.exports = async (req, res) => {
    const clientId = (process.env.CANVA_CLIENT_ID || '').trim();
    const clientSecret = (process.env.CANVA_CLIENT_SECRET || '').trim();
    const redirectUri = (process.env.CANVA_REDIRECT_URI || '').trim();

    if (!clientId || !clientSecret || !redirectUri) {
        res.status(500).send(
            'Falta configurar CANVA_CLIENT_ID, CANVA_CLIENT_SECRET y/o CANVA_REDIRECT_URI en Vercel. ' +
            'Visita /api/canva/status para ver el diagnóstico exacto.'
        );
        return;
    }

    const url = new URL(req.url, `https://${req.headers.host}`);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
        res.status(400).send(`Canva devolvió un error de autorización: ${error}. Vuelve a intentarlo desde /api/canva/authorize.`);
        return;
    }

    const cookies = parseCookies(req);
    const verifier = cookies.canva_verifier;

    if (!code || !verifier) {
        res.status(400).send('Falta el código de Canva o expiró la sesión temporal (dura 10 minutos). Vuelve a empezar desde /api/canva/authorize.');
        return;
    }

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    let tokenResp, tokenData;
    try {
        tokenResp = await fetch('https://api.canva.com/rest/v1/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${basicAuth}`
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                code_verifier: verifier,
                redirect_uri: redirectUri
            })
        });
        tokenData = await tokenResp.json();
    } catch (e) {
        res.status(500).send(`No se pudo contactar a Canva: ${e.message}`);
        return;
    }

    if (!tokenResp.ok) {
        res.status(500).send(`Canva rechazó el intercambio de token: ${JSON.stringify(tokenData)}. Revisa /api/canva/status.`);
        return;
    }

    // access_token, refresh_token y expires_in vienen de Canva.
    const sessionId = crypto.randomUUID();
    await kv.set(`canva_token:${sessionId}`, tokenData, { ex: Math.max(tokenData.expires_in || 3600, 60) });
    if (tokenData.refresh_token) {
        // El refresh token dura más, lo guardamos aparte sin vencimiento corto.
        await kv.set(`canva_refresh:${sessionId}`, tokenData.refresh_token);
    }

    res.setHeader('Set-Cookie', [
        `canva_session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`,
        'canva_verifier=; Path=/; Max-Age=0'
    ]);

    res.writeHead(302, { Location: '/oneiacool.html?canva=conectado' });
    res.end();
};
