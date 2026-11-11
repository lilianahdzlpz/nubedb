import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import pg from 'pg';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const app = Fastify({ logger: true, bodyLimit: 64 * 1024 });
const { Pool } = pg;
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'https://nubedb.vercel.app,http://localhost:5173')
  .split(',').map(v => v.trim()).filter(Boolean);
const configuredPassword = process.env.NUBEDB_PASSWORD || '';
const sessionSecret = process.env.SESSION_SECRET || '';
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const loginAttempts = new Map();
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: true } : undefined,
  max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000,
  statement_timeout: 10000
}) : null;

await app.register(cors, {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('origin_not_allowed'), false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

const sha = value => createHash('sha256').update(value).digest();
function passwordMatches(candidate) {
  return timingSafeEqual(sha(candidate), sha(configuredPassword));
}
function createSession() {
  const payload = Buffer.from(JSON.stringify({
    sub: 'owner', exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  })).toString('base64url');
  return `${payload}.${createHmac('sha256', sessionSecret).update(payload).digest('base64url')}`;
}
function validSession(token) {
  if (!token || !sessionSecret) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const expected = createHmac('sha256', sessionSecret).update(parts[0]).digest();
  const received = Buffer.from(parts[1], 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;
  try {
    const p = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    return p.sub === 'owner' && Number(p.exp) > Math.floor(Date.now() / 1000);
  } catch { return false; }
}
function bearerToken(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}
app.addHook('preHandler', async (req, reply) => {
  if (!(req.url === '/api' || req.url.startsWith('/api/') || req.url === '/auth/me')) return;
  if (!validSession(bearerToken(req))) return reply.code(401).send({ error: 'unauthorized' });
});
function requireDb(reply) {
  if (!pool) { reply.code(503).send({ error: 'database_not_configured' }); return false; }
  return true;
}
function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
async function tableExists(schema, table) {
  const result = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema=$1 AND table_name=$2 AND table_type='BASE TABLE'`,
    [schema, table]
  );
  return result.rowCount > 0;
}

app.get('/health', async (_req, reply) => {
  if (!pool) return reply.code(503).send({ status: 'not_configured', database: false });
  try {
    await pool.query('SELECT 1');
    return { status: 'ok', database: true, authenticationConfigured: Boolean(configuredPassword && sessionSecret.length >= 32) };
  } catch (err) {
    app.log.error({ err }, 'Database health check failed');
    return reply.code(503).send({ status: 'database_unavailable', database: false });
  }
});
app.post('/auth/login', async (req, reply) => {
  if (!configuredPassword || sessionSecret.length < 32)
    return reply.code(503).send({ error: 'authentication_not_configured' });
  const ip = req.ip, now = Date.now();
  const attempts = (loginAttempts.get(ip) || []).filter(t => now - t < 900000);
  if (attempts.length >= 8) return reply.code(429).send({ error: 'too_many_attempts' });
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!passwordMatches(password)) {
    attempts.push(now); loginAttempts.set(ip, attempts);
    return reply.code(401).send({ error: 'invalid_credentials' });
  }
  loginAttempts.delete(ip);
  return { token: createSession(), expiresIn: SESSION_TTL_SECONDS };
});
app.get('/auth/me', async () => ({ authenticated: true }));
app.get('/api', async () => ({ name: 'NubeDB API', version: '1.0.0', authentication: 'required' }));

// Only user tables in non-system schemas are exposed. System/catalog schemas stay hidden.
app.get('/api/tables', async (_req, reply) => {
  if (!requireDb(reply)) return;
  const { rows } = await pool.query(`
    SELECT t.table_schema AS schema, t.table_name AS name,
           COALESCE(s.n_live_tup, 0)::bigint AS estimated_rows
    FROM information_schema.tables t
    LEFT JOIN pg_stat_user_tables s
      ON s.schemaname=t.table_schema AND s.relname=t.table_name
    WHERE t.table_type='BASE TABLE'
      AND t.table_schema NOT IN ('pg_catalog','information_schema')
      AND t.table_schema NOT LIKE 'pg_toast%'
    ORDER BY t.table_schema, t.table_name
  `);
  return { tables: rows };
});
app.get('/api/tables/:schema/:table', async (req, reply) => {
  if (!requireDb(reply)) return;
  const { schema, table } = req.params;
  if (!await tableExists(schema, table)) return reply.code(404).send({ error: 'table_not_found' });
  const { rows } = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position
  `, [schema, table]);
  return { schema, table, columns: rows };
});
app.get('/api/tables/:schema/:table/rows', async (req, reply) => {
  if (!requireDb(reply)) return;
  const { schema, table } = req.params;
  if (!await tableExists(schema, table)) return reply.code(404).send({ error: 'table_not_found' });
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200);
  const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
  const result = await pool.query(
    `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(table)} LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return { rows: result.rows, limit, offset, count: result.rowCount };
});

// Deliberately read-only SQL console. One SELECT/WITH statement only, no mutations or multiple statements.
app.post('/api/query', async (req, reply) => {
  if (!requireDb(reply)) return;
  const sql = typeof req.body?.sql === 'string' ? req.body.sql.trim() : '';
  if (!sql || sql.length > 8000) return reply.code(400).send({ error: 'invalid_query' });
  const normalized = sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--.*$/gm, ' ').trim();
  if (!/^(select|with)\b/i.test(normalized) || /;[\s\S]*\S/.test(normalized.replace(/;$/, '')) ||
      /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|execute|vacuum|refresh)\b/i.test(normalized)) {
    return reply.code(400).send({ error: 'read_only_select_required' });
  }
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN READ ONLY');
      await client.query("SET LOCAL statement_timeout = '5000ms'");
      const result = await client.query(normalized.replace(/;$/, ''));
      await client.query('ROLLBACK');
      return { columns: result.fields.map(f => f.name), rows: result.rows.slice(0, 200), rowCount: result.rowCount };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      return reply.code(400).send({ error: 'query_failed', message: err.message });
    } finally { client.release(); }
  } catch (err) {
    req.log.error({ err }, 'Query execution failed');
    return reply.code(500).send({ error: 'query_unavailable' });
  }
});

app.setErrorHandler((error, req, reply) => {
  req.log.error(error);
  if (error.message === 'origin_not_allowed') return reply.code(403).send({ error: 'origin_not_allowed' });
  reply.code(500).send({ error: 'internal_server_error' });
});
const port = Number(process.env.PORT || 3001);
try { await app.listen({ port, host: '0.0.0.0' }); }
catch (err) { app.log.error(err); process.exit(1); }
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
  await app.close(); if (pool) await pool.end(); process.exit(0);
});
