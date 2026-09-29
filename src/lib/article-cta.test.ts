import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { articleCatalogLinks } from "./article-cta";

const hrefs = (html: string) =>
  articleCatalogLinks(html, "uk").map((l) => l.href);

describe("article catalogue links", () => {
  it("follows what the article is about", () => {
    assert.deepEqual(
      hrefs("<p>Матриця 384 проти 640 — що обрати?</p>"),
      [
        "/catalog/teplovizori/matrytsia-640",
        "/catalog/teplovizori/matrytsia-384",
      ],
    );
    assert.deepEqual(hrefs("<p>Модель з LRF міряє дистанцію.</p>"), [
      "/catalog/teplovizori/z-dalekomirom",
    ]);
    assert.deepEqual(hrefs("<p>Прилад нічного бачення проти тепловізора</p>"), [
      "/catalog/pnb",
    ]);
  });

  it("reads the text, not the markup", () => {
    // "640" inside a class name or a URL must not decide the links
    assert.deepEqual(
      hrefs('<img class="w-640" src="/img/384.jpg" alt="фото" /><p>Огляд.</p>'),
      ["/catalog/teplovizori"],
    );
  });

  it("never leaves the block without a door", () => {
    assert.deepEqual(hrefs("<p>Загальний текст без цифр.</p>"), [
      "/catalog/teplovizori",
    ]);
    assert.deepEqual(hrefs(""), ["/catalog/teplovizori"]);
  });

  it("stops at four links", () => {
    const busy =
      "<p>256, 384, 640, LRF, приціл, насадка, ПНБ, бінокль — усе разом.</p>";
    assert.equal(articleCatalogLinks(busy, "uk").length, 4);
  });

  it("labels in the reader's language", () => {
    assert.equal(
      articleCatalogLinks("<p>матриця 640</p>", "ru")[0].label,
      "Тепловизоры 640",
    );
  });
});
