// POST /api/canva/create-design
// Body JSON esperado: { "titulo": "Mi diseño", "tipo": "presentation" }
// "tipo" puede ser: presentation, doc, whiteboard, instagram_post, etc.
// (los nombres exactos que acepta Canva están en su documentación de
// "design_type"). Esta es la función que tu HTML debe llamar cuando el
// usuario pida "crea un diseño en Canva de tal cosa".
const { parseCookies, readJsonBody } = require('./_utils');
const { getValidAccessToken } = require('./_refresh');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Usa POST.' });
        return;
    }

    const cookies = parseCookies(req);
    const sessionId = cookies.canva_session;
    if (!sessionId) {
        res.status(401).json({
            error: 'sin_sesion',
            mensaje: 'Este usuario todavía no conectó su cuenta de Canva. Mándalo a /api/canva/authorize primero.'
        });
        return;
    }

    // Ahora esto renueva el token solo con el refresh_token si el access_token
    // ya expiró, en vez de fallar y pedirle al usuario reconectar cada 4h.
    const accessToken = await getValidAccessToken(sessionId);
    if (!accessToken) {
        res.status(401).json({
            error: 'sesion_expirada',
            mensaje: 'La sesión de Canva de este usuario expiró de verdad (el refresh también falló). Debe volver a /api/canva/authorize.'
        });
        return;
    }

    const { titulo, tipo } = await readJsonBody(req);

    let createResp, design;
    try {
        createResp = await fetch('https://api.canva.com/rest/v1/designs', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                design_type: { type: 'preset', name: tipo || 'presentation' },
                title: titulo || 'Diseño creado por ONEIACOOL'
            })
        });
        design = await createResp.json();
    } catch (e) {
        res.status(500).json({ error: 'fallo_de_red', mensaje: e.message });
        return;
    }

    if (!createResp.ok) {
        res.status(createResp.status).json({ error: 'canva_rechazo', detalle: design });
        return;
    }

    res.status(200).json({
        id: design.design.id,
        editar_url: design.design.urls.edit_url,
        ver_url: design.design.urls.view_url
    });
};
