# Звіт: Пісочниця тепловізора `/simulator`

**Дата впровадження:** 2026-07-30  
**URL:** `/uk/simulator`, `/ru/simulator`  
**Код:** `src/components/simulator/ThermalSandbox.tsx`, `src/lib/thermal/sandbox-physics.ts`

---

## 1. Параметри в UI

| Параметр | Діапазон / опції | Вплив |
|----------|------------------|--------|
| Матриця | 160×120 … 1280×1024 | FOV, пікселізація, DRI (через pitch×N) |
| Pixel pitch | 17 / 12 / 10 / 8 µm | FOV, IFOV, DRI, px на цілі |
| NETD | 10–60 mK | шум/контраст сцени |
| Фокус об'єктива | 13–100 mm | FOV, IFOV, DRI, px |
| Ціль | людина 0.75 / олень 1.0 / кабан 0.7 м | DRI і px |
| Дистанція | 50 … D_detect | статус, розмір цілі |
| Погода | ясно / туман | px×0.6, шум |
| Палітра | white-hot / red-hot | LUT (ліс cold / ціль hot) |
| Digi-zoom | ×1…×16 | crop сенсора |
| Частота | 25/30/50 Hz | **лише HUD** |
| K (калібрування) | 0.5–2.0, default **1.66** | масштаб усіх DRI |
| Пресети | RS75-class + товари каталогу | заповнюють поля |

---

## 2. Формули

```
sensor_width_mm = pitch_µm × N_horiz / 1000
FOV_h°          = 2 × atan(sensor_width_mm / (2 × f_mm)) × 180/π
IFOV_mrad       = pitch_µm / f_mm
px(dist)        = target_m × f_mm / (pitch_mm × dist_m)
                  pitch_mm = pitch_µm / 1000

D_det = K × target × f / (2  × pitch_mm)
D_rec = K × target × f / (8  × pitch_mm)
D_id  = K × target × f / (13 × pitch_mm)
```

Статус на дистанції: порівняння `px` (з туманом ×0.6) з 13 / 8 / 2.

Рендер: cold forest LUT + hot subject → NETD noise → matrix grain → digi-zoom (як PDP sim).  
Розмір цілі на сенсорі ≈ Johnson px (`sandboxTargetHeightFrac`).

---

## 3. Калібрування K

**Референс:** RS75-клас — 1280×1024, 12 µm, 75 mm, людина **0.75 m**, паспортна **D_detect ≈ 3900 m**.

```
raw = 0.75 × 75 / (2 × 0.012) = 2343.75 m
K   = 3900 / 2343.75 ≈ 1.664  → default K = 1.66
```

Перевірка в тестах: `calibrationRs75DetectM(1.66)` ∈ 3870…3930 m.

> Примітка: діапазон K≈0.7–0.9 у ТЗ відповідає іншій нормалізації (напр. critical size 1.7 m або 1 cycle). У коді K **експоновано** слайдером; дефолт узгоджений з 3900 m @ 0.75 m.

---

## 4. Guardrails

- Clamp: NETD, focal, distance, K, лише дозволені matrix/pitch.
- Distance max = round(D_detect).
- Підказка «нетипова конфігурація» якщо D_detect > 3.5 km і hi-end combo (1280+fine pitch+long lens тощо).

---

## 5. Файли

| Файл | Роль |
|------|------|
| `sandbox-physics.ts` | формули + clamp |
| `sandbox-physics.test.ts` | unit |
| `ThermalSandbox.tsx` | UI + canvas |
| `app/[locale]/simulator/page.tsx` | route |
| Header nav | «Пісочниця» |

---

## 6. Тести

```bash
npm test  # includes sandbox-physics.test.ts
```
