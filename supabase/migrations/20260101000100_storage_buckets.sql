-- Create the private storage buckets the API uploads artwork and proofs to.
-- Idempotent: safe to re-run.
insert into storage.buckets (id, name, public)
values
  ('artwork', 'artwork', false),
  ('proofs', 'proofs', false)
on conflict (id) do nothing;
