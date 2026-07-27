# Бриф для AI-агента / коворкера — Pro-Optics (internetstore-test)

**Кому:** AI-агент или разработчик, который должен **доделать прод** без «шарю в SQL» от владельца.  

---

## 0. Карта проекта (где что лежит)

| Что | Значение |
|-----|----------|
| **Бренд / продукт** | **Pro-Optics** — e-commerce тепловизоры / оптика, Украина (uk/ru) |
| **Локальная папка** | `C:\Users\User\optics-shop-skeleton` |
| **npm name** | `optics-shop-skeleton` (`package.json`) |
| **Git remote** | `https://github.com/jacquesrouxwp/internetstore-test.git` |
| **GitHub org/user** | `jacquesrouxwp` |
| **GitHub repo** | `internetstore-test` |
| **Ветка** | `main` (деплой с main) |
| **Vercel team/scope** | `jacqros-projects` |
| **Vercel project name** | `optics-shop-skeleton` |
| **Production URL** | https://optics-shop-skeleton.vercel.app |
| **Vercel dashboard** | https://vercel.com/jacqros-projects/optics-shop-skeleton |
| **Supabase project ref** | `wvbqacawttfzrzcqdfai` (host: `wvbqacawttfzrzcqdfai.supabase.co`) |
| **Supabase dashboard** | https://supabase.com/dashboard/project/wvbqacawttfzrzcqdfai |
| **Стек** | Next.js **14.2** App Router, React 18, TypeScript, Tailwind 3, next-intl, Supabase JS, Zustand (cart), framer-motion/motion, fast-xml-parser (Prom) |
| **Админка** | https://optics-shop-skeleton.vercel.app/admin |
| **Health DB** | https://optics-shop-skeleton.vercel.app/api/health/db |
| **Бриф (этот файл)** | `docs/COWORKER_AGENT_BRIEF.md` |
| **SQL одной вставкой** | `supabase/RUN_ME_IN_SUPABASE.sql` |

### Связки (как связано)

```
Код (local / GitHub main)
        │
        │  git push origin main
        ▼
   GitHub: jacquesrouxwp/internetstore-test
        │
        │  Vercel auto-deploy (Production)
        ▼
   Vercel: jacqros-projects / optics-shop-skeleton
   URL: optics-shop-skeleton.vercel.app
        │
        │  env: NEXT_PUBLIC_SUPABASE_*, SERVICE_ROLE, TELEGRAM_*, NP…
        ▼
   Supabase: wvbqacawttfzrzcqdfai.supabase.co
   (Postgres + Auth + Storage product-images)
```

### Env на Vercel (ожидаемые)

| Переменная | Зачем |
|------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL проекта Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Публичный ключ (каталог read) |
| `SUPABASE_SERVICE_ROLE_KEY` | Сервер: админ, заказы, sync, storage |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Уведомления о заказах |
| `NOVA_POSHTA_API_KEY` | Города/отделения НП |
| `CRON_SECRET` / `SEED_SECRET` | Cron price-sync / bootstrap seed |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Demo-логин админки (сменить на prod) |
| `NEXT_PUBLIC_SITE_URL` | Канонический URL сайта |

### 3 конкурента для сравнения цен

1. **OpticStore** — https://opticstore.com.ua/catalog/teplovizory  
2. **ProfOptica** — https://profoptica.com.ua/teplovizory/  
3. **Optics-Pro** — https://www.optics-pro.com.ua/ua/teplovizori/  

### Важные URL приложения

| Страница | URL |
|----------|-----|
| Витрина | `/` (locale uk default, `/ru` для русского) |
| Каталог | `/catalog/teplovizori` |
| Админ | `/admin` |
| Цены vs рынок | `/admin/price-compare` |
| API health | `/api/health/db` |
| API seed | `POST /api/admin/seed` |
| API price sync | `POST/GET /api/admin/price-sync` |
| API orders | `POST /api/orders` |

---

**Репо:** `https://github.com/jacquesrouxwp/internetstore-test` (ветка `main`)  
**Live:** `https://optics-shop-skeleton.vercel.app`  
**Локальный путь владельца:** `C:\Users\User\optics-shop-skeleton`  

---

## 1. Зачем мы это делаем (бизнес)

Владелец открывает **интернет-магазин тепловизоров в Украине** (Pro-Optics).

Сейчас сайт **выглядит** как магазин, но без нормальной БД:

- товары/заказы/админ-правки живут в **памяти** или не персистятся → **сброс после redeploy**;
- нельзя надёжно продавать (потеря заказов, цены «из воздуха»);
- нужна **авто-сверка цен с 3 конкурентами** (маркетинг: «у нас дешевле»).

**Цель агента:** довести **Supabase как единственный source of truth** + **сравнение цен vs 3 сайта**, чтобы:

1. Каталог и заказы **не пропадали** после деплоя.  
2. Цены/остатки в заказе считались **с сервера из БД**.  
3. Админ реально писал в Postgres.  
4. По 3 конкурентам можно **автоматически** подтягивать цены по URL карточек товаров.  
5. На витрине — бейдж «дешевле на X ₴» и блок на карточке товара.

---

## 2. Три конкурента (фиксировано)

| # | Имя | Каталог (справочно) |
|---|-----|---------------------|
| 1 | **OpticStore** | https://opticstore.com.ua/catalog/teplovizory |
| 2 | **ProfOptica** | https://profoptica.com.ua/teplovizory/ |
| 3 | **Optics-Pro** | https://www.optics-pro.com.ua/ua/teplovizori/ |

**Важно:** для авто-цены нужна не страница каталога, а **URL конкретной карточки товара** у конкурента (привязка product ↔ URL в админке).

---

## 3. Что уже сделано в коде (не переписывать с нуля)

Проверь `main` — уже есть:

| Фича | Где в коде |
|------|------------|
| Service Supabase client | `src/lib/supabase/service.ts` |
| Мапперы product/order | `src/lib/supabase/mappers.ts` |
| Каталог из БД + fallback seed | `src/lib/db/catalog-repo.ts`, `src/lib/catalog.ts` |
| Админ CRUD → service_role | `src/lib/db/admin-repo.ts`, `src/app/api/admin/*` |
| Заказы: цена/stock **из БД** | `src/app/api/orders/route.ts` |
| Health | `GET /api/health/db` |
| Seed каталога | `POST /api/admin/seed` (+ header `x-seed-secret: seed-once`) |
| SQL схема магазина | `supabase/migrations/001_production.sql` |
| SQL сравнение цен + 3 конкурента | `supabase/migrations/002_price_compare.sql` |
| **Один файл «вставить и Run»** | `supabase/RUN_ME_IN_SUPABASE.sql` (001+002) |
| Админка сравнения | `/admin/price-compare` |
| Авто-чтение цены со страницы | `src/lib/price-compare/extract-price.ts` |
| Синк цен | `POST/GET /api/admin/price-sync` |
| Cron (Vercel) | `vercel.json` → `/api/admin/price-sync` daily 06:00 UTC |
| UI бейдж + секция PDP | `PriceCompareBadge`, `PriceCompareSection` |
| Telegram заказы | env `TELEGRAM_*` |
| Нова Пошта | env `NOVA_POSHTA_API_KEY` |

**Не** реализуй заново storefront/админ-оболочку — **доведи инфраструктуру данных и проверь e2e**.

---

## 4. Env (Vercel + локально)

На Vercel (Production) должны быть **непустые**:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
NOVA_POSHTA_API_KEY
```

Опционально:

```
CRON_SECRET          # для защиты cron price-sync
SEED_SECRET          # или seed-once для bootstrap seed
ADMIN_EMAIL / ADMIN_PASSWORD
ADMIN_SESSION_SECRET
NEXT_PUBLIC_SITE_URL
```

**Service role — только сервер**, никогда `NEXT_PUBLIC_`.

Проверка: `GET https://optics-shop-skeleton.vercel.app/api/health/db`  
Ожидание после настройки:

```json
{
  "ok": true,
  "productsCount": >0,
  "categoriesCount": >0,
  "brandsCount": >0,
  "env": { "urlPresent": true, "anonPresent": true, "servicePresent": true }
}
```

Если `productsCount: 0` но env ok → таблицы пустые / миграция не накатана / seed не делали.  
Если ошибка «table not found» → **не накатили SQL**.

---

## 5. Что агент должен сделать (чеклист по порядку)

### A. Supabase — создать таблицы (1 раз)

Владелец **не шарит SQL**. Сделай сам через Dashboard **или** Management API, если есть доступ.

**Клики в UI (если делаешь руками / инструктируешь):**

1. https://supabase.com/dashboard → нужный проект  
2. Слева **SQL Editor** → **New query**  
3. Вставить **весь** файл `supabase/RUN_ME_IN_SUPABASE.sql`  
4. **Run** → Success  
5. **Table Editor** — есть `products`, `brands`, `categories`, `orders`, `competitors`, `competitor_product_links`  
6. В `competitors` — 3 строки: OpticStore, ProfOptica, Optics-Pro  

### B. Засеять каталог (seed)

После таблиц:

```http
POST /api/admin/seed
Header: x-seed-secret: seed-once
Content-Type: application/json
Body: {}
```

Или с cookie админа после логина `/admin`.

Ожидание: `products` ≈ 20–30 (seed из `src/data/seed.ts`).  
Если 0 + error про tables → SQL не применён.

### C. Проверить заказы (критично)

1. Checkout тестовый заказ на live/local с Supabase.  
2. Строка в `orders` + `order_items` в Table Editor.  
3. `POST /api/orders` с **поддельной** `price: 1` → сервер должен взять цену из `products`, не из body.  
4. Stock уменьшился (RPC `decrement_product_stock` или fallback update).

### D. Сравнение цен (автомат vs 3 сайта)

1. `/admin/price-compare`  
2. Убедиться, что 3 конкурента названы правильно.  
3. Для 2–3 топ-товаров:  
   - найти **ту же модель** на каждом из 3 сайтов;  
   - вставить **URL карточки** (не каталога);  
   - «Зберегти URL» → «Зчитати ціну».  
4. На витрине: бейдж «дешевше на X ₴» если экономия ≥ 300 ₴.  
5. На PDP — таблица сравнения + disclaimer.  
6. `POST /api/admin/price-sync` — массовый синк.  

Парсер: JSON-LD → meta price → regex «грн». Не 100% на всех вёрстках; при fail — `last_error` в link, не врать на витрине.

### E. Storage (фото админки)

- Bucket `product-images` (public) — создаётся SQL/кодом при upload.  
- Upload: `/api/admin/upload` только Storage, **не** data-URL.

### F. Документация для владельца

Кратко: «SQL уже выполнен, seed ок, как добавить URL конкурента» — 5 строк в README или оставить этот файл.

---

## 6. Чего **не** делать

- Не хардкодить service role в клиент.  
- Не возвращать in-memory как основной режим на prod, если Supabase настроен.  
- Не парсить **весь каталог** конкурента «в поиске» без URL — только привязанные product URLs.  
- Не обещать realtime-цены; daily cron + ручной «Синхронізувати» достаточно.  
- Не ломать UI (звёзды, logo intro, hero glass, i18n).  
- Не коммитить `.env.local` с секретами.

---

## 7. Критерии приёмки (Definition of Done)

| # | Критерий | Как проверить |
|---|----------|----------------|
| 1 | SQL накатан | Table Editor: products, competitors, … |
| 2 | Env тройка Supabase | `/api/health/db` → все present |
| 3 | Товары в БД | `productsCount` > 0 после seed |
| 4 | Redeploy не сбрасывает цену | Меняешь price в admin → redeploy → цена та же |
| 5 | Заказ в Postgres | Table `orders` после checkout |
| 6 | Цена заказа с сервера | Fake price в body игнорируется |
| 7 | 3 конкурента | OpticStore / ProfOptica / Optics-Pro |
| 8 | Авто-цена | Sync по URL → `last_price` заполнен |
| 9 | Витрина | Бейдж/секция при saving ≥ 300 ₴ |
| 10 | Build | `npm run build` exit 0 |

---

## 8. Полезные команды

```bash
cd C:\Users\User\optics-shop-skeleton
git pull origin main
npm install
npm run build

# health
curl -s https://optics-shop-skeleton.vercel.app/api/health/db

# seed (после SQL)
curl -s -X POST https://optics-shop-skeleton.vercel.app/api/admin/seed \
  -H "x-seed-secret: seed-once" -H "Content-Type: application/json" -d "{}"

# price sync (нужна admin session cookie ИЛИ cron secret)
curl -s -X POST https://optics-shop-skeleton.vercel.app/api/admin/price-sync \
  -H "Content-Type: application/json" -d "{}"
```

Админ demo (сменить на prod!): `/admin` — см. `ADMIN_EMAIL` / fallback `admin@pro-optics.ua` / `admin123`.

---

## 9. Типичные блокеры

| Симптом | Причина | Действие |
|---------|---------|----------|
| table not found | SQL не Run | `RUN_ME_IN_SUPABASE.sql` |
| productsCount 0 | нет seed | `POST /api/admin/seed` |
| env empty на Vercel | ключи `""` | перезаписать env, redeploy |
| price sync fail | сайт блокирует бота / нет JSON-LD | другой URL; смотреть `last_error` |
| заказ 503 | нет service_role | env + SQL |
| RLS | public insert orders выключен специально | писать только service_role |

---

## 10. Контекст продукта (коротко)

- Витрина: каталог, фильтры, dual-range detection, cart, checkout НП, i18n uk/ru.  
- Фон: Stars (`StarsBackground`).  
- Logo intro: центр → header.  
- Админ: `/admin/*` cookie session + optional Supabase Auth role admin.  
- Оплата Monobank/LiqPay — **stubs**, не блокер этого ТЗ (отдельный этап).  
- Юридика (оферта, ПРРО) — отдельный этап.

---

## 11. Сообщение агенту в один абзац (можно копировать)

> Подключи и доведи Supabase для Pro-Optics (repo internetstore-test): накати `supabase/RUN_ME_IN_SUPABASE.sql` в SQL Editor, проверь env на Vercel, сделай seed через `POST /api/admin/seed`, убедись что `/api/health/db` отдаёт productsCount > 0, заказы пишутся в orders с server-side ценой/stock, настрой сравнение цен с 3 конкурентами (OpticStore, ProfOptica, Optics-Pro) через `/admin/price-compare` (URL карточек + price-sync). Не переписывай UI с нуля. Отчитайся по чеклисту DoD из `docs/COWORKER_AGENT_BRIEF.md`.

---

## 12. Отчёт, который агент должен вернуть владельцу

```
[ ] SQL: Success / ошибка: …
[ ] health/db: { ok, productsCount, … }
[ ] seed: products=N brands=N categories=N
[ ] тестовый заказ: order_number=… в Supabase
[ ] fake price: проигнорирована, total=…
[ ] 3 конкурента в таблице competitors
[ ] пример sync: product … last_price=…
[ ] скрин/описание бейджа на витрине
[ ] что осталось (платёжки, домен, …)
```

---

*Файл создан для передачи AI-коворкеру. Обновляй при смене DoD.*
