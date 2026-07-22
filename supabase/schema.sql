-- Pro-Optics schema for Supabase (Postgres)
-- Run in Supabase SQL Editor

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
  price numeric(12,2) not null,
  old_price numeric(12,2),
  stock int default 0,
  in_stock boolean generated always as (stock > 0) stored,
  brand_id uuid references brands(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  resolution text, -- 256x192 | 384x288 | 640x512
  device_type text, -- mono | scope | binocular | clipon
  detection_range_m int, -- human detection range, meters
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

-- Orders
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  status text not null default 'new',
  -- new | confirmed | paid | shipping | done | cancelled
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  payment_method text not null default 'cod',
  payment_status text default 'pending',
  delivery_method text default 'nova_poshta',
  np_city_ref text,
  np_city_name text,
  np_warehouse_ref text,
  np_warehouse_name text,
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
  quantity int not null default 1
);

-- Reviews (optional public)
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  author text not null,
  text text not null,
  rating int check (rating between 1 and 5),
  published boolean default true,
  created_at timestamptz default now()
);

-- Blog posts
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

-- Storage bucket for product images (create in dashboard: product-images, public)

-- RLS
alter table products enable row level security;
alter table categories enable row level security;
alter table brands enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table reviews enable row level security;
alter table posts enable row level security;

-- Public read for published catalog
create policy "public read products" on products for select using (published = true);
create policy "public read categories" on categories for select using (true);
create policy "public read brands" on brands for select using (true);
create policy "public read reviews" on reviews for select using (published = true);
create policy "public read posts" on posts for select using (published = true);

-- Anyone can create orders (checkout)
create policy "public insert orders" on orders for insert with check (true);
create policy "public insert order_items" on order_items for insert with check (true);

-- Admin full access (authenticated)
create policy "admin all products" on products for all using (auth.role() = 'authenticated');
create policy "admin all categories" on categories for all using (auth.role() = 'authenticated');
create policy "admin all brands" on brands for all using (auth.role() = 'authenticated');
create policy "admin all orders" on orders for all using (auth.role() = 'authenticated');
create policy "admin all order_items" on order_items for all using (auth.role() = 'authenticated');
create policy "admin all reviews" on reviews for all using (auth.role() = 'authenticated');
create policy "admin all posts" on posts for all using (auth.role() = 'authenticated');
