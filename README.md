# OpticsShop — e-commerce (тепловізори / оптика)

Повноцінний інтернет-магазин професійної оптики на **Next.js 14 + TypeScript + Tailwind + Supabase + next-intl (UK/RU)**.

- **Live (Vercel):** https://optics-shop-skeleton.vercel.app/
- **Repo:** https://github.com/jacquesrouxwp/internetstore-test
- **Референс структури каталогу:** https://www.optics-pro.com.ua/ua/teplovizori/

> Демо-костяк перетворено на App Router storefront. Без Supabase працює на seed-даних (18+ товарів).

## Стек

| Шар | Технологія |
|-----|------------|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind |
| i18n | next-intl (`uk` default, `ru` prefix) |
| DB / Auth | Supabase Postgres + Auth (опційно) |
| Cart | Zustand + localStorage |
| Deploy | Vercel |

## Швидкий старт

```bash
npm install
npm run dev
```

Відкрийте http://localhost:3000

### Адмін (демо)

- URL: `/admin`
- Login: `admin@opticsshop.ua` / `admin123`
- (або `ADMIN_EMAIL` / `ADMIN_PASSWORD` з `.env`)

## Змінні оточення

Скопіюйте `.env.example` → `.env.local` і заповніть:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — каталог і замовлення в Postgres
- `NOVA_POSHTA_API_KEY` — реальні міста/відділення (без ключа — демо-довідник)
- `MONOBANK_TOKEN` / `LIQPAY_*` / `WAYFORPAY_*` — онлайн-оплата
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` — сповіщення про замовлення
- `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_FB_PIXEL_ID` — аналітика

SQL-схема: `supabase/schema.sql`

## Що реалізовано

1. **Каталог** — фільтри (бренд, тип, матриця, ціна), сортування, пагінація  
2. **Картка товару** — ціна/знижка, наявність, specs, Schema.org Product  
3. **Головна** — hero, топ продажів, хіти, новинки, акції, бренди, відгуки  
4. **Кошик + checkout** — localStorage, Нова Пошта (API або demo), COD / Monobank / LiqPay / WayForPay stubs  
5. **Адмін** — login, CRUD товарів (demo memory), замовлення, імпорт Prom YML/XML  
6. **i18n** — UK/RU, перемикач у шапці  
7. **Дизайн** — біло-сіра преміум-палітра, акцент `#C1121F`, Inter/Manrope, Lucide  
8. **SEO** — metadata, OG, sitemap, robots, JSON-LD  

## Структура

```
src/
  app/[locale]/     # storefront (uk/ru)
  app/admin/         # admin cabinet
  app/api/           # orders, nova-poshta, admin
  components/        # UI, catalog, cart, layout
  data/seed.ts       # демо-каталог
  lib/               # catalog, cart, supabase, utils
  i18n/              # next-intl routing
messages/            # uk.json, ru.json
supabase/schema.sql
```

## Deploy на Vercel

Проєкт уже прив’язаний: `optics-shop-skeleton`.  
Після push у `main` Vercel збере Next.js-білд. Додайте env-змінні в Project Settings.

```bash
git add -A
git commit -m "feat: full Next.js e-commerce storefront"
git push origin main
```

## Legacy

Старий статичний HTML збережено в `_legacy/`.
