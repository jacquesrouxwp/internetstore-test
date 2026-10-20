import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dropUkrainianSentences, ruSpecValue } from "./spec-ru";
import { buildSpecRows } from "./product-specs";

describe("ruSpecValue", () => {
  it("turns yes/no answers into Russian", () => {
    assert.equal(ruSpecValue("Так"), "Да");
    assert.equal(ruSpecValue("Ні"), "Нет");
    assert.equal(ruSpecValue("Так/Так"), "Да/Да");
    assert.equal(ruSpecValue("Ні/Так"), "Нет/Да");
    assert.equal(ruSpecValue("Так, 2.4 GHz 802.11 b/g/n"), "Да, 2.4 GHz 802.11 b/g/n");
  });

  it("translates the common supplier phrases", () => {
    assert.equal(ruSpecValue("Змінний"), "Сменный");
    assert.equal(ruSpecValue("VOx (оксид ванадію)"), "VOx (оксид ванадия)");
    assert.equal(ruSpecValue("Ні, вбудована 32"), "Нет, встроенная 32");
    assert.equal(ruSpecValue("Вбудований запис фото та відео"), "Встроенная запись фото и видео");
    assert.equal(ruSpecValue("Від 10 до нескінченності"), "От 10 до бесконечности");
    assert.equal(ruSpecValue("4 (без ІК), 2,5 ... 3,5 (з ІК)"), "4 (без ИК), 2,5 ... 3,5 (с ИК)");
  });

  it("leaves Russian, neutral and untranslatable values alone", () => {
    assert.equal(ruSpecValue("640x480"), "640x480");
    assert.equal(ruSpecValue("12 месяцев"), "12 месяцев");
    // Half a translation reads worse than the Ukrainian original
    const odd = "Змінна цифрова сітка (кількість попередньо завантажених сіток понад 10)";
    assert.equal(ruSpecValue(odd), odd);
  });

  it("does not touch Ukrainian letters inside other words", () => {
    assert.equal(ruSpecValue("Тип B, Ні"), "Тип B, Нет");
    assert.equal(ruSpecValue("Іспанія"), "Іспанія");
  });
});

describe("buildSpecRows for /ru", () => {
  it("shows supplier names and values in Russian", () => {
    const rows = buildSpecRows(
      { "Вага, гр": "100", "Підтримка Wi-Fi": "Так", "Тип батареї": "Змінний" },
      { locale: "ru" },
    );
    assert.deepEqual(
      rows.map((r) => [r.label, r.value]),
      [
        ["Вес, г", "100"],
        ["Поддержка Wi-Fi", "Да"],
        ["Тип батареи", "Сменный"],
      ],
    );
  });

  it("keeps the Ukrainian page as it was", () => {
    const rows = buildSpecRows({ "Вага, гр": "100", "Підтримка Wi-Fi": "Так" }, { locale: "uk" });
    assert.deepEqual(
      rows.map((r) => [r.label, r.value]),
      [
        ["Вага, гр", "100"],
        ["Підтримка Wi-Fi", "Так"],
      ],
    );
  });
});

describe("dropUkrainianSentences", () => {
  it("drops sentences that quote Ukrainian spec names", () => {
    assert.equal(
      dropUkrainianSentences(
        "Вес 100 г делает прибор удобным. Также в спецификации указано: Вага, гр — 100. Светосила F1.1 и 2.4 GHz.",
      ),
      "Вес 100 г делает прибор удобным. Светосила F1.1 и 2.4 GHz.",
    );
  });
});
