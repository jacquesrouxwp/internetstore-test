import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { transliterate } from "@/lib/translit";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(n: number, locale: string = "uk"): string {
  const formatted = new Intl.NumberFormat(locale === "ru" ? "ru-UA" : "uk-UA", {
    maximumFractionDigits: 0,
  }).format(n);
  return `${formatted} грн`;
}

/** URL-safe ASCII slug. Cyrillic is transliterated, never kept verbatim —
 *  non-ASCII slugs 404 on the product route. */
export function slugify(input: string): string {
  return transliterate(input)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function generateOrderNumber(): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const r = Math.floor(Math.random() * 9000 + 1000);
  return `OS-${y}${m}${day}-${r}`;
}
