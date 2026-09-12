/**
 * Add Leonardo DRS IWS monocular from Kapral facts + photos,
 * price 250000 (sale vs market 817990), publish unique-offer blog post.
 *
 *   npx tsx scripts/add-leonardo-drs-iws.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

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

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const SLUG = "leonardo-drs-iws-teploviziynyy-monokuliar";
const BLOG_SLUG = "leonardo-drs-iws-unikalna-propozytsiia";
const PRICE = 250000;
const OLD_PRICE = 817990;
const SKU = "KA_5621938";

const IMAGE_URLS = [
  "https://kapral.com.ua/wp-content/uploads/2026/08/c528544a-e692-4add-beb6-e6fd1e86d2f9.webp",
  "https://kapral.com.ua/wp-content/uploads/2026/08/0c1c1702-72ac-4891-b3e5-cc49bddbd9eb.webp",
  "https://kapral.com.ua/wp-content/uploads/2026/08/2-81.webp",
  "https://kapral.com.ua/wp-content/uploads/2026/08/2-82.webp",
  "https://kapral.com.ua/wp-content/uploads/2026/08/monokuliar-leonardo-drs-86623003006248.webp",
];

const specs = {
  Тип: "Тепловізійний монокуляр",
  Бренд: "Leonardo DRS",
  Модель: "IWS",
  "Тип сенсора": "VOx Microbolometer",
  Матриця: "640x480",
  "Роздільна здатність матриці": "640x480",
  Призначення: "Спостереження та ідентифікація теплових об'єктів",
  "Режим роботи": "Денний / нічний, 24/7",
  Колір: "TAN",
  "Робота без ІЧ-підсвічування": "Так",
  resolution: "640x480",
};

const descriptionUk = `Leonardo DRS IWS — тепловізійний монокуляр військового класу для спостереження в повній темряві, диму, тумані та складних умовах освітлення. Прилад можна використовувати як ручний пристрій або у складі оптичного комплексу.

Ключові особливості:
• Матриця 640×480 на сенсорі VOx (оксид ванадію)
• Детальне теплове зображення для впевненого розпізнавання об'єктів
• Робота без зовнішнього ІЧ-підсвічування — фіксує власне теплове випромінювання цілей
• Режим роботи день / ніч, 24/7
• Корпус у кольорі TAN
• Формат монокуляра з можливістю інтеграції в оптичний комплекс

IWS найкраще розкривається там, де потрібні якість картинки й стабільна робота в полі: спостереження, ідентифікація теплових об'єктів, задачі в умовах обмеженої видимості.

Орієнтуйтеся на таблицю характеристик на цій сторінці — усі ключові параметри зібрані там.`.trim();

const descriptionRu = `Leonardo DRS IWS — тепловизионный монокуляр военного класса для наблюдения в полной темноте, дыму, тумане и сложных условиях освещения. Прибор можно использовать как ручное устройство или в составе оптического комплекса.

Ключевые особенности:
• Матрица 640×480 на сенсоре VOx (оксид ванадия)
• Детальное тепловое изображение для уверенного распознавания объектов
• Работа без внешней ИК-подсветки — фиксирует собственное тепловое излучение целей
• Режим работы день / ночь, 24/7
• Корпус в цвете TAN
• Формат монокуляра с возможностью интеграции в оптический комплекс

IWS лучше всего раскрывается там, где нужны качество картинки и стабильная работа в поле: наблюдение, идентификация тепловых объектов, задачи в условиях ограниченной видимости.

Ориентируйтесь на таблицу характеристик на этой странице — все ключевые параметры собраны там.`.trim();

async function download(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://kapral.com.ua/",
      Accept: "image/*,*/*",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error(`too small ${buf.length}`);
  return buf;
}

async function uploadBuf(path, buf, contentType) {
  const { error } = await sb.storage
    .from("product-images")
    .upload(path, buf, { contentType, upsert: true });
  if (error) throw error;
  return sb.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

async function ensureBrand() {
  const { data: existing } = await sb
    .from("brands")
    .select("id, slug, name")
    .or("slug.eq.leonardo-drs,name.ilike.%Leonardo DRS%")
    .maybeSingle();
  if (existing) return existing;
  const { data, error } = await sb
    .from("brands")
    .insert({ slug: "leonardo-drs", name: "Leonardo DRS" })
    .select("id, slug, name")
    .single();
  if (error) throw error;
  console.log("brand created", data);
  return data;
}

async function ensureCategory() {
  const { data } = await sb
    .from("categories")
    .select("id, slug")
    .eq("slug", "teplovizori")
    .maybeSingle();
  if (!data) throw new Error("category teplovizori missing");
  return data;
}

async function upsertProduct(brand, category, images) {
  const { data: existing } = await sb
    .from("products")
    .select("id, slug")
    .eq("slug", SLUG)
    .maybeSingle();

  const row = {
    slug: SLUG,
    sku: SKU,
    name_uk: "Тепловізійний монокуляр Leonardo DRS IWS",
    name_ru: "Тепловизионный монокуляр Leonardo DRS IWS",
    short_uk:
      "Leonardo DRS IWS — тепловізійний монокуляр 640×480 VOx, військовий клас, акційна пропозиція.",
    short_ru:
      "Leonardo DRS IWS — тепловизионный монокуляр 640×480 VOx, военный класс, акционное предложение.",
    description_uk: descriptionUk,
    description_ru: descriptionRu,
    price: PRICE,
    old_price: OLD_PRICE,
    stock: 1,
    brand_id: brand.id,
    category_id: category.id,
    resolution: "640x480",
    device_type: "mono",
    published: true,
    is_sale: true,
    is_top: true,
    is_new: true,
    is_hit: false,
    images,
    image_alts: images.map(
      () => "Тепловізійний монокуляр Leonardo DRS IWS — Pro-Optics"
    ),
    specs,
    meta_title_uk: "Leonardo DRS IWS — тепловізійний монокуляр 640×480 | Pro-Optics",
    meta_title_ru: "Leonardo DRS IWS — тепловизионный монокуляр 640×480 | Pro-Optics",
    meta_description_uk:
      "Leonardo DRS IWS: матриця 640×480 VOx, військовий клас. Акційна ціна в Pro-Optics.",
    meta_description_ru:
      "Leonardo DRS IWS: матрица 640×480 VOx, военный класс. Акционная цена в Pro-Optics.",
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await sb
      .from("products")
      .update(row)
      .eq("id", existing.id)
      .select("id, slug, price, old_price, published")
      .single();
    if (error) throw error;
    console.log("product updated", data);
    return data;
  }

  const { data, error } = await sb
    .from("products")
    .insert({ ...row, created_at: new Date().toISOString() })
    .select("id, slug, price, old_price, published")
    .single();
  if (error) throw error;
  console.log("product created", data);
  return data;
}

async function publishBlog(coverUrl) {
  const now = new Date().toISOString();
  const productUrl = `/product/${SLUG}`;

  const bodyUk = `
<p><strong>Унікальна пропозиція Pro-Optics:</strong> тепловізійний монокуляр <strong>Leonardo DRS IWS</strong> — професійна система військового класу з матрицею <strong>640×480</strong> на сенсорі VOx. Обмежена кількість: зараз у наявності <strong>1 шт.</strong></p>

<h2>Чому це рідкісна позиція</h2>
<p>Leonardo DRS IWS зустрічається на ринку рідко. Це не масовий «мисливський» монокуляр, а прилад для спостереження й ідентифікації в умовах повної темряви, диму, туману та складного освітлення. Його можна використовувати як ручний пристрій або інтегрувати в оптичний комплекс.</p>

<h2>Ключові факти</h2>
<ul>
<li>Матриця <strong>640×480</strong>, сенсор <strong>VOx microbolometer</strong></li>
<li>Робота <strong>без зовнішнього ІЧ-підсвічування</strong></li>
<li>Режим день / ніч, 24/7</li>
<li>Корпус у кольорі <strong>TAN</strong></li>
<li>Акційна ціна в Pro-Optics: <strong>250 000 ₴</strong> (орієнтир ринку значно вищий)</li>
</ul>

<p><img src="${coverUrl}" alt="Leonardo DRS IWS — тепловізійний монокуляр" style="max-width:100%;height:auto;border-radius:12px" /></p>

<h2>Кому підходить</h2>
<p>Тим, хто шукає серйозний тепловізійний монокуляр для спостереження та ідентифікації, а не «бюджетну іграшку». Якщо потрібна детальна теплова картинка 640×480 і формат, з яким можна працювати в полі довго — IWS варто розглянути зараз, поки є в наявності.</p>

<h2>Як замовити</h2>
<p>Картка товару: <a href="${productUrl}">Leonardo DRS IWS в каталозі Pro-Optics</a>. Наявність обмежена — одна одиниця. Питання по комплектації та доставці — через консультанта на сайті.</p>
`.trim();

  const bodyRu = `
<p><strong>Уникальное предложение Pro-Optics:</strong> тепловизионный монокуляр <strong>Leonardo DRS IWS</strong> — профессиональная система военного класса с матрицей <strong>640×480</strong> на сенсоре VOx. Ограниченное количество: сейчас в наличии <strong>1 шт.</strong></p>

<h2>Почему это редкая позиция</h2>
<p>Leonardo DRS IWS на рынке встречается редко. Это не массовый «охотничий» монокуляр, а прибор для наблюдения и идентификации в условиях полной темноты, дыма, тумана и сложного освещения. Его можно использовать как ручное устройство или интегрировать в оптический комплекс.</p>

<h2>Ключевые факты</h2>
<ul>
<li>Матрица <strong>640×480</strong>, сенсор <strong>VOx microbolometer</strong></li>
<li>Работа <strong>без внешней ИК-подсветки</strong></li>
<li>Режим день / ночь, 24/7</li>
<li>Корпус в цвете <strong>TAN</strong></li>
<li>Акционная цена в Pro-Optics: <strong>250 000 ₴</strong> (рыночный ориентир значительно выше)</li>
</ul>

<p><img src="${coverUrl}" alt="Leonardo DRS IWS — тепловизионный монокуляр" style="max-width:100%;height:auto;border-radius:12px" /></p>

<h2>Кому подходит</h2>
<p>Тем, кто ищет серьёзный тепловизионный монокуляр для наблюдения и идентификации, а не «бюджетную игрушку». Если нужна детальная тепловая картинка 640×480 и формат для полевой работы — IWS стоит рассмотреть сейчас, пока есть в наличии.</p>

<h2>Как заказать</h2>
<p>Карточка товара: <a href="${productUrl}">Leonardo DRS IWS в каталоге Pro-Optics</a>. Наличие ограничено — одна единица. Вопросы по комплектации и доставке — через консультанта на сайте.</p>
`.trim();

  const row = {
    slug: BLOG_SLUG,
    title_uk: "Leonardo DRS IWS: унікальна пропозиція тепловізійного монокуляра 640×480",
    title_ru: "Leonardo DRS IWS: уникальное предложение тепловизионного монокуляра 640×480",
    excerpt_uk:
      "Рідкісний Leonardo DRS IWS з матрицею 640×480 VOx — акційна ціна 250 000 ₴, лише 1 шт. в наявності.",
    excerpt_ru:
      "Редкий Leonardo DRS IWS с матрицей 640×480 VOx — акционная цена 250 000 ₴, только 1 шт. в наличии.",
    body_uk: bodyUk,
    body_ru: bodyRu,
    cover_url: coverUrl,
    category: "Огляди",
    published: true,
    published_at: now,
    meta_title_uk:
      "Leonardo DRS IWS — унікальна пропозиція | Pro-Optics Blog",
    meta_title_ru:
      "Leonardo DRS IWS — уникальное предложение | Pro-Optics Blog",
    meta_description_uk:
      "Leonardo DRS IWS 640×480 VOx: рідкісний тепловізійний монокуляр за акційною ціною в Pro-Optics. Лише 1 шт.",
    meta_description_ru:
      "Leonardo DRS IWS 640×480 VOx: редкий тепловизионный монокуляр по акционной цене в Pro-Optics. Только 1 шт.",
    updated_at: now,
  };

  const { data, error } = await sb
    .from("blog_posts")
    .upsert(row, { onConflict: "slug" })
    .select("id, slug, title_uk, published, cover_url")
    .single();
  if (error) throw error;
  console.log("blog OK", data);
  return data;
}

async function main() {
  console.log("=== Leonardo DRS IWS ===");
  const brand = await ensureBrand();
  const category = await ensureCategory();

  const uploaded = [];
  for (let i = 0; i < IMAGE_URLS.length; i++) {
    const url = IMAGE_URLS[i];
    console.log("download", url.split("/").pop());
    try {
      const buf = await download(url);
      const ext = url.toLowerCase().includes(".png") ? "png" : "webp";
      const ct = ext === "png" ? "image/png" : "image/webp";
      const pub = await uploadBuf(
        `leonardo-drs-iws/${Date.now()}-img-${i}.${ext}`,
        buf,
        ct
      );
      uploaded.push(pub);
      console.log("  OK", buf.length);
    } catch (e) {
      console.log("  SKIP", e.message);
    }
  }
  if (!uploaded.length) throw new Error("no images uploaded");

  const product = await upsertProduct(brand, category, uploaded);
  const blog = await publishBlog(uploaded[0]);

  console.log("\nDONE");
  console.log("Product:", `https://pro-optics.com.ua/product/${product.slug}`);
  console.log("Blog:", `https://pro-optics.com.ua/blog/${blog.slug}`);
  console.log("Price:", PRICE, "old:", OLD_PRICE, "stock: 1, sale+top+new");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
