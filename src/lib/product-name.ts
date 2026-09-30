/**
 * Product names per locale.
 *
 * The import wrote one scraped string into both `name_uk` and `name_ru`
 * (`nameRu: parsed.name` in lib/import/optics-pro-pipeline), so 99% of the
 * catalogue shows Ukrainian names on /ru — measured 2026-09-30: 490 of 493
 * titles identical across the two locales, while the descriptions differ in
 * every single one. The defect is the name, and only the name.
 *
 * A product name is a generic head plus a model: "Тепловізор Pulsar Axion
 * XG30". The model is already Latin and must not be touched. Only the head
 * needs translating, and the whole catalogue uses 57 of them — so the name is
 * derived here rather than stored, and no one has to retype 1129 rows.
 *
 * An editor who fills name_ru by hand still wins: a value that differs from
 * the Ukrainian one is taken as written.
 */

/** Kept free of @/types so types/index.ts can delegate to it without a cycle. */
export type NameLocale = "uk" | "ru" | "en";

interface NameFields {
  nameUk: string;
  nameRu?: string | null;
}

interface Generic {
  /** As it appears at the start of the Ukrainian name. */
  uk: string;
  ru: string;
  /** English reads model-first: "Pulsar Axion XG30 Thermal Monocular". */
  en: string;
}

/**
 * Longest first — "Тепловізійний бінокль" must win over "Тепловізійний".
 * Donor typos are listed as their own entries so they translate correctly
 * instead of falling through: the Ukrainian side of the catalogue keeps them
 * until someone fixes the rows, but ru and en come out clean.
 */
const GENERICS: Generic[] = [
  { uk: "Адаптер для встановлення тепловізорів на шолом", ru: "Адаптер для установки тепловизоров на шлем", en: "Helmet Adapter for Thermal Devices" },
  { uk: "Цифровий приціл-насадка нічного бачення", ru: "Цифровой прицел-насадка ночного видения", en: "Digital Night Vision Clip-on Sight" },
  { uk: "Цифровий монокуляр нічного бачення", ru: "Цифровой монокуляр ночного видения", en: "Digital Night Vision Monocular" },
  { uk: "Тепловізійний мультиспектральний приціл", ru: "Тепловизионный мультиспектральный прицел", en: "Multispectral Thermal Sight" },
  { uk: "Тепловізійний двоканальний коліматор", ru: "Тепловизионный двухканальный коллиматор", en: "Dual-Channel Thermal Collimator" },
  { uk: "Цифровий бінокль нічного бачення", ru: "Цифровой бинокль ночного видения", en: "Digital Night Vision Binoculars" },
  { uk: "Адаптер кронштейна МАК для прицілів", ru: "Адаптер кронштейна MAK для прицелов", en: "MAK Mount Adapter for Sights" },
  { uk: "Цифровий приціл нічного бачення", ru: "Цифровой прицел ночного видения", en: "Digital Night Vision Sight" },
  { uk: "Кронштейн европризма для прицілів", ru: "Кронштейн европризма для прицелов", en: "Euro-Prism Mount for Sights" },
  { uk: "Тепловізонна насадка/монокуляр", ru: "Тепловизионная насадка/монокуляр", en: "Thermal Clip-on / Monocular" },
  { uk: "Кронштейн боковий для прицілів", ru: "Кронштейн боковой для прицелов", en: "Side Mount for Sights" },
  { uk: "Купити насадку нічного бачення", ru: "Насадка ночного видения", en: "Night Vision Clip-on" },
  { uk: "Тепловізійна поворотна камера", ru: "Тепловизионная поворотная камера", en: "Thermal PTZ Camera" },
  { uk: "Джерело зовнішнього живлення", ru: "Источник внешнего питания", en: "External Power Supply" },
  { uk: "Пульт дистанційного керування", ru: "Пульт дистанционного управления", en: "Remote Control" },
  { uk: "Цифровий приціл день / ніч", ru: "Цифровой прицел день / ночь", en: "Digital Day / Night Sight" },
  { uk: "Цифровий бінокль день/ніч", ru: "Цифровой бинокль день/ночь", en: "Digital Day / Night Binoculars" },
  { uk: "Цифровий приціл день/ніч", ru: "Цифровой прицел день/ночь", en: "Digital Day / Night Sight" },
  { uk: "Тепловізійний бінокль Диполь", ru: "Тепловизионный бинокль Диполь", en: "Dipol Thermal Binoculars" },
  { uk: "Монокуляр нічного бачення", ru: "Монокуляр ночного видения", en: "Night Vision Monocular" },
  { uk: "Тепловізійний коліматор", ru: "Тепловизионный коллиматор", en: "Thermal Collimator" },
  { uk: "Приціл нічного бачення", ru: "Прицел ночного видения", en: "Night Vision Sight" },
  { uk: "Пріціл нічного бачення", ru: "Прицел ночного видения", en: "Night Vision Sight" },
  { uk: "Бінокль нічного бачення", ru: "Бинокль ночного видения", en: "Night Vision Binoculars" },
  { uk: "Окуляри нічного бачення", ru: "Очки ночного видения", en: "Night Vision Goggles" },
  { uk: "Насадка нічного бачення", ru: "Насадка ночного видения", en: "Night Vision Clip-on" },
  { uk: "Прилад нічного бачення", ru: "Прибор ночного видения", en: "Night Vision Device" },
  { uk: "Автомобільний тепловізор", ru: "Автомобильный тепловизор", en: "Automotive Thermal Camera" },
  { uk: "Швидкоз ємний кронштейн", ru: "Быстросъёмный кронштейн", en: "Quick-Detach Mount" },
  { uk: "Тепловізійний монокуляр", ru: "Тепловизионный монокуляр", en: "Thermal Monocular" },
  { uk: "Біспектральний бінокуляр", ru: "Биспектральный бинокуляр", en: "Bispectral Binocular" },
  { uk: "Тепловізійний бінокль", ru: "Тепловизионный бинокль", en: "Thermal Binoculars" },
  { uk: "Тепловізійна насадка", ru: "Тепловизионная насадка", en: "Thermal Clip-on" },
  { uk: "Тепловізонна насадка", ru: "Тепловизионная насадка", en: "Thermal Clip-on" },
  { uk: "Тепловізійний приціл", ru: "Тепловизионный прицел", en: "Thermal Sight" },
  { uk: "Тепловізійний прицлі", ru: "Тепловизионный прицел", en: "Thermal Sight" },
  { uk: "Інфрачервоний ліхтар", ru: "Инфракрасный фонарь", en: "Infrared Illuminator" },
  { uk: "Акумуляторний блок", ru: "Аккумуляторный блок", en: "Battery Pack" },
  { uk: "Планка-перехідник", ru: "Планка-переходник", en: "Rail Adapter" },
  { uk: "Кришка на об єктив", ru: "Крышка на объектив", en: "Lens Cap" },
  { uk: "Кришка на об'єктив", ru: "Крышка на объектив", en: "Lens Cap" },
  { uk: "Кронштей-демфер", ru: "Кронштейн-демпфер", en: "Damper Mount" },
  { uk: "Джерело живлення", ru: "Источник питания", en: "Power Supply" },
  { uk: "Кришка-адаптер", ru: "Крышка-адаптер", en: "Adapter Cap" },
  { uk: "Шийний ремінець", ru: "Шейный ремешок", en: "Neck Strap" },
  { uk: "Кронштейн бічний", ru: "Кронштейн боковой", en: "Side Mount" },
  { uk: "Маунт (ріг) типу", ru: "Маунт (рог) типа", en: "Rhino Mount, type" },
  { uk: "Цифровий пріціл", ru: "Цифровой прицел", en: "Digital Sight" },
  { uk: "Цифровий приціл", ru: "Цифровой прицел", en: "Digital Sight" },
  { uk: "Кріплення для", ru: "Крепление для", en: "Mount for" },
  { uk: "Тепловізор", ru: "Тепловизор", en: "Thermal Monocular" },
  { uk: "Кронштейн", ru: "Кронштейн", en: "Mount" },
  { uk: "Кріплення", ru: "Крепление", en: "Mount" },
  { uk: "Наглазник", ru: "Наглазник", en: "Eyecup" },
  { uk: "Моноблок", ru: "Моноблок", en: "Monoblock" },
  { uk: "Адаптер", ru: "Адаптер", en: "Adapter" },
  { uk: "Окуляр", ru: "Окуляр", en: "Eyepiece" },
].sort((a, b) => b.uk.length - a.uk.length);

export interface SplitName {
  /** The generic head, when the name starts with a known one. */
  generic: Generic | null;
  /** Everything after it — brand and model, already Latin. */
  rest: string;
}

/** Splits "Тепловізор Pulsar Axion XG30" into its head and its model. */
export function splitProductName(nameUk: string): SplitName {
  const name = (nameUk || "").trim();
  for (const generic of GENERICS) {
    if (name.toLowerCase().startsWith(generic.uk.toLowerCase())) {
      return { generic, rest: name.slice(generic.uk.length).trim() };
    }
  }
  return { generic: null, rest: name };
}

/**
 * The product name for a locale.
 *
 * Ukrainian is returned as stored. Russian prefers a hand-written `name_ru`
 * and otherwise translates the head. English always derives, model first.
 * A name whose head we do not know is returned unchanged — better the
 * Ukrainian word than an invented translation.
 */
export function localizedProductName(
  product: NameFields,
  locale: NameLocale,
): string {
  const uk = (product.nameUk || "").trim();
  if (locale === "uk") return uk;

  const ru = (product.nameRu || "").trim();
  if (locale === "ru" && ru && ru !== uk) return ru;

  const { generic, rest } = splitProductName(uk);
  if (!generic) return locale === "ru" && ru ? ru : uk;

  if (locale === "ru") return rest ? `${generic.ru} ${rest}` : generic.ru;
  return rest ? `${rest} ${generic.en}` : generic.en;
}
