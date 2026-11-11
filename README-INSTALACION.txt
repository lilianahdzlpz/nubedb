NUBEDB — INSTALACIÓN

1) Descomprime el ZIP.
2) Configura api/.env usando api/.env.example. Completa DATABASE_URL, NUBEDB_PASSWORD, SESSION_SECRET y FRONTEND_ORIGIN.
3) En api/: npm install && npm run dev
4) En web/: npm install && npm run dev
5) Abre la URL que indique Vite.

DESPLIEGUE
API Render: root api, build npm install, start npm start.
Frontend Vercel: root web, build npm run build, output dist.
VITE_API_URL debe apuntar a la URL HTTPS de Render.
FRONTEND_ORIGIN en Render debe ser el origen exacto del frontend.

SEGURIDAD
No publiques archivos .env ni credenciales. La consola SQL acepta únicamente SELECT/WITH en modo READ ONLY. El explorador solo consulta datos; no modifica ni elimina tablas o registros. Usa una base de pruebas primero. Consulta README.md para los detalles.
