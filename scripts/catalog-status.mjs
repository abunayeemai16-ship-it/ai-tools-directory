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
const local = JSON.parse(readFileSync(path.join(root, "data", "db.json"), "utf8"));
const jsonTools = Array.isArray(local.tools) ? local.tools : [];
const jsonPub = jsonTools.filter((t) => t.status === "published");

console.log("json", { total: jsonTools.length, published: jsonPub.length });
console.log("database_url_set", Boolean(url));
if (!url) process.exit(0);

const pool = new Pool({
  connectionString: stripSslMode(url),
  max: 1,
  connectionTimeoutMillis: 15_000,
  ssl: /localhost|127\.0\.0\.1/i.test(url) ? undefined : { rejectUnauthorized: false },
});
const result = await pool.query("SELECT value FROM forge_kv WHERE key = $1", ["catalog"]);
const catalog = result.rows[0]?.value || {};
const tools = Array.isArray(catalog.tools) ? catalog.tools : [];
const pub = tools.filter((t) => t.status === "published");
const jsonSlugs = new Set(jsonPub.map((t) => t.slug));
const pgSlugs = new Set(pub.map((t) => t.slug));
const missingOnPg = jsonPub.filter((t) => !pgSlugs.has(t.slug)).map((t) => t.slug);
const extraOnPg = pub.filter((t) => !jsonSlugs.has(t.slug)).map((t) => t.slug);
console.log("postgres", { total: tools.length, published: pub.length, keys: Object.keys(catalog) });
console.log("missingOnPostgres", missingOnPg.length, missingOnPg.slice(0, 40));
console.log("extraOnPostgres", extraOnPg.length, extraOnPg.slice(0, 20));
await pool.end();
