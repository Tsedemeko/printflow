-- Configurable kiosk main-screen categories.
create table if not exists kiosk_categories (
  id text primary key,
  label text not null,
  description text not null default '',
  position integer not null default 0
);

-- Seed the default tiles (idempotent).
insert into kiosk_categories (id, label, description, position) values
  ('apparel', 'Apparel, Sublimation & Fashion', 'T-shirts, golf, hoodies, tracksuits, kits, school uniforms, embroidery, overalls, jumpsuits, wedding & traditional dress, trousers.', 0),
  ('signage', 'Banners & Signage', 'X-banners, flag banners, pull-ups, corex boards, gazebos, pop-up walls.', 1),
  ('promotional', 'Branding & Promo', 'Umbrellas, table cloths, oval boards, and branded gifts.', 2)
on conflict (id) do nothing;
