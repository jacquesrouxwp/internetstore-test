-- OLX terminal: used devices found on OLX.ua and the bargaining around them.
-- Rows come from the owner's Grok bots through /api/olx/deals (key in
-- OLX_TERMINAL_KEY); the owner watches and decides in /admin/olx.

create table if not exists public.olx_deals (
  id uuid primary key default gen_random_uuid(),
  olx_url text not null unique,
  title text,
  seller_name text,
  city text,
  -- our catalogue product this listing was matched to (prices come from it)
  product_slug text,
  model text,
  asking_price integer,      -- "хоче": seller's price
  our_offer integer,         -- "пропонуємо": our last offer
  bargain_at integer,        -- "торг на": where the bargaining stands now
  final_price integer,       -- agreed price, once bought
  status text not null default 'new'
    check (status in ('new', 'negotiating', 'needs_ok', 'bought', 'rejected', 'lost')),
  owner_decision text,       -- e.g. "ok 23800" / "ні" — set from the admin
  owner_decision_at timestamptz,
  notes text,
  chat jsonb not null default '[]'::jsonb, -- [{ at, from: "us" | "seller", text }]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists olx_deals_updated_idx on public.olx_deals (updated_at desc);
create index if not exists olx_deals_status_idx on public.olx_deals (status);

-- Only the service role (API routes) reads and writes.
alter table public.olx_deals enable row level security;
