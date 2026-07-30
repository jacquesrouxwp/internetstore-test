# Thermal Simulator — Hard Math Audit (для аудитора)

**Документ:** жёсткая спецификация математики и пайплайна рендера  
**Продукт:** Pro-Optics / optics-shop-skeleton — симулятор тепловизора (PDP + `/simulator`)  
**Дата аудита:** 2026-07-30  
**Назначение:** скачать и передать аудитору / ревьюеру без доступа к репозиторию  
**Источник истины в коде:**

| Модуль | Путь |
|--------|------|
| Johnson / FOV / статус / grain | `src/lib/thermal/parse-product-thermal.ts` |
| Цели (размеры) | `src/lib/thermal/targets.ts` |
| Земля, альфа, digi-zoom | `src/lib/thermal/zoom.ts` |
| Sandbox DRI (оптика) | `src/lib/thermal/sandbox-physics.ts` |
| PDP canvas | `src/components/product/ThermalSimulator.tsx` |
| Sandbox UI | `src/components/simulator/ThermalSandbox.tsx` |
| Unit-тесты | `src/lib/thermal/*.test.ts` (76+ тестов) |

**Статус:** это **обучающая / коммерческая визуализация**, калиброванная на passport D и критерии Johnson, а не сертифицированный TRM / NVThermIP. Ниже — что именно считается, с формулами и численными примерами.

---

## 0. Executive summary (для аудитора за 2 минуты)

1. **Статус** (Идентификация / Распознавание / Выявление / Не видно) = классические пороги Johnson **2 / 8 / 13** пикселей на **критическом размере** цели.  
2. **Паспортная дальность D** товара — якорь: на дистанции `d = D` «паспортные» пиксели = ровно **2** (`px_pass = 2·D/d`).  
3. **Видимый размер** на экране = **угловой размер тела / FOV_верт** (оптика: f, pitch, матрица; fallback FOV↓ ≈ 11°).  
4. **Согласование картинки и бейджа:**  
   - внутри полосы выявления (`d ≤ D`) — hot-mark не меньше ~2.5 grain-px на critical, если FOV «провалился»;  
   - **за D** — цель **гаснет** (visibility → 0 за ~8%·D), статус = «Не видно», **жёлтых пикселей нет**.  
5. **Туман** влияет на статус (×0.6 к px) и шум/контраст; **не** сдвигает якорь ног и не меняет геометрию при той же дистанции внутри полосы.  
6. **NETD** → только шум/контраст, **не** статус. **Матрица** → зернистость (downscale).  
7. **Цифровой зум** ×1…×32 — только crop сенсорных блоков, **без** новой детали.

---

## 1. Архитектура пайплайна (PDP)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Forest plate (fixed FOV) → cold palette LUT              │
│ 2. Subject sprite (luma-key) → size + feet on ground        │
│    → hot palette LUT                                        │
│ 3. Composite + NETD noise (deterministic seed)              │
│ 4. Downscale to matrix grain (pixelation)                   │
│ 5. Digital zoom crop → upscale to 480×360 logic canvas      │
│ 6. Device frame (ocular circle / screen 4:3) + HUD          │
└─────────────────────────────────────────────────────────────┘
```

| Константа | Значение | Смысл |
|-----------|----------|--------|
| `LOGIC_W × LOGIC_H` | **480 × 360** | логический кадр 4:3 |
| `DIST_MIN_M` | **50 m** | минимум слайдера |
| Палитры | white-hot / iron-hot | LUT после слоёв |
| Погода | clear / fog | шум, контраст, fade/status |

Слои **холодный лес / горячая цель** разделены **до** пикселизации: один общий LUT на весь кадр запрещён (иначе кроны «греются»).

---

## 2. Входы модели (product → ThermalSimParams)

```text
matrix          ∈ {256, 384, 640}     // класс сенсора (W)
detectionRangeM                       // паспортная D выявления, м (обычно human)
netdMk                                // NETD, mK
refreshRateHz                         // HUD only
focalMm | null                        // объектив, мм
pitchUm | null                        // pitch, µm (default 12 если есть f)
```

### 2.1. Матрица (реальные пиксели vs grain)

| Класс `matrix` | Реальная высота сенсора `matrixVertPixels` | Offscreen grain W | Grain H (= W·3/4) |
|----------------|--------------------------------------------|-------------------|-------------------|
| 256 | 192 | 96 | 72 |
| 384 | 288 | 144 | 108 |
| 640 | 512 | 240 | 180 |

- **FOV** считается по **реальной** высоте сенсора (192/288/512).  
- **Статус / «пиксели на матрице» в HUD** — по **grain** после downscale (то, что «видит» симулятор).

### 2.2. Defaults, если паспорт пустой

| matrix | default D, m | default NETD, mK | demo f, mm |
|--------|--------------|------------------|------------|
| 256 | 1050 | 40 | 19 |
| 384 | 1600 | 35 | 25 |
| 640 | 2350 | 25 | 35 |

`DEFAULT_FOV_VERT_DEG = 11` — если нет `focalMm`.

### 2.3. Парсинг f из названия / specs

Паттерны (упрощённо): `f=25`, `35 мм`, `LE15`, `LH35`, `CQ50L`, `FQ50`, `640-50` → 50 мм, диапазон **9…150 мм**.

---

## 3. Цели (4 типа)

Два размера на цель (важно не путать):

| ID | UI (uk) | **criticalSizeM** (Johnson / D) | **visualHeightM** (угловой размер на экране) |
|----|---------|----------------------------------|-----------------------------------------------|
| human | Людина | **0.75 m** | **1.8 m** |
| deer | Олень | **1.0 m** | **1.3 m** |
| boar | Кабан | **0.7 m** | **1.0 m** |
| fox | Лисиця | **0.3 m** | **0.4 m** |

### 3.1. Масштаб паспортной D на цель

Паспорт обычно для **человека 0.75 m**:

\[
D_{\text{target}} = \max\!\left(80,\; \mathrm{round}\!\left(D_{\text{human}} \cdot \frac{s_{\text{crit,target}}}{0.75}\right)\right)
\]

**Примеры** (`D_human = 1200 m`):

| Цель | s_crit | D_target |
|------|--------|----------|
| human | 0.75 | 1200 m |
| deer | 1.0 | 1600 m |
| boar | 0.7 | 1120 m |
| fox | 0.3 | 480 m |

Лиса «съедается» дальностью первой — учебный контраст матрицы/D.

Слайдер max на PDP = max(D по активным панелям compare, D текущей цели).

---

## 4. Johnson — паспортный якорь

### 4.1. Пороги (line-pairs / critical dimension)

\[
\begin{align*}
N_{\text{detect}} &= 2 \\
N_{\text{recognize}} &= 8 \\
N_{\text{identify}} &= 13
\end{align*}
\]

### 4.2. Паспортные пиксели (без оптики)

Калибровка: **на d = D ровно 2 px**:

\[
px_{\text{pass}}(d, D) = \frac{2 \cdot D}{d}
\]

| d | px_pass (D=1200) | Полоса (clear) |
|---|------------------|----------------|
| 50 m | 48 | identify |
| D/4 = 300 m | 8 | recognize (граница) |
| 2D/13 ≈ 184.6 m | 13 | identify (граница) |
| **D = 1200 m** | **2** | **detect** |
| 1300 m | 1.846 | none (паспорт) |

### 4.3. Туман на паспортных px

\[
px_{\text{eff}} = px_{\text{pass}} \cdot 
\begin{cases}
0.6 & \text{fog} \\
1 & \text{clear}
\end{cases}
\]

### 4.4. Полосы дистанций (clear)

\[
\begin{align*}
d_{\text{identify,max}} &= \frac{2D}{13} \\
d_{\text{recognize,max}} &= \frac{2D}{8} = \frac{D}{4} \\
d_{\text{detect,max}} &= D
\end{align*}
\]

### 4.5. Legacy `computeDetectStatus` (только паспорт)

```
if px_eff ≥ 13 → identify
else if px_eff ≥ 8 → recognize
else if px_eff ≥ 2 → detect
else → none
```

**На UI PDP сейчас основной статус — visual** (см. §7), passport px может показываться справочно.

---

## 5. FOV и видимый размер (оптика)

### 5.1. Вертикальный FOV

Высота сенсора:

\[
H_{\text{mm}} = \frac{p_{\mu\mathrm{m}} \cdot N_{v}}{1000}
\]

где \(N_v = matrixVertPixels\) (192/288/512), \(p\) — pitch (default **12 µm**).

\[
\mathrm{FOV}_{v}\;[\mathrm{rad}] = 2 \arctan\!\left(\frac{H_{\mathrm{mm}}}{2\,f_{\mathrm{mm}}}\right)
\]

Если `focalMm` нет → \(\mathrm{FOV}_v = 11° \cdot \pi/180\).

**Пример:** 384×288, 12 µm, f=25 mm:

\[
H = 12\cdot288/1000 = 3.456\,\mathrm{mm},\quad
\mathrm{FOV}_v = 2\arctan(3.456/50) \approx 0.1377\,\mathrm{rad} \approx 7.9°.
\]

### 5.2. Угловой размер и доля кадра (тело)

Small-angle:

\[
\theta \approx \frac{h_{\mathrm{visual}}}{d}\quad[\mathrm{rad}]
\]

\[
f_{\mathrm{frame}} = \mathrm{clamp}\!\left(
  \frac{\theta}{\mathrm{FOV}_v}\cdot M_{\mathrm{opt}},\;
  0.004,\; 0.55
\right)
\]

\(M_{\mathrm{opt}} = 1\) на native FOV (digi-zoom отдельно).

**Проверка «честного» 50 m, human 1.8 m, FOV=11°:**

\[
f_{\mathrm{frame}} = \frac{1.8/50}{11\cdot\pi/180} \approx 0.187 \;\Rightarrow\; \mathbf{18.7\%}\text{ высоты кадра}
\]

(целевое окно аудита: **15–25%**, не на весь экран).

**200 m:** \(\approx 4.7\%\) — уже мелко.

### 5.3. Grain-пиксели тела и critical

\[
\begin{align*}
px_{\mathrm{body,grain}} &= f_{\mathrm{frame}} \cdot H_{\mathrm{grain}} \\
px_{\mathrm{crit,FOV}} &= px_{\mathrm{body,grain}} \cdot \frac{s_{\mathrm{crit}}}{h_{\mathrm{visual}}}
\end{align*}
\]

\(H_{\mathrm{grain}} = matrixPixelHeight\) (72/108/180).

---

## 6. Рендер высоты: detect floor + fade за D

Функция: `renderTargetHeightFrac(...)`.

### 6.1. Visibility (жизнь hot-mark)

\[
D_{\mathrm{eff}} = 
\begin{cases}
D & \text{clear} \\
0.6\,D & \text{fog}
\end{cases}
\]

\[
v =
\begin{cases}
1 & d \le D_{\mathrm{eff}} \\
\left(1-u\right)^2 & D_{\mathrm{eff}} < d < D_{\mathrm{eff}}(1+\delta) \\
0 & d \ge D_{\mathrm{eff}}(1+\delta)
\end{cases}
\quad
\delta = 0.08,\quad
u = \frac{d - D_{\mathrm{eff}}}{\delta\, D_{\mathrm{eff}}}
\]

**D = 1200 m, clear:**

| d | v | Смысл |
|---|---|--------|
| ≤ 1200 | 1 | полная цель |
| 1250 | ~0.23 | почти погасла |
| ≥ 1296 | **0** | **не рисуется** |
| 1300 | **0** | статус none, **нет жёлтых пикселей** |

### 6.2. Detect floor (внутри полосы)

Константа: `DETECT_GRAIN_MIN = 2.5` (critical на grain).

Если \(px_{\mathrm{pass}} \ge 2\) и \(px_{\mathrm{crit,FOV}} < 2\):

\[
f_{\mathrm{floor}} = \min\!\left(
  0.1,\;
  \frac{2.5 \cdot h_{\mathrm{visual}} / s_{\mathrm{crit}}}{H_{\mathrm{grain}}}
\right)
\]

\[
f_{\mathrm{render}} = \max(f_{\mathrm{FOV}},\, f_{\mathrm{floor}})
\]

Иначе \(f_{\mathrm{render}} = f_{\mathrm{FOV}}\).

Если \(v < 1\): \(f_{\mathrm{render}} \leftarrow f_{\mathrm{render}}\cdot v\).  
Если \(v = 0\): \(f_{\mathrm{render}} = 0\) → **subject layer не рисуется**.

**Смысл:**  
- на D бейдж «Выявление» ⇔ есть видимая тепловая точка;  
- за D бейдж «Не видно» ⇔ точки нет (не «призрак» того же размера).

---

## 7. Статус на UI (visual, сшит с картинкой)

`computeDetectStatusVisual`:

1. Если \(v \le 0\) → **none**.  
2. \(f = renderTargetHeightFrac(...)\) ; если \(f \le 0\) → **none**.  
3.  
\[
px_{\mathrm{crit,drawn}} = f \cdot H_{\mathrm{grain}} \cdot \frac{s_{\mathrm{crit}}}{h_{\mathrm{visual}}} \cdot 
\begin{cases} 0.6 & \text{fog} \\ 1 & \text{clear} \end{cases}
\]
4. Пороги 13 / 8 / 2 → identify / recognize / detect / none.

**Инвариант аудита:**  
«detect» ⇒ \(px_{\mathrm{crit,drawn}} \ge 2\) (clear, внутри полосы с floor).  
«none» за fade ⇒ \(f = 0\), пикселей цели нет.

---

## 8. Геометрия земли (ноги не «летают»)

### 8.1. Горизонт и ступни

| Константа | Значение |
|-----------|----------|
| `HORIZON_FRAC` | 0.73 |
| `FEET_FRAC_AT_MIN` | 0.91 (на 50 m) |
| `DEER_CENTER_X` | 0.5 |

\[
y_{\mathrm{feet}}(d) = H_{\mathrm{logic}}\cdot\left(
  HOR + (FEET_{50}-HOR)\cdot\frac{d_{\min}}{d}
\right) + \mathrm{sink}
\]

Тот же закон \(1/d\), что и для размера → **нет float** при зуме/дистанции.

### 8.2. Прямоугольник спрайта

\[
\begin{align*}
h &= f_{\mathrm{render}} \cdot H_{\mathrm{logic}} \\
w &= h \cdot \mathrm{aspect}_{\mathrm{sprite}} \\
x &= 0.5\,W - w/2 \\
y &= y_{\mathrm{feet}} - h
\end{align*}
\]

(При \(f_{\mathrm{render}}=0\) draw пропускается; min-1px ghost запрещён.)

### 8.3. Независимость от погоды/палитры (геометрия)

| Параметр | Влияет на x,y,w,h? |
|----------|---------------------|
| distance | да |
| target / FOV / f / pitch / matrix grain floor | да |
| fog | **только** visibility fade (за Deff) и alpha; **не** якорь при d ≤ Deff |
| palette white/iron | нет (только цвет) |
| NETD | нет (шум) |
| digi-zoom | crop после, не world-size |

---

## 9. Атмосфера (alpha), не геометрия

\[
t = \mathrm{clamp}(d/D,\,0,\,1)
\]
\[
\tau_{\mathrm{clear}} = 1 - (1-0.38)\,t^{0.9}
\]
\[
\tau_{\mathrm{fog}} = 0.7\cdot \tau_{\mathrm{clear}}\quad\text{(в zoom.ts, для base transmission)}
\]

На draw: \(\alpha \propto \tau \cdot v\) (visibility).  
На d=D: \(\tau \approx 0.38\) — detect blob не «смывается» в 0.

---

## 10. NETD (шум / контраст) — не статус

\[
\begin{align*}
A_{\mathrm{noise}} &= \frac{\max(\mathrm{NETD},12)}{30}\cdot 28
  \cdot M_{\mathrm{fog}}
  \cdot \bigl(0.75 + 0.55\cdot t_{50}\bigr) \\
M_{\mathrm{fog}} &= 1.55\ (\mathrm{fog})\ /\ 1 \\
t_{50} &= \mathrm{clamp}\!\left(\frac{d-50}{D-50},0,1\right)
\end{align*}
\]

\[
C = \frac{42}{\max(\mathrm{NETD},15)} \cdot 
\begin{cases} 0.68 & \text{fog} \\ 1 & \text{clear} \end{cases}
\]

Шум **детерминированный** (mulberry32 + hash seed: scene, target, matrix, NETD, d, weather, palette, panel).

---

## 11. Пикселизация матрицы и digi-zoom

### 11.1. Pixelation

1. Compose 480×360  
2. Draw → grain canvas `pixW × pixH` (см. §2.1)  
3. `imageSmoothingEnabled` при downscale

### 11.2. Digital zoom

Шаги: **1, 2, 4, 8, 16, 32**.

Crop на grain:

\[
s_w = \frac{W_g}{z},\quad
s_h = \frac{H_g}{z},\quad
\text{center = focus (cx,cy цели)}
\]

Затем nearest-neighbour upscale на 480×360.

**Важно:** ×32 **не** добавляет разрешение — только увеличивает блоки (честный digi-zoom).  
Кнопка «Збільшити ціль» / inspect выбирает z так, чтобы цель ~40% кадра (на D часто ×16…×32).

---

## 12. Sandbox `/simulator` (отдельная физика DRI)

Sandbox считает DRI **из оптики**, не из passport D товара:

\[
px = \frac{s_{\mathrm{crit}} \cdot f_{\mathrm{mm}}}{p_{\mathrm{mm}} \cdot d}
\]

\[
D_N = \frac{K \cdot s_{\mathrm{crit}} \cdot f_{\mathrm{mm}}}{N \cdot p_{\mathrm{mm}}}
\quad N\in\{2,8,13\}
\]

- \(K\) default **1.66** (калибровка RS75-class: 1280×1024, 12 µm, 75 mm, human 0.75 m → \(D_{\mathrm{det}}\approx 3900\) m).  
- FOV гориз.: \(2\arctan(W_{\mathrm{mm}}/(2f))\).  
- IFOV ≈ \(p_{\mu\mathrm{m}}/f_{\mathrm{mm}}\) mrad.  
- Визуал цели: тот же FOV_vert + detect floor + fade past \(D_{\mathrm{detect}}\) (как PDP).  
- NETD — шум; статус UI — по **rendered critical grain**, не «пустой detect».

Матрицы sandbox: 160…1280; pitch 17/12/10/8 µm; f 13…100 mm.

---

## 13. Численные сценарии (жёсткая QA-матрица)

### 13.1. Human, D=1200, 384 / f=25 / 12 µm

| d | px_pass | v | Статус (clear) | Hot-mark |
|---|---------|---|----------------|----------|
| 50 | 48 | 1 | identify/recognize* | ~FOV 15–25%+ |
| 300 | 8 | 1 | recognize band | средний |
| 1200 | 2 | 1 | **detect** | ≥ ~2.5 crit grain |
| 1300 | 1.85 | **0** | **none** | **нет** |

\*точный visual-статус зависит от grain после FOV; на 35 mm ближе к identify.

### 13.2. Fox vs deer, тот же прибор

\(D_{\mathrm{fox}} \ll D_{\mathrm{deer}}\) → на фиксированных 700 m лиса часто detect/none раньше оленя.

### 13.3. Fog

- Геометрия при d ≤ 0.6D: та же.  
- Статус: crit ×0.6.  
- Deff = 0.6D → fade раньше.  
- Шум ×1.55, контраст ×0.68.

### 13.4. Инварианты (must-pass)

1. d=50, human, default FOV: **не** full-frame (не 50%+ без длинного f).  
2. d=D: status detect **и** visible hot mark.  
3. d ≥ D·1.08: status none **и** f_render=0.  
4. Clear↔Fog при d=200: **тот же** feet anchor / size (кроме fade-зоны за Deff).  
5. Palette swap: позиция/размер без изменений.  
6. Digi ×z: только crop, world size тот же.  
7. NETD change: статус не прыгает при том же d,D,target,fog.

---

## 14. Что это НЕ делает (границы модели)

| Тема | Реальность симулятора |
|------|------------------------|
| Полный NVTherm / TRM | Нет — упрощённый Johnson + FOV |
| Атмосфера MODTRAN | Нет — fog ×0.6 + noise |
| Diffraction / MTF lens | Нет |
| Разный NETD → D | Нет (NETD только grain noise) |
| Passport D vs реальная оптика | D — маркетинг-якорь; floor/fade сшивают UI |
| Метрологическая сертификация | Нет |
| 3D рельеф / укрытия | 2D plate + 1 спрайт |
| Сравнение брендов 1:1 lab | Обучающий / sales tool |

---

## 15. Карта формул → функции кода

| Формула | Функция |
|---------|---------|
| px_pass = 2D/d | `pixelsOnTarget` |
| px_eff fog ×0.6 | `effectivePixelsOnTarget` |
| FOV_v | `fovVerticalRadFromOptics` / `resolveFovVerticalRad` |
| frame frac | `targetFrameHeightFrac` / `opticsTargetHeightFrac` |
| D_target | `detectionRangeForTarget` |
| visibility | `targetSubjectVisibility` |
| draw height | `renderTargetHeightFrac` |
| status UI | `computeDetectStatusVisual` |
| crit grain HUD | `renderedCriticalGrainPx` |
| feet | `deerFeetYFrac` / `deerScreenRect` |
| alpha | `atmosphericTransmission` |
| digi crop | `digitalZoomCrop` / `inspectDigiZoom` |
| noise | `netdNoiseAmp` / `netdContrast` |
| sandbox DRI | `johnsonRangeM` / `computeDri` / `pixelsOnTargetOptics` |

---

## 16. Unit-тесты (регрессия для аудита)

Запуск:

```bash
npm test
```

Покрывают (не исчерпывающе):

- Johnson 2/8/13 границы и fog demote  
- FOV human 50 m ∈ 15–25%  
- longer f → larger target  
- **D=1200 detect+grain; 1300 none+frac=0**  
- fox D короче deer  
- RS75 K≈1.66 → ~3900 m  
- digi inspect → ×32 на дальней дистанции  
- ground plane 1/d sync  

---

## 17. Версия документа и контактные якоря

| Поле | Значение |
|------|----------|
| Doc ID | THERMAL_SIMULATOR_HARD_MATH_AUDIT |
| Date | 2026-07-30 |
| Repo | optics-shop-skeleton / internetstore-test |
| Live | optics-shop-skeleton.vercel.app |
| Related | `docs/THERMAL_SIMULATOR_AUDIT.md`, `docs/JOHNSON_STATUS_AUDIT.md`, `docs/SANDBOX_SIMULATOR_REPORT.md` |

---

## 18. Одностраничная «шпаргалка» для аудитора

```
STATUS:
  px_crit = body_grain × (s_crit / h_visual) × (fog ? 0.6 : 1)
  body_grain = f_render × H_grain
  ≥13 identify | ≥8 recognize | ≥2 detect | else none

PASSPORT:
  px_pass = 2·D/d   (at d=D → 2)
  D_target = D_human × s_crit/0.75

SIZE (draw):
  FOV_v = 2·atan((p·Nv/1000)/(2f))   or 11°
  f_FOV = (h_visual/d) / FOV_v
  if d≤D and crit_FOV<2: f = max(f_FOV, floor≈2.5 crit grain)
  if d>D: fade over 8%·D then f=0 (NO PIXELS)

GEOMETRY:
  feet ∝ 1/d toward horizon 0.73; size & feet same law

NOISE:
  NETD → amplitude only; not status

ZOOM:
  digi 1..32 = crop grain only

TARGETS:
  human 0.75/1.8 | deer 1.0/1.3 | boar 0.7/1.0 | fox 0.3/0.4  (crit/visual m)
```

---

*Конец hard-audit. При расхождении UI и этого документа приоритет — исходный код, перечисленный в таблице §0; документ отражает состояние на 2026-07-30.*
