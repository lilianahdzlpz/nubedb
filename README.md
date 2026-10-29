# NubeDB

Starter deployable: React + Vite frontend, Fastify API, PostgreSQL metadata schema. This is a development starter, not a production Supabase clone. Authentication and tenant authorization must be implemented before real users or sensitive data are allowed.

## Requirements

- Node.js 20+
- A PostgreSQL database (Neon is one hosted option)
- GitHub account for deploys

## Run locally

Copy `api/.env.example` to `api/.env` and set `DATABASE_URL`.

In one terminal:

```
cd api
npm install
npm run dev
```

In another terminal:

```
cd web
npm install
npm run dev
```

Open the URL printed by Vite (usually http://localhost:5173).

The frontend uses `VITE_API_URL` and defaults to http://localhost:3001. The API health endpoint is `/health`.

## Database

Apply `db/001_init.sql` to your PostgreSQL database using the provider's SQL editor or psql. For a first deploy, use a separate development database. Keep `DATABASE_URL` only in the backend environment variables, never in `web/.env`.

## Deploy

1. Push this folder to a GitHub repository.
2. Deploy `web/` as a Vercel Vite project. Build command: `npm run build`; output directory: `dist`.
3. Deploy `api/` as a Render Node web service. Build command: `npm install`; start command: `npm start`.
4. Set API environment variables on Render: `DATABASE_URL`, `FRONTEND_ORIGIN` (your Vercel URL), `NODE_ENV=production`.
5. Set `VITE_API_URL` in Vercel to the Render API URL, then redeploy the frontend.
6. Apply the SQL migration before testing the API.

## Security before production

This starter intentionally does not expose SQL execution or user-created table management. Add authentication, server-side authorization, rate limiting, request validation, audit logging, backups, and per-project isolation before those features. Do not add a public endpoint that accepts arbitrary SQL.
