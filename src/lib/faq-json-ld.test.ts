import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { faqFromArticleHtml, faqPageJsonLd } from "./faq-json-ld";

describe("faq from an article", () => {
  it("takes the questions of the FAQ section only", () => {
    const html =
      "<h2>Чи працює тепловізор взимку?</h2><p>Так.</p>" +
      "<h2>Часті питання</h2>" +
      "<h3>Чи можна заряджати тепловізор на морозі?</h3><p>Ні. Спершу <strong>зігрійте</strong> акумулятор.</p>" +
      "<h3>Порада</h3><p>Не питання.</p>" +
      "<h3>Чи бачить тепловізор у туман?</h3><p>Бачить, але гірше.</p><p>Дальність падає.</p>" +
      "<h2>Інше</h2><p>Текст.</p>";
    assert.deepEqual(faqFromArticleHtml(html), [
      { q: "Чи можна заряджати тепловізор на морозі?", a: "Ні. Спершу зігрійте акумулятор." },
      { q: "Чи бачить тепловізор у туман?", a: "Бачить, але гірше. Дальність падає." },
    ]);
  });
  it("reads the Russian heading and finds nothing without one", () => {
    assert.equal(faqFromArticleHtml("<h2>Частые вопросы</h2><h3>Можно ли?</h3><p>Да.</p>").length, 1);
    assert.deepEqual(faqFromArticleHtml("<h2>Коротко</h2><h3>Можно ли?</h3><p>Да.</p>"), []);
  });
});

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
