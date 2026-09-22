// GET /api/canva/authorize
// Este es el enlace al que apunta el botón "Conectar con Canva" de tu app.
// Genera el par PKCE (verifier + challenge), guarda el verifier en una
// cookie temporal (solo dura 10 minutos) y manda al usuario a la pantalla
// real de login/autorización de Canva. Canva, no nosotros, le muestra al
// usuario qué permisos está aceptando.
const { base64url, SCOPES, crypto } = require('./_utils');

module.exports = async (req, res) => {
    // .trim() por si al pegar la variable en Vercel quedó un espacio o
    // salto de línea invisible al final — es la causa #1 de
    // "El ID de cliente no es válido".
    const clientId = (process.env.CANVA_CLIENT_ID || '').trim();
    const redirectUri = (process.env.CANVA_REDIRECT_URI || '').trim();

    if (!clientId || !redirectUri) {
        res.status(500).send(
            'Falta configurar CANVA_CLIENT_ID y/o CANVA_REDIRECT_URI en las variables de entorno de Vercel. ' +
            'Visita /api/canva/status para ver el diagnóstico exacto.'
        );
        return;
    }

    const verifier = base64url(crypto.randomBytes(32));
    const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());

    res.setHeader(
        'Set-Cookie',
        `canva_verifier=${verifier}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
    );

    const params = new URLSearchParams({
        code_challenge_method: 'S256',
        code_challenge: challenge,
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: SCOPES
    });

    res.writeHead(302, { Location: `https://www.canva.com/api/oauth/authorize?${params.toString()}` });
    res.end();
};
