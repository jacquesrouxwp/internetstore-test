# Pro-Optics — бриф для аудитора: админ-панель, БД, механика, формулы

**Дата:** 2026-07-28  
**Назначение:** максимально чёткая проверка админки, зависимостей, базы данных, расчётов (заказы, скидки, сравнение цен), auth и API.  
**Секреты в документ не входят** — только имена env и способы проверки.

---

## 0. Карта доступов (live)

| Ресурс | URL / ref |
|--------|-----------|
| **Витрина** | https://optics-shop-skeleton.vercel.app |
| **Админка** | https://optics-shop-skeleton.vercel.app/admin |
| **Health DB** | https://optics-shop-skeleton.vercel.app/api/health/db |
| **GitHub** | https://github.com/jacquesrouxwp/internetstore-test (`main`) |
| **Vercel project** | `jacqros-projects` / `optics-shop-skeleton` |
| **Supabase project** | `wvbqacawttfzrzcqdfai` → `https://wvbqacawttfzrzcqdfai.supabase.co` |
| **SQL (полная схема)** | `supabase/RUN_ME_IN_SUPABASE.sql` |
| **Миграции** | `supabase/migrations/001_production.sql`, `002_price_compare.sql` |

### Логин админки (demo)

| Поле | Источник |
|------|----------|
| Email | env `ADMIN_EMAIL` (default в коде: `admin@pro-optics.ua`) |
| Password | env `ADMIN_PASSWORD` (default demo — **должен быть сменён на prod**) |
| Cookie | `optics_admin` (httpOnly, 7 дней, `sameSite=lax`, `secure` в production) |
| Код auth | `src/lib/admin/auth.ts` |
| Login API | `POST /api/admin/login` · Logout `DELETE /api/admin/login` |

**Важно для аудита безопасности:**  
сейчас auth = **cookie + env password**, не полноценный Supabase Auth 2FA. `SUPABASE_SERVICE_ROLE_KEY` используется **только на сервере** (admin write, orders, price-sync, upload).

---

## 1. Структура админ-панели (UI)

Корень: `src/app/admin/*` · оболочка: `src/components/admin/AdminShell.tsx`  
`robots: noindex` в `admin/layout.tsx`.

| Раздел | URL | Назначение |
|--------|-----|------------|
| Логин | `/admin` | Форма email/password |
| Dashboard | `/admin/dashboard` | Обзор |
| Товары | `/admin/products` | Список |
| Товар new/edit | `/admin/products/new`, `/admin/products/[id]` | CRUD + upload фото |
| Категории | `/admin/categories` | CRUD |
| Бренды | `/admin/brands` | CRUD |
| Заказы | `/admin/orders`, `/admin/orders/[id]` | Список, смена статуса |
| **Ціни vs ринок** | `/admin/price-compare` | Конкуренты, URL, парсер, sync |
| Імпорт Prom | `/admin/import` | XML → продукты |

### Навигация (sidebar)

```
Головна · Товари · Категорії · Бренди · Замовлення · Ціни vs ринок · Імпорт Prom
```

---

## 2. API админки (зависимости от cookie)

Все ниже требуют `requireAdminApi` → cookie `optics_admin`, **кроме** cron на price-sync (секрет).

| Method | Path | Назначение |
|--------|------|------------|
| POST/DELETE/GET | `/api/admin/login` | Login / logout / check |
| GET | `/api/admin/session` | Сессия |
| GET/POST/PUT/DELETE | `/api/admin/products` | CRUD товаров |
| GET/POST/PUT/DELETE | `/api/admin/categories` | CRUD категорий |
| GET/POST/PUT/DELETE | `/api/admin/brands` | CRUD брендов |
| GET/PATCH | `/api/admin/orders` | Список / смена статуса |
| GET/PUT | `/api/admin/competitors` | Топ-3 конкурента |
| GET/POST/DELETE | `/api/admin/price-links` | URL товар↔конкурент |
| POST/GET | `/api/admin/price-sync` | Парсер цен; GET — cron |
| POST | `/api/admin/upload` | Фото → Storage `product-images` |
| POST | `/api/admin/import` | Prom XML |
| POST | `/api/admin/seed` | Bootstrap seed (seed secret) |

### Публичные / storefront API

| Method | Path | Назначение |
|--------|------|------------|
| POST | `/api/orders` | Создание заказа (**цены только из БД**) |
| GET | `/api/nova-poshta` | Города / отделения НП |
| GET | `/api/health/db` | Health + seeded |

### Cron

| Schedule | Path | Файл |
|----------|------|------|
| `0 6 * * *` (06:00 UTC) | `/api/admin/price-sync` | `vercel.json` |

Auth cron: header `Authorization: Bearer <CRON_SECRET|SEED_SECRET>` или `x-cron-secret`.

---

## 3. Стек и зависимости (для проверки окружения)

| Слой | Технология |
|------|------------|
| App | Next.js **14.2** App Router, React 18, TypeScript |
| UI | Tailwind 3, Manrope/Inter |
| i18n | next-intl (uk/ru) — **витрина**; админка UI на украинском |
| Cart | Zustand (client) — цены в заказе **не доверяются** |
| DB | Supabase Postgres + RLS |
| Storage | Supabase bucket `product-images` (public read, write service_role) |
| Deploy | Vercel (`framework: nextjs`) |
| Motion | framer-motion / motion (intro logo, stars) |
| Import | fast-xml-parser (Prom) |

Ключевые npm-пакеты: `@supabase/supabase-js`, `next-intl`, `zustand`, `lucide-react`, `framer-motion` / `motion`.

---

## 4. Переменные окружения (Vercel + local)

См. также `.env.example`. **Не коммитить реальные ключи.**

### Обязательные для «магазин работает»

| Env | Роль |
|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL проекта |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Публичный read (RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server: admin, orders, sync, upload (**secret**) |

### Админка

| Env | Роль |
|-----|------|
| `ADMIN_EMAIL` | Логин |
| `ADMIN_PASSWORD` | Пароль |
| `ADMIN_SESSION_SECRET` | Значение cookie (опц.; иначе `"1"`) |
| `ADMIN_EMAILS` | Allow-list email через запятую (если Auth) |

### Интеграции

| Env | Роль |
|-----|------|
| `NOVA_POSHTA_API_KEY` | Реальные города/отделения |
| `TELEGRAM_BOT_TOKEN` | Уведомление о заказе |
| `TELEGRAM_CHAT_ID` | Чат/группа |
| `CRON_SECRET` / `SEED_SECRET` | Cron price-sync / seed API |
| `NEXT_PUBLIC_SITE_URL` | Канонический URL |
| `NEXT_PUBLIC_TELEGRAM_URL` / `VIBER` / `WHATSAPP` | Виджет / футер |

### Опционально price-compare

| Env | Default | Роль |
|-----|---------|------|
| `PRICE_COMPARE_MIN_SAVINGS` | `300` | **Исторический** порог; UI теперь показывает сравнение и при «дороже» |
| `PRICE_COMPARE_STALE_DAYS` | `14` | Пометка «застар.» |

### Платежи (заглушки / не подключены end-to-end)

`PAYMENT_PROVIDER`, `MONOBANK_TOKEN`, `LIQPAY_*`, `WAYFORPAY_*` — код заказа создаёт заказ; **онлайн-оплата не реализована** как полноценный шлюз.

---

## 5. База данных (схема)

Применение: Supabase SQL Editor → `supabase/RUN_ME_IN_SUPABASE.sql`.

### 5.1. Таблицы каталога

#### `brands`
| Колонка | Тип | Примечание |
|---------|-----|------------|
| id | uuid PK | |
| slug | text unique | |
| name | text | |
| logo_url | text | |
| sort_order | int | |

#### `categories`
| Колонка | Тип | Примечание |
|---------|-----|------------|
| id | uuid PK | |
| slug | text unique | |
| name_uk / name_ru | text | i18n |
| parent_id | uuid FK | |
| sort_order | int | |

#### `products` (ядро)
| Колонка | Тип | Примечание |
|---------|-----|------------|
| id | uuid PK | |
| slug | text unique | URL `/product/{slug}` |
| sku | text | |
| name_uk / name_ru | text | |
| description_*, short_* | text | |
| **price** | numeric(12,2) ≥ 0 | **Source of truth для заказа** |
| old_price | numeric(12,2) | Для % скидки на UI |
| **stock** | int ≥ 0 | Списание при заказе |
| in_stock | generated | `stock > 0` |
| brand_id, category_id | uuid FK | |
| resolution, device_type | text | Фильтры |
| detection_range_m | int | Фильтр дальности |
| rating, reviews_count | | UI |
| is_hit, is_new, is_top, is_sale | boolean | Бейджи |
| images | jsonb | `string[]` URL |
| specs | jsonb | `Record<label, value>` |
| prom_id | text | Импорт |
| published | boolean | Витрина только `true` |
| created_at, updated_at | timestamptz | |

### 5.2. Заказы

#### `orders`
| Колонка | Тип | Примечание |
|---------|-----|------------|
| order_number | text unique | `OS-YYMMDD-####` |
| status | text | default `new` |
| customer_name, customer_phone, customer_email | | |
| payment_method | text | `cod` / monobank / liqpay / wayforpay |
| payment_status | text | `pending` / `awaiting_payment` |
| np_city_*, np_warehouse_* | | Нова Пошта |
| **delivery_cost** | numeric | |
| **subtotal** | numeric | Σ (price_db × qty) |
| **total** | numeric | subtotal + delivery |
| comment | text | |

#### `order_items`
| Колонка | Тип | Примечание |
|---------|-----|------------|
| order_id | uuid FK cascade | |
| product_id | uuid FK set null | |
| product_name, product_slug | snapshot | |
| **price** | numeric | **Цена на момент заказа (из БД)** |
| quantity | int > 0 | |

### 5.3. Сравнение цен

#### `competitors`
| slug (seed) | name | website (каталог) |
|-------------|------|-------------------|
| opticstore | OpticStore | opticstore.com.ua/... |
| profoptica | ProfOptica | profoptica.com.ua/... |
| optics-pro | Optics-Pro | optics-pro.com.ua/... |

#### `competitor_product_links`
| Колонка | Тип | Примечание |
|---------|-----|------------|
| product_id | uuid FK | Наш товар |
| competitor_id | uuid FK | |
| product_url | text | **URL карточки**, не каталога |
| last_price | numeric | Результат парсера |
| last_checked_at | timestamptz | |
| last_error | text | HTTP / not found |
| is_active | boolean | |
| UNIQUE(product_id, competitor_id) | | |

### 5.4. RPC склад

```sql
decrement_product_stock(p_product_id uuid, p_qty int) → boolean
-- UPDATE products SET stock = stock - p_qty
-- WHERE id = … AND stock >= p_qty
-- security definer, GRANT service_role only
```

### 5.5. RLS (кратко)

| Таблица | Public SELECT | Public write |
|---------|---------------|--------------|
| products, categories, brands | published / all brands | **нет** |
| orders, order_items | **нет** | **нет** (только service_role) |
| competitors, competitor_product_links | is_active | **нет** |
| storage product-images | read | service_role only |

---

## 6. Механика и **математика** (что проверять)

### 6.1. Скидка на карточке (бейдж `-%`)

**Файл:** `src/types/index.ts` → `salePercent`

```
если oldPrice отсутствует ИЛИ oldPrice ≤ price → null (бейдж не показывать)
иначе:
  sale% = round( (oldPrice - price) / oldPrice * 100 )
```

**Тест:** price=8600, old=10000 → **14%**.  
price=10000, old=10000 → нет бейджа.  
price=11000, old=10000 → нет бейджа.

### 6.2. Формат цены на UI

**Файл:** `src/lib/utils.ts` → `formatPrice`  
`Intl.NumberFormat(uk-UA|ru-UA)`, 0 decimals → `"12 500 грн"`.

Парсер сравнения использует короткую форму `"12 500 ₴"` (`shortUah` в badge).

### 6.3. Заказ (критично для аудита)

**Файл:** `src/app/api/orders/route.ts`  
**Правило:** `// SERVER PRICE — ignore client raw.price`

Для каждой позиции:

1. Найти product по `productId` (uuid) или `productSlug`.  
2. `published === false` → 400.  
3. `qty = max(1, floor(quantity))`.  
4. Если `stock < qty` → **409** + available.  
5. `unitPrice = Number(product.price)` из БД (**игнор цены с клиента**).  
6. `subtotal += unitPrice * qty`.

Итог:

```
delivery = max(0, Number(deliveryCost) || 0)   // клиент; НП обычно 0 в демо
total    = subtotal + delivery
order_number = OS-{YY}{MM}{DD}-{1000..9999}
```

Далее:

7. `decrement_product_stock` на каждую линию; при fail → **compensate** (вернуть stock) → 409.  
8. INSERT `orders` + `order_items` (snapshot name/slug/price).  
9. Telegram notify (если env).  
10. Опционально `paymentUrl` stub для monobank/liqpay/wayforpay.

**Тесты аудитора:**

| # | Действие | Ожидание |
|---|----------|----------|
| A | В DevTools подменить price в cart на 1 ₴, оформить | В заказе **цена из БД**, не 1 ₴ |
| B | qty > stock | 409, stock не уходит |
| C | 2 позиции | subtotal = p1×q1 + p2×q2; total = subtotal + delivery |
| D | Повтор после успеха | stock уменьшен на qty |

### 6.4. Сравнение цен (price-compare)

**Код:**  
- extract: `src/lib/price-compare/extract-price.ts`  
- build: `src/lib/price-compare/repo.ts` → `buildPriceCompare`  
- UI: `PriceCompareBadge`, `PriceCompareSection`  
- types: `MIN_SAVINGS_UAH` default 300, `STALE_DAYS` 14, `MAX_COMPETITORS` 3  

#### Парсер (порядок)

1. JSON-LD Product/Offer (`price` **или** `Price` — OpticStore)  
2. Meta / itemprop / og:price / data-price  
3. Regex рядом с `грн` / `₴` / `UAH`  
4. Иначе `last_error`

#### Формула Δ (saving)

```
savingUah = round(competitorPrice - ourPrice)

  savingUah > 0  → мы ДЕШЕВЛЕ на savingUah
  savingUah < 0  → мы ДОРОЖЕ на |savingUah|
  savingUah ≈ 0  → как рынок (±100 ₴ UI-порог тона)
```

Строки сортируются по `savingUah` **desc** (лучшая для нас сверху).

**Headline на бейдже:**

- если есть хоть один `savingUah > 0` → показывать **max** saving (зелёный);  
- если все ≤ 0 → показывать **min** saving (самый дешёвый конкурент = «мы дороже», оранжевый).

**Показ:** при наличии **любых** строк с `last_price` — бейдж/таблица **всегда** (не только скидка).

**Stale:**

```
isStale = now - last_checked_at > STALE_DAYS * 24h
```

**Поток админа:**

1. Выбрать товар.  
2. Вставить URL карточки у конкурента.  
3. «Тест парсера» → `POST /api/admin/price-sync` body `{ testUrl }` (без записи).  
4. «Зберегти URL» → `POST /api/admin/price-links`.  
5. «Зчитати ціну» → `{ linkId }` → пишет `last_price`.  
6. Cron daily / «Синхронізувати всі».

**Тесты математики:**

| our | competitor | saving | UI |
|-----|------------|--------|-----|
| 89000 | 95000 | +6000 | ↓ 6 000 ₴ дешевше |
| 112000 | 107990 | −4010 | ↑ 4 010 ₴ дорожче |
| 14300 | 14304 | +4 | ≈ як у ринку (тон equal, \|Δ\|&lt;100) |

### 6.5. Номер заказа

```
OS-{year2}{month2}{day2}-{random 1000-9999}
пример: OS-260728-4821
```

---

## 7. Клиентский цикл (зафиксировано)

```
[Админ] Добавить товар (price, stock, photos)
    → [Админ] Привязать URL у 1–3 конкурентов
    → [Парсер] last_price (+ cron 06:00)
    → [Витрина] бейдж + таблица для посетителя
    → [Покупатель] checkout
    → [API orders] цена/stock из БД, total = Σ + delivery
    → [TG] уведомление
    → [Админ] /admin/orders
```

**Не реализовано:** автопоиск модели на 3 сайтах; онлайн-оплата end-to-end.

---

## 8. Чеклист аудитора (пошагово)

### A. Доступ и health

- [ ] `/api/health/db` → ok / seeded  
- [ ] `/admin` → login (credentials из env владельца)  
- [ ] Без cookie → `401` на `/api/admin/products`  
- [ ] `robots` admin noindex  

### B. Каталог CRUD

- [ ] Создать товар: price, old_price, stock, published  
- [ ] Upload image → URL в Storage  
- [ ] Витрина показывает товар; unpublished — нет  
- [ ] sale% = round((old−price)/old×100)  

### C. Price-compare

- [ ] `/admin/price-compare` — 3 конкурента  
- [ ] Тест URL OpticStore product page → цена > 0  
- [ ] Save + sync → `last_price` в UI  
- [ ] На витрине Δ = competitor − our  
- [ ] Мы дороже → оранжевый бейдж (не скрыт)  
- [ ] Cron path защищён секретом  

### D. Заказ (математика)

- [ ] Оформить COD с 1 товаром: total = price_db × qty  
- [ ] Подмена price в Network/payload **не** меняет total  
- [ ] stock уменьшился  
- [ ] Заказ в `/admin/orders`  
- [ ] Telegram (если env)  

### E. Нова Пошта

- [ ] С ключом — города/отделения  
- [ ] Без ключа — graceful demo / error  

### F. Безопасность (замечания)

- [ ] SERVICE_ROLE только server  
- [ ] Сменить demo `ADMIN_PASSWORD`  
- [ ] Ротация ключей после передачи доступа  
- [ ] Нет публичного insert в orders через anon  

---

## 9. Ключевые файлы (карта кода)

| Область | Путь |
|---------|------|
| Admin shell / nav | `src/components/admin/AdminShell.tsx` |
| Auth | `src/lib/admin/auth.ts` |
| Product form | `src/components/admin/ProductForm.tsx` |
| Orders API | `src/app/api/orders/route.ts` |
| Price extract | `src/lib/price-compare/extract-price.ts` |
| Price repo/sync | `src/lib/price-compare/repo.ts` |
| Price types/math constants | `src/lib/price-compare/types.ts` |
| Catalog DB | `src/lib/db/catalog-repo.ts` |
| Mappers | `src/lib/supabase/mappers.ts` |
| Service client | `src/lib/supabase/service.ts` |
| Telegram | `src/lib/telegram.ts` |
| Nova Poshta | `src/lib/nova-poshta.ts`, `src/app/api/nova-poshta/route.ts` |
| Specs i18n | `src/lib/product-specs.ts` |
| Schema SQL | `supabase/RUN_ME_IN_SUPABASE.sql` |
| Cron | `vercel.json` |

---

## 10. Вердикт для записи аудитора

| Модуль | Статус | Что проверять |
|--------|--------|----------------|
| Админ CRUD | ✅ | Products/brands/categories/orders |
| Auth админки | ⚠️ demo cookie | Сменить пароль; не 2FA |
| Заказы + math | ✅ | **Server price**, stock RPC, total |
| Price-compare | ✅ | Парсер + Δ + UI cheaper/expensive |
| Привязка URL | ✅ ручная | Нет автопоиска моделей |
| БД Supabase | ✅ | RLS + service_role writes |
| НП / Telegram | ✅ код | Зависит от env |
| Оплата online | ❌ | Только COD / stubs |

> **Админ-панель + Postgres + server-side order math + price parser — рабочие для аудита механики.  
> Фокус проверки: игнор client price, stock decrement, формулы sale% и savingUah, env/secrets hygiene.**

---

## 11. Контакты инфраструктуры (без секретов)

| | |
|--|--|
| Production | https://optics-shop-skeleton.vercel.app |
| Admin | https://optics-shop-skeleton.vercel.app/admin |
| Supabase dashboard | https://supabase.com/dashboard/project/wvbqacawttfzrzcqdfai |
| Vercel dashboard | https://vercel.com/jacqros-projects/optics-shop-skeleton |

**Логин/пароль админки и API keys — запросить у владельца проекта отдельно (не хранить в git).**

---

*Документ для передачи аудитору. Сопутствующий общий статус: `docs/AUDIT_STATUS.md`.*
