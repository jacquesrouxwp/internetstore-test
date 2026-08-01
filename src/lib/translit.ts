/**
 * Cyrillic -> Latin transliteration for URL slugs.
 *
 * Slugs must stay ASCII: a Cyrillic slug survives a round trip through the
 * DB but not through the URL/router, so product pages built from Ukrainian
 * names 404'd until this was applied (see reslug admin route).
 *
 * Ukrainian readings win where uk/ru disagree (г->h, и->y, е->e), since the
 * catalog is Ukrainian-first.
 */
const MAP: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "h",
  ґ: "g",
  д: "d",
  е: "e",
  є: "ie",
  ж: "zh",
  з: "z",
  и: "y",
  і: "i",
  ї: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ь: "",
  ю: "iu",
  я: "ia",
  // Russian-only letters
  ё: "e",
  ъ: "",
  ы: "y",
  э: "e",
};

export function transliterate(input: string): string {
  let out = "";
  for (const ch of input.toLowerCase()) {
    out += ch in MAP ? MAP[ch] : ch;
  }
  return out;
}
