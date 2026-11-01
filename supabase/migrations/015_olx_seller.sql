-- OLX terminal: who the seller is, from the bot. seller_id is the OLX user id;
-- contacted_count = with how many of this seller's listings we have already written;
-- seller_label = the bot's ready line for the card ("Сергій · писали 2 рази").
-- All nullable; a later POST overwrites them only when it brings a value.
alter table public.olx_deals add column if not exists seller_id text;
alter table public.olx_deals add column if not exists contacted_count integer check (contacted_count >= 0);
alter table public.olx_deals add column if not exists seller_label text;

create index if not exists olx_deals_seller_id_idx on public.olx_deals (seller_id);
