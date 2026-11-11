# NubeDB — paquete de actualización de acceso privado

Este paquete contiene archivos completos para reemplazar en el repositorio existente `lilianahdzlpz/nubedb`.
No es un clon completo del repositorio: conserva los archivos que ya tienes y sustituye las rutas indicadas.

## Archivos incluidos
- `api/src/server.js` — API con inicio de sesión por contraseña, sesión firmada y rutas protegidas.
- `web/src/App.tsx` — pantalla de acceso y panel NubeDB.
- `web/src/style.css` — si está incluido, reemplaza el CSS actual completo. Si solo aparece `nubedb-login.css`, conserva tu `style.css` actual y pega el contenido de ese archivo al final.
- `api/.env.example` — nombres de variables; no contiene contraseñas reales.

## Antes de desplegar: configura Render
En Render → servicio `nubedb` → Environment, conserva `DATABASE_URL` y configura:

- `NODE_ENV` = `production`
- `FRONTEND_ORIGIN` = `https://nubedb.vercel.app`
- `NUBEDB_PASSWORD` = una contraseña larga y única que solo tú conozcas.
- `SESSION_SECRET` = una cadena aleatoria de al menos 64 caracteres.

Genera `SESSION_SECRET` con un generador criptográfico confiable o localmente con:
`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

No publiques estos valores en GitHub, no los pegues en el frontend y no los compartas en el chat.
Guarda los cambios en Render y espera a que el servicio quede `Live`.

## Subir a GitHub
1. Descarga y descomprime este paquete.
2. Abre tu repositorio `https://github.com/lilianahdzlpz/nubedb`.
3. Reemplaza cada archivo por el del paquete, respetando exactamente su ruta.
4. Confirma los cambios en la rama `main`. GitHub y Vercel/Render iniciarán sus despliegues automáticos.

## Verificación
- `https://nubedb.onrender.com/health` debe seguir respondiendo con `status: ok` y `database: true`.
- Abre `https://nubedb.vercel.app/`: debe aparecer la pantalla de contraseña.
- Inicia sesión con la contraseña configurada en Render.

## Alcance y seguridad
La API mantiene `/health` público para comprobar disponibilidad. Las rutas `/api` y `/auth/me` exigen sesión. El token expira en 12 horas y el navegador lo guarda en `sessionStorage`; salir elimina la sesión local.
El editor de tablas y la ejecución SQL siguen desactivados: todavía no hay endpoints de administración de tablas ni permisos de consulta. No ejecutes SQL arbitrario hasta implementar controles adicionales.
