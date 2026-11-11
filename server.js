import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import pg from 'pg';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const app = Fastify({ logger: true });
const { Pool } = pg;
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'https://nubedb.vercel.app,http://localhost:5173')
  .split(',').map(value => value.trim()).filter(Boolean);
const configuredPassword = process.env.NUBEDB_PASSWORD || '';
const sessionSecret = process.env.SESSION_SECRET || '';
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const loginAttempts = new Map();

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction ? { rejectUnauthorized: true } : undefined,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000
    })
  : null;

await app.register(cors, {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

function passwordMatches(candidate) {
  const candidateDigest = createHash('sha256').update(candidate).digest();
  const configuredDigest = createHash('sha256').update(configuredPassword).digest();
  return timingSafeEqual(candidateDigest, configuredDigest);
}

function createSession() {
  const payload = Buffer.from(JSON.stringify({
    sub: 'owner',
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  })).toString('base64url');
  const signature = createHmac('sha256', sessionSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function validSession(token) {
  if (!token || !sessionSecret) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const expected = createHmac('sha256', sessionSecret).update(parts[0]).digest();
  const received = Buffer.from(parts[1], 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    return payload.sub === 'owner' && Number(payload.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function bearerToken(request) {
  const header = request.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

app.addHook('preHandler', async (request, reply) => {
  const protectedRoute = request.url === '/api' || request.url.startsWith('/api/');
  const sessionRoute = request.url === '/auth/me';
  if (!protectedRoute && !sessionRoute) return;
  if (!validSession(bearerToken(request))) {
    return reply.code(401).send({ error: 'unauthorized' });
  }
});

app.get('/health', async (_request, reply) => {
  if (!pool) return reply.code(503).send({ status: 'not_configured', database: false });
  try {
    await pool.query('SELECT 1');
    return {
      status: 'ok',
      database: true,
      authenticationConfigured: Boolean(configuredPassword && sessionSecret.length >= 32)
    };
  } catch (err) {
    app.log.error({ err }, 'Database health check failed');
    return reply.code(503).send({ status: 'database_unavailable', database: false });
  }
});

app.post('/auth/login', async (request, reply) => {
  if (!configuredPassword || sessionSecret.length < 32) {
    return reply.code(503).send({ error: 'authentication_not_configured' });
  }

  const origin = request.headers.origin;
  if (origin && !allowedOrigins.includes(origin)) {
    return reply.code(403).send({ error: 'origin_not_allowed' });
  }

  const ip = request.ip;
  const now = Date.now();
  const attempts = (loginAttempts.get(ip) || []).filter(time => now - time < 15 * 60 * 1000);
  if (attempts.length >= 8) {
    return reply.code(429).send({ error: 'too_many_attempts' });
  }

  const password = typeof request.body?.password === 'string' ? request.body.password : '';
  if (!passwordMatches(password)) {
    attempts.push(now);
    loginAttempts.set(ip, attempts);
    return reply.code(401).send({ error: 'invalid_credentials' });
  }

  loginAttempts.delete(ip);
  return { token: createSession(), expiresIn: SESSION_TTL_SECONDS };
});

app.get('/auth/me', async () => ({ authenticated: true }));

app.get('/api', async () => ({
  name: 'NubeDB API',
  version: '0.2.0',
  authentication: 'required'
}));

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
