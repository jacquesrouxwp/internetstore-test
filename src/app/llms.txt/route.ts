import { getBrandsWithProducts, getCategories, getCatalog } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site-url";
import { pluralProducts } from "@/lib/brand-pages";
import { STORE_EMAIL, STORE_PHONE_DISPLAY } from "@/lib/contact";
import { SELLER } from "@/lib/legal";

/**
 * /llms.txt — a plain map of the shop for answer engines.
 *
 * ChatGPT already sends buyers to /vykup, and the pages it cites are the ones
 * that state a fact plainly. This file does the same for the shop as a whole:
 * who sells, what is sold, and which page answers which question, without
 * navigation, scripts or marketing. Everything here is generated from the live
 * catalogue, so it cannot drift from the site.
 *
 * https://llmstxt.org/
 */

export const revalidate = 3600;

export async function GET() {
  const site = getSiteUrl();
  const [categories, brands] = await Promise.all([
    getCategories().catch(() => []),
    getBrandsWithProducts().catch(() => []),
  ]);

  const lines: string[] = [
    "# Pro-Optics (Про Оптікс)",
    "",
    `> Інтернет-магазин тепловізорів, тепловізійних прицілів, насадок і приладів нічного бачення в Україні. Продавець — ${SELLER.legalName.uk}, ${SELLER.legalAddress.uk}. Доставка Новою Поштою по всій Україні, оплата при отриманні. Телефон ${STORE_PHONE_DISPLAY}, пошта ${STORE_EMAIL}.`,
    "",
    "## Каталог",
    "",
  ];

  // A category with nothing in it (the stray "kolimatronie" row) would send an
  // answer engine to an empty page, so it is counted before it is listed.
  for (const c of categories) {
    const { total } = await getCatalog({ limit: 1 }, c.slug).catch(() => ({
      total: 0,
    }));
    if (!total) continue;
    lines.push(
      `- [${c.nameUk}](${site}/catalog/${c.slug}): ${pluralProducts(total, "uk")}.`,
    );
  }

  lines.push("", "## Сервіси та умови", "");
  lines.push(
    `- [Викуп і трейд-ін тепловізорів](${site}/vykup): магазин купує вживані тепловізори та прилади нічного бачення по Україні, оцінка за фото й моделлю.`,
    `- [Люкс-оптика під замовлення](${site}/premium-optyka): тепловізори, біноклі, приціли й далекоміри Swarovski, ZEISS, Leica, Steiner, Kahles та інших європейських брендів, яких зазвичай немає в наявності, — привозимо під замовлення, ціну й термін називає консультант.`,
    `- [Умови для військових](${site}/viyskovym): окремі умови для підрозділів ЗСУ та волонтерів.`,
    `- [Симулятор тепловізора](${site}/simulator): показує, як матриця, об'єктив і дистанція змінюють картинку — можна порівняти дві моделі.`,
    `- [Порівняння моделей](${site}/porivniannia): таблиці «модель X проти моделі Y» за паспортними характеристиками.`,
    `- [Бренди](${site}/brand): ціни й асортимент за виробниками.`,
    `- [Статті](${site}/blog): як обрати тепловізор, що означає дальність у паспорті, тепловізор чи ПНБ.`,
    `- [Доставка й оплата](${site}/delivery) · [Гарантія](${site}/warranty) · [Контакти](${site}/contacts)`,
    `- [Публічна оферта](${site}/oferta) · [Політика конфіденційності](${site}/privacy)`,
  );

  if (brands.length) {
    lines.push("", "## Бренди в наявності", "");
    lines.push(brands.map((b) => b.name).join(", ") + ".");
  }

  lines.push(
    "",
    "## Примітки",
    "",
    "- Ціни в гривнях, актуальні на сторінці товару.",
    "- Характеристики в картках узяті з паспорта виробника; зірки «сильні сторони приладу» розраховані з цих характеристик, це не відгуки покупців.",
    "- Повна карта сайту: " + `${site}/sitemap.xml`,
    "",
  );

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
