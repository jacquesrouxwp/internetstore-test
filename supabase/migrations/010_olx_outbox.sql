-- Messages the owner writes in /admin/olx for a bot to send to the seller.
-- [{ id, text, at, sent_at }] — sent_at stays null until a bot reports it sent.
alter table public.olx_deals add column if not exists outbox jsonb not null default '[]'::jsonb;
