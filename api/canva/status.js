// GET /api/canva/status
// Endpoint de diagnóstico. No expone secretos: solo dice si cada variable
// está presente, si tiene espacios/saltos de línea invisibles (causa muy
// común del error "invalid client_id"), y qué redirect_uri está usando
// realmente el código en este momento. Visítalo en el navegador después de
// cada deploy para confirmar que todo quedó bien antes de probar el login.
function checkVar(name) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') {
        return { presente: false };
    }
    const limpio = raw.trim();
    return {
        presente: true,
        longitud: raw.length,
        tiene_espacios_o_saltos: raw !== limpio,
        empieza_con: raw.slice(0, 4) + '…',
        termina_con: '…' + raw.slice(-4)
    };
}

module.exports = async (req, res) => {
    const clientId = checkVar('CANVA_CLIENT_ID');
    const clientSecret = checkVar('CANVA_CLIENT_SECRET');
    const redirectUri = checkVar('CANVA_REDIRECT_URI');
    const kvUrl = checkVar('KV_REST_API_URL');
    const kvToken = checkVar('KV_REST_API_TOKEN');

    const host = req.headers.host;
    const problemas = [];

    if (!clientId.presente) problemas.push('Falta CANVA_CLIENT_ID en Vercel.');
    if (!clientSecret.presente) problemas.push('Falta CANVA_CLIENT_SECRET en Vercel.');
    if (!redirectUri.presente) problemas.push('Falta CANVA_REDIRECT_URI en Vercel.');
    if (clientId.tiene_espacios_o_saltos) problemas.push('CANVA_CLIENT_ID tiene espacios o saltos de línea invisibles: vuelve a pegarlo.');
    if (clientSecret.tiene_espacios_o_saltos) problemas.push('CANVA_CLIENT_SECRET tiene espacios o saltos de línea invisibles: vuelve a pegarlo.');
    if (redirectUri.presente && redirectUri.tiene_espacios_o_saltos) problemas.push('CANVA_REDIRECT_URI tiene espacios o saltos de línea invisibles: vuelve a pegarlo.');
    if (redirectUri.presente) {
        const valor = process.env.CANVA_REDIRECT_URI.trim();
        if (!valor.startsWith('https://')) problemas.push('CANVA_REDIRECT_URI debe empezar con https://');
        if (!valor.includes(host)) {
            problemas.push(`CANVA_REDIRECT_URI (dominio: ${valor}) no coincide con el dominio desde el que estás viendo esto (${host}). Si acabas de redesplegar, actualiza esta variable con el dominio fijo real y vuelve a poner esa misma URL en "Authorized redirects" dentro de Canva.`);
        }
        if (!valor.endsWith('/api/canva/callback')) problemas.push('CANVA_REDIRECT_URI debería terminar exactamente en /api/canva/callback.');
    }
    if (!kvUrl.presente || !kvToken.presente) problemas.push('Faltan las variables de Vercel KV (KV_REST_API_URL / KV_REST_API_TOKEN) — sin esto no se pueden guardar las sesiones de Canva.');

    res.status(200).json({
        ok: problemas.length === 0,
        problemas,
        detalle: { clientId, clientSecret, redirectUri, kvUrl, kvToken },
        host_actual: host,
        siguiente_paso: problemas.length === 0
            ? 'Todo parece correcto aquí. Prueba /api/canva/authorize. Si Canva sigue rechazando el client_id, el valor en Vercel no coincide con el que aparece hoy en el portal de Canva: bórralo y vuelve a copiarlo desde ahí.'
            : 'Corrige lo de arriba en Vercel → Settings → Environment Variables, guarda, y haz Redeploy (los cambios no aplican hasta el próximo deploy).'
    });
};
