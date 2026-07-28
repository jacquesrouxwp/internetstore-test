-- P0 admin: store settings, order extras, product SEO, admin password
-- Apply in Supabase SQL Editor after 001+002

-- ─── Orders: manager note, tracking, returned status allowed as text ───
alter table orders add column if not exists manager_comment text;
alter table orders add column if not exists tracking_number text;
alter table orders add column if not exists tracking_url text;
alter table orders add column if not exists status_notified_at timestamptz;

create index if not exists orders_status_idx on orders(status);
create index if not exists orders_created_idx on orders(created_at desc);
create index if not exists orders_phone_idx on orders(customer_phone);
create index if not exists orders_number_idx on orders(order_number);

-- ─── Products: SEO + gallery alts ───
alter table products add column if not exists meta_title_uk text;
alter table products add column if not exists meta_title_ru text;
alter table products add column if not exists meta_description_uk text;
alter table products add column if not exists meta_description_ru text;
alter table products add column if not exists image_alts jsonb default '[]'::jsonb;

-- ─── Store settings (key/value JSON) ───
create table if not exists store_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table store_settings enable row level security;
drop policy if exists "public read store_settings" on store_settings;
-- Public can read non-secret settings (site contact, social, legal for footer)
create policy "public read store_settings"
  on store_settings for select
  using (key in ('site', 'social', 'legal', 'delivery', 'notify_templates'));

-- Seed defaults (safe upsert)
insert into store_settings (key, value) values
  ('site', '{
    "phones": ["+38 068 692-86-75", "+38 050 111-22-33"],
    "email": "info@pro-optics.ua",
    "address": "Київ, Україна",
    "hours": "Пн–Пт: 9:00–18:00 · Сб: 12:00–15:00",
    "siteName": "Pro-Optics"
  }'::jsonb),
  ('social', '{
    "telegram": "https://t.me/pro_optics_ua",
    "viber": "viber://chat?number=%2B380501112233",
    "whatsapp": "https://wa.me/380501112233"
  }'::jsonb),
  ('legal', '{
    "entityName": "",
    "edrpou": "",
    "ipn": "",
    "legalAddress": ""
  }'::jsonb),
  ('delivery', '{
    "defaultCost": 0,
    "freeFrom": 0,
    "note": "Доставка Новою Поштою"
  }'::jsonb),
  ('nova_poshta_sender', '{
    "cityRef": "",
    "cityName": "",
    "senderRef": "",
    "senderAddressRef": "",
    "contactSender": "",
    "sendersPhone": "",
    "warehouseRef": ""
  }'::jsonb),
  ('notify_templates', '{
    "new": "Ваше замовлення {orderNumber} прийнято. Дякуємо!",
    "processing": "Замовлення {orderNumber} в обробці.",
    "shipped": "Замовлення {orderNumber} відправлено. ТТН: {trackingNumber}",
    "done": "Замовлення {orderNumber} виконано. Дякуємо за покупку!",
    "cancelled": "Замовлення {orderNumber} скасовано.",
    "returned": "Замовлення {orderNumber} оформлено як повернення."
  }'::jsonb),
  ('security', '{
    "passwordHash": null,
    "adminEmail": null
  }'::jsonb)
on conflict (key) do nothing;

-- ─── Low stock threshold in settings ───
insert into store_settings (key, value) values
  ('inventory', '{"lowStockThreshold": 2}'::jsonb)
on conflict (key) do nothing;
