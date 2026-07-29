# Pro-Optics — ТЗ + hard-аудит всего сайта

| Поле | Значение |
|------|----------|
| **Дата ТЗ / аудита** | **2026-07-29** |
| **Версия документа** | 1.0 |
| **Проект** | Интернет-магазин тепловизоров / оптики (Украина) |
| **Бренд** | Pro-Optics |
| **Live** | https://optics-shop-skeleton.vercel.app |
| **GitHub** | https://github.com/jacquesrouxwp/internetstore-test (`main`) |
| **Стек** | Next.js 14 App Router, TypeScript, Tailwind, next-intl (uk/ru), Supabase, Zustand, Vercel |
| **Назначение** | Единый документ: **техническое задание (как должно быть)** + **аудит (что сделано / дыры)** на дату выше |

> Предыдущие partial-аудиты: `AUDIT_STATUS.md` (2026-07-28), `AUDIT_ADMIN_PANEL.md`, `P0_ADMIN_REPORT.md`, `THERMAL_SIMULATOR_AUDIT.md` (обновлён 2026-07-29).

---

## 0. Краткая сводка

| Область | ТЗ (цель) | Аудит 2026-07-29 |
|---------|-----------|------------------|
| Витрина UK/RU | Полный storefront | ✅ |
| Каталог + PDP + корзина + checkout | Рабочий цикл покупки | ✅ (оплата online — stub/нет) |
| Админка P0 | Товары, заказы, настройки, security | ✅ |
| Сравнение цен vs конкуренты | Бейджи + парсер | ✅ (ручная привязка URL) |
| Блог | Карусель, /blog, admin WYSIWYG | ✅ |
| **Симулятор тепловизора** | Физически честный demo + sales UX | ✅ (см. §5) |
| Онлайн-оплата | LiqPay / Fondy / … | ❌ |
| Юр. пакет (оферта, privacy) | Полный | ⚠️ минимально |
| Собственный домен + 2FA admin | Prod hardening | ⚠️ ops |

**Оценка «магазин + контент + симулятор» как e-commerce demo:** **~8.0–8.5 / 10**  
**Оценка «готов к полноценным продажам 24/7»:** ниже (платежи, юр., ops).

---

## 1. Техническое задание (продукт)

### 1.1. Цели бизнеса

1. Продавать тепловизоры / прицелы / бинокли / НВ онлайн в UA.
2. Вызывать доверие: сравнение цен с топ-конкурентами, понятные specs.
3. **Дифференциатор:** интерактивный **симулятор «как прибор видит в темноте»** на PDP и с карточек.
4. Админка: каталог, заказы, Нова Пошта TTN, блог, прайс-compare.

### 1.2. Пользовательские роли

| Роль | Возможности |
|------|-------------|
| Посетитель | Каталог, PDP, sim, корзина, checkout (COD / stubs) |
| Покупатель | Заказ → Telegram/email notify, статусы в админке |
| Админ | CRUD, заказы, импорт, price-links, settings, news |

### 1.3. Локализация

- **uk** (default), **ru** (prefix `/ru`)
- next-intl, `messages/uk.json`, `messages/ru.json`

### 1.4. Storefront (маршруты)

| Route | Назначение |
|-------|------------|
| `/[locale]` | Главная: hero, rails, бренды, блог-карусель |
| `/[locale]/catalog/[category]` | Каталог, фильтры, пагинация |
| `/[locale]/product/[slug]` | PDP: цена, specs, price-compare, **thermal sim**, CTA |
| `/[locale]/cart` | Корзина |
| `/[locale]/checkout` | Оформление + НП |
| `/[locale]/blog`, `/blog/[slug]` | Контент |
| about, contacts, delivery, warranty | Инфо |
| `/admin/*` | Админка |
| `/demo/thermal` | Dev-превью симулятора |

### 1.5. Карточка товара (каталог) — UX ТЗ

- Кнопка **Купить** (в корзину).
- Под ней кнопка **Симуляция** → `/product/{slug}#thermal-simulator` (вертикальный stack).
- Бейджи sale/hit/new, price-compare badge при наличии links.

### 1.6. PDP — UX ТЗ

- **В корзину** + **Симуляция** (если товар thermal-ish).
- Блок `#thermal-simulator`: дистанция 1/d, Johnson, NETD, matrix, compare 2 панелей, digi-zoom.
- Дисклеймер: D часто для человека; сцена — олень; симуляция приблизительная.

### 1.7. Симулятор (кратко ТЗ)

См. полный актуальный аудит: [`THERMAL_SIMULATOR_AUDIT.md`](./THERMAL_SIMULATOR_AUDIT.md) (дата **2026-07-29**).

| Требование | Суть |
|------------|------|
| Перспектива | Олень **реально** уменьшается ∝ 1/d; на 1000 м — малая тёплая точка |
| Земля | Ноги на ground plane (не mid-trunk) |
| Johnson | px = 2×(D/dist); 2/8/13 → detect/recognize/identify |
| NETD / matrix | Шум / пикселизация |
| Compare | Ровно **2** окна: этот прибор + один peer; имена моделей над canvas |
| Digi-zoom | ×1…×16 + «Увеличить цель» на большой дистанции |
| Детерминизм | Canvas 480×270, seeded noise |

### 1.8. Заказы

- `POST /api/orders` — серверный пересчёт цены/stock из БД.
- Nova Poshta: города/отделения.
- Telegram notify.
- Админ: статусы, фильтры, TTN, print, export.

### 1.9. Сравнение цен

- Ручные competitor URL на товар.
- Parser/cron extract.
- UI: badge «дешевле/дороже/равно» даже если мы дороже.

### 1.10. Не в scope ТЗ (на 2026-07-29)

- Полноценный эквайринг (LiqPay/Fondy live).
- Автопоиск URL конкурентов.
- Полный GDPR/оферта пакет.
- 2FA админа, multi-tenant.

---

## 2. Архитектура (как реализовано)

```
Next.js 14 (App Router)
├── Storefront [locale]     → catalog-repo / seed fallback
├── Admin /admin            → service_role Supabase + cookie auth
├── API /api/*              → orders, NP, admin CRUD, thermal-specs
├── Supabase Postgres       → products, orders, blog, price_links, settings
├── Vercel                  → deploy main
└── Client cart             → Zustand + localStorage
```

Ключевые пакеты: `next-intl`, `@supabase/*`, `zustand`, `bcryptjs`, `react-quill` (blog), `zod`.

Миграции: `supabase/migrations/001`…`005`, `schema.sql`.

---

## 3. Аудит по модулям (2026-07-29)

### 3.1. Витрина

| Функция | Статус | Комментарий |
|---------|--------|-------------|
| Каталог, фильтры, dual-range detection | ✅ | |
| ProductCard: Купить + Симуляция (stack) | ✅ | |
| PDP, specs, JSON-LD | ✅ | |
| i18n uk/ru | ✅ | |
| Корзина / checkout UI | ✅ | |
| Онлайн-оплата live | ❌ | stubs / env |

### 3.2. Данные

| Функция | Статус |
|---------|--------|
| Supabase source of truth | ✅ |
| Seed fallback без Supabase | ✅ |
| Storage product images | ✅ |
| Health `/api/health/db` | ✅ |

### 3.3. Админка P0

| Функция | Статус |
|---------|--------|
| Login rate-limit, bcrypt password | ✅ |
| Orders filters/status/export/print/TTN | ✅ |
| Products search/bulk/inline/SEO/gallery | ✅ |
| store_settings | ✅ |
| Honeypot checkout | ✅ |
| News/blog WYSIWYG | ✅ |

### 3.4. Price compare

| Функция | Статус |
|---------|--------|
| Links + extract + badge/popover | ✅ |
| Показ даже если дороже | ✅ |
| Auto-discover competitor URLs | ❌ |

### 3.5. Блог

| Функция | Статус |
|---------|--------|
| blog_posts, /blog, carousel | ✅ |
| Seed premium posts | ✅ |

### 3.6. Thermal simulator

| Функция | Статус | Балл |
|---------|--------|------|
| 1/d recession | ✅ | 9/10 |
| Ground plane | ✅ | 8/10 |
| Johnson + NETD + matrix | ✅ | 8.5/10 |
| Compare 2 panels + names | ✅ | 9/10 |
| Digi-zoom inspect | ✅ | 9/10 |
| Unit tests | ✅ 29/29 | 8/10 |
| E2E canvas | ❌ | — |
| Docs sync | ✅ после этого файла | — |

**Общий балл симулятора как sales-tool: ~8.2/10**  
(не lab IFOV; human-D vs deer; Sim на всех карточках, блок на PDP — не всегда).

---

## 4. Известные риски / tech debt

1. **Кнопка «Симуляция» на всех карточках**, симулятор на PDP — только thermal-ish → hash может «пустой» на NV/аксессуарах.
2. **Passport D** часто human detection; сцена — олень (дисклеймер на sim).
3. Legacy ассеты `public/thermal/scene_deer_*` (baked) — **не** в runtime pipeline (сейчас forest + deer_subject).
4. `docs/THERMAL_SIMULATOR_AUDIT.md` до 2026-07-29 описывал устаревший baked-zoom — **переписан**.
5. Нет e2e visual regression canvas.
6. Нет live online payment.
7. Admin demo credentials в README — сменить на prod.

---

## 5. Тесты и проверки

```bash
npm test   # thermal: zoom + parse-product-thermal
npx tsc --noEmit
```

На 2026-07-29: **29/29** thermal unit tests green.

---

## 6. Рекомендации (backlog)

| Prio | Задача |
|------|--------|
| P0 | Показывать Sim на карточке только если `productHasThermalSim` **или** fallback-текст на PDP |
| P0 | Shared helper `productHasThermalSim()` для card + PDP |
| P1 | Удалить/архивировать unused thermal JPEGs |
| P1 | Playwright smoke: 50m size > 1000m; digi ×16; 2 compare panels |
| P2 | Online payment integration |
| P2 | Юр. страницы |
| P2 | Admin 2FA / password policy prod |

---

## 7. История ключевых коммитов (thermal + sim CTA)

| Commit | Суть |
|--------|------|
| `e16bc29`… | Первый sim |
| `426c4af` | Two-layer 1/d (коллега) |
| `ae50e29` / `aec2936` | 1/d + ground band |
| `729f94e` | Compare = 2 panels + model names |
| `1d775fd` | Digi-zoom + «Увеличить цель» |
| `ffcd2b4`…`9d985a4` | PDP кнопка Симуляция |
| `a932816` / `a5063b5` | Карточки: Купить + Симуляция (stack) |
| *(docs)* | Этот файл **2026-07-29** |

---

## 8. Контакты артефактов

| Документ | Дата | Содержание |
|----------|------|------------|
| **SITE_TZ_AND_AUDIT.md** (этот) | **2026-07-29** | Полное ТЗ + аудит сайта |
| THERMAL_SIMULATOR_AUDIT.md | **2026-07-29** | Актуальный sim |
| AUDIT_STATUS.md | 2026-07-28 | Чеклист аудитора (до sim-волны) |
| AUDIT_ADMIN_PANEL.md | ~2026-07 | Админка deep |
| P0_ADMIN_REPORT.md | ~2026-07 | P0 отчёт |
| COWORKER_AGENT_BRIEF.md | — | Бриф для агента |

---

*Документ зафиксирован в GitHub `docs/` для передачи следующему разработчику / аудитору. Дата ТЗ: **2026-07-29**.*
