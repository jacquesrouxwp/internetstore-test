import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatDescription,
  paragraphsFromText,
  splitSentences,
} from "./format-description";

const WALL =
  "HikMicro LYNX LE15 3.0 — компактний тепловізійний монокуляр з матрицею 384×288. " +
  "Об'єктив 15 мм забезпечує баланс між кутом огляду та дальністю. " +
  "Частота оновлення 50 Гц дає плавну картинку під час руху. " +
  "Клас захисту IP67 — повна герметичність при зануренні у воду. " +
  "Автономність до 6,5 годин на одному заряді. " +
  "Підтримка Wi‑Fi для трансляції зображення на смартфон.";

describe("splitSentences", () => {
  it("splits Ukrainian sentences on . + capital", () => {
    const s = splitSentences(
      "Перше речення. Друге речення. Третє речення."
    );
    assert.equal(s.length, 3);
    assert.equal(s[0], "Перше речення.");
    assert.equal(s[2], "Третє речення.");
  });

  it("keeps short text as one piece", () => {
    assert.deepEqual(splitSentences("Одне речення без крапки"), [
      "Одне речення без крапки",
    ]);
  });
});

describe("paragraphsFromText", () => {
  it("returns one paragraph for short copy", () => {
    const blocks = paragraphsFromText("Короткий текст. Ще речення.");
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].type, "paragraph");
  });

  it("splits a wall of text into several paragraphs", () => {
    const blocks = paragraphsFromText(WALL);
    assert.ok(blocks.length >= 2, `expected ≥2 paragraphs, got ${blocks.length}`);
    assert.ok(blocks.every((b) => b.type === "paragraph"));
    const joined = blocks
      .map((b) => (b.type === "paragraph" ? b.text : ""))
      .join(" ");
    assert.ok(joined.includes("IP67"));
    assert.ok(joined.includes("Wi‑Fi") || joined.includes("Wi-Fi") || joined.includes("смартфон"));
  });
});

describe("formatDescription", () => {
  it("handles empty / null", () => {
    assert.deepEqual(formatDescription(""), []);
    assert.deepEqual(formatDescription(null), []);
    assert.deepEqual(formatDescription(undefined), []);
  });

  it("preserves existing blank-line paragraphs", () => {
    const blocks = formatDescription(
      "Перший абзац.\n\nДругий абзац з деталями."
    );
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].type, "paragraph");
    assert.equal(blocks[1].type, "paragraph");
    if (blocks[0].type === "paragraph") {
      assert.ok(blocks[0].text.includes("Перший"));
    }
  });

  it("detects bullet lists", () => {
    const blocks = formatDescription(
      "Комплектація:\n• Монокуляр\n• Чохол\n• Кабель USB"
    );
    assert.ok(blocks.some((b) => b.type === "heading"));
    const list = blocks.find((b) => b.type === "list");
    assert.ok(list && list.type === "list");
    if (list?.type === "list") {
      assert.equal(list.items.length, 3);
      assert.ok(list.items[0].includes("Монокуляр"));
    }
  });

  it("detects dash bullets and numbered items", () => {
    const blocks = formatDescription(
      "Переваги:\n- Легка вага\n- Wi-Fi\n1. Запис відео\n2. LRF"
    );
    const list = blocks.find((b) => b.type === "list");
    assert.ok(list && list.type === "list");
    if (list?.type === "list") {
      assert.ok(list.items.length >= 4);
    }
  });

  it("formats a real-style wall without newlines into multiple blocks", () => {
    const blocks = formatDescription(WALL);
    assert.ok(blocks.length >= 2);
    assert.ok(blocks.every((b) => b.type === "paragraph"));
  });

  it("strips simple HTML line breaks", () => {
    const blocks = formatDescription(
      "<p>Перший блок.</p><p>Другий блок.</p>"
    );
    assert.ok(blocks.length >= 1);
    const text = blocks
      .map((b) => (b.type === "paragraph" ? b.text : ""))
      .join(" ");
    assert.ok(!/<p>/i.test(text));
    assert.ok(text.includes("Перший"));
  });

  it("does not invent words — only restructures", () => {
    const src =
      "Матриця 640×512. Дальність виявлення 1800 м. Захист IP67.";
    const blocks = formatDescription(src);
    const out = blocks
      .map((b) => {
        if (b.type === "paragraph") return b.text;
        if (b.type === "heading") return b.text;
        return b.items.join(" ");
      })
      .join(" ");
    for (const word of ["Матриця", "640", "1800", "IP67"]) {
      assert.ok(out.includes(word), `missing ${word}`);
    }
  });
});
