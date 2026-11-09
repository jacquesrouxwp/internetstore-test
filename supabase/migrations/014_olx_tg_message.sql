-- The deal's card in the Telegram group: the chat with the seller is posted as replies under it.
alter table public.olx_deals add column if not exists tg_message_id bigint;
