/**
 * FAQPage markup for the question blocks we already print.
 *
 * Answer engines and Bing lift a stated question with a stated answer far more
 * readily than the same text inside a paragraph, and the shop is already
 * winning ChatGPT traffic on exactly that kind of page (/vykup). The markup
 * only describes visible text — it never adds a question the page does not
 * answer, which is what Google's FAQ guidelines require.
 */

export interface FaqItem {
  q: string;
  a: string;
}

export function faqPageJsonLd(items: FaqItem[]): Record<string, unknown> | null {
  const clean = items.filter((i) => i.q?.trim() && i.a?.trim());
  if (!clean.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: clean.map((i) => ({
      "@type": "Question",
      name: i.q.trim(),
      acceptedAnswer: { "@type": "Answer", text: i.a.trim() },
    })),
  };
}

/** Section headings that open a question block in a blog article. */
const FAQ_HEADING = /^(част\S*\s+(питання|вопросы)|питання\s+(і|та)\s+відповіді|вопросы\s+и\s+ответы|faq)(?![a-zа-яёіїєґ'’])/i;

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/**
 * The questions an article answers in its "Часті питання" section: each
 * <h3> that ends with "?" and the paragraphs under it, up to the next
 * heading. Only that section counts — a question used as a heading elsewhere
 * in the text is not an FAQ entry.
 */
export function faqFromArticleHtml(html: string): FaqItem[] {
  const parts = html.split(/(?=<h2[\s>])/i);
  const section = parts.find((part) => {
    const m = part.match(/^<h2[^>]*>([\s\S]*?)<\/h2>/i);
    return m ? FAQ_HEADING.test(text(m[1])) : false;
  });
  if (!section) return [];
  const items: FaqItem[] = [];
  for (const block of section.split(/(?=<h3[\s>])/i).slice(1)) {
    const m = block.match(/^<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*)$/i);
    if (!m) continue;
    const q = text(m[1]);
    const a = text(m[2].split(/<h[1-6][\s>]/i)[0]);
    if (q.endsWith("?") && a) items.push({ q, a });
  }
  return items;
}
