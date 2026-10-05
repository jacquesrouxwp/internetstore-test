import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mentionsWeapon, stripWeaponSentences } from "./merchant-description";

describe("merchant description sanitizer", () => {
  it("drops the sentence that cost us fifteen products", () => {
    const text =
      "Тепловізор Pulsar Telos LRF XQ35 — монокуляр для спостереження. " +
      "Матриця 384×288 дає запас по деталях. " +
      "Для стрільби цього формфактора недостатньо — потрібен тепловізійний приціл. " +
      "Вага 600 г дозволяє носити його всю ніч.";
    const { text: clean, removed } = stripWeaponSentences(text);
    assert.equal(removed, 1);
    assert.ok(!mentionsWeapon(clean));
    assert.match(clean, /Матриця 384×288/);
    assert.match(clean, /Вага 600 г/);
  });

  it("catches rails and mounts, not only sights", () => {
    for (const s of [
      "Кріплення типу Picatinny та Weaver ставить блок на рейку.",
      "Блок лишається на зброї і не заважає.",
      "Кронштейн тримає прилад на планці.",
      "Насадка ставиться перед денною оптикою.",
    ]) {
      assert.equal(stripWeaponSentences(s).text, "", s);
    }
  });

  it("leaves an honest observation text alone", () => {
    const text =
      "Монокуляр для спостереження в повній темряві. " +
      "Матриця 640×512, об'єктив 50 мм, вага 560 г. " +
      "Працює до 10 годин від одного заряду.";
    const { text: clean, removed } = stripWeaponSentences(text);
    assert.equal(removed, 0);
    assert.equal(clean, text.replace(/\s+/g, " ").trim());
  });

  it("keeps punctuation when it rejoins", () => {
    const { text } = stripWeaponSentences("Перше речення. Друге речення.");
    assert.equal(text, "Перше речення. Друге речення.");
  });

  it("survives an empty description", () => {
    assert.deepEqual(stripWeaponSentences(""), { text: "", removed: 0 });
  });
});
