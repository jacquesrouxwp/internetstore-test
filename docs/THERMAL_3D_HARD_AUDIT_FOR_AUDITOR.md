# HARD AUDIT — Thermal 3D Simulator (deer only)

**Дата:** 2026-07-30  
**Режим:** READ-ONLY audit — **не правити код у цій сесії; аудитор виправляє**  
**Версія коду:** `main` (ThermalSimulator3D + thermal-math + deer.glb)  
**Live:** https://optics-shop-skeleton.vercel.app/demo/thermal  
**PDP:** product pages з `ThermalSimulator3DLazy`

**Користувацький вердикт (продукт):**  
> половина екрана без лісу; олень «улітає» на дерева при ближче/далі; якість неприйнятна.

---

## 0. Executive summary для аудитора

| # | Severity | Симптом | Корінь (коротко) |
|---|----------|---------|------------------|
| **P0** | Critical | Олень «літає» на крони / відривається від землі при зміні дистанції | Немає ground-plane anchor як у 2D; камера `lookAt` фіксований; ноги на y=0, але **horizon лісу і camera pitch не зшиті**; `scaleBoost` до ×8 змінює видимий розмір незалежно від Z |
| **P0** | Critical | Половина (або велика частина) кадру без лісу — чорна/порожня зона | Forest = **один billboard** на фіксованому Z; розмір/центр по Y не покривають FOV; ColdGround + clear color `#05060a` заповнюють дірки; crop digi 0.52; можливий mismatch aspect grain vs logic |
| **P1** | High | Ліс виглядає «плоским постером», не сценою | 2D plate на plane, без перспективи ґрунту/горизонту з 2D-моделі (`HORIZON_FRAC` / `FEET_FRAC`) |
| **P1** | High | На D / далеко олень то роздутий, то точка, не як 2D | `scaleBoost = min(8, 2.5/critGrain)` ламає фізичну перспективу |
| **P2** | Med | Повільно / шумно / «мигає» | Кожен кадр: full scene → RT → `readRenderTargetPixels` → CPU flip → 2D LUT/noise loop 480×360 |
| **P2** | Med | Подвійний render path | WebGL canvas `opacity:0` + окремий display canvas; r3f default render + manual `gl.render` |
| **P3** | Low | Тільки олень | By design (інші цілі приховані) |

**Висновок:** 3D — **не production-ready**. Це prototype hybrid (R3F mesh + 2D post), **не** port 2D ground/FOV math. Аудитор має **перепроєктувати placement + forest fill**, а не «підкрутити tint».

---

## 1. Що ЗРОБЛЕНО (as-built inventory)

### 1.1 Файли

| Path | Role |
|------|------|
| `src/components/product/ThermalSimulator3D.tsx` | Main 3D sim UI + scene + post |
| `src/components/product/ThermalSimulator3DLazy.tsx` | `dynamic(..., { ssr: false })` |
| `src/lib/thermal/thermal-math.ts` | Re-exports 2D math + deer constants |
| `public/thermal/models/deer.glb` | Draco mesh, textures stripped (~**47 KB**) |
| `public/thermal/forest_whitehot.jpg` | Backdrop texture (~350 KB) |
| `scripts/strip-deer-textures.mjs` | Offline strip textures from source GLB |
| PDP: `src/app/[locale]/product/[slug]/page.tsx` | Uses `ThermalSimulator3DLazy` |
| Demo: `src/app/demo/thermal/page.tsx` | Uses 3D sim |

**Залежності:** `three@0.170`, `@react-three/fiber@8.17`, `@react-three/drei@9.121` (React 18).

### 1.2 Pipeline (фактичний)

```
[UI state: distance, fog, palette, digiZoom, matrix]
        │
        ▼
 R3F Canvas (hidden, opacity:0, fixed 480×360 style)
   ├─ PerspectiveCamera: fov = FOV_vert(f,pitch,matrix) deg
   │    position (0, 1.55, 0)
   │    lookAt (0, 1.55*0.55, -100)   ← FIXED target, not deer feet
   ├─ ColdGround: horizontal plane y=0, z=-200, 800×800, color #05060a
   ├─ ForestBackdrop: vertical plane at z = -(maxRange*1.2+40)
   │    size from tan(fov/2)*|z|*1.45, texture forest_whitehot
   ├─ DeerModel: group at (0,0,-distanceM), scale = scaleBoost
   │    mesh scaled so bbox height = 1.3 m, feet local y=0
   └─ PostCapture useFrame:
        render scene → WebGLRenderTarget (grainW×grainH)
        readPixels → flip Y → digi crop (focus 0.5, 0.52)
        upscale to 480×360 → CPU LUT + NETD noise → vignette
        copy to visible <canvas>
        gl.clear() on default framebuffer
```

### 1.3 Що працює (частково)

- Завантаження Draco GLB + strip textures (вага OK).  
- Emissive heat shader (ноги/тулуб) — концепт.  
- Passport D → `deerDetectionRangeM` (×1.0/0.75).  
- Status badge: `computeDetectStatusVisual` (2D math).  
- Digi steps 1…32 (crop on grain).  
- Fog/palette UI (на геометрію Z не впливають — **але** scaleBoost/distance впливають на «літ»).  
- Тільки олень в UI (інші цілі hidden by design).

### 1.4 2D math, яку 3D **НЕ** використовує для placement

У 2D (`zoom.ts`) для «ноги на землі / не на кронах»:

```
HORIZON_FRAC = 0.73
FEET_FRAC_AT_MIN = 0.91
feetY(d) = HORIZON + (FEET_50 - HORIZON) * (50/d)
```

**3D цього не застосовує.** Олень завжди `position.y = 0` (світові), камера завжди дивиться в точку `(0, ~0.85, -100)`. При зміні `d` змінюється лише `z` оленя → **проекція ніг на кадр рухається по вертикалі** і «лізе» в зону крон на forest plate.

---

## 2. BUG P0 — Олень «улітає» на дерева (ближче/далі)

### 2.1 Симптом (продукт)

При русі слайдера дистанції олень **не стоїть у фіксованій «галявині»** відносно лісу:  
візуально **піднімається / сідає на крони / відривається** — «летить».

### 2.2 Root cause (геометрія камери + сцена)

**A. Camera look target фіксований**

```ts
// CameraRig
cam.position.set(0, CAMERA_EYE_HEIGHT_M /*1.55*/, 0);
cam.lookAt(0, CAMERA_EYE_HEIGHT_M * 0.55 /*≈0.85*/, -100);
```

- Pitch камери **не** залежить від `distanceM`.  
- При `d=50` олень на z=-50, висота 1.3 m (ноги 0…1.3), камера дивиться «крізь» нього в -100.  
- При `d=800` олень на z=-800; **кут між camera→feet і camera→lookAt** інший → ноги зміщуються по **screen Y**.  
- Forest plate — **плоский poster** з намальованим горизонтом на **фіксованій** texture UV, **не** прив’язаний до world ground line.

**B. Немає screen-space ground anchor**

2D: `feetY` ∝ 1/d → до горизонту.  
3D: world feet `y=0` завжди, без компенсації pitch/horizon.

**C. `scaleBoost` до ×8**

```ts
if (passPx >= 2 && critGrain < 2) {
  scaleBoost = Math.min(8, 2.5 / critGrain);
}
group.scale.setScalar(scaleBoost);
```

- На великих `d` олень **штучно роздувається** (до 8×), щоб «2.5 grain px».  
- Це **ламає** фізичну перспективу (розмір ≠ 1/d).  
- Візуально: «точка роздулась у комаху на кронах» / стрибки розміру при зміні d.

**D. Nested scale**

`root.scale = s` (normalize to 1.3 m) **і** `group.scale = scaleBoost`.  
Працює математично, але boost застосовується **після** normalize — OK, але boost сам по собі шкідливий для UX.

**E. Rotation `y = π/2`**

Side profile — OK для силуету, але bbox center XZ offset рахується **до** rotation; можливий residual offset (менший bug).

### 2.3 Expected (для аудитора)

| d | Очікування |
|---|------------|
| 50 m | Олень **на ґрунті** (нижня ~15–25%? або як 2D feet band), **не** на кронах |
| 200–500 m | Менший, **ноги** все ще на litter band plate |
| D | Hot spot / tiny, **не** «олень на гілках» |
| Δd | Ноги **плавно** до горизонту, **без** vertical jump |

### 2.4 Fix directions (не імплементувати тут — для аудитора)

1. **Screen-space plant (рекомендовано, як 2D):**  
   - Рахувати `feetNdcY` / world ray на ground plane, або  
   - Ставити deer group.y так, щоб projected feet = `deerFeetYFrac(d)` на viewport.  
2. **Або** camera lookAt deer body center + forest as **skybox / cylindrical panorama** with horizon locked to same NDC y as 2D `HORIZON_FRAC`.  
3. **Прибрати scaleBoost** або замінити bloom/min pixel у **post** (2D already had detect floor on **draw frac**, not world scale).  
4. Ground contact: align forest plate **horizon line** in texture to world `y` / NDC.

---

## 3. BUG P0 — Половина екрана без лісу

### 3.1 Симптом

Велика зона кадру (часто низ або боки, або «половина») — **не ліс**, а чорний/порожній cold void.

### 3.2 Root causes

**A. Forest = один finite plane**

```ts
z = -(max(120, maxRangeM) * 1.2 + 40)
halfH = tan(fov/2) * |z| * 1.45
halfW = halfH * (4/3) * 1.45
position.y = CAMERA_EYE_HEIGHT_M * 0.25  // ≈ 0.39 m
```

- Площина **обмежена**; будь-який промінь поза її rectangle → **clear color** `#05060a` або ColdGround.  
- Центр площини по **Y ≈ 0.39 m**, камера на **1.55 m** lookAt **0.85 m** → **нижня / верхня** частина FOV легко **мимо** plane → «половина без лісу».  
- Margin 1.45 **недостатній** при digi-zoom crop off-center (focusY=**0.52**) + pitch.

**B. ColdGround заповнює низ чорним**

Horizontal plane 800×800 at y=0, color pure near-black — у кадрі виглядає як «дірка», не litter.

**C. Aspect / grain crop**

- Render RT: `matrixPixelWidth × matrixPixelHeight` (e.g. 144×108).  
- Digi crop focus `(0.5, 0.52)` — **не** центр оленя.  
- Upscale до 480×360 — якщо plane не fill RT, чорні краї **збільшуються**.

**D. Double-sided plane still not infinite**

`side: DoubleSide` ≠ full-screen coverage.

**E. Історично** color ×0.12 (вже підняли tint) — якщо лишаються темні зони, LUT робить їх «порожнечею».

### 3.3 Expected

- **100%** FOV (після digi crop) заповнений cold forest plate (або seamless world).  
- Немає чорних «квадрантів».  
- Горизонт текстури ≈ 2D `HORIZON_FRAC≈0.73` у NDC.

### 3.4 Fix directions

1. **Full-screen background pass** (не plane в world):  
   - Draw forest as **screen-space quad** / skybox **before** 3D deer, UV from NDC.  
2. Або **huge** plane: size `tan(fov/2)*depth * 3+` і **y-center** = camera look height, не 0.39.  
3. **Billboard** `lookAt(camera)` кожен кадр.  
4. Прибрати / перефарбувати ColdGround (litter texture band, не #05060a).  
5. Align crop focus to **deer projected center**, not hardcoded 0.52.

---

## 4. BUG P1 — scaleBoost vs фізика / 2D parity

| d (approx, 384/f25) | Pure FOV body grain | After scaleBoost |
|---------------------|---------------------|------------------|
| 50 m | ~20 px | 1× (OK) |
| 500 m | ~2 px | may boost |
| D | &lt;1 px | **boost up to ×8** → fake size |

2D detect floor змінював **heightFrac на canvas**, не world scale.  
3D boost **ламає** «на 50 m малий, на D точка» story.

**Аудитор:** status з `computeDetectStatusVisual` (2D grain floor) **не** відповідає реальному 3D raster без boost; з boost — status/picture роз’їзд інший.

---

## 5. BUG P2 — Performance / architecture

| Issue | Detail |
|-------|--------|
| `readRenderTargetPixels` every frame | GPU→CPU sync; mobile FPS killer |
| CPU loop 480×360 | noise+LUT JS |
| Hidden WebGL + visible 2D | 2 pipelines |
| r3f still runs + manual render | waste |
| Draco CDN | first load dependency |

**Target was 60 fps mobile** — **не досягнуто** цією архітектурою без GPU post shader.

---

## 6. Інваріанти (spec) vs actual

| Інваріант (продукт) | Actual 3D |
|---------------------|-----------|
| Ноги на землі, не на гілках | **FAIL** (float/climb on canopy band) |
| d change → scale with scene, no fly | **FAIL** |
| 50 m ≈ small figure not full frame | **Partial** (FOV OK if no boost) |
| At D ~2 px detect | **Forced** via scaleBoost (hack) |
| Fog/palette don’t move target | **Partial** (Z ok; scaleBoost/fog hide only) |
| Forest full frame cold | **FAIL** (half empty) |
| Only deer | **PASS** (by design) |

---

## 7. Конфіг / константи (as-built)

```
LOGIC_W/H     = 480×360
CAMERA_EYE    = 1.55 m
DEER_H        = 1.3 m visual, 1.0 m critical
DEER_GLB      = /thermal/models/deer.glb (~47 KB)
FOREST        = /thermal/forest_whitehot.jpg
Grain         = matrixPixelWidth/Height (96×72 / 144×108 / 240×180)
Digi focus    = (0.5, 0.52)
scaleBoost    = min(8, 2.5/critGrain) when passPx≥2 && critGrain<2
Forest z      = -(max(120,maxRangeM)*1.2 + 40)
Forest y      = 0.25 * 1.55 ≈ 0.39 m
```

---

## 8. Recommended repair plan (for auditor — priority order)

### Phase A — Geometry lock (must)

1. **Ground plant:** project deer feet to screen Y = `deerFeetYFrac(d)` (port from `zoom.ts`) **або** raycast ground plane shared with forest horizon.  
2. **Camera:** either lock horizon (fixed pitch + forest NDC horizon) **або** lookAt deer mid-body but **recompute** forest so horizon stays fixed in frame (2D-like).  
3. **Remove world scaleBoost**; if need min detect blob — post-process dilate / 2D-style frac only for status HUD, not mesh scale.

### Phase B — Forest fill (must)

4. Replace world plane with **screen-filled** cold forest (fullscreen quad / sky cylinder).  
5. Map texture so tree bases ≈ `HORIZON_FRAC`.  
6. Kill black void (clear color = sample forest edge or match litter).

### Phase C — Pipeline (should)

7. GPU fragment post (LUT+noise+pixelate) — no readPixels.  
8. One visible canvas.  
9. Parity tests: screenshot 50 / 200 / 500 / D vs 2D reference.

### Phase D — Product

10. Keep deer-only until A+B green.  
11. Then multi-target.

---

## 9. Acceptance tests (auditor sign-off)

1. **Forest coverage:** no solid black half-frame at digi×1, d=50…D, whitehot/iron.  
2. **Feet lock:** at d=50, 200, 500, D — feet stay in soil band of forest art (not canopy).  
3. **No fly:** animate slider 50→D→50 continuous; no vertical pop onto trees.  
4. **Size:** 50 m deer ≈ 15–30% frame height (optics); D = tiny spot without ×8 mesh inflate.  
5. **Fog:** same pose/size; only noise/status.  
6. **FPS:** ≥30 mid-range mobile; goal 60 with GPU post.

---

## 10. Out of scope / known intentional

- Boar / fox / human 3D — hidden, later.  
- Full NVTherm — not claimed.  
- Sandbox `/simulator` — still **2D** multi-target, not this 3D path.

---

## 11. Contact points in code (line-level anchors)

| Problem | Where |
|---------|--------|
| Camera fixed lookAt | `ThermalSimulator3D.tsx` → `CameraRig` |
| Deer Z only | `DeerModel` `position.z = -distanceM` |
| scaleBoost | `SceneContent` + `DeerModel` scale |
| Forest finite plane / y | `ForestBackdrop` |
| Black ground | `ColdGround` |
| Digi focus 0.52 | `PostCapture` `digitalZoomCrop(..., 0.5, 0.52)` |
| CPU post | `PostCapture` `useFrame` |
| 2D ground math (reference) | `src/lib/thermal/zoom.ts` `deerFeetYFrac`, `HORIZON_FRAC` |
| 2D forest draw (reference) | `ThermalSimulator.tsx` `drawForestCover` |

---

## 12. One-liner for auditor

**3D deer is a prototype that places a hot GLB on −Z with a small forest billboard and CPU post; it does not implement the 2D ground-plane / horizon lock, so the deer climbs the canopy when distance changes and the forest does not fill the frame — rebuild placement + background before any polish.**

---

*Document only. No code changes from this audit request.*  
*File: `docs/THERMAL_3D_HARD_AUDIT_FOR_AUDITOR.md`*
