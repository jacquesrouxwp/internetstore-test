-- Clicks on “write to manager” CTAs (Telegram / WhatsApp / phone).
-- Intent from the site — not proof a message was sent in the messenger.

create table if not exists public.consult_events (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('telegram', 'whatsapp', 'phone', 'open_sheet')),
  source text not null default 'other',
  path text,
  created_at timestamptz not null default now()
);

create index if not exists consult_events_created_at_idx
  on public.consult_events (created_at desc);

create index if not exists consult_events_channel_idx
  on public.consult_events (channel);

-- Public insert only via service role (API route). No anon policies needed.
alter table public.consult_events enable row level security;
