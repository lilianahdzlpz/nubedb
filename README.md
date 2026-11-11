# NubeDB — aplicación privada (v1)

NubeDB es un panel web para una base PostgreSQL existente: React + Vite, Fastify y PostgreSQL. Esta entrega incluye autenticación por contraseña, sesión firmada de 12 horas, explorador de tablas y consola SQL estrictamente de solo lectura.

## Funciones incluidas
- Inicio de sesión privado; token firmado en servidor y guardado en `sessionStorage`.
- Estado de salud de la API y conexión PostgreSQL.
- Listado de tablas de usuario y visualización de columnas/primeras 50 filas.
- Consola SQL limitada a una única consulta `SELECT`/`WITH`, transacción `READ ONLY`, timeout de 5 segundos y respuesta máxima de 200 filas.
- Identificadores SQL de tablas escapados y valores de paginación parametrizados.
- CORS por lista de orígenes permitidos y limitación básica de intentos de inicio de sesión.

**Límites deliberados de seguridad:** esta versión no crea, altera ni elimina tablas/filas; no admite SQL de escritura ni múltiples sentencias. No es un clon de Supabase ni un servicio multiusuario. La autenticación es una contraseña compartida para un único propietario. Para producción con datos sensibles, añade MFA, gestión de usuarios/roles, rate limiting distribuido, backups y revisión de seguridad.

## Requisitos
- Node.js 20+
- PostgreSQL (Neon es una opción)
- Variables de entorno configuradas

## Desarrollo local
1. Copia `api/.env.example` como `api/.env` y completa los valores.
2. En una terminal: `cd api && npm install && npm run dev`
3. En otra: `cd web && npm install && npm run dev`
4. Abre la dirección local que indique Vite (normalmente `http://localhost:5173`).

La API usa el puerto 3001 por defecto. En `web/.env` define `VITE_API_URL=http://localhost:3001` si necesitas cambiarlo.

## Variables de API
- `DATABASE_URL`: cadena PostgreSQL privada. Nunca ponerla en el frontend.
- `NUBEDB_PASSWORD`: contraseña larga y única.
- `SESSION_SECRET`: secreto aleatorio de al menos 64 caracteres hexadecimales.
- `FRONTEND_ORIGIN`: origen exacto del frontend; varios orígenes separados por coma.
- `NODE_ENV=production` en Render.

Genera el secreto con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. No subas `.env` a GitHub ni compartas secretos en chats.

## Base de datos y despliegue
`db/001_init.sql` crea las tablas de metadatos del workspace, proyecto y auditoría incluidas en este paquete; el explorador también muestra otras tablas de usuario que ya existan en la base configurada. Ejecuta el SQL solo si quieres esas tablas de metadatos.

### Render (API)
- Root directory: `api`
- Build: `npm install`
- Start: `npm start`
- Health check: `/health`
- Configura las variables anteriores en el panel de Render.

### Vercel (frontend)
- Root directory: `web`
- Build: `npm run build`
- Output: `dist`
- Variable: `VITE_API_URL` con la URL pública HTTPS de Render.

Después de desplegar, configura `FRONTEND_ORIGIN` en Render con el dominio exacto de Vercel y vuelve a desplegar la API. Verifica `/health` y prueba el login.

## Pruebas
Desde `api`: `npm start`. Desde `web`: `npm run build`. Comprueba el inicio de sesión, el listado de tablas y una consulta SELECT. Usa primero una base de desarrollo o una copia de respaldo.
