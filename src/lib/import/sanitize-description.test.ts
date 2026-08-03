import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  sanitizeDonorDescription,
  hasCompetitorMention,
} from "./sanitize-description";

// Real tail of an imported description (HikMicro Lynx LE15 3.0), which named
// the donor shop as the brand's official representative on our storefront.
const REAL_TAIL =
  "Клас захисту IP67 — повна герметичність при зануренні у воду. " +
  "Комплектація приладу Тепловізійний монокуляр HikMicro Lynx LE15 3.0. " +
  "Чому варто купити HikMicro Lynx LE15 3.0 в Оптикс-Про? " +
  "Магазин Optics-Pro є офіційним представником бренду HikMicro в Україні. " +
  "Купуючи у нас, ви отримуєте: Гарантію якості: Кожен прилад проходить передпродажну перевірку. " +
  "Швидку логістику: Доставка по Україні здійснюється в найкоротші терміни.";

describe("sanitizeDonorDescription", () => {
  it("removes the donor's self-promotion but keeps the product facts", () => {
    const r = sanitizeDonorDescription(REAL_TAIL);
    assert.equal(hasCompetitorMention(r.text), false);
    assert.ok(r.hadCompetitor);
    assert.ok(r.text.includes("Клас захисту IP67"), "product fact kept");
    assert.ok(r.text.includes("Комплектація приладу"), "contents kept");
    assert.ok(!/Оптикс-Про|Optics-Pro/i.test(r.text));
    assert.ok(!/Швидку логістику/i.test(r.text), "shop promise dropped");
  });

  it("drops shop-service promises we cannot make on our own behalf", () => {
    const r = sanitizeDonorDescription(
      "Матриця 384x288. Наші фахівці допоможуть з налаштуванням. Вага 300 г."
    );
    assert.ok(r.text.includes("Матриця 384x288"));
    assert.ok(r.text.includes("Вага 300 г"));
    assert.ok(!/фахівці/i.test(r.text));
  });

  it("leaves a clean description untouched", () => {
    const clean =
      "Тепловізор із матрицею 640x512. Дальність виявлення 1800 м. Захист IP67.";
    const r = sanitizeDonorDescription(clean);
    assert.equal(r.text, clean);
    assert.equal(r.removedSentences.length, 0);
    assert.equal(r.hadCompetitor, false);
  });

  it("handles empty input", () => {
    assert.equal(sanitizeDonorDescription("").text, "");
    assert.equal(sanitizeDonorDescription(null).text, "");
    assert.equal(sanitizeDonorDescription(undefined).hadCompetitor, false);
  });

  it("does not leave dangling punctuation after a cut", () => {
    const r = sanitizeDonorDescription(
      "Матриця 256x192. Купуючи у нас, ви отримуєте:"
    );
    assert.equal(r.text, "Матриця 256x192.");
  });
});
