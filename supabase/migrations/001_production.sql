-- Pro-Optics production schema + RLS
-- Apply in Supabase SQL Editor (or supabase db push)

create extension if not exists "pgcrypto";

-- Brands
create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  logo_url text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_uk text not null,
  name_ru text not null,
  description_uk text,
  description_ru text,
  parent_id uuid references categories(id) on delete set null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  sku text,
  name_uk text not null,
  name_ru text not null,
  description_uk text,
  description_ru text,
  short_uk text,
  short_ru text,
  price numeric(12,2) not null check (price >= 0),
  old_price numeric(12,2),
  stock int not null default 0 check (stock >= 0),
  in_stock boolean generated always as (stock > 0) stored,
  brand_id uuid references brands(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  resolution text,
  device_type text,
  detection_range_m int,
  rating numeric(2,1) default 0,
  reviews_count int default 0,
  is_hit boolean default false,
  is_new boolean default false,
  is_top boolean default false,
  is_sale boolean default false,
  images jsonb default '[]'::jsonb,
  specs jsonb default '{}'::jsonb,
  prom_id text,
  published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists products_category_idx on products(category_id);
create index if not exists products_brand_idx on products(brand_id);
create index if not exists products_price_idx on products(price);
create index if not exists products_published_idx on products(published);
create index if not exists products_slug_idx on products(slug);

-- Orders
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  status text not null default 'new',
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  payment_method text not null default 'cod',
  payment_status text default 'pending',
  delivery_method text default 'nova_poshta',
  delivery_carrier text default 'nova_poshta',
  np_city_ref text,
  np_city_name text,
  np_warehouse_ref text,
  np_warehouse_name text,
  delivery_address text,
  delivery_cost numeric(12,2) default 0,
  subtotal numeric(12,2) not null,
  total numeric(12,2) not null,
  comment text,
  payment_external_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  product_slug text,
  price numeric(12,2) not null,
  quantity int not null default 1 check (quantity > 0)
);

create index if not exists order_items_order_idx on order_items(order_id);

-- Optional reviews / posts (kept for storefront)
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  author text not null,
  text text not null,
  rating int check (rating between 1 and 5),
  published boolean default true,
  created_at timestamptz default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_uk text not null,
  title_ru text not null,
  excerpt_uk text,
  excerpt_ru text,
  body_uk text,
  body_ru text,
  cover_url text,
  published boolean default true,
  published_at timestamptz default now()
);

-- Atomic stock decrement (service_role / security definer)
create or replace function public.decrement_product_stock(
  p_product_id uuid,
  p_qty int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated int;
begin
  if p_qty is null or p_qty <= 0 then
    return false;
  end if;
  update products
  set stock = stock - p_qty,
      updated_at = now()
  where id = p_product_id
    and stock >= p_qty;
  get diagnostics updated = row_count;
  return updated = 1;
end;
$$;

revoke all on function public.decrement_product_stock(uuid, int) from public;
grant execute on function public.decrement_product_stock(uuid, int) to service_role;

-- Storage bucket (public product images)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set public = true;

-- Public read for product images
drop policy if exists "public read product-images" on storage.objects;
create policy "public read product-images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Writes only via service role (bypass RLS) — no public insert policy

-- ─── RLS ───────────────────────────────────────────────
alter table products enable row level security;
alter table categories enable row level security;
alter table brands enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table reviews enable row level security;
alter table posts enable row level security;

-- Drop legacy open policies if re-running
drop policy if exists "public read products" on products;
drop policy if exists "public read categories" on categories;
drop policy if exists "public read brands" on brands;
drop policy if exists "public read reviews" on reviews;
drop policy if exists "public read posts" on posts;
drop policy if exists "public insert orders" on orders;
drop policy if exists "public insert order_items" on order_items;
drop policy if exists "admin all products" on products;
drop policy if exists "admin all categories" on categories;
drop policy if exists "admin all brands" on brands;
drop policy if exists "admin all orders" on orders;
drop policy if exists "admin all order_items" on order_items;
drop policy if exists "admin all reviews" on reviews;
drop policy if exists "admin all posts" on posts;

-- Public catalog read only
create policy "public read published products"
  on products for select
  using (published = true);

create policy "public read categories"
  on categories for select
  using (true);

create policy "public read brands"
  on brands for select
  using (true);

create policy "public read published reviews"
  on reviews for select
  using (published = true);

create policy "public read published posts"
  on posts for select
  using (published = true);

-- NO public insert/update/delete on orders/products —
-- server uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).

-- service_role bypasses RLS by default in Supabase.
