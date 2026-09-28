const crypto = require('crypto');

// Convierte un buffer a base64url (el formato que exige PKCE), sin
// dependencias externas.
function base64url(buffer) {
    return buffer
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Lee las cookies de la petición entrante (Vercel no las parsea solo).
function parseCookies(req) {
    const header = req.headers.cookie || '';
    return Object.fromEntries(
        header
            .split(';')
            .map(p => p.trim())
            .filter(Boolean)
            .map(pair => {
                const idx = pair.indexOf('=');
                return [pair.slice(0, idx), decodeURIComponent(pair.slice(idx + 1))];
            })
    );
}

// Lee el body JSON de una petición POST (Vercel no lo parsea solo en
// funciones serverless "planas" como estas).
async function readJsonBody(req) {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

const SCOPES = [
    'asset:read', 'asset:write',
    'brandtemplate:content:read', 'brandtemplate:meta:read',
    'design:content:read', 'design:content:write', 'design:meta:read',
    'profile:read'
].join(' ');

module.exports = { base64url, parseCookies, readJsonBody, SCOPES, crypto };
