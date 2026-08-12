/**
 * Apply 004 blog migration statements one-by-one via REST isn't possible for DDL.
 * Seeds posts if table already has columns. Prints SQL path for user.
 *
 * For columns: use Supabase SQL editor with 004_blog_posts.sql
 * This script: insert seed posts if empty (after migration).
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

const SEED = [
  {
    slug: "yak-obraty-teplovizor",
    title_uk: "Як обрати тепловізор: гід за характеристиками",
    title_ru: "Как выбрать тепловизор: гид по характеристикам",
    excerpt_uk:
      "Матриця, об'єктив, NETD і частота — що реально впливає на картинку в полі.",
    excerpt_ru:
      "Матрица, объектив, NETD и частота — что реально влияет на картинку в поле.",
    body_uk:
      "Матриця 384×288 — золотий стандарт для більшості завдань. 640×512 потрібна, коли важлива ідентифікація на великих дистанціях.\n\nОб'єктив 19–25 мм зручний у лісі, 35–50 мм — на відкритій місцевості. NETD нижче 35 мК дає кращу «промальовку» в негоду.",
    body_ru:
      "Матрица 384×288 — золотой стандарт для большинства задач. 640×512 нужна, когда важна идентификация на больших дистанциях.\n\nОбъектив 19–25 мм удобен в лесу, 35–50 мм — на открытой местности. NETD ниже 35 мК даёт лучшую детализацию в непогоду.",
    category: "Гіди",
    published: true,
    published_at: new Date(Date.now() - 10 * 864e5).toISOString(),
    meta_title_uk: "Як обрати тепловізор — гід Pro-Optics",
    meta_title_ru: "Как выбрать тепловизор — гид Pro-Optics",
  },
  {
    slug: "hikmicro-lineup-guide",
    title_uk: "HikMicro: огляд популярних лінійок",
    title_ru: "HikMicro: обзор популярных линеек",
    excerpt_uk: "Короткий розбір для бюджету 25–60 тис. грн.",
    excerpt_ru: "Короткий разбор для бюджета 25–60 тыс. грн.",
    body_uk:
      "HikMicro сильний сервісом і лінійкою LYNX / FALCON / CONDOR. Нижче — орієнтири по сегментах.",
    body_ru:
      "HikMicro силён сервисом и линейкой LYNX / FALCON / CONDOR. Ниже — ориентиры по сегментам.",
    category: "Огляди",
    published: true,
    published_at: new Date(Date.now() - 20 * 864e5).toISOString(),
  },
  {
    slug: "dostavka-nova-poshta",
    title_uk: "Доставка тепловізорів Новою Поштою",
    title_ru: "Доставка тепловизоров Новой Почтой",
    excerpt_uk: "Як ми пакуємо прилади та що перевірити при отриманні.",
    excerpt_ru: "Как мы упаковываем приборы и что проверить при получении.",
    body_uk:
      "Кожен прилад пакуємо в оригінальну коробку з амортизацією. При отриманні перевірте комплектацію.",
    body_ru:
      "Каждый прибор упаковываем в оригинальную коробку с амортизацией. При получении проверьте комплектацию.",
    category: "Сервіс",
    published: true,
    published_at: new Date(Date.now() - 30 * 864e5).toISOString(),
  },
  {
    slug: "netd-shcho-tse",
    title_uk: "NETD: що означає чутливість тепловізора",
    title_ru: "NETD: что означает чувствительность тепловизора",
    excerpt_uk: "Чому NETD <25 mK важливий у туман і дощ.",
    excerpt_ru: "Почему NETD <25 mK важен в туман и дождь.",
    body_uk:
      "NETD показує, наскільки дрібну різницю температур здатен «побачити» сенсор. Менше значення — краща деталізація.",
    body_ru:
      "NETD показывает, насколько мелкую разницу температур способен «увидеть» сенсор. Меньшее значение — лучшая детализация.",
    category: "Гіди",
    published: true,
    published_at: new Date(Date.now() - 5 * 864e5).toISOString(),
  },
  {
    slug: "doglyad-za-optikoyu",
    title_uk: "Догляд за тепловізором: 5 простих правил",
    title_ru: "Уход за тепловизором: 5 простых правил",
    excerpt_uk: "Як не зіпсувати об'єктив і акумулятор у полі.",
    excerpt_ru: "Как не испортить объектив и аккумулятор в поле.",
    body_uk:
      "1. Не торкайтеся германієвого об'єктива пальцями.\n2. Сушіть прилад після дощу.\n3. Акумулятори — частково зарядженими при зберіганні.\n4. Оновлюйте прошивку.\n5. Сухе місце з силікагелем.",
    body_ru:
      "1. Не касайтесь германиевого объектива пальцами.\n2. Сушите прибор после дождя.\n3. Аккумуляторы — частично заряженными при хранении.\n4. Обновляйте прошивку.\n5. Сухое место с силикагелем.",
    category: "Сервіс",
    published: true,
    published_at: new Date(Date.now() - 2 * 864e5).toISOString(),
  },
];

async function main() {
  // probe columns
  const { data, error } = await sb.from("posts").select("id, category").limit(1);
  if (error) {
    console.error(
      "posts table/columns missing. Run supabase/migrations/004_blog_posts.sql in SQL Editor first.\n",
      error.message
    );
    process.exit(1);
  }
  console.log("posts OK, sample:", data);

  const { count } = await sb
    .from("posts")
    .select("*", { count: "exact", head: true });
  console.log("posts count:", count);

  if ((count || 0) === 0) {
    const { error: ie } = await sb.from("posts").insert(SEED);
    if (ie) {
      console.error("seed failed:", ie.message);
      process.exit(1);
    }
    console.log("Seeded", SEED.length, "posts");
  } else {
    console.log("Skip seed — posts already exist");
  }

  const { data: all } = await sb
    .from("posts")
    .select("slug, title_uk, published, category")
    .eq("published", true)
    .order("published_at", { ascending: false });
  console.log("Published:", all);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
