-- Price compare vs top-N competitors (auto-sync by product URL)
-- Apply in Supabase SQL Editor after 001_production.sql

create table if not exists competitors (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  website text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Max 3 active competitors enforced in app; DB allows more for flexibility
create table if not exists competitor_product_links (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  competitor_id uuid not null references competitors(id) on delete cascade,
  product_url text not null,
  last_price numeric(12,2),
  last_checked_at timestamptz,
  last_error text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (product_id, competitor_id)
);

create index if not exists cpl_product_idx on competitor_product_links(product_id);
create index if not exists cpl_competitor_idx on competitor_product_links(competitor_id);

alter table competitors enable row level security;
alter table competitor_product_links enable row level security;

drop policy if exists "public read competitors" on competitors;
drop policy if exists "public read competitor links" on competitor_product_links;

-- Public can read active competitors and links with prices (for badges)
create policy "public read competitors"
  on competitors for select using (is_active = true);

create policy "public read competitor links"
  on competitor_product_links for select using (is_active = true);

-- Writes only via service_role (bypass RLS)

-- Seed 3 competitor slots (owner renames/fills websites)
insert into competitors (slug, name, website, sort_order)
values
  ('competitor-1', 'Конкурент 1', null, 1),
  ('competitor-2', 'Конкурент 2', null, 2),
  ('competitor-3', 'Конкурент 3', null, 3)
on conflict (slug) do nothing;
