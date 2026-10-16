import pg from "pg";
import type { Pool, PoolClient } from "pg";
import type { Database } from "@/lib/types";

const { Pool: PgPool } = pg;

const CATALOG_KEY = "catalog";
const ANALYTICS_KEY = "analytics";

let pool: Pool | null = null;
let schemaReady = false;

export function databaseUrl() {
  return (process.env.DATABASE_URL || process.env.POSTGRES_URL || "").trim();
}

export function usesPostgres() {
  return Boolean(databaseUrl());
}

function connectionStringWithoutSslMode(url: string) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("uselibpqcompat");
    return parsed.toString();
  } catch {
    return url
      .replace(/[?&]sslmode=[^&]*/gi, "")
      .replace(/[?&]uselibpqcompat=[^&]*/gi, "")
      .replace(/\?&/, "?")
      .replace(/[?&]$/, "");
  }
}

function getPool() {
  if (pool) return pool;
  const url = databaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const local = /localhost|127\.0\.0\.1/i.test(url);
  pool = new PgPool({
    connectionString: connectionStringWithoutSslMode(url),
    max: process.env.VERCEL ? 1 : 4,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: process.env.VERCEL ? 3_000 : 8_000,
    ssl: local ? undefined : { rejectUnauthorized: false },
  });
  pool.on("error", (error) => {
    console.error("[forge] Postgres pool error", error);
  });
  return pool;
}

async function ensureSchema(runner: Pool | PoolClient) {
  if (schemaReady) return;
  await runner.query(`
    CREATE TABLE IF NOT EXISTS forge_kv (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  schemaReady = true;
}

async function upsert(client: Pool | PoolClient, key: string, value: unknown) {
  await client.query(
    `INSERT INTO forge_kv (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify(value)],
  );
}

function mergeAnalytics(
  catalog: Partial<Database> | null,
  analytics: { sessions?: Database["sessions"]; pageviews?: Database["pageviews"] } | null,
): Partial<Database> | null {
  if (!catalog) return null;
  if (analytics?.sessions) catalog.sessions = analytics.sessions;
  if (analytics?.pageviews) catalog.pageviews = analytics.pageviews;
  return catalog;
}

export async function loadPostgresStore(): Promise<Partial<Database> | null> {
  const client = await getPool().connect();
  try {
    await ensureSchema(client);
    const catalog = await client.query<{ value: Partial<Database> }>(
      "SELECT value FROM forge_kv WHERE key = $1",
      [CATALOG_KEY],
    );
    const analytics = await client.query<{
      value: { sessions?: Database["sessions"]; pageviews?: Database["pageviews"] };
    }>("SELECT value FROM forge_kv WHERE key = $1", [ANALYTICS_KEY]);
    return mergeAnalytics(catalog.rows[0]?.value ?? null, analytics.rows[0]?.value ?? null);
  } finally {
    client.release();
  }
}

export async function savePostgresCatalog(payload: unknown) {
  const client = await getPool().connect();
  try {
    await ensureSchema(client);
    await upsert(client, CATALOG_KEY, payload);
  } finally {
    client.release();
  }
}

export async function savePostgresAnalytics(payload: {
  sessions: Database["sessions"];
  pageviews: Database["pageviews"];
}) {
  const client = await getPool().connect();
  try {
    await ensureSchema(client);
    await upsert(client, ANALYTICS_KEY, payload);
  } finally {
    client.release();
  }
}

export async function withPostgresTransaction<T>(
  fn: (raw: Partial<Database> | null) => Promise<{ result: T; next: Database }>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await ensureSchema(client);
    await client.query("BEGIN");
    const catalog = await client.query<{ value: Partial<Database> }>(
      "SELECT value FROM forge_kv WHERE key = $1 FOR UPDATE",
      [CATALOG_KEY],
    );
    const analytics = await client.query<{
      value: { sessions?: Database["sessions"]; pageviews?: Database["pageviews"] };
    }>("SELECT value FROM forge_kv WHERE key = $1 FOR UPDATE", [ANALYTICS_KEY]);
    const raw = mergeAnalytics(catalog.rows[0]?.value ?? null, analytics.rows[0]?.value ?? null);
    const { result, next } = await fn(raw);
    await upsert(client, CATALOG_KEY, {
      settings: next.settings,
      geminiKeys: next.geminiKeys,
      categories: next.categories,
      tools: next.tools,
      comparisons: next.comparisons,
      submissions: next.submissions,
      clicks: next.clicks,
      commissions: next.commissions,
      rankChecks: next.rankChecks,
      ads: next.ads,
      sessions: next.sessions,
      pageviews: next.pageviews,
    });
    await upsert(client, ANALYTICS_KEY, {
      sessions: next.sessions,
      pageviews: next.pageviews,
    });
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore rollback errors */
    }
    throw error;
  } finally {
    client.release();
  }
}
