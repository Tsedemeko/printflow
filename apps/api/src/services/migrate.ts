import pg from "pg";
import { config } from "../config.js";

// Idempotent DDL for the tables the API manages at runtime. Running this on boot means
// the operator never has to paste SQL into Supabase — set SUPABASE_DB_URL and it self-heals.
// Everything here is CREATE ... IF NOT EXISTS / ON CONFLICT DO NOTHING, so it is safe to run
// on an existing database without touching data.
const RUNTIME_SCHEMA = `
create table if not exists kiosk_categories (
  id text primary key,
  label text not null,
  description text not null default '',
  position integer not null default 0
);

insert into kiosk_categories (id, label, description, position) values
  ('apparel', 'Apparel, Sublimation & Fashion', 'T-shirts, golf, hoodies, tracksuits, kits, school uniforms, embroidery, overalls, jumpsuits, wedding & traditional dress, trousers.', 0),
  ('signage', 'Banners & Signage', 'X-banners, flag banners, pull-ups, corex boards, gazebos, pop-up walls.', 1),
  ('promotional', 'Branding & Promo', 'Umbrellas, table cloths, oval boards, and branded gifts.', 2)
on conflict (id) do nothing;

create table if not exists shop_settings (
  id text primary key,
  banking jsonb not null default '{}',
  email jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

insert into shop_settings (id, banking, email) values ('shop', '{}', '{}')
on conflict (id) do nothing;
`;

// Creates/updates the API's own tables. No-op (with a log) when no DB connection is configured.
export async function ensureRuntimeSchema(): Promise<void> {
  if (!config.databaseUrl) {
    console.warn("[migrate] SUPABASE_DB_URL not set — skipping auto schema. Settings persist to local disk only.");
    return;
  }
  const client = new pg.Client({
    connectionString: config.databaseUrl,
    // Supabase requires TLS; its pooler cert isn't in the default CA bundle.
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    await client.query(RUNTIME_SCHEMA);
    console.log("[migrate] Runtime schema ensured (kiosk_categories, shop_settings).");
  } catch (error) {
    // Never let a migration problem stop the API from booting — it can still serve from memory/disk.
    console.error("[migrate] Could not ensure schema:", error instanceof Error ? error.message : error);
  } finally {
    await client.end().catch(() => undefined);
  }
}
