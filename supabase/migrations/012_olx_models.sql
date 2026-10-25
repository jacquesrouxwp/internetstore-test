-- OLX terminal: buying prices per model, set by the owner, instead of a share
-- of our new price. Prices are for "як нове" with box and documents; adjust
-- holds what condition moves them by, in UAH:
-- { "new": +, "used": −, "no_box": −, "no_docs": − } (stored as positive numbers).

create table if not exists public.olx_models (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  aliases text[] not null default '{}',
  category text,
  target_price integer,     -- the bot may close at this
  ceiling_price integer,    -- up to this the owner decides
  adjust jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.olx_models enable row level security;

-- What the seller says about the item, read by the bot from the listing and the chat.
alter table public.olx_deals add column if not exists model_id uuid references public.olx_models (id) on delete set null;
alter table public.olx_deals add column if not exists condition text
  check (condition in ('new', 'like_new', 'used', 'defect'));
alter table public.olx_deals add column if not exists has_box boolean;
alter table public.olx_deals add column if not exists has_docs boolean;
alter table public.olx_deals add column if not exists kit text;
alter table public.olx_deals add column if not exists condition_notes text;
