# Аудит симулятора тепловизора (актуальный)

| Поле | Значение |
|------|----------|
| **Дата аудита** | **2026-07-29** |
| **Статус** | Актуальная архитектура (two-layer 1/d + ground plane) |
| **Live** | https://optics-shop-skeleton.vercel.app |
| **Demo** | `/demo/thermal` |
| **Код** | `src/components/product/ThermalSimulator.tsx`, `src/lib/thermal/*` |

> Устаревшие версии этого файла (baked-сцена 1.0–1.55× zoom без 1/d) **недействительны**.  
> Полное ТЗ сайта: [`SITE_TZ_AND_AUDIT.md`](./SITE_TZ_AND_AUDIT.md) (**2026-07-29**).

---

## 1. Модель (как работает сейчас)

### 1.1. Два слоя

1. **Лес** — fixed FOV (`forest_whitehot.jpg`), cover с bias к земле.
2. **Олень** — спрайт `deer_subject_whitehot.jpg`, luma-key + crop по копытам.

### 1.2. Перспектива (обязательно)

```
высота_оленя ∝ 1 / distance
ноги_на_земле: (feetY − horizon) ∝ 1 / distance
```

| Дистанция | Эффект |
|-----------|--------|
| 50 м | Крупный олень на переднем плане litter |
| 200 м | Заметно меньше |
| 1000 м | ~1/20 размера 50 м — малая тёплая точка |
| D (напр. 2300) | Johnson «Виявлення»; digi-zoom ×16 делает hot mark видимым |

Константы: `DEER_FRAC_AT_MIN=0.52`, `HORIZON_FRAC=0.73`, `FEET_FRAC_AT_MIN=0.91` (`zoom.ts`).

### 1.3. Johnson

```
px = 2 × (D / dist)   [fog → ×0.6]
≥13 ідентифікація · ≥8 розпізнавання · ≥2 виявлення · <2 не видно
```

Matrix/NETD **не** меняют статус (только grain/noise).

### 1.4. FX pipeline

```
compose forest+deer → NETD noise (seeded) + palette → matrix downscale
→ digital zoom crop (×1…16) → vignette + HUD
```

- Canvas logical: **480×270**
- PRNG: **mulberry32** (не Math.random)
- Red-hot: iron LUT по luminance (геометрия = white)

### 1.5. Compare

- Ровно **2** панели: текущий товар + один peer.
- Имена моделей **над** каждым canvas.
- Peer: preset 256/384/640 или товар из `listThermalCompareOptions` / API `GET /api/products/thermal-specs`.

### 1.6. Digi-zoom (inspect detection)

- На экране: − / + / **«Збільшити ціль»**
- `inspectDigiZoom(distance)`: на ≥1500 м → ×16
- Увеличивает **пиксели матрицы**, не добавляет детализации (честно).

### 1.7. UX входа

| Место | UI |
|-------|-----|
| ProductCard | Купить → **Симуляция** (вертикально) → `#thermal-simulator` |
| PDP | В корзину + **Симуляция** (если thermal-ish) |
| Дисклеймер | D часто human; сцена олень; sim приблизительная |

---

## 2. Файлы

| Путь | Роль |
|------|------|
| `ThermalSimulator.tsx` | UI + canvas |
| `zoom.ts` / `zoom.test.ts` | 1/d, ground, digi |
| `parse-product-thermal.ts` + `.test.ts` | D, NETD, Johnson, matrix |
| `list-thermal-products.ts` | compare list |
| `api/products/thermal-specs` | API |
| `public/thermal/forest_whitehot.jpg` | фон |
| `public/thermal/deer_subject_whitehot.jpg` | спрайт |
| `scene_deer_*` | **legacy**, не runtime |

---

## 3. Тесты (2026-07-29)

```bash
npm test
# zoom + parse-product-thermal → 29 pass
```

Покрыто: 1/d ratios, ground band, Johnson thresholds, inspectDigiZoom, parseMatrix (no name false-positive).

---

## 4. Оценка (hard)

| Критерий | Балл |
|----------|------|
| 1/d согласован с Johnson | 9/10 |
| Ground plant | 8/10 |
| Sales UX (compare, digi, CTA) | 9/10 |
| Determinism | 9/10 |
| Docs/e2e/legacy cleanup | 6/10 |
| **Итого sales-tool** | **~8.2/10** |

Занижение (не «плохой 1/d»): human-D vs deer; Sim на всех карточках vs не на всех PDP; нет e2e canvas; legacy assets.

---

## 5. История

| Дата / commit | Событие |
|---------------|---------|
| ~2026-07-28 | Первый sim, layered, baked |
| 2026-07-29 `426c4af` | Коллега: two-layer 1/d |
| 2026-07-29 `ae50e29` | Ground band fix |
| 2026-07-29 `729f94e` | Compare = 2 panels |
| 2026-07-29 `1d775fd` | Digi inspect |
| 2026-07-29 `a5063b5` | Card buttons stack |
| **2026-07-29** | **Этот документ** (актуализация) |

---

*Дата аудита симулятора: **2026-07-29**.*
