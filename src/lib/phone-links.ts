import {
  STORE_PHONE_2_DISPLAY,
  STORE_PHONE_2_TEL,
  STORE_PHONE_DISPLAY,
  STORE_PHONE_TEL,
} from "@/lib/contact";

/**
 * The store numbers as people write them in articles and descriptions:
 * "063 789-76-99", "063 789 76 99", "+38 (063) 789-76-99", "+380637897699",
 * and the same ways for 098 218-17-82. Only these numbers — other digits in a
 * text are never turned into links. Whatever form was written, the link shows
 * +380 XX XXX XX XX and dials the +380 E.164 number.
 */
const SEP = "[\\s\\u00a0-]?";
// Country code, then an optional trunk 0 — against 38 ("+380…"), inside
// parentheses ("+38 (063)…"), or with a space before the operator ("+380 63 …").
const number = (op: string, a: string, b: string, c: string) =>
  `(?:\\+?38${SEP})?\\(?(?:0${SEP})?${op}\\)?${SEP}${a}${SEP}${b}${SEP}${c}`;
export const STORE_PHONE_TEXT_RE = new RegExp(
  `(?<![\\d+])(?:${number("63", "789", "76", "99")}|${number("98", "218", "17", "82")})(?!\\d)`,
  "g"
);

const isSecond = (found: string) => found.replace(/\D/g, "").includes("98218");

/** The tel: link for a number found in text. Always the +380 E.164 form. */
const telOf = (found: string) => (isSecond(found) ? STORE_PHONE_2_TEL : STORE_PHONE_TEL);

/** Visible text: +380 XX XXX XX XX, whatever way the number was written. */
const displayOf = (found: string) => (isSecond(found) ? STORE_PHONE_2_DISPLAY : STORE_PHONE_DISPLAY);

export type PhoneSegment = { text: string; phone: boolean; tel?: string };

/** Plain text → pieces, with the store number marked for rendering as a link. */
export function splitPhones(text: string): PhoneSegment[] {
  const out: PhoneSegment[] = [];
  let last = 0;
  for (const m of Array.from(text.matchAll(STORE_PHONE_TEXT_RE))) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at), phone: false });
    out.push({ text: displayOf(m[0]), phone: true, tel: telOf(m[0]) });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), phone: false });
  return out;
}

/**
 * Wraps the store number in article / SEO HTML into a tel: link, so the
 * site-wide phone chooser can open on it. Text already inside a link and
 * tag attributes are left alone.
 */
export function linkifyPhonesHtml(html: string): string {
  return html
    .split(/(<a\b[\s\S]*?<\/a>|<[^>]*>)/i)
    .map((part) =>
      part.startsWith("<")
        ? part
        : part.replace(
            STORE_PHONE_TEXT_RE,
            (m) => `<a href="${telOf(m)}" class="phone-link">${displayOf(m)}</a>`
          )
    )
    .join("");
}
