import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import pg from 'pg';

const app = Fastify({ logger: true });
const { Pool } = pg;

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      // Hosted PostgreSQL providers typically require TLS. Use their documented
      // connection string with sslmode=require.
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: true }
        : undefined,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000
    })
  : null;

await app.register(cors, {
  origin: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(s => s.trim()),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

app.get('/health', async (_request, reply) => {
  if (!pool) {
    return reply.code(503).send({ status: 'not_configured', database: false });
  }
  try {
    await pool.query('SELECT 1');
    return { status: 'ok', database: true };
  } catch (err) {
    requestLogError(err);
    return reply.code(503).send({ status: 'database_unavailable', database: false });
  }
});

app.get('/api', async () => ({
  name: 'NubeDB API',
  version: '0.1.0',
  note: 'Starter endpoint. Authentication and tenant authorization are not yet implemented.'
}));

function requestLogError(err) {
  app.log.error({ err }, 'Database health check failed');
}

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  reply.code(500).send({ error: 'internal_server_error' });
});

const port = Number(process.env.PORT || 3001);
try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await app.close();
    if (pool) await pool.end();
    process.exit(0);
  });
}
