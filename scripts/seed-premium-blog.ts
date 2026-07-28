/**
 * Seed 3 premium blog posts (uk + ru, rich HTML + SVG infographics).
 * Requires blog_posts table (005_blog_posts_table.sql).
 *
 * npx tsx scripts/seed-premium-blog.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
for (const line of text.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq < 1) continue;
  const k = t.slice(0, eq).trim();
  let v = t.slice(eq + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  )
    v = v.slice(1, -1);
  process.env[k] = v;
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const PHOTO_PH =
  '<div style="margin:1.25rem 0;padding:2.5rem 1rem;border-radius:12px;border:1px dashed rgba(255,255,255,0.18);background:rgba(255,255,255,0.04);text-align:center;color:#9AA0A8;font-size:0.875rem;">[ФОТО: замініть на фото товару через адмінку]</div>';

/** Infographic 1: matrix grids */
const SVG_MATRIX = `
<svg viewBox="0 0 640 280" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Порівняння матриць" style="width:100%;height:auto;display:block;border-radius:12px;background:#0D0E11;">
  <rect width="640" height="280" fill="#0D0E11"/>
  <text x="32" y="36" fill="#F5F6F7" font-family="system-ui,sans-serif" font-size="16" font-weight="700">Матриця сенсора</text>
  <text x="32" y="56" fill="#9AA0A8" font-family="system-ui,sans-serif" font-size="12">Більше пікселів → чіткіша ідентифікація на дистанції</text>
  <!-- 256 -->
  <g transform="translate(40,90)">
    <rect width="160" height="140" rx="10" fill="#16181D" stroke="rgba(255,255,255,0.1)"/>
    <text x="80" y="28" text-anchor="middle" fill="#B0B5BC" font-family="system-ui,sans-serif" font-size="13" font-weight="600">256×192</text>
    <g fill="#3a3f48">${Array.from({ length: 8 }, (_, r) =>
      Array.from(
        { length: 10 },
        (_, c) =>
          `<rect x="${16 + c * 13}" y="${42 + r * 10}" width="10" height="7" rx="1"/>`
      ).join("")
    ).join("")}</g>
    <text x="80" y="128" text-anchor="middle" fill="#8A8F97" font-family="system-ui,sans-serif" font-size="11">Вхідний рівень</text>
  </g>
  <!-- 384 highlighted -->
  <g transform="translate(240,80)">
    <rect width="160" height="160" rx="10" fill="#16181D" stroke="#E11D2A" stroke-width="2"/>
    <text x="80" y="28" text-anchor="middle" fill="#E11D2A" font-family="system-ui,sans-serif" font-size="13" font-weight="700">384×288</text>
    <g fill="#E11D2A" opacity="0.85">${Array.from({ length: 10 }, (_, r) =>
      Array.from(
        { length: 12 },
        (_, c) =>
          `<rect x="${14 + c * 11}" y="${40 + r * 9}" width="8" height="6" rx="1"/>`
      ).join("")
    ).join("")}</g>
    <text x="80" y="145" text-anchor="middle" fill="#F5F6F7" font-family="system-ui,sans-serif" font-size="11" font-weight="600">Золота середина</text>
  </g>
  <!-- 640 -->
  <g transform="translate(440,90)">
    <rect width="160" height="140" rx="10" fill="#16181D" stroke="rgba(255,255,255,0.1)"/>
    <text x="80" y="28" text-anchor="middle" fill="#B0B5BC" font-family="system-ui,sans-serif" font-size="13" font-weight="600">640×512</text>
    <g fill="#5a616c">${Array.from({ length: 12 }, (_, r) =>
      Array.from(
        { length: 14 },
        (_, c) =>
          `<rect x="${12 + c * 10}" y="${40 + r * 7}" width="7" height="5" rx="1"/>`
      ).join("")
    ).join("")}</g>
    <text x="80" y="128" text-anchor="middle" fill="#8A8F97" font-family="system-ui,sans-serif" font-size="11">Преміум / дальність</text>
  </g>
</svg>`;

const SVG_NETD = `
<svg viewBox="0 0 640 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Шкала NETD" style="width:100%;height:auto;display:block;border-radius:12px;background:#0D0E11;">
  <rect width="640" height="200" fill="#0D0E11"/>
  <text x="32" y="36" fill="#F5F6F7" font-family="system-ui,sans-serif" font-size="16" font-weight="700">NETD — чутливість</text>
  <text x="32" y="56" fill="#9AA0A8" font-family="system-ui,sans-serif" font-size="12">Менше mK → краща «промальовка» в туман і дощ</text>
  <defs>
    <linearGradient id="netdGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#16a34a"/>
      <stop offset="45%" stop-color="#f5a623"/>
      <stop offset="100%" stop-color="#E11D2A"/>
    </linearGradient>
  </defs>
  <rect x="48" y="100" width="544" height="28" rx="14" fill="url(#netdGrad)"/>
  <line x1="120" y1="90" x2="120" y2="138" stroke="#F5F6F7" stroke-width="2"/>
  <line x1="280" y1="90" x2="280" y2="138" stroke="#F5F6F7" stroke-width="2"/>
  <line x1="480" y1="90" x2="480" y2="138" stroke="#F5F6F7" stroke-width="2"/>
  <text x="120" y="160" text-anchor="middle" fill="#16a34a" font-family="system-ui,sans-serif" font-size="12" font-weight="700">≤20 mK</text>
  <text x="120" y="178" text-anchor="middle" fill="#9AA0A8" font-family="system-ui,sans-serif" font-size="10">преміум</text>
  <text x="280" y="160" text-anchor="middle" fill="#f5a623" font-family="system-ui,sans-serif" font-size="12" font-weight="700">≤35 mK</text>
  <text x="280" y="178" text-anchor="middle" fill="#9AA0A8" font-family="system-ui,sans-serif" font-size="10">оптимум</text>
  <text x="480" y="160" text-anchor="middle" fill="#E11D2A" font-family="system-ui,sans-serif" font-size="12" font-weight="700">>50 mK</text>
  <text x="480" y="178" text-anchor="middle" fill="#9AA0A8" font-family="system-ui,sans-serif" font-size="10">слабше в негоду</text>
</svg>`;

const SVG_RANGE = `
<svg viewBox="0 0 640 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Дальність" style="width:100%;height:auto;display:block;border-radius:12px;background:#0D0E11;">
  <rect width="640" height="220" fill="#0D0E11"/>
  <text x="32" y="36" fill="#F5F6F7" font-family="system-ui,sans-serif" font-size="16" font-weight="700">Дальність: виявлення → розпізнавання → ідентифікація</text>
  <line x1="48" y1="140" x2="592" y2="140" stroke="rgba(255,255,255,0.2)" stroke-width="3"/>
  <!-- figures -->
  <g fill="#E11D2A">
    <circle cx="140" cy="100" r="10"/><rect x="132" y="112" width="16" height="28" rx="3"/>
    <text x="140" y="170" text-anchor="middle" fill="#F5F6F7" font-family="system-ui,sans-serif" font-size="12" font-weight="600">~500 м</text>
    <text x="140" y="188" text-anchor="middle" fill="#9AA0A8" font-family="system-ui,sans-serif" font-size="10">ідентифікація</text>
  </g>
  <g fill="#f5a623" opacity="0.9">
    <circle cx="320" cy="95" r="8"/><rect x="314" y="105" width="12" height="22" rx="2"/>
    <text x="320" y="170" text-anchor="middle" fill="#F5F6F7" font-family="system-ui,sans-serif" font-size="12" font-weight="600">~1000 м</text>
    <text x="320" y="188" text-anchor="middle" fill="#9AA0A8" font-family="system-ui,sans-serif" font-size="10">розпізнавання</text>
  </g>
  <g fill="#6b7078">
    <circle cx="500" cy="90" r="5"/><rect x="496" y="96" width="8" height="14" rx="1"/>
    <text x="500" y="170" text-anchor="middle" fill="#F5F6F7" font-family="system-ui,sans-serif" font-size="12" font-weight="600">~1500 м+</text>
    <text x="500" y="188" text-anchor="middle" fill="#9AA0A8" font-family="system-ui,sans-serif" font-size="10">виявлення</text>
  </g>
</svg>`;

const bodyGuideUk = `
<p>У 2026 році вибір тепловізора — це не «чим дорожче, тим краще», а підбір під сценарій: ліс, поле, місто, охорона чи полювання. Нижче — робочий чекліст, яким ми користуємось у Pro-Optics.</p>

${PHOTO_PH}

<h2>1. Матриця (роздільна здатність)</h2>
${SVG_MATRIX}
<p><strong>256×192</strong> — компакт і бюджет, розвідка на коротких дистанціях.<br/>
<strong>384×288</strong> — золота середина для більшості завдань.<br/>
<strong>640×512</strong> — коли важлива ідентифікація на великих відстанях і «запас» по деталях.</p>

<h2>2. NETD — чутливість</h2>
${SVG_NETD}
<p>NETD (Noise Equivalent Temperature Difference) показує, наскільки дрібну різницю температур здатен «побачити» сенсор. У туман, дощ і високу вологість різниця між ≤25 mK і 50+ mK відчутна не на папері, а в полі.</p>

<h2>3. Дальність: три різні цифри</h2>
${SVG_RANGE}
<p>Виробники часто пишуть максимальне <em>виявлення</em>. Для практики важливіше:</p>
<ul>
<li><strong>ідентифікація</strong> — зрозуміти, хто/що саме;</li>
<li><strong>розпізнавання</strong> — людина / тварина / техніка;</li>
<li><strong>виявлення</strong> — «є теплова ціль».</li>
</ul>

${PHOTO_PH}

<h2>4. Під бюджет (орієнтир, ₴)</h2>
<table style="width:100%;border-collapse:collapse;margin:1rem 0;font-size:0.9rem;">
<thead>
<tr style="border-bottom:1px solid rgba(255,255,255,0.12);text-align:left;">
<th style="padding:0.6rem 0.5rem;color:#F5F6F7;">Бюджет</th>
<th style="padding:0.6rem 0.5rem;color:#F5F6F7;">Що шукати</th>
</tr>
</thead>
<tbody>
<tr style="border-bottom:1px solid rgba(255,255,255,0.06);"><td style="padding:0.55rem 0.5rem;">до 25 тис.</td><td style="padding:0.55rem 0.5rem;">компакт 256, прості сценарії</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.06);"><td style="padding:0.55rem 0.5rem;">25–45 тис.</td><td style="padding:0.55rem 0.5rem;">384 / NETD ~≤35, універсал</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.06);"><td style="padding:0.55rem 0.5rem;">45–80 тис.</td><td style="padding:0.55rem 0.5rem;">краща дальність, дисплей, запис</td></tr>
<tr><td style="padding:0.55rem 0.5rem;">80 тис.+</td><td style="padding:0.55rem 0.5rem;">640, LRF, преміум-серії</td></tr>
</tbody>
</table>

<blockquote>Перед покупкою порівняйте ціну з ринком — на картках Pro-Optics є бейдж порівняння з топ-конкурентами.</blockquote>

<p><a href="/catalog/teplovizori" style="display:inline-block;margin-top:0.5rem;padding:0.65rem 1.1rem;background:#E11D2A;color:#fff;border-radius:10px;font-weight:600;text-decoration:none;">Каталог тепловізорів →</a></p>
`;

const bodyGuideRu = `
<p>В 2026 году выбор тепловизора — не «чем дороже, тем лучше», а подбор под сценарий: лес, поле, город, охрана или охота. Ниже — рабочий чек-лист Pro-Optics.</p>
${PHOTO_PH}
<h2>1. Матрица</h2>
${SVG_MATRIX}
<p><strong>256×192</strong> — бюджет и короткие дистанции.<br/><strong>384×288</strong> — золотая середина.<br/><strong>640×512</strong> — идентификация на больших расстояниях.</p>
<h2>2. NETD</h2>
${SVG_NETD}
<p>Чем ниже NETD, тем лучше детализация в туман и дождь. Разница между ≤25 mK и 50+ mK заметна в поле.</p>
<h2>3. Дальность</h2>
${SVG_RANGE}
<p>Различайте выявление, распознавание и идентификацию — это разные цифры в спецификации.</p>
${PHOTO_PH}
<blockquote>Сравните цену с рынком — на карточках Pro-Optics есть бейдж сравнения с топ-конкурентами.</blockquote>
<p><a href="/catalog/teplovizori" style="display:inline-block;margin-top:0.5rem;padding:0.65rem 1.1rem;background:#E11D2A;color:#fff;border-radius:10px;font-weight:600;text-decoration:none;">Каталог тепловизоров →</a></p>
`;

const bodyPnbUk = `
<p><strong>Тепловізор</strong> «бачить» теплове випромінювання і працює в повній темряві, тумані, крізь легкий дим. <strong>ПНБ</strong> підсилює залишкове світло (місяць, зірки) або працює з ІЧ-підсвіткою.</p>

${PHOTO_PH}

<h2>Оберіть тепловізор, якщо</h2>
<ul>
<li>потрібне виявлення в тумані / без місяця;</li>
<li>важлива робота вдень і вночі без зміни приладу;</li>
<li>немає змоги світити ІЧ-ліхтарем (демаскування).</li>
</ul>

<h2>Оберіть ПНБ, якщо</h2>
<ul>
<li>потрібна «природна» картинка обличчя/деталей при місяці;</li>
<li>бюджет на класику Gen2+ / Gen3;</li>
<li>вже є ІЧ-підсвітка в системі.</li>
</ul>

${PHOTO_PH}

<blockquote>У каталозі Pro-Optics є обидва типи приладів — менеджер допоможе з підбором під задачу й бюджет.</blockquote>
<p><a href="/catalog/teplovizori" style="display:inline-block;margin-top:0.5rem;padding:0.65rem 1.1rem;background:#E11D2A;color:#fff;border-radius:10px;font-weight:600;text-decoration:none;">Дивитись каталог →</a></p>
`;

const bodyPnbRu = `
<p><strong>Тепловизор</strong> «видит» тепловое излучение. <strong>ПНВ</strong> усиливает остаточный свет или работает с ИК-подсветкой.</p>
${PHOTO_PH}
<h2>Выберите тепловизор, если</h2>
<ul>
<li>нужно обнаружение в тумане / без луны;</li>
<li>важна работа днём и ночью;</li>
<li>нельзя светить ИК (демаскировка).</li>
</ul>
<h2>Выберите ПНВ, если</h2>
<ul>
<li>нужна естественная картинка при луне;</li>
<li>бюджет на классику Gen2+/Gen3;</li>
<li>уже есть ИК-подсветка.</li>
</ul>
${PHOTO_PH}
<blockquote>В каталоге Pro-Optics есть оба типа приборов — менеджер поможет с подбором.</blockquote>
`;

const bodyMatrixUk = `
<p>Три параметри, які найчастіше плутають при виборі тепловізора: <strong>матриця</strong>, <strong>NETD</strong> і <strong>дальність</strong>. Нижче — коротко й наочно, з інфографіками у стилі Pro-Optics.</p>

<h2>Матриця</h2>
${SVG_MATRIX}
<p>Більше пікселів — більше деталей на тій самій дистанції. 384×288 — практичний оптимум для більшості задач; 640×512 — коли потрібен «запас» по ідентифікації.</p>

${PHOTO_PH}

<h2>NETD</h2>
${SVG_NETD}
<p>Це чутливість до різниці температур. Для складної погоди дивіться моделі з NETD ближче до 20–35 mK, а не лише маркетингову «дальність у км».</p>

<h2>Дальність</h2>
${SVG_RANGE}
<p>Запитуйте виробника / продавця саме про <em>ідентифікацію</em> людини (або вашу ціль), а не лише про максимальне виявлення.</p>

${PHOTO_PH}

<p><a href="/catalog/teplovizori" style="display:inline-block;margin-top:0.5rem;padding:0.65rem 1.1rem;background:#E11D2A;color:#fff;border-radius:10px;font-weight:600;text-decoration:none;">Підібрати модель у каталозі →</a></p>
`;

const bodyMatrixRu = `
<p>Три параметра, которые чаще всего путают: <strong>матрица</strong>, <strong>NETD</strong> и <strong>дальность</strong>.</p>
<h2>Матрица</h2>
${SVG_MATRIX}
<p>384×288 — практичный оптимум; 640×512 — запас по идентификации.</p>
${PHOTO_PH}
<h2>NETD</h2>
${SVG_NETD}
<p>Чувствительность к разнице температур. Для сложной погоды смотрите 20–35 mK.</p>
<h2>Дальность</h2>
${SVG_RANGE}
<p>Спрашивайте про идентификацию человека, а не только про максимальное обнаружение.</p>
${PHOTO_PH}
<p><a href="/catalog/teplovizori" style="display:inline-block;margin-top:0.5rem;padding:0.65rem 1.1rem;background:#E11D2A;color:#fff;border-radius:10px;font-weight:600;text-decoration:none;">Подобрать модель →</a></p>
`;

const POSTS = [
  {
    slug: "yak-obraty-teplovizor-2026",
    title_uk: "Як обрати тепловізор у 2026 році",
    title_ru: "Как выбрать тепловизор в 2026 году",
    excerpt_uk:
      "Матриця, NETD, дальність і бюджет — практичний гід від Pro-Optics з наочними схемами.",
    excerpt_ru:
      "Матрица, NETD, дальность и бюджет — практический гид Pro-Optics с наглядными схемами.",
    body_uk: bodyGuideUk.trim(),
    body_ru: bodyGuideRu.trim(),
    category: "Гайди",
    published: true,
    published_at: new Date().toISOString(),
    meta_title_uk: "Як обрати тепловізор у 2026 році — гід Pro-Optics",
    meta_title_ru: "Как выбрать тепловизор в 2026 году — гид Pro-Optics",
    meta_description_uk:
      "Чекліст вибору тепловізора: матриця 256/384/640, NETD, дальність, бюджети. Інфографіка.",
    meta_description_ru:
      "Чек-лист выбора тепловизора: матрица, NETD, дальность, бюджеты. Инфографика.",
  },
  {
    slug: "teplovizor-chy-pnb",
    title_uk: "Тепловізор чи ПНБ",
    title_ru: "Тепловизор или ПНВ",
    excerpt_uk:
      "Коли потрібен тепловізор, а коли класичний прилад нічного бачення — без води.",
    excerpt_ru:
      "Когда нужен тепловизор, а когда классический ПНВ — без воды.",
    body_uk: bodyPnbUk.trim(),
    body_ru: bodyPnbRu.trim(),
    category: "Гайди",
    published: true,
    published_at: new Date(Date.now() - 3600_000).toISOString(),
    meta_title_uk: "Тепловізор чи ПНБ — що обрати | Pro-Optics",
    meta_title_ru: "Тепловизор или ПНВ — что выбрать | Pro-Optics",
    meta_description_uk:
      "Порівняння тепловізора і ПНБ: сценарії, плюси, мінуси, рекомендації.",
    meta_description_ru:
      "Сравнение тепловизора и ПНВ: сценарии, плюсы, минусы.",
  },
  {
    slug: "matrytsya-netd-dalnist",
    title_uk: "Матриця, NETD і дальність",
    title_ru: "Матрица, NETD и дальность",
    excerpt_uk:
      "Три ключові параметри тепловізора — з інфографіками: сітки матриць, шкала NETD, лінійка дальності.",
    excerpt_ru:
      "Три ключевых параметра тепловизора — с инфографикой: матрицы, NETD, дальность.",
    body_uk: bodyMatrixUk.trim(),
    body_ru: bodyMatrixRu.trim(),
    category: "Гайди",
    published: true,
    published_at: new Date(Date.now() - 7200_000).toISOString(),
    meta_title_uk: "Матриця, NETD і дальність тепловізора — пояснення",
    meta_title_ru: "Матрица, NETD и дальность тепловизора — объяснение",
    meta_description_uk:
      "Наочно: різниця матриць 256/384/640, шкала NETD, виявлення vs ідентифікація.",
    meta_description_ru:
      "Наглядно: матрицы 256/384/640, шкала NETD, обнаружение vs идентификация.",
  },
];

async function main() {
  const { error: probe } = await sb.from("blog_posts").select("id").limit(1);
  if (probe) {
    console.error("blog_posts missing:", probe.message);
    console.error("Run supabase/migrations/005_blog_posts_table.sql first");
    process.exit(1);
  }

  for (const row of POSTS) {
    const { error } = await sb.from("blog_posts").upsert(
      {
        ...row,
        cover_url: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    );
    if (error) console.error("FAIL", row.slug, error.message);
    else console.log("OK", row.slug, "—", row.title_uk);
  }

  const { data } = await sb
    .from("blog_posts")
    .select("slug, title_uk, published, category")
    .eq("published", true)
    .order("published_at", { ascending: false });
  console.log("\nPublished on site:", data);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
