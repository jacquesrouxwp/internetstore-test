-- When the seller published the listing on OLX (bots pass it as listed_at).
alter table public.olx_deals add column if not exists listed_at timestamptz;
