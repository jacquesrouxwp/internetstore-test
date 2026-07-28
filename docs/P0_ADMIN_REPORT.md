# P0 Admin — звіт про впровадження

**Дата:** 2026-07-28  
**Коміт:** (див. git log)

## Обов'язково після деплою

1. Відкрити Supabase SQL Editor → виконати  
   `supabase/migrations/003_admin_p0.sql`  
   (також додано в кінець `RUN_ME_IN_SUPABASE.sql`).
2. Перевірити env: `NOVA_POSHTA_API_KEY`, опційно `RESEND_API_KEY` + `RESEND_FROM`.
3. У `/admin/settings` заповнити контакти, реквізити, НП відправника, змінити пароль.

---

## Додані розділи UI

| URL | Призначення |
|-----|-------------|
| `/admin/orders` | Фільтри, пошук, пагінація, CSV, статуси (+ returned) |
| `/admin/orders/[id]` | Картка: клієнт, суми, ТТН, менеджер-коментар, сповіщення |
| `/admin/orders/[id]/print` | Друк рахунку/накладної |
| `/admin/products` | Пошук/фільтри/сорт/bulk/інлайн stock·price/дубль |
| `/admin/settings` | site, social, legal, delivery, НП, templates, password |
| AdminShell | пункт «Налаштування» |

---

## Нові / оновлені API

| Method | Path | Опис |
|--------|------|------|
| GET/PATCH | `/api/admin/orders` | q, status, dateFrom/To, page; CSV; managerComment; notify |
| POST/GET | `/api/admin/orders/ttn` | Створення ТТН НП |
| GET/PUT | `/api/admin/settings` | store_settings + зміна пароля |
| GET/PATCH | `/api/admin/products` | фільтри + bulk/inline/duplicate |
| POST | `/api/admin/login` | rate-limit 5/10хв + bcrypt hash |
| POST | `/api/orders` | honeypot `website` |

---

## Таблиці / колонки (SQL 003)

- `orders`: `manager_comment`, `tracking_number`, `tracking_url`, `status_notified_at` + індекси  
- `products`: `meta_title_uk/ru`, `meta_description_uk/ru`, `image_alts`  
- `store_settings` (key/value jsonb) + RLS public read для site/social/legal/delivery/templates  

---

## Статуси замовлень

`new → processing → shipped → done` + `cancelled` + `returned`

---

## Що залишилось / обмеження

| Тема | Статус |
|------|--------|
| P1: блог, сторінки, відгуки, KPI dashboard, глибокий Prom | **не в P0** |
| Drag-and-drop галереї (HTML5 dnd) | стрілки ←→ + «Головне» замість full DnD |
| Excel (.xlsx) | CSV з BOM (Excel-friendly) |
| Email клієнту | Resend, якщо `RESEND_API_KEY`; інакше Telegram в admin chat |
| ТТН | потрібні API key + ref-и відправника в settings |
| Пароль | bcrypt у `store_settings.security`; env — recovery |

---

## Файли (ключові)

- `supabase/migrations/003_admin_p0.sql`
- `src/lib/store-settings.ts`, `notify-customer.ts`, `admin/rate-limit.ts`
- `src/lib/nova-poshta.ts` (`createInternetDocument`)
- `src/lib/db/admin-repo.ts` (list filters, bulk, patch)
- `src/app/admin/settings/page.tsx`
- `src/app/admin/orders/*`, `products/page.tsx`
