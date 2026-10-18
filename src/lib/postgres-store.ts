import pg from "pg";
import type { Pool, PoolClient } from "pg";
import type { Database } from "@/lib/types";

const { Pool: PgPool } = pg;

const CATALOG_KEY = "catalog";
const ANALYTICS_KEY = "analytics";
const SCHEMA_KEY = "schema";
const SCHEMA_VERSION = 2;
const MIGRATION_LOCK_ID = 7_310_002;
let migrationFailedAt = 0;

/** Event streams live in the analytics row so catalog reads stay small and rarely change. */
const EVENT_FIELDS = ["sessions", "pageviews", "clicks"] as const;
const CATALOG_COLUMNS = `value - 'sessions' - 'pageviews' - 'clicks'`;

export type AnalyticsSlice = Pick<Database, "sessions" | "pageviews" | "clicks">;
export type StoreVersions = { catalog: string | null; analytics: string | null };

type Runner = Pool | PoolClient;

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
    // Concurrent cached loaders queue for the single Vercel connection; give them room.
    connectionTimeoutMillis: process.env.VERCEL ? 10_000 : 8_000,
    ssl: local ? undefined : { rejectUnauthorized: false },
  });
  pool.on("error", (error) => {
    console.error("[forge] Postgres pool error", error);
  });
  return pool;
}

async function ensureSchema(runner: Runner) {
  if (schemaReady) return;
  await runner.query(`
    CREATE TABLE IF NOT EXISTS forge_kv (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Checking the big rows for leftover keys would detoast megabytes on every cold start;
  // a tiny marker row records that the migration already ran.
  const marker = await runner.query<{ version: number | null }>(
    "SELECT (value->>'version')::int AS version FROM forge_kv WHERE key = $1",
    [SCHEMA_KEY],
  );
  if ((marker.rows[0]?.version ?? 0) >= SCHEMA_VERSION) {
    schemaReady = true;
    return;
  }
  // Reads already project event fields away, so the move is housekeeping: one instance runs it,
  // everyone else carries on, and a failure never fails the request.
  if (Date.now() - migrationFailedAt < 10 * 60_000) return;
  try {
    await runner.query("BEGIN");
    const lock = await runner.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_xact_lock($1) AS locked",
      [MIGRATION_LOCK_ID],
    );
    if (!lock.rows[0]?.locked) {
      await runner.query("ROLLBACK");
      return;
    }
    await runner.query("SET LOCAL statement_timeout = '45s'");
    await moveEventsOutOfCatalog(runner);
    await runner.query(
      `INSERT INTO forge_kv (key, value, updated_at) VALUES ($1, $2::jsonb, clock_timestamp())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = clock_timestamp()`,
      [SCHEMA_KEY, JSON.stringify({ version: SCHEMA_VERSION })],
    );
    await runner.query("COMMIT");
    schemaReady = true;
  } catch (error) {
    migrationFailedAt = Date.now();
    await runner.query("ROLLBACK").catch(() => undefined);
    console.error("[forge] analytics migration failed; will retry later", error);
  }
}

/** Server-side move of event streams into the analytics row; no data leaves Postgres. */
async function moveEventsOutOfCatalog(runner: Runner) {
  await runner.query(
    `INSERT INTO forge_kv (key, value, updated_at)
     SELECT $2, jsonb_build_object(
       'sessions', COALESCE(value->'sessions', '[]'::jsonb),
       'pageviews', COALESCE(value->'pageviews', '[]'::jsonb),
       'clicks', COALESCE(value->'clicks', '[]'::jsonb)
     ), clock_timestamp()
     FROM forge_kv WHERE key = $1 AND NOT EXISTS (SELECT 1 FROM forge_kv WHERE key = $2)
     ON CONFLICT (key) DO NOTHING`,
    [CATALOG_KEY, ANALYTICS_KEY],
  );
  // Merge by id (older deployments may still append clicks to the catalog row during rollout).
  // Sort-based dedupe keeps this O(n log n) for large click histories.
  await runner.query(
    `WITH source AS (
       SELECT e, ord FROM forge_kv a,
         jsonb_array_elements(COALESCE(a.value->'clicks', '[]'::jsonb)) WITH ORDINALITY t(e, ord)
       WHERE a.key = $2
       UNION ALL
       SELECT e, 1000000000 + ord FROM forge_kv c,
         jsonb_array_elements(c.value->'clicks') WITH ORDINALITY t(e, ord)
       WHERE c.key = $1 AND jsonb_typeof(c.value->'clicks') = 'array'
     ), unique_clicks AS (
       SELECT DISTINCT ON (COALESCE(e->>'id', ord::text)) e, ord
       FROM source ORDER BY COALESCE(e->>'id', ord::text), ord
     )
     UPDATE forge_kv
     SET value = jsonb_set(value, '{clicks}',
           COALESCE((SELECT jsonb_agg(e ORDER BY ord) FROM unique_clicks), '[]'::jsonb)),
         updated_at = clock_timestamp()
     WHERE key = $2 AND EXISTS (
       SELECT 1 FROM forge_kv c WHERE c.key = $1 AND jsonb_typeof(c.value->'clicks') = 'array'
     )`,
    [CATALOG_KEY, ANALYTICS_KEY],
  );
  await runner.query(
    `UPDATE forge_kv SET value = ${CATALOG_COLUMNS}, updated_at = clock_timestamp()
     WHERE key = $1 AND (value ? 'sessions' OR value ? 'pageviews' OR value ? 'clicks')`,
    [CATALOG_KEY],
  );
}

async function withClient<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await ensureSchema(client);
    return await fn(client);
  } finally {
    client.release();
  }
}

function stripEvents(value: unknown) {
  const copy = { ...(value as Record<string, unknown>) };
  for (const field of EVENT_FIELDS) delete copy[field];
  return copy;
}

function publishedCount(raw: unknown) {
  const tools = (raw as { tools?: { status?: string }[] } | null)?.tools;
  if (!Array.isArray(tools)) return 0;
  return tools.filter((tool) => tool?.status !== "draft").length;
}

/** Returns the new catalog version, or null when the write was skipped. */
async function upsertCatalog(client: Runner, value: unknown) {
  const payload = stripEvents(value);
  const incoming = publishedCount(payload);
  const current = await client.query<{ published: number }>(
    `SELECT (
       SELECT count(*) FROM jsonb_array_elements(COALESCE(value->'tools', '[]'::jsonb)) t
       WHERE (t->>'status') IS DISTINCT FROM 'draft'
     )::int AS published
     FROM forge_kv WHERE key = $1`,
    [CATALOG_KEY],
  );
  const existing = current.rows[0]?.published ?? 0;
  if (existing > incoming) {
    console.warn("[forge] skip catalog write that would drop published tools", {
      existing,
      incoming,
    });
    return null;
  }
  const saved = await client.query<{ version: string }>(
    `INSERT INTO forge_kv (key, value, updated_at)
     VALUES ($1, $2::jsonb, clock_timestamp())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = clock_timestamp()
     RETURNING updated_at::text AS version`,
    [CATALOG_KEY, JSON.stringify(payload)],
  );
  return saved.rows[0]?.version ?? null;
}

export async function readStoreVersions(): Promise<StoreVersions> {
  return withClient(async (client) => {
    const res = await client.query<{ key: string; version: string }>(
      "SELECT key, updated_at::text AS version FROM forge_kv WHERE key = ANY($1::text[])",
      [[CATALOG_KEY, ANALYTICS_KEY]],
    );
    const find = (key: string) => res.rows.find((row) => row.key === key)?.version ?? null;
    return { catalog: find(CATALOG_KEY), analytics: find(ANALYTICS_KEY) };
  });
}

export async function loadCatalog() {
  return withClient(async (client) => {
    const res = await client.query<{ value: Partial<Database>; version: string }>(
      `SELECT ${CATALOG_COLUMNS} AS value, updated_at::text AS version FROM forge_kv WHERE key = $1`,
      [CATALOG_KEY],
    );
    return { value: res.rows[0]?.value ?? null, version: res.rows[0]?.version ?? null };
  });
}

export async function loadAnalytics() {
  return withClient(async (client) => {
    const res = await client.query<{ value: Partial<AnalyticsSlice>; version: string }>(
      "SELECT value, updated_at::text AS version FROM forge_kv WHERE key = $1",
      [ANALYTICS_KEY],
    );
    return { value: res.rows[0]?.value ?? null, version: res.rows[0]?.version ?? null };
  });
}

/** Tool fields needed by cards, deals, comparisons, and the sitemap. */
const PUBLIC_TOOL_FIELDS = [
  "slug",
  "name",
  "website",
  "officialUrl",
  "category",
  "pricingModel",
  "rating",
  "reviewCount",
  "featured",
  "brandColor",
  "shortPitch",
  "bestFor",
  "dealText",
  "couponCode",
  "couponDiscount",
  "couponExpires",
  "status",
  "createdAt",
];

/**
 * Published tools reduced to card fields, plus the small public collections.
 * Drafts, submissions, keys, commissions, rank checks, and long review text stay in Postgres.
 */
export async function loadPublicCatalog() {
  const toolObject = `jsonb_strip_nulls(jsonb_build_object(${PUBLIC_TOOL_FIELDS.map(
    (field) => `'${field}', t->'${field}'`,
  ).join(", ")}))`;
  return withClient(async (client) => {
    const res = await client.query<{ value: Partial<Database>; version: string }>(
      `SELECT jsonb_strip_nulls(jsonb_build_object(
         'settings', jsonb_build_object(
           'homeSeoTitle', value->'settings'->'homeSeoTitle',
           'homeSeoDescription', value->'settings'->'homeSeoDescription',
           'siteDomain', value->'settings'->'siteDomain'
         ),
         'categories', value->'categories',
         'comparisons', value->'comparisons',
         'ads', value->'ads',
         'tools', (
           SELECT COALESCE(jsonb_agg(${toolObject}), '[]'::jsonb)
           FROM jsonb_array_elements(COALESCE(value->'tools', '[]'::jsonb)) t
           WHERE (t->>'status') IS DISTINCT FROM 'draft'
         )
       )) AS value, updated_at::text AS version
       FROM forge_kv WHERE key = $1`,
      [CATALOG_KEY],
    );
    return { value: res.rows[0]?.value ?? null, version: res.rows[0]?.version ?? null };
  });
}

/** One full tool record, without downloading the rest of the catalog. */
export async function loadCatalogTool(slug: string) {
  return withClient(async (client) => {
    const res = await client.query<{ tool: Database["tools"][number] }>(
      `SELECT t AS tool
       FROM forge_kv, jsonb_array_elements(COALESCE(value->'tools', '[]'::jsonb)) t
       WHERE key = $1 AND t->>'slug' = $2
       LIMIT 1`,
      [CATALOG_KEY, slug],
    );
    return res.rows[0]?.tool ?? null;
  });
}

/** Pageview totals since `sinceIso`, aggregated in Postgres. */
export async function loadPageviewSummary(sinceIso: string) {
  return withClient(async (client) => {
    const totals = await client.query<{ pageviews: number; visitors: number }>(
      `SELECT count(*)::int AS pageviews, count(DISTINCT e->>'sessionId')::int AS visitors
       FROM forge_kv, jsonb_array_elements(COALESCE(value->'pageviews', '[]'::jsonb)) e
       WHERE key = $1 AND e->>'timestamp' >= $2`,
      [ANALYTICS_KEY, sinceIso],
    );
    const countries = await client.query<{ country: string }>(
      `SELECT e->>'country' AS country
       FROM forge_kv, jsonb_array_elements(COALESCE(value->'pageviews', '[]'::jsonb)) e
       WHERE key = $1 AND e->>'timestamp' >= $2
         AND COALESCE(e->>'country', '') NOT IN ('', 'UN')
       GROUP BY 1 ORDER BY count(*) DESC LIMIT 5`,
      [ANALYTICS_KEY, sinceIso],
    );
    return {
      pageviews: totals.rows[0]?.pageviews ?? 0,
      visitors: totals.rows[0]?.visitors ?? 0,
      topCountries: countries.rows.map((row) => row.country),
    };
  });
}

export async function savePostgresCatalog(payload: unknown) {
  return withClient((client) => upsertCatalog(client, payload));
}

/**
 * Locks the catalog row and runs `fn`. When `cachedVersion` still matches the stored version,
 * `fn` receives `reuseCached = true` and no catalog payload is downloaded.
 * `fn` returns `next: null` when nothing changed, which skips the write entirely.
 */
export async function withCatalogTransaction<T>(
  cachedVersion: string | null,
  fn: (
    raw: Partial<Database> | null,
    reuseCached: boolean,
  ) => Promise<{ result: T; next: Database | null }>,
): Promise<{ result: T; version: string | null; written: boolean }> {
  return withClient(async (client) => {
    try {
      await client.query("BEGIN");
      const locked = await client.query<{ version: string }>(
        "SELECT updated_at::text AS version FROM forge_kv WHERE key = $1 FOR UPDATE",
        [CATALOG_KEY],
      );
      const current = locked.rows[0]?.version ?? null;
      const reuse = cachedVersion !== null && current === cachedVersion;
      let raw: Partial<Database> | null = null;
      if (!reuse) {
        const res = await client.query<{ value: Partial<Database> }>(
          `SELECT ${CATALOG_COLUMNS} AS value FROM forge_kv WHERE key = $1`,
          [CATALOG_KEY],
        );
        raw = res.rows[0]?.value ?? null;
      }
      const { result, next } = await fn(raw, reuse);
      let version = current;
      let written = false;
      if (next) {
        const saved = await upsertCatalog(client, next);
        if (saved) {
          version = saved;
          written = true;
        }
      }
      await client.query("COMMIT");
      return { result, version, written };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* ignore rollback errors */
      }
      throw error;
    }
  });
}

/** Appends one event server-side; nothing is read back. */
export async function appendAnalyticsEvent(field: "pageviews" | "clicks", event: object) {
  await withClient((client) =>
    client.query(
      `INSERT INTO forge_kv (key, value, updated_at)
       VALUES ($1, jsonb_build_object($2::text, jsonb_build_array($3::jsonb)), clock_timestamp())
       ON CONFLICT (key) DO UPDATE SET
         value = jsonb_set(
           forge_kv.value,
           ARRAY[$2::text],
           COALESCE(forge_kv.value->$2::text, '[]'::jsonb) || jsonb_build_array($3::jsonb)
         ),
         updated_at = clock_timestamp()`,
      [ANALYTICS_KEY, field, JSON.stringify(event)],
    ),
  );
}

/** Inserts the session or merges `patch` into the existing one, server-side. */
export async function touchAnalyticsSession(
  session: Database["sessions"][number],
  patch: Partial<Database["sessions"][number]>,
) {
  await withClient((client) =>
    client.query(
      `INSERT INTO forge_kv (key, value, updated_at)
       VALUES ($1, jsonb_build_object('sessions', jsonb_build_array($2::jsonb)), clock_timestamp())
       ON CONFLICT (key) DO UPDATE SET
         value = jsonb_set(forge_kv.value, '{sessions}', CASE
           WHEN EXISTS (
             SELECT 1 FROM jsonb_array_elements(COALESCE(forge_kv.value->'sessions', '[]'::jsonb)) s
             WHERE s->>'id' = $3
           )
           THEN (
             SELECT jsonb_agg(CASE WHEN e.s->>'id' = $3 THEN e.s || $4::jsonb ELSE e.s END ORDER BY e.ord)
             FROM jsonb_array_elements(forge_kv.value->'sessions') WITH ORDINALITY AS e(s, ord)
           )
           ELSE COALESCE(forge_kv.value->'sessions', '[]'::jsonb) || jsonb_build_array($2::jsonb)
         END),
         updated_at = clock_timestamp()`,
      [ANALYTICS_KEY, JSON.stringify(session), session.id, JSON.stringify(patch)],
    ),
  );
}
