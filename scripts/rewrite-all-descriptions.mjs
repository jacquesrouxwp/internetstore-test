/**
 * Rewrite all published product descriptions (UA + RU) from specs facts.
 * No invented features. Prefer specs table over prose when they conflict.
 *
 *   npx tsx scripts/rewrite-all-descriptions.mjs           # dry-run sample
 *   npx tsx scripts/rewrite-all-descriptions.mjs --apply   # write Supabase
 *   npx tsx scripts/rewrite-all-descriptions.mjs --apply --limit=50
 */
import { createClient } from "@supabase/supabase-js";
import {
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
} from "fs";
import { resolve } from "path";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = resolve(f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      )
        v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}
loadEnv();

const APPLY = process.argv.includes("--apply");
const LIMIT = (() => {
  const a = process.argv.find((x) => x.startsWith("--limit="));
  return a ? Number(a.split("=")[1]) : 0;
})();
const ONLY = (() => {
  const a = process.argv.find((x) => x.startsWith("--slug="));
  return a ? a.split("=")[1] : "";
})();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function hash32(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(seed, arr) {
  return arr[seed % arr.length];
}

function specGet(specs, ...keys) {
  if (!specs) return "";
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(specs, k)) {
      const v = specs[k];
      if (v != null && String(v).trim() && String(v).trim() !== "-") {
        return String(v).trim();
      }
    }
  }
  return "";
}

function truthy(v) {
  const s = String(v || "")
    .trim()
    .toLowerCase();
  return s === "true" || s === "так" || s === "да" || s === "yes" || s === "1";
}

function falsy(v) {
  const s = String(v || "")
    .trim()
    .toLowerCase();
  return s === "false" || s === "ні" || s === "нет" || s === "no" || s === "0";
}

function cleanModelName(name) {
  let s = String(name || "").trim();
  // peel common type prefixes (possibly stacked)
  for (let i = 0; i < 4; i++) {
    const next = s
      .replace(
        /^(Тепловізійний|Тепловизионный|Тепловізор|Тепловизор|Цифровий|Цифровой|Приціл|Прицел|Монокуляр|Бінокль|Бинокль|Насадка|Окуляри|Очки|Мультиспектральний|Мультиспектральный|Прилад нічного бачення|Прибор ночного видения|приціл|прицел|бінокль|бинокль)\s+/i,
        ""
      )
      .trim();
    if (next === s) break;
    s = next;
  }
  return s.replace(/\s{2,}/g, " ").trim();
}

function deviceKind(p) {
  const blob = `${p.device_type || ""} ${p.name_uk || ""} ${p.slug || ""}`.toLowerCase();
  if (/clipon|насадк|clip-on|tc\d/.test(blob)) return "clipon";
  if (/binocular|бінокл|бинокл|merger|habrok|raptor|observir|voyage/.test(blob))
    return "binocular";
  if (
    /night|пнб|пнв|nv0|night vision|нічного бачення|ночного видения|edge gs|pvs-/.test(
      blob
    )
  )
    return "nv";
  if (/scope|приціл|прицел|rattler|adder|thermion|pantera|ocelot|vidar|stellar/.test(blob))
    return "scope";
  if (/mono|монокуляр|lynx|axion|asp|helion|telos|cyclops/.test(blob))
    return "mono";
  if (p.device_type === "scope") return "scope";
  if (p.device_type === "binocular") return "binocular";
  if (p.device_type === "clipon") return "clipon";
  if (p.device_type === "mono") return "mono";
  return "device";
}

function deviceLabel(kind, lang) {
  const map = {
    scope: { uk: "тепловізійний приціл", ru: "тепловизионный прицел" },
    mono: { uk: "тепловізійний монокуляр", ru: "тепловизионный монокуляр" },
    binocular: {
      uk: "тепловізійний бінокль",
      ru: "тепловизионный бинокль",
    },
    clipon: {
      uk: "тепловізійна насадка",
      ru: "тепловизионная насадка",
    },
    nv: {
      uk: "прилад нічного бачення",
      ru: "прибор ночного видения",
    },
    device: { uk: "оптичний прилад", ru: "оптический прибор" },
  };
  return (map[kind] || map.device)[lang];
}

function extractFacts(p) {
  const s = p.specs || {};
  const kind = deviceKind(p);
  const model = cleanModelName(p.name_uk || p.name_ru || p.slug);
  const brand = p.brand || "";

  const resolution =
    p.resolution ||
    specGet(s, "Матриця", "Матрица", "Роздільна здатність матриці", "resolution") ||
    "";
  const netd = specGet(s, "netdMk", "NETD", "Різниця температур матриці (NETD)");
  const freq = specGet(s, "frequencyHz", "Частота матриці, Гц", "Частота", "Частота, Гц");
  const focal = specGet(s, "focalLengthMm", "Об єктив, мм", "Об'єктив, мм", "Объектив, мм", "Об'єктив");
  const detection =
    (p.detection_range_m != null && String(p.detection_range_m)) ||
    specGet(s, "Дальність виявлення, м", "Дальність виявлення людини, м", "Максимальна дальність виявлення, м");
  const weight = specGet(s, "weightG", "Вага, грам", "Вага, гр", "Вага");
  const ip = specGet(s, "ip", "Рівень захисту", "IP рейтинг", "Захист");
  let mag = specGet(s, "Збільшення, х", "Збільшення", "Увеличение");
  // Drop donor junk like "2.5 − 20 (x8 цифрове збільшення)"
  if (mag && (/цифр|digital|\(/.test(mag) || mag.length > 20)) {
    mag = "";
  }
  const magMin = specGet(s, "magnificationMin");
  const magMax = specGet(s, "magnificationMax");
  const batteryLife = specGet(s, "batteryLifeH", "Автономна робота, г", "Автономная работа, ч");
  const display = specGet(s, "display", "Тип дисплею", "Тип дисплея", "Дисплей");
  const displayRes = specGet(s, "displayResolution", "Роздільна здатність дисплею, піксель");
  const pitch = specGet(s, "pixelPitchUm", "Крок пікселю, мкм");
  const fov = specGet(s, "Кут поля зору, град", "Поле зору, град, м на 100 м", "Поле зору");
  const lrfRange = specGet(s, "Дальність дії далекоміра, м");
  const dims = specGet(s, "dimensionsMm", "Габаритні розміри, мм");
  const temp = specGet(s, "operatingTempRange", "Температура експлуатації, °С", "Температурний режим, °C");
  const shock = specGet(s, "Ударна стійкість, Дж");
  const eyeRelief = specGet(s, "Дистанція до окуляра, мм");
  const fnum = specGet(s, "Світлосила, F/");

  const hasWifi =
    truthy(s.hasWifi) ||
    truthy(specGet(s, "Підтримка Wi-Fi", "WiFi", "Wi-Fi")) ||
    /так/i.test(specGet(s, "Запис фото-відео/Wi-Fi"));
  const hasBt = truthy(s.hasBluetooth) || truthy(specGet(s, "Підтримка Bluetooth"));
  // Laser LRF only — ignore "ШІ Далекомір" / software estimators
  const laserLrfRaw = specGet(
    s,
    "Лазерний далекомір",
    "Вбудований лазерний далекомір"
  );
  const hasLrf = !!lrfRange || truthy(laserLrfRaw);
  const hasRec =
    /так/i.test(specGet(s, "Запис фото-відео/Wi-Fi", "Підтримка відео і фото запису")) ||
    truthy(specGet(s, "Наявність мікрофону"));

  const magnification =
    mag ||
    (magMin && magMax ? `${magMin}-${magMax}` : magMin || magMax || "");

  return {
    kind,
    model,
    brand,
    resolution,
    netd: netd ? (netd.match(/[≤<]/) ? netd : `≤${netd}`) : "",
    netdRaw: netd,
    freq,
    focal,
    detection,
    weight,
    ip,
    magnification,
    batteryLife,
    display,
    displayRes,
    pitch,
    fov,
    lrfRange,
    dims,
    temp,
    shock,
    eyeRelief,
    fnum,
    hasWifi,
    hasBt,
    hasLrf,
    hasRec,
  };
}

function bulletsFor(f, lang, seed) {
  const items = [];
  const L = lang === "ru";

  if (f.resolution) {
    items.push(
      L
        ? `Матрица ${f.resolution}${f.pitch ? ` с шагом пикселя ${f.pitch} мкм` : ""}`
        : `Матриця ${f.resolution}${f.pitch ? ` з кроком пікселя ${f.pitch} мкм` : ""}`
    );
  }
  if (f.netdRaw) {
    const n = f.netdRaw.replace(/[≤<\s]/g, "");
    items.push(L ? `Чувствительность NETD ≤${n} мК` : `Чутливість NETD ≤${n} мК`);
  }
  if (f.focal) {
    items.push(
      L
        ? `Объектив ${f.focal} мм${f.fnum ? `, светосила F/${f.fnum}` : ""}`
        : `Об'єктив ${f.focal} мм${f.fnum ? `, світлосила F/${f.fnum}` : ""}`
    );
  }
  if (f.freq) {
    items.push(L ? `Частота обновления ${f.freq} Гц` : `Частота оновлення ${f.freq} Гц`);
  }
  if (f.detection) {
    items.push(
      L
        ? `Дальность обнаружения человека до ${f.detection} м`
        : `Дальність виявлення людини до ${f.detection} м`
    );
  }
  if (f.magnification) {
    items.push(L ? `Увеличение ${f.magnification}×` : `Збільшення ${f.magnification}×`);
  }
  if (f.display) {
    items.push(
      L
        ? `Дисплей ${f.display}${f.displayRes ? ` (${f.displayRes})` : ""}`
        : `Дисплей ${f.display}${f.displayRes ? ` (${f.displayRes})` : ""}`
    );
  }
  if (f.hasLrf) {
    items.push(
      f.lrfRange
        ? L
          ? `Лазерный дальномер с дальностью до ${f.lrfRange} м`
          : `Лазерний далекомір із дальністю до ${f.lrfRange} м`
        : L
          ? `Встроенный лазерный дальномер`
          : `Вбудований лазерний далекомір`
    );
  }
  if (f.hasWifi || f.hasRec) {
    const parts = [];
    if (f.hasWifi) parts.push("Wi-Fi");
    if (f.hasRec)
      parts.push(L ? "запись фото и видео" : "запис фото та відео");
    if (f.hasBt) parts.push("Bluetooth");
    items.push(parts.join(", "));
  }
  if (f.batteryLife) {
    items.push(
      L
        ? `Автономная работа до ${f.batteryLife} ч`
        : `Автономна робота до ${f.batteryLife} год`
    );
  }
  if (f.ip) {
    items.push(L ? `Защита ${f.ip}` : `Захист ${f.ip}`);
  }
  if (f.weight) {
    items.push(L ? `Масса ${f.weight} г` : `Маса ${f.weight} г`);
  }
  if (f.shock) {
    items.push(
      L
        ? `Ударостойкость до ${f.shock} Дж`
        : `Ударна стійкість до ${f.shock} Дж`
    );
  }
  if (f.temp) {
    items.push(
      L
        ? `Рабочая температура ${f.temp} °C`
        : `Робоча температура ${f.temp} °C`
    );
  }

  // 4–7 bullets
  const unique = [...new Set(items.filter(Boolean))];
  if (unique.length <= 7) return unique.slice(0, Math.max(unique.length, Math.min(4, unique.length)));
  // prefer first important + rotate extras
  const core = unique.slice(0, 4);
  const rest = unique.slice(4);
  while (core.length < 7 && rest.length) {
    core.push(rest[(seed + core.length) % rest.length]);
    rest.splice((seed + core.length) % Math.max(rest.length, 1), 1);
  }
  return [...new Set(core)].slice(0, 7);
}

function intro(f, lang, seed) {
  const label = deviceLabel(f.kind, lang);
  const m = f.model;
  if (lang === "ru") {
    return pick(seed, [
      `${m} — ${label}, рассчитанный на работу в темноте и при плохой видимости. Прибор помогает уверенно находить теплоконтрастные цели и держать контроль над обстановкой на дистанции. Ниже — только параметры из спецификации этой модели.`,
      `В линейке ${f.brand || "производителя"} модель ${m} выступает как ${label} для охоты, наблюдения и полевых задач. Конструкция ориентирована на стабильную картинку и понятное управление; все цифры ниже взяты из таблицы характеристик.`,
      `${m} — ${label} для ночной и сумеречной работы. Аппарат закрывает практические сценарии, где глазу уже не хватает света, а решение нужно принимать быстро, опираясь на заявленные технические данные.`,
    ]);
  }
  return pick(seed, [
    `${m} — ${label}, розрахований на роботу в темряві та за поганої видимості. Прилад допомагає впевнено знаходити теплоконтрастні цілі й тримати контроль над обстановкою на дистанції. Нижче — лише параметри зі специфікації цієї моделі.`,
    `У лінійці ${f.brand || "виробника"} модель ${m} виступає як ${label} для полювання, спостереження та польових задач. Конструкція орієнтована на стабільну картинку й зрозуміле керування; усі цифри нижче взяті з таблиці характеристик.`,
    `${m} — ${label} для нічної та сутінкової роботи. Апарат закриває практичні сценарії, де оку вже бракує світла, а рішення потрібно приймати швидко, спираючись на заявлені технічні дані.`,
  ]);
}

function heading(lang, seed) {
  if (lang === "ru") {
    return pick(seed, [
      "Ключевые особенности:",
      "Что важно по факту:",
      "Основные параметры:",
      "На что опираться в работе:",
    ]);
  }
  return pick(seed, [
    "Ключові особливості:",
    "Що важливо по суті:",
    "Основні параметри:",
    "На що спиратися в роботі:",
  ]);
}

function usage(f, lang, seed) {
  const kind = f.kind;
  if (lang === "ru") {
    const byKind = {
      scope: [
        `На охоте и на стрельбище ${f.model} удобнее всего раскрывается как прицел для ночной работы: тепловая картина помогает быстрее находить цель, а заявленные оптические параметры поддерживают контроль дистанции.`,
        `В полевых условиях прибор ставят на оружие и используют там, где важны тепловой контраст и повторяемость прицеливания — от вечернего выхода до работы в сложных погодных условиях в пределах заявленной защиты.`,
      ],
      mono: [
        `Как монокуляр ${f.model} удобен для скрытного наблюдения и быстрой оценки местности: его берут на маршрут, на засидку или для разведки обстановки без лишнего оборудования.`,
        `Лучше всего аппарат работает в сценариях «увидел — оценил — принял решение»: поиск животных, контроль подходов и наблюдение в темноте с опорой на тепловую картинку.`,
      ],
      binocular: [
        `Формат бинокля делает ${f.model} удобным для длительного наблюдения двумя глазами — на засидке, при охране территории или когда нужно спокойно вести обзор на большой площади.`,
        `Прибор раскрывается в задачах, где важны комфорт наблюдения и дальность: контроль поля, поиск тепловых сигнатур и работа парой без быстрой усталости глаз.`,
      ],
      clipon: [
        `Насадка рассчитана на работу в связке с дневной оптикой: ${f.model} ставят перед прицелом, когда нужно быстро перейти к тепловому режиму, не меняя привычную схему прицеливания.`,
        `Типовой сценарий — охота или тактическая задача, где дневной прицел уже пристрелян, а тепловой канал нужен только для ночного участка работы.`,
      ],
      nv: [
        `${f.model} используют как прибор ночного видения там, где есть остаточный свет или ИК-подсветка по возможностям конкретной комплектации. Это инструмент для движения, наблюдения и работы в темноте без теплового канала.`,
        `Прибор уместен в ночных выходах, охране и задачах, где нужна усиленная картина в темноте при опоре на заявленные оптические характеристики.`,
      ],
      device: [
        `${f.model} применяют в полевых условиях, где нужна уверенная работа оптики в темноте или при ограниченной видимости — в рамках характеристик, указанных для этой модели.`,
        `Практическая ниша прибора — наблюдение и рабочие задачи на местности, когда важны заявленные параметры сенсора, оптики и автономности.`,
      ],
    };
    return pick(seed + 3, byKind[kind] || byKind.device);
  }
  const byKind = {
    scope: [
      `На полюванні та на стрільбищі ${f.model} найкраще розкривається як приціл для нічної роботи: теплова картина допомагає швидше знаходити ціль, а заявлені оптичні параметри підтримують контроль дистанції.`,
      `У польових умовах прилад ставлять на зброю й використовують там, де важливі тепловий контраст і повторюваність прицілювання — від вечірнього виходу до роботи в складних погодних умовах у межах заявленого захисту.`,
    ],
    mono: [
      `Як монокуляр ${f.model} зручний для прихованого спостереження та швидкої оцінки місцевості: його беруть на маршрут, на засідку або для розвідки обстановки без зайвого спорядження.`,
      `Найкраще апарат працює в сценаріях «побачив — оцінив — прийняв рішення»: пошук тварин, контроль підходів і спостереження в темряві з опорою на теплову картинку.`,
    ],
    binocular: [
      `Формат бінокля робить ${f.model} зручним для тривалого спостереження двома очима — на засідці, під час охорони території або коли потрібно спокійно вести огляд на великій площі.`,
      `Прилад розкривається в задачах, де важливі комфорт спостереження й дальність: контроль поля, пошук теплових сигнатур і робота парою без швидкої втоми очей.`,
    ],
    clipon: [
      `Насадка розрахована на роботу в зв’язці з денною оптикою: ${f.model} ставлять перед прицілом, коли потрібно швидко перейти до теплового режиму, не змінюючи звичну схему прицілювання.`,
      `Типовий сценарій — полювання або тактична задача, де денний приціл уже пристріляний, а тепловий канал потрібен лише для нічної ділянки роботи.`,
    ],
    nv: [
      `${f.model} використовують як прилад нічного бачення там, де є залишкове світло або ІЧ-підсвітка за можливостями конкретної комплектації. Це інструмент для руху, спостереження й роботи в темряві без теплового каналу.`,
      `Прилад доречний у нічних виходах, охороні та задачах, де потрібна підсилена картина в темряві з опорою на заявлені оптичні характеристики.`,
    ],
    device: [
      `${f.model} застосовують у польових умовах, де потрібна впевнена робота оптики в темряві або за обмеженої видимості — у межах характеристик, зазначених для цієї моделі.`,
      `Практична ніша приладу — спостереження та робочі задачі на місцевості, коли важливі заявлені параметри сенсора, оптики й автономності.`,
    ],
  };
  return pick(seed + 3, byKind[kind] || byKind.device);
}

function outro(f, lang, seed) {
  if (lang === "ru") {
    return pick(seed + 5, [
      `В итоге ${f.model} стоит рассматривать как рабочий инструмент с понятным набором характеристик, без лишних обещаний сверх спецификации. Перед выбором сверьте цифры в таблице на этой странице — она остаётся главным источником фактов.`,
      `Если задачи совпадают с назначением прибора, заявленные параметры дают достаточно опоры, чтобы оценить модель по делу, а не по рекламным формулировкам. Дополнительные детали и точные значения смотрите в блоке характеристик.`,
    ]);
  }
  return pick(seed + 5, [
    `У підсумку ${f.model} варто розглядати як робочий інструмент із зрозумілим набором характеристик, без зайвих обіцянок понад специфікацію. Перед вибором звірте цифри в таблиці на цій сторінці — вона лишається головним джерелом фактів.`,
    `Якщо задачі збігаються з призначенням приладу, заявлені параметри дають достатньо опори, щоб оцінити модель по суті, а не за рекламними формулюваннями. Додаткові деталі й точні значення дивіться в блоці характеристик.`,
  ]);
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function buildDescription(f, lang, seed) {
  const bullets = bulletsFor(f, lang, seed);
  // Ensure 4–7: if too few, add soft factual leftovers
  while (bullets.length < 4) {
    if (f.fov && !bullets.some((b) => /поля|поле/i.test(b))) {
      bullets.push(
        lang === "ru" ? `Поле зрения ${f.fov}` : `Поле зору ${f.fov}`
      );
      continue;
    }
    if (f.eyeRelief && !bullets.some((b) => /окуляр|eye/i.test(b))) {
      bullets.push(
        lang === "ru"
          ? `Удаление выходного зрачка ${f.eyeRelief} мм`
          : `Віддалення вихідної зіниці ${f.eyeRelief} мм`
      );
      continue;
    }
    if (f.dims && !bullets.some((b) => /габарит|размер|розмір/i.test(b))) {
      bullets.push(
        lang === "ru"
          ? `Габариты ${f.dims} мм`
          : `Габарити ${f.dims} мм`
      );
      continue;
    }
    break;
  }

  const parts = [
    intro(f, lang, seed),
    "",
    heading(lang, seed + 1),
    ...bullets.slice(0, 7).map((b) => `• ${b}`),
    "",
    usage(f, lang, seed),
    "",
    outro(f, lang, seed),
  ];

  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function rewriteProduct(p) {
  const f = extractFacts(p);
  const seed = hash32(p.slug || p.id || f.model);
  // If almost no facts, keep a minimal honest stub from name only
  const factCount = [
    f.resolution,
    f.netdRaw,
    f.focal,
    f.detection,
    f.freq,
    f.magnification,
    f.ip,
    f.weight,
  ].filter(Boolean).length;

  if (factCount < 2) {
    const labelUk = deviceLabel(f.kind, "uk");
    const labelRu = deviceLabel(f.kind, "ru");
    const uk = `${f.model} — ${labelUk} для польової роботи в умовах обмеженої видимості.\n\nКлючові особливості:\n• Модель ${f.model}\n• Призначення: ${labelUk}\n• Орієнтуйтеся на таблицю характеристик на цій сторінці\n• Параметри можуть відрізнятися залежно від комплектації\n\nПрилад розглядають для практичних задач спостереження чи роботи на місцевості в межах заявленої специфікації.\n\nДетальні цифри наведені в блоці характеристик нижче.`;
    const ru = `${f.model} — ${labelRu} для полевой работы в условиях ограниченной видимости.\n\nКлючевые особенности:\n• Модель ${f.model}\n• Назначение: ${labelRu}\n• Ориентируйтесь на таблицу характеристик на этой странице\n• Параметры могут отличаться в зависимости от комплектации\n\nПрибор рассматривают для практических задач наблюдения или работы на местности в пределах заявленной спецификации.\n\nПодробные цифры приведены в блоке характеристик ниже.`;
    return { uk, ru, factCount, model: f.model };
  }

  return {
    uk: buildDescription(f, "uk", seed),
    ru: buildDescription(f, "ru", seed + 11),
    factCount,
    model: f.model,
  };
}

async function fetchAll() {
  const all = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from("products")
      .select(
        "id, slug, name_uk, name_ru, description_uk, description_ru, specs, resolution, detection_range_m, device_type, published, brands(name, slug)"
      )
      .eq("published", true)
      .range(from, from + 999);
    if (error) throw error;
    all.push(
      ...(data || []).map((p) => ({
        ...p,
        brand: p.brands?.name || p.brands?.slug || "",
      }))
    );
    if (!data?.length || data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  let products = await fetchAll();
  if (ONLY) products = products.filter((p) => p.slug === ONLY);
  if (LIMIT > 0) products = products.slice(0, LIMIT);

  console.log(`Products: ${products.length}  apply=${APPLY}`);

  const out = [];
  const backup = [];

  for (const p of products) {
    const rewritten = rewriteProduct(p);
    backup.push({
      id: p.id,
      slug: p.slug,
      description_uk: p.description_uk,
      description_ru: p.description_ru,
    });
    out.push({
      id: p.id,
      slug: p.slug,
      model: rewritten.model,
      factCount: rewritten.factCount,
      words_uk: countWords(rewritten.uk),
      words_ru: countWords(rewritten.ru),
      description_uk: rewritten.uk,
      description_ru: rewritten.ru,
    });
  }

  mkdirSync(resolve("scripts/out"), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(
    resolve(`scripts/out/descriptions-backup-${stamp}.json`),
    JSON.stringify(backup, null, 2)
  );
  writeFileSync(
    resolve(`scripts/out/descriptions-rewritten-${stamp}.json`),
    JSON.stringify(out, null, 2)
  );

  // print 2 samples
  for (const s of out.slice(0, 2)) {
    console.log("\n==========", s.slug, `facts=${s.factCount} words=${s.words_uk}/${s.words_ru}`);
    console.log("--- UA ---\n" + s.description_uk);
    console.log("--- RU ---\n" + s.description_ru);
  }

  const avgUk =
    out.reduce((a, b) => a + b.words_uk, 0) / Math.max(out.length, 1);
  console.log(`\nAvg words UA=${avgUk.toFixed(0)}`);

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to write DB.");
    return;
  }

  let ok = 0;
  let fail = 0;
  const chunk = 40;
  for (let i = 0; i < out.length; i += chunk) {
    const slice = out.slice(i, i + chunk);
    await Promise.all(
      slice.map(async (row) => {
        const { error } = await sb
          .from("products")
          .update({
            description_uk: row.description_uk,
            description_ru: row.description_ru,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (error) {
          fail++;
          console.log("FAIL", row.slug, error.message);
        } else ok++;
      })
    );
    console.log(`Wrote ${Math.min(i + chunk, out.length)}/${out.length}`);
  }
  console.log(`Done ok=${ok} fail=${fail}`);
  console.log(`Backup: scripts/out/descriptions-backup-${stamp}.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
