-- Owner asked a bot to re-read this chat on OLX now; cleared when the bot next updates the deal.
alter table public.olx_deals add column if not exists refresh_requested_at timestamptz;
