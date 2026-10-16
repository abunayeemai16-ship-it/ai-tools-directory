import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { Pool } = require("pg");

const root = process.cwd();
loadEnv(path.join(root, ".env.local"));

const url = (process.env.DATABASE_URL || process.env.POSTGRES_URL || "").trim();
if (!url) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const dbPath = path.join(root, "data", "db.json");
const local = JSON.parse(readFileSync(dbPath, "utf8"));
const localTools = Array.isArray(local.tools) ? local.tools : [];
const localComparisons = Array.isArray(local.comparisons) ? local.comparisons : [];
const localCategories = Array.isArray(local.categories) ? local.categories : [];

const connectionString = stripSslMode(url);
const localHost = /localhost|127\.0\.0\.1/i.test(url);
const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 15_000,
  ssl: localHost ? undefined : { rejectUnauthorized: false },
});

const replace = process.argv.includes("--replace");
const catalog = await loadCatalog(pool);
const tools = replace ? [] : Array.isArray(catalog.tools) ? catalog.tools : [];
const comparisons = replace
  ? []
  : Array.isArray(catalog.comparisons)
    ? catalog.comparisons
    : [];
const categories = replace
  ? []
  : Array.isArray(catalog.categories)
    ? catalog.categories
    : [];

const takenTools = new Set(
  tools.flatMap((tool) => [tool.slug, String(tool.name || "").trim().toLowerCase()]),
);
const added = [];
for (const tool of localTools) {
  const nameKey = String(tool.name || "").trim().toLowerCase();
  if (!tool.slug || takenTools.has(tool.slug) || (nameKey && takenTools.has(nameKey))) continue;
  tools.push(tool);
  takenTools.add(tool.slug);
  if (nameKey) takenTools.add(nameKey);
  added.push({ slug: tool.slug, name: tool.name, status: tool.status });
}

const takenComparisons = new Set(
  comparisons.flatMap((item) => [item.slug, `${item.toolASlug}::${item.toolBSlug}`]),
);
let addedComparisons = 0;
for (const item of localComparisons) {
  const pair = `${item.toolASlug}::${item.toolBSlug}`;
  if (!item.slug || takenComparisons.has(item.slug) || takenComparisons.has(pair)) continue;
  comparisons.push(item);
  takenComparisons.add(item.slug);
  takenComparisons.add(pair);
  addedComparisons += 1;
}

const takenCategories = new Set(categories.map((item) => item.slug));
let addedCategories = 0;
for (const item of localCategories) {
  if (!item.slug || takenCategories.has(item.slug)) continue;
  categories.push(item);
  takenCategories.add(item.slug);
  addedCategories += 1;
}

const next = {
  ...catalog,
  tools,
  comparisons,
  categories,
};
await upsertCatalog(pool, next);
await pool.end();

const published = tools.filter((tool) => tool.status === "published").length;
console.log(
  JSON.stringify(
    {
      ok: true,
      sourceTools: localTools.length,
      addedTools: added.length,
      addedComparisons,
      addedCategories,
      storeTools: tools.length,
      publishedTools: published,
      added: added.slice(0, 40),
    },
    null,
    2,
  ),
);

function loadEnv(file) {
  let text = "";
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function stripSslMode(value) {
  try {
    const parsed = new URL(value);
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("uselibpqcompat");
    return parsed.toString();
  } catch {
    return value;
  }
}

async function loadCatalog(clientPool) {
  await clientPool.query(`
    CREATE TABLE IF NOT EXISTS forge_kv (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const result = await clientPool.query("SELECT value FROM forge_kv WHERE key = $1", ["catalog"]);
  return result.rows[0]?.value && typeof result.rows[0].value === "object"
    ? result.rows[0].value
    : {};
}

async function upsertCatalog(clientPool, value) {
  await clientPool.query(
    `INSERT INTO forge_kv (key, value, updated_at)
     VALUES ('catalog', $1::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(value)],
  );
}
