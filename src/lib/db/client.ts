import "server-only";
import { readFileSync } from "node:fs";
import { Pool, type PoolConfig, type QueryResultRow } from "pg";

/**
 * PostgreSQL connection pool.
 *
 * WHY A POOL, NOT A CONNECTION PER REQUEST
 * Opening a Postgres connection is expensive — a TCP handshake, authentication,
 * and a dedicated backend *process* on the server. At any real request rate,
 * connecting per request would exhaust the server long before the queries did.
 * A pool keeps a small set of connections open and lends them out, so a request
 * borrows one for a few milliseconds and returns it.
 *
 * `max` is the ceiling on concurrent database work, not on concurrent HTTP
 * requests. Requests beyond it queue for a connection rather than failing —
 * which is the behaviour you want under a burst.
 */

declare global {
  var __pulsesPool: Pool | undefined;
}

/**
 * A managed Postgres (Supabase) only accepts TLS connections, and it is a
 * different machine on the public internet — unlike a local socket, the
 * traffic is worth encrypting. Local development against localhost has no
 * TLS listener at all, so the setting has to follow the host.
 */
function sslFor(connectionString: string): PoolConfig["ssl"] {
  let host: string;
  try {
    host = new URL(connectionString).hostname;
  } catch {
    return undefined;
  }

  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return undefined;
  }

  // Supabase serves a certificate signed by its own CA. Point
  // DATABASE_CA_CERT at that downloaded .crt to verify the chain properly;
  // without it we still encrypt, but cannot prove who is on the other end.
  const caPath = process.env.DATABASE_CA_CERT;
  if (!caPath) return { rejectUnauthorized: false };

  return { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true };
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }

  const pool = new Pool({
    connectionString,
    ssl: sslFor(connectionString),
    max: 10,
    idleTimeoutMillis: 30_000,
    // A managed database across the network takes longer to hand out a
    // connection than a local one, and a cold pooler slower still.
    connectionTimeoutMillis: 15_000,
  });

  // A pooled connection can die between uses (network blip, server restart).
  // Without a listener, pg emits an unhandled 'error' event and takes the
  // process down with it.
  pool.on("error", (err) => {
    console.error("[db] idle client error", err.message);
  });

  return pool;
}

/**
 * In development Next.js re-evaluates modules on every hot reload. Without
 * caching on globalThis, each reload would build a new pool and leak the old
 * one's connections until Postgres refused new ones.
 */
export const pool: Pool = global.__pulsesPool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  global.__pulsesPool = pool;
}

/**
 * Run a parameterised query.
 *
 * Values are ALWAYS passed as `params`, never interpolated into the SQL string.
 * The driver sends the statement and the values separately, so a value can
 * never be parsed as SQL. This is what makes injection impossible — it is a
 * structural guarantee, not a matter of escaping carefully.
 */
export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const started = Date.now();
  const result = await pool.query<T>(text, params);

  const ms = Date.now() - started;
  if (ms > 500) {
    console.warn(`[db] slow query ${ms}ms: ${text.slice(0, 80).replace(/\s+/g, " ")}`);
  }
  return result.rows;
}

/** Single-row helper for queries that aggregate to exactly one result. */
export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
