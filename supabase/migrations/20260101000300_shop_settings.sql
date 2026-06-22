-- Single-row shop configuration: banking details (shown on invoices) and outbound email settings.
create table if not exists shop_settings (
  id text primary key,
  banking jsonb not null default '{}',
  email jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Seed the singleton row (idempotent).
insert into shop_settings (id, banking, email) values ('shop', '{}', '{}')
on conflict (id) do nothing;
