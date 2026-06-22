create extension if not exists "pgcrypto";

create type product_category as enum ('apparel', 'document', 'signage', 'canvas_photo', 'promotional', 'quick_sale');
create type order_source as enum ('kiosk', 'counter', 'online', 'quick_sale');
create type order_status as enum ('new', 'awaiting_artwork', 'design_review', 'approved', 'in_production', 'quality_check', 'ready_for_collection', 'completed', 'cancelled');
create type payment_status as enum ('unpaid', 'deposit_due', 'deposit_paid', 'paid', 'refunded', 'failed');
create type payment_method as enum ('cash', 'card_yoco', 'payfast', 'eft', 'snapscan', 'zapper', 'manual_external');
create type proof_status as enum ('not_required', 'draft', 'sent', 'changes_requested', 'approved', 'expired');
create type notification_channel as enum ('sms', 'email', 'whatsapp', 'in_app');

create table profiles (
  id text primary key default gen_random_uuid()::text,
  full_name text not null,
  email text,
  mobile text,
  role text not null check (role in ('owner', 'manager', 'sales_assistant', 'cashier', 'designer', 'document_operator', 'canvas_operator', 'apparel_operator', 'signage_operator')),
  roles text[] not null default '{}',
  access_areas text[] not null default '{}',
  active boolean not null default true,
  password_hash text,
  created_at timestamptz not null default now()
);

create table customers (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  mobile text not null unique,
  email text unique,
  created_at timestamptz not null default now()
);

create table catalog_products (
  id text primary key,
  category product_category not null,
  department text not null,
  name text not null,
  description text not null,
  base_price numeric(12,2) not null,
  unit_label text not null,
  requires_artwork boolean not null default true,
  proof_recommended boolean not null default false,
  inventory_tags text[] not null default '{}',
  options jsonb not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table pricing_rules (
  id text primary key default gen_random_uuid()::text,
  label text not null,
  product_id text references catalog_products(id),
  rule jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table deposit_rules (
  id text primary key default gen_random_uuid()::text,
  label text not null,
  priority integer not null default 0,
  category product_category,
  product_id text references catalog_products(id),
  min_total numeric(12,2),
  max_total numeric(12,2),
  deposit_percent numeric(5,2) not null,
  non_refundable boolean not null default true,
  active boolean not null default true
);

create table discount_rules (
  id text primary key default gen_random_uuid()::text,
  label text not null,
  priority integer not null default 0,
  category product_category,
  product_id text references catalog_products(id),
  min_quantity integer,
  min_total numeric(12,2),
  discount_percent numeric(5,2) not null,
  active boolean not null default true
);

create table orders (
  id text primary key default gen_random_uuid()::text,
  order_number text not null unique,
  source order_source not null,
  status order_status not null default 'new',
  payment_status payment_status not null default 'unpaid',
  customer_id text not null references customers(id),
  subtotal numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  required_deposit numeric(12,2) not null default 0,
  balance_due numeric(12,2) not null default 0,
  queue_name text not null,
  staff_assignee_id text references profiles(id),
  rush boolean not null default false,
  internal_notes jsonb not null default '[]',
  activity_log jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references orders(id) on delete cascade,
  product_id text not null references catalog_products(id),
  product_name text not null,
  category product_category not null,
  department text not null,
  quantity integer not null,
  selected_options jsonb not null default '{}',
  special_instructions text,
  unit_price numeric(12,2) not null,
  line_total numeric(12,2) not null,
  batch_key text not null
);

create table artwork_files (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references orders(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  storage_path text not null,
  uploaded_by text not null check (uploaded_by in ('customer', 'staff')),
  width_px integer,
  height_px integer,
  dpi integer,
  preflight_warnings text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table proofs (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references orders(id) on delete cascade,
  status proof_status not null default 'draft',
  preview_path text,
  customer_comments text,
  sent_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table payments (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references orders(id) on delete cascade,
  method payment_method not null,
  status payment_status not null,
  amount numeric(12,2) not null,
  provider_reference text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create table inventory_items (
  id text primary key default gen_random_uuid()::text,
  sku text not null unique,
  name text not null,
  tags text[] not null default '{}',
  quantity_on_hand numeric(12,2) not null default 0,
  reorder_point numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table inventory_movements (
  id text primary key default gen_random_uuid()::text,
  inventory_item_id text not null references inventory_items(id),
  order_id text references orders(id),
  delta numeric(12,2) not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table notification_events (
  id text primary key default gen_random_uuid()::text,
  order_id text references orders(id),
  customer_id text references customers(id),
  channel notification_channel not null,
  event text not null,
  recipient text not null,
  subject text,
  message text not null,
  status text not null default 'queued',
  provider_reference text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table counter_queue_tickets (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references orders(id) on delete cascade,
  order_number text not null,
  customer_name text not null,
  customer_mobile text not null,
  department text not null,
  status text not null check (status in ('waiting', 'acknowledged', 'escalated', 'resolved')) default 'waiting',
  acknowledged_at timestamptz,
  acknowledged_by text,
  escalated_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id text primary key default gen_random_uuid()::text,
  actor_id text,
  actor_type text not null,
  entity_type text not null,
  entity_id text not null,
  event text not null,
  message text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table kiosk_categories (
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

-- Single-row shop configuration: banking details (shown on invoices) and outbound email.
create table shop_settings (
  id text primary key,
  banking jsonb not null default '{}',
  email jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

insert into shop_settings (id, banking, email) values ('shop', '{}', '{}')
on conflict (id) do nothing;

create index orders_status_idx on orders(status);
create index orders_customer_idx on orders(customer_id);
create index order_items_batch_idx on order_items(batch_key);
create index artwork_order_idx on artwork_files(order_id);
create index notification_status_idx on notification_events(status);
create index counter_queue_status_idx on counter_queue_tickets(status);
create index counter_queue_order_idx on counter_queue_tickets(order_id);
