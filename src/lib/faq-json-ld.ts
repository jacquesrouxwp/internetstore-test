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
