-- OLX terminal: a model's prices go by the state of the item. Instead of one
-- target/ceiling with UAH adjustments, each state has its own range:
-- tiers = { "new_full" | "new_bare" | "g9" | "g8" | "g7" | "g6":
--           { "from": opening offer, "to": the most we pay, "needs_ok": only with the owner's ок } }
-- A model may be one of our catalogue products (product_slug, brand, category).

alter table public.olx_models add column if not exists product_slug text unique;
alter table public.olx_models add column if not exists brand text;
alter table public.olx_models add column if not exists tiers jsonb not null default '{}'::jsonb;
-- The table is a day old and holds no prices yet
alter table public.olx_models drop column if exists target_price;
alter table public.olx_models drop column if exists ceiling_price;
alter table public.olx_models drop column if exists adjust;

-- The seller's condition out of 10 (10 = new, never used)
alter table public.olx_deals add column if not exists grade smallint check (grade between 1 and 10);
