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
    slug: "yak-obraty-teplovizor-2026",
    title_uk: "Як обрати тепловізор у 2026 році",
    title_ru: "Как выбрать тепловизор в 2026 году",
    excerpt_uk:
      "Короткий гід: матриця, об'єктив, NETD, бюджет і сценарії застосування.",
    excerpt_ru:
      "Короткий гид: матрица, объектив, NETD, бюджет и сценарии применения.",
    body_uk:
      "<h2>На що звернути увагу</h2><p>У 2026 році ринок тепловізорів пропонує широкий вибір. Нижче — практичний чекліст.</p><h3>Матриця</h3><ul><li><strong>256×192</strong> — вхідний рівень.</li><li><strong>384×288</strong> — золотий стандарт.</li><li><strong>640×512</strong> — великі дистанції.</li></ul><p>Порівняйте ціни на Pro-Optics з ринком.</p>",
    body_ru:
      "<h2>На что обратить внимание</h2><p>В 2026 году рынок тепловизоров предлагает широкий выбор. Ниже — чек-лист.</p><h3>Матрица</h3><ul><li><strong>256×192</strong> — входной уровень.</li><li><strong>384×288</strong> — золотой стандарт.</li><li><strong>640×512</strong> — большие дистанции.</li></ul>",
    category: "Гайди",
    published: true,
    published_at: new Date(Date.now() - 864e5).toISOString(),
    meta_title_uk: "Як обрати тепловізор у 2026 — гід Pro-Optics",
    meta_title_ru: "Как выбрать тепловизор в 2026 — гид Pro-Optics",
  },
  {
    slug: "teplovizor-chy-pnb",
    title_uk: "Тепловізор чи ПНБ",
    title_ru: "Тепловизор или ПНВ",
    excerpt_uk:
      "Коли потрібен тепловізор, а коли класичний прилад нічного бачення.",
    excerpt_ru:
      "Когда нужен тепловизор, а когда классический прибор ночного видения.",
    body_uk:
      "<h2>Коротко про різницю</h2><p><strong>Тепловізор</strong> бачить тепло. <strong>ПНБ</strong> підсилює залишкове світло.</p><ul><li>Туман / повна темрява → тепловізор</li><li>Місяць + бюджет → ПНБ</li></ul>",
    body_ru:
      "<h2>Коротко о разнице</h2><p><strong>Тепловизор</strong> видит тепло. <strong>ПНВ</strong> усиливает остаточный свет.</p>",
    category: "Гайди",
    published: true,
    published_at: new Date(Date.now() - 2 * 864e5).toISOString(),
    meta_title_uk: "Тепловізор чи ПНБ — що обрати",
    meta_title_ru: "Тепловизор или ПНВ — что выбрать",
  },
];

async function main() {
  const { error: probe } = await sb.from("blog_posts").select("id").limit(1);
  if (probe) {
    console.error(
      "Run supabase/migrations/005_blog_posts_table.sql first:\n",
      probe.message
    );
    process.exit(1);
  }

  for (const row of SEED) {
    const { error } = await sb.from("blog_posts").upsert(row, {
      onConflict: "slug",
    });
    if (error) console.error(row.slug, error.message);
    else console.log("ok", row.slug);
  }

  const { data } = await sb
    .from("blog_posts")
    .select("slug, title_uk, published, category")
    .eq("published", true);
  console.log("Published posts:", data);
}

main();
