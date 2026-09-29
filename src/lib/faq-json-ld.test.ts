import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { faqPageJsonLd } from "./faq-json-ld";

describe("faq json-ld", () => {
  it("wraps questions as a FAQPage", () => {
    const data = faqPageJsonLd([
      { q: "Скільки коштують тепловізори Pulsar?", a: "Від 30 000 грн." },
    ]) as Record<string, unknown>;
    assert.equal(data["@type"], "FAQPage");
    const main = data.mainEntity as Record<string, unknown>[];
    assert.equal(main.length, 1);
    assert.equal(main[0].name, "Скільки коштують тепловізори Pulsar?");
    assert.deepEqual(main[0].acceptedAnswer, {
      "@type": "Answer",
      text: "Від 30 000 грн.",
    });
  });

  it("drops half-empty pairs and stays silent when nothing is left", () => {
    assert.equal(
      (faqPageJsonLd([{ q: "Питання?", a: "  " }]) as unknown),
      null,
    );
    const data = faqPageJsonLd([
      { q: "Питання?", a: "  " },
      { q: "Друге?", a: "Відповідь." },
    ]) as Record<string, unknown>;
    assert.equal((data.mainEntity as unknown[]).length, 1);
  });

  it("says nothing for an empty list", () => {
    assert.equal(faqPageJsonLd([]), null);
  });
});
