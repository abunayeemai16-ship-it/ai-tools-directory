import { createHash } from "node:crypto";
import pg from "pg";
import type { Pool, PoolClient } from "pg";
import type { Database } from "@/lib/types";

const { Pool: PgPool } = pg;

const CATALOG_KEY = "catalog";
const ANALYTICS_KEY = "analytics";
const SCHEMA_KEY = "schema";
/**
 * The catalog row is ~13 MB compressed, and every SQL access decompresses all of it.
 * Public pages read small rows derived from it at write time instead: PUBLIC_KEY holds the
 * card projection, forge_tools one row per tool.
 */
const PUBLIC_KEY = "public";
const SCHEMA_VERSION = 3;
const MIGRATION_LOCK_ID = 7_310_002;
let migrationFailedAt = 0;

/**
 * Events live one per row in forge_events: a pageview is an INSERT, a heartbeat a one-row upsert.
 * Keeping them inside a JSON document forced Postgres to rewrite megabytes on every visit.
 */
const EVENT_FIELDS = ["sessions", "pageviews", "clicks"] as const;
const EVENT_KINDS = [
  { field: "sessions", kind: "session", at: "lastSeen" },
  { field: "pageviews", kind: "pageview", at: "timestamp" },
  { field: "clicks", kind: "click", at: "timestamp" },
] as const;
const CATALOG_COLUMNS = `value - '{sessions,pageviews,clicks}'::text[]`;
/** A suspended serverless function must not pin one of the pooler's few backends. */
const TRANSACTION_GUARDS = [
  "SET LOCAL statement_timeout = '30s'",
  "SET LOCAL idle_in_transaction_session_timeout = '60s'",
];

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
  // DDL takes table locks that queue every later query, so the steady state is one tiny SELECT
  // and tables are only created when missing.
  const marker = await runner.query<{ version: number | null; missing: boolean }>(
    `SELECT (SELECT (value->>'version')::int FROM forge_kv WHERE key = $1) AS version,
            to_regclass('forge_tools') IS NULL OR to_regclass('forge_events') IS NULL AS missing`,
    [SCHEMA_KEY],
  ).catch(async (error: { code?: string }) => {
    if (error.code !== "42P01") throw error;
    await runner.query(`
      CREATE TABLE IF NOT EXISTS forge_kv (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    return { rows: [{ version: null, missing: true }] };
  });
  const { version, missing } = marker.rows[0] ?? { version: null, missing: true };
  if (missing) await createTables(runner);
  if ((version ?? 0) >= SCHEMA_VERSION) {
    schemaReady = true;
    return;
  }
  // One instance runs the move, everyone else carries on, and a failure never fails the request.
  if (Date.now() - migrationFailedAt < 60_000) return;
  try {
    await runner.query("BEGIN");
    const lock = await runner.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_xact_lock($1) AS locked",
      [MIGRATION_LOCK_ID],
    );
    if (!lock.rows[0]?.locked) {
      await runner.query("ROLLBACK");
      migrationFailedAt = Date.now();
      return;
    }
    await runner.query("SET LOCAL statement_timeout = '45s'");
    await runner.query("SET LOCAL idle_in_transaction_session_timeout = '30s'");
    await moveEventsToTable(runner);
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

async function createTables(runner: Runner) {
  await runner.query(`
    DO $$
    BEGIN
      IF to_regclass('forge_tools') IS NULL THEN
        CREATE TABLE forge_tools (slug TEXT PRIMARY KEY, hash TEXT NOT NULL, data JSONB NOT NULL);
        ALTER TABLE forge_tools ENABLE ROW LEVEL SECURITY;
      END IF;
      IF to_regclass('forge_events') IS NULL THEN
        CREATE TABLE forge_events (
          kind TEXT NOT NULL,
          id TEXT NOT NULL,
          at TIMESTAMPTZ NOT NULL,
          data JSONB NOT NULL,
          PRIMARY KEY (kind, id)
        );
        CREATE INDEX forge_events_kind_at ON forge_events (kind, at);
        ALTER TABLE forge_events ENABLE ROW LEVEL SECURITY;
      END IF;
    END $$
  `);
}

function eventTime(field: string) {
  return `CASE WHEN e->>'${field}' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN (e->>'${field}')::timestamptz
               ELSE clock_timestamp() END`;
}

/**
 * Server-side move of the analytics row's event arrays into forge_events.
 * The catalog row is never touched here: reading it takes minutes on a busy free-tier instance,
 * and catalog writes already drop any event keys it still carries.
 */
async function moveEventsToTable(runner: Runner) {
  for (const { field, kind, at } of EVENT_KINDS) {
    await runner.query(
      `INSERT INTO forge_events (kind, id, at, data)
       SELECT DISTINCT ON (id) $3::text, id, at, e FROM (
         SELECT COALESCE(NULLIF(e->>'id', ''), md5(e::text)) AS id, ${eventTime(at)} AS at, e, ord
         FROM forge_kv f, jsonb_array_elements(f.value->$2::text) WITH ORDINALITY t(e, ord)
         WHERE f.key = $1 AND jsonb_typeof(e) = 'object'
       ) src
       ORDER BY id, ord DESC
       ON CONFLICT (kind, id) DO ${
         kind === "session"
           ? "UPDATE SET data = forge_events.data || EXCLUDED.data, at = GREATEST(forge_events.at, EXCLUDED.at)"
           : "NOTHING"
       }`,
      [ANALYTICS_KEY, field, kind],
    );
  }
  await runner.query(
    `UPDATE forge_kv SET value = ${CATALOG_COLUMNS}, updated_at = clock_timestamp()
     WHERE key = $1 AND value ?| '{sessions,pageviews,clicks}'::text[]`,
    [ANALYTICS_KEY],
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
  const current = await client.query<{ published: number | null }>(
    `SELECT COALESCE(
       (SELECT jsonb_array_length(value->'data'->'tools') FROM forge_kv WHERE key = $2),
       (SELECT count(*)::int FROM forge_kv, jsonb_array_elements(COALESCE(value->'tools', '[]'::jsonb)) t
        WHERE key = $1 AND (t->>'status') IS DISTINCT FROM 'draft')
     ) AS published`,
    [CATALOG_KEY, PUBLIC_KEY],
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
  await syncDerivedRows(client, payload);
  return saved.rows[0]?.version ?? null;
}

type JsonObject = Record<string, unknown>;

function pick(source: JsonObject, fields: readonly string[]) {
  const out: JsonObject = {};
  for (const field of fields) {
    if (source[field] !== null && source[field] !== undefined) out[field] = source[field];
  }
  return out;
}

function digest(text: string) {
  return createHash("sha1").update(text).digest("hex");
}

/** Published tools reduced to card fields, plus the small public collections. */
function publicProjection(payload: JsonObject) {
  const tools = Array.isArray(payload.tools) ? (payload.tools as JsonObject[]) : [];
  return {
    settings: pick((payload.settings ?? {}) as JsonObject, [
      "homeSeoTitle",
      "homeSeoDescription",
      "siteDomain",
      "sponsoredName",
      "sponsoredPrice",
      "sponsoredDays",
      "sponsoredOfferPrice",
      "sponsoredOfferStart",
      "sponsoredOfferEnd",
    ]),
    categories: payload.categories ?? [],
    comparisons: payload.comparisons ?? [],
    ads: payload.ads ?? [],
    tools: tools
      .filter((tool) => tool && tool.status !== "draft")
      .map((tool) => pick(tool, PUBLIC_TOOL_FIELDS)),
  };
}

/** Rewrites only the derived rows whose content hash changed. */
export async function syncDerivedRows(client: Runner, payload: JsonObject) {
  const publicJson = JSON.stringify(publicProjection(payload));
  const publicHash = digest(publicJson);
  const stored = await client.query<{ hash: string | null }>(
    "SELECT value->>'hash' AS hash FROM forge_kv WHERE key = $1",
    [PUBLIC_KEY],
  );
  if (stored.rows[0]?.hash !== publicHash) {
    await client.query(
      `INSERT INTO forge_kv (key, value, updated_at)
       VALUES ($1, jsonb_build_object('hash', $2::text, 'data', $3::jsonb), clock_timestamp())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = clock_timestamp()`,
      [PUBLIC_KEY, publicHash, publicJson],
    );
  }

  const known = new Map(
    (await client.query<{ slug: string; hash: string }>("SELECT slug, hash FROM forge_tools")).rows.map(
      (row) => [row.slug, row.hash],
    ),
  );
  const seen = new Set<string>();
  const changed: { slug: string; hash: string; json: string }[] = [];
  for (const tool of Array.isArray(payload.tools) ? (payload.tools as JsonObject[]) : []) {
    const slug = typeof tool?.slug === "string" ? tool.slug : "";
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const json = JSON.stringify(tool);
    const hash = digest(json);
    if (known.get(slug) !== hash) changed.push({ slug, hash, json });
  }
  for (let index = 0; index < changed.length; index += 100) {
    const batch = changed.slice(index, index + 100);
    await client.query(
      `INSERT INTO forge_tools (slug, hash, data)
       SELECT * FROM unnest($1::text[], $2::text[], $3::jsonb[])
       ON CONFLICT (slug) DO UPDATE SET hash = EXCLUDED.hash, data = EXCLUDED.data`,
      [batch.map((row) => row.slug), batch.map((row) => row.hash), batch.map((row) => row.json)],
    );
  }
  const removed = [...known.keys()].filter((slug) => !seen.has(slug));
  if (removed.length) {
    await client.query("DELETE FROM forge_tools WHERE slug = ANY($1::text[])", [removed]);
  }
}

/** Newest event per kind; every heartbeat, pageview, or click moves at least one of them. */
const EVENTS_VERSION_SQL = `concat_ws('|', ${EVENT_KINDS.map(
  ({ kind }) => `(SELECT max(at) FROM forge_events WHERE kind = '${kind}')::text`,
).join(", ")})`;

export async function readStoreVersions(): Promise<StoreVersions> {
  return withClient(async (client) => {
    const res = await client.query<{ catalog: string | null; analytics: string | null }>(
      `SELECT (SELECT updated_at::text FROM forge_kv WHERE key = $1) AS catalog,
              ${EVENTS_VERSION_SQL} AS analytics`,
      [CATALOG_KEY],
    );
    return { catalog: res.rows[0]?.catalog ?? null, analytics: res.rows[0]?.analytics ?? null };
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
    const version = await client.query<{ analytics: string | null }>(
      `SELECT ${EVENTS_VERSION_SQL} AS analytics`,
    );
    const res = await client.query<{ kind: string; data: never }>(
      "SELECT kind, data FROM forge_events WHERE kind = ANY($1::text[]) ORDER BY at",
      [EVENT_KINDS.map((entry) => entry.kind)],
    );
    const value: AnalyticsSlice = { sessions: [], pageviews: [], clicks: [] };
    for (const row of res.rows) {
      const target = EVENT_KINDS.find((entry) => entry.kind === row.kind);
      if (target) value[target.field].push(row.data);
    }
    return { value, version: version.rows[0]?.analytics ?? null };
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
 * Published tools reduced to card fields, plus the small public collections; null until the
 * first catalog write has produced the derived row.
 */
export async function loadPublicCatalog() {
  return withClient(async (client) => {
    const res = await client.query<{ value: Partial<Database> | null }>(
      "SELECT value->'data' AS value FROM forge_kv WHERE key = $1",
      [PUBLIC_KEY],
    );
    return { value: res.rows[0]?.value ?? null };
  });
}

/** One full tool record. `ready` is false until forge_tools has been populated. */
export async function loadCatalogTool(slug: string) {
  return withClient(async (client) => {
    const res = await client.query<{ tool: Database["tools"][number] | null; ready: boolean }>(
      `SELECT (SELECT data FROM forge_tools WHERE slug = $1) AS tool,
              EXISTS (SELECT 1 FROM forge_tools) AS ready`,
      [slug],
    );
    return { tool: res.rows[0]?.tool ?? null, ready: Boolean(res.rows[0]?.ready) };
  });
}

/** Pageview totals since `sinceIso`, aggregated in Postgres. */
export async function loadPageviewSummary(sinceIso: string) {
  return withClient(async (client) => {
    const totals = await client.query<{ pageviews: number; visitors: number }>(
      `SELECT count(*)::int AS pageviews, count(DISTINCT data->>'sessionId')::int AS visitors
       FROM forge_events WHERE kind = 'pageview' AND at >= $1::timestamptz`,
      [sinceIso],
    );
    const countries = await client.query<{ country: string }>(
      `SELECT data->>'country' AS country
       FROM forge_events
       WHERE kind = 'pageview' AND at >= $1::timestamptz
         AND COALESCE(data->>'country', '') NOT IN ('', 'UN')
       GROUP BY 1 ORDER BY count(*) DESC LIMIT 5`,
      [sinceIso],
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
      for (const guard of TRANSACTION_GUARDS) await client.query(guard);
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
export async function appendAnalyticsEvent(
  field: "pageviews" | "clicks",
  event: { id: string; timestamp: string },
) {
  const kind = field === "pageviews" ? "pageview" : "click";
  await withClient((client) =>
    client.query(
      `INSERT INTO forge_events (kind, id, at, data) VALUES ($1, $2, $3::timestamptz, $4::jsonb)
       ON CONFLICT (kind, id) DO NOTHING`,
      [kind, event.id, event.timestamp, JSON.stringify(event)],
    ),
  );
}

/*
 * Small non-analytics records (live comparisons, rate-limit counters) share forge_events under
 * their own kinds, so they need no DDL and never touch the catalog row.
 */

export async function readRecord<T>(kind: string, id: string) {
  return withClient(async (client) => {
    const res = await client.query<{ data: T }>(
      "SELECT data FROM forge_events WHERE kind = $1 AND id = $2",
      [kind, id],
    );
    return res.rows[0]?.data ?? null;
  });
}

export async function writeRecord(kind: string, id: string, at: string, data: unknown) {
  await withClient((client) =>
    client.query(
      `INSERT INTO forge_events (kind, id, at, data) VALUES ($1, $2, $3::timestamptz, $4::jsonb)
       ON CONFLICT (kind, id) DO UPDATE SET data = EXCLUDED.data, at = EXCLUDED.at`,
      [kind, id, at, JSON.stringify(data)],
    ),
  );
}

export async function mergeRecord<T>(kind: string, id: string, patch: Record<string, unknown>) {
  return withClient(async (client) => {
    const res = await client.query<{ data: T }>(
      "UPDATE forge_events SET data = data || $3::jsonb WHERE kind = $1 AND id = $2 RETURNING data",
      [kind, id, JSON.stringify(patch)],
    );
    return res.rows[0]?.data ?? null;
  });
}

export async function incrementRecordField(kind: string, id: string, field: string) {
  await withClient((client) =>
    client.query(
      `UPDATE forge_events
       SET data = jsonb_set(data, ARRAY[$3::text], to_jsonb(COALESCE((data->>$3)::int, 0) + 1))
       WHERE kind = $1 AND id = $2`,
      [kind, id, field],
    ),
  );
}

export async function listRecords<T>(kind: string, limit: number) {
  return withClient(async (client) => {
    const res = await client.query<{ data: T }>(
      "SELECT data FROM forge_events WHERE kind = $1 ORDER BY at DESC LIMIT $2",
      [kind, limit],
    );
    return res.rows.map((row) => row.data);
  });
}

export async function deleteRecord(kind: string, id: string) {
  await withClient((client) =>
    client.query("DELETE FROM forge_events WHERE kind = $1 AND id = $2", [kind, id]),
  );
}

export async function deleteRecordsBefore(kind: string, beforeIso: string) {
  await withClient((client) =>
    client.query("DELETE FROM forge_events WHERE kind = $1 AND at < $2::timestamptz", [
      kind,
      beforeIso,
    ]),
  );
}

/** Atomically adds one to a counter row and returns the new count. */
export async function incrementCounter(kind: string, id: string, at: string) {
  return withClient(async (client) => {
    const res = await client.query<{ n: number }>(
      `INSERT INTO forge_events (kind, id, at, data) VALUES ($1, $2, $3::timestamptz, '{"n":1}'::jsonb)
       ON CONFLICT (kind, id) DO UPDATE
         SET data = jsonb_build_object('n', COALESCE((forge_events.data->>'n')::int, 0) + 1)
       RETURNING (data->>'n')::int AS n`,
      [kind, id, at],
    );
    return res.rows[0]?.n ?? 1;
  });
}

/** Inserts the session or merges `patch` into the existing one, server-side. */
export async function touchAnalyticsSession(
  session: Database["sessions"][number],
  patch: Partial<Database["sessions"][number]>,
) {
  await withClient((client) =>
    client.query(
      `INSERT INTO forge_events (kind, id, at, data) VALUES ('session', $1, $2::timestamptz, $3::jsonb)
       ON CONFLICT (kind, id) DO UPDATE SET
         data = forge_events.data || $4::jsonb,
         at = GREATEST(forge_events.at, EXCLUDED.at)`,
      [session.id, session.lastSeen, JSON.stringify(session), JSON.stringify(patch)],
    ),
  );
}
