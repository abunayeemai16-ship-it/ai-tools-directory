-- Forge persistent store for Supabase Postgres / Vercel.
-- The app also creates this table automatically on first DATABASE_URL connection.

CREATE TABLE IF NOT EXISTS forge_kv (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS forge_kv_updated_at_idx ON forge_kv (updated_at DESC);
