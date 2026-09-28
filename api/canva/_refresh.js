// Función interna (no es un endpoint) para renovar el access_token de Canva
// usando el refresh_token guardado, sin obligar al usuario a reconectar.
const { kv } = require('@vercel/kv');

async function getValidAccessToken(sessionId) {
    const tokenData = await kv.get(`canva_token:${sessionId}`);
    if (tokenData) return tokenData.access_token;

    // El access_token expiró (o su TTL en KV venció). Intentamos usar el
    // refresh_token, que guardamos aparte sin expiración corta.
    const refreshToken = await kv.get(`canva_refresh:${sessionId}`);
    if (!refreshToken) return null;

    const clientId = (process.env.CANVA_CLIENT_ID || '').trim();
    const clientSecret = (process.env.CANVA_CLIENT_SECRET || '').trim();
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const resp = await fetch('https://api.canva.com/rest/v1/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        })
    });

    if (!resp.ok) return null;
    const fresh = await resp.json();

    await kv.set(`canva_token:${sessionId}`, fresh, { ex: Math.max(fresh.expires_in || 3600, 60) });
    if (fresh.refresh_token) {
        await kv.set(`canva_refresh:${sessionId}`, fresh.refresh_token);
    }

    return fresh.access_token;
}

module.exports = { getValidAccessToken };
