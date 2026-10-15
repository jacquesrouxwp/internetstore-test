import { STORE_PHONE_TEL } from "@/lib/contact";

/**
 * The store number as people write it in articles and descriptions:
 * "063 789-76-99", "063 789 76 99", "+38 (063) 789-76-99", "+380637897699".
 * Only this number — other digits in a text are never turned into links.
 */
const SEP = "[\\s\\u00a0-]?";
export const STORE_PHONE_TEXT_RE = new RegExp(
  `(?<![\\d+])(?:\\+?38${SEP})?\\(?0?63\\)?${SEP}789${SEP}76${SEP}99(?!\\d)`,
  "g"
);

export type PhoneSegment = { text: string; phone: boolean };

/** Plain text → pieces, with the store number marked for rendering as a link. */
export function splitPhones(text: string): PhoneSegment[] {
  const out: PhoneSegment[] = [];
  let last = 0;
  for (const m of Array.from(text.matchAll(STORE_PHONE_TEXT_RE))) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at), phone: false });
    out.push({ text: m[0], phone: true });
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
            (m) => `<a href="${STORE_PHONE_TEL}" class="phone-link">${m}</a>`
          )
    )
    .join("");
}
