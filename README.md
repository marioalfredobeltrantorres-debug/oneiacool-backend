# ONEIACOOL Backend — Guía para dejarlo funcionando

El código ya está arreglado y blindado. Lo que falta es 100% configuración
de cuentas (Vercel + Canva), y eso solo lo puedes hacer tú porque requiere
tu login. Sigue estos pasos en orden — no te saltes ninguno.

## 0. Revoca el secreto que compartiste antes
Si en algún momento pegaste tu Client Secret de Canva en un chat, mensaje o
captura pública, entra al portal de Canva y bórralo, genera uno nuevo, y
usa solo ese nuevo valor de aquí en adelante.

## 1. Sube este código
Sube esta carpeta a un repo de GitHub (o arrástrala directo si usas
"Deploy" manual en Vercel) y conéctala a tu proyecto de Vercel.

## 2. Conecta un KV Store (si no lo tienes ya)
En el proyecto de Vercel: Storage -> Create Database -> KV -> conéctalo al
proyecto. Esto crea solo las variables KV_REST_API_URL y KV_REST_API_TOKEN.

## 3. Encuentra tu dominio FIJO
En Vercel -> Settings -> Domains. Necesitas el dominio que **no cambia**
en cada deploy (algo como `oneiacool-backend.vercel.app`, sin el hash
aleatorio tipo `-moy0mv7yq-`). Si no tienes uno, Vercel siempre te da al
menos uno con el nombre del proyecto: usa ese.

## 4. Configura Canva
En el portal de desarrolladores de Canva, en tu integración:
- Credentials -> copia el Client ID (botón "Copiar", no lo escribas a mano)
- Authorized redirects -> agrega, EXACTO:
  `https://TU-DOMINIO-FIJO/api/canva/callback`
  (borra ahí cualquier URL vieja de despliegues anteriores)

## 5. Variables de entorno en Vercel
Settings -> Environment Variables -> agrega (entorno "Production"):
- `CANVA_CLIENT_ID` = el que copiaste en el paso 4
- `CANVA_CLIENT_SECRET` = tu client secret actual (el nuevo si lo rotaste)
- `CANVA_REDIRECT_URI` = `https://TU-DOMINIO-FIJO/api/canva/callback`
  (debe quedar IDÉNTICO a lo que pusiste en Canva)

Pega los valores directo con Ctrl+V, sin escribirlos a mano, para evitar
espacios o saltos de línea invisibles.

## 6. Redeploy
Deployments -> los tres puntos del último deploy -> Redeploy. Las
variables de entorno no aplican hasta el siguiente deploy.

## 7. Verifica antes de probar el login
Abre en el navegador:
`https://TU-DOMINIO-FIJO/api/canva/status`

Te va a decir en español, sin mostrar los secretos, si falta algo o si hay
un espacio/salto de línea invisible en alguna variable. Corrige lo que
diga ahí y repite el paso 6 hasta que salga `"ok": true`.

## 8. Prueba real
Abre `https://TU-DOMINIO-FIJO/api/canva/authorize` y completa el login de
Canva. Si todo salió bien, terminas en `/oneiacool.html?canva=conectado`.

## Archivos nuevos que agregué
- `api/canva/status.js` — diagnóstico de configuración (paso 7).
- `api/canva/_refresh.js` — renueva el access_token solo cuando expira,
  usando el refresh_token, para que no tengas que reconectar cada ~4h.
- `create-design.js` ahora usa ese refresh automático.
- `authorize.js` y `callback.js` ahora validan las variables antes de
  llamar a Canva y avisan exactamente qué falta, en vez de mandarte a un
  error genérico de Canva.
