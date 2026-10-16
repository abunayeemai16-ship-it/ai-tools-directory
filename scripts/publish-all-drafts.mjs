import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { Pool } = require("pg");
const root = process.cwd();

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

loadEnv(path.join(root, ".env.local"));
const url = (process.env.DATABASE_URL || process.env.POSTGRES_URL || "").trim();
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: stripSslMode(url),
  max: 1,
  connectionTimeoutMillis: 15_000,
  ssl: /localhost|127\.0\.0\.1/i.test(url) ? undefined : { rejectUnauthorized: false },
});

const meta = await pool.query(
  "SELECT key, pg_column_size(value) AS bytes, updated_at FROM forge_kv",
);
console.log("rows", meta.rows);

const result = await pool.query("SELECT value FROM forge_kv WHERE key = $1", ["catalog"]);
const catalog = result.rows[0]?.value;
if (!catalog || !Array.isArray(catalog.tools)) {
  console.error("No catalog tools in Postgres");
  await pool.end();
  process.exit(1);
}

const before = {
  tools: catalog.tools.length,
  published: catalog.tools.filter((tool) => tool.status === "published").length,
  drafts: catalog.tools.filter((tool) => tool.status === "draft").length,
  comparisons: Array.isArray(catalog.comparisons) ? catalog.comparisons.length : 0,
  comparisonDrafts: Array.isArray(catalog.comparisons)
    ? catalog.comparisons.filter((item) => item.status === "draft").length
    : 0,
};
console.log("before", before);

const culture = catalog.tools.find(
  (tool) =>
    String(tool.slug || "").includes("culture") ||
    String(tool.name || "").toLowerCase().includes("culture amp"),
);
console.log("cultureAmp", culture && { slug: culture.slug, status: culture.status, name: culture.name });

if (process.argv.includes("--apply")) {
  for (const tool of catalog.tools) tool.status = "published";
  if (Array.isArray(catalog.comparisons)) {
    for (const item of catalog.comparisons) item.status = "published";
  }
  await pool.query(
    `INSERT INTO forge_kv (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    ["catalog", JSON.stringify(catalog)],
  );
  const afterRes = await pool.query("SELECT value FROM forge_kv WHERE key = $1", ["catalog"]);
  const afterTools = afterRes.rows[0].value.tools || [];
  console.log("after", {
    tools: afterTools.length,
    published: afterTools.filter((tool) => tool.status === "published").length,
    drafts: afterTools.filter((tool) => tool.status === "draft").length,
  });
}

await pool.end();
