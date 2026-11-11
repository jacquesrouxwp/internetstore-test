import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { linkifyPhonesHtml, splitPhones } from "./phone-links";

const DISPLAY = "+380 63 789 76 99";
const LINK = `<a href="tel:+380637897699" class="phone-link">${DISPLAY}</a>`;

describe("linkifyPhonesHtml", () => {
  it("links the store number in the formats used on the site", () => {
    for (const n of [
      "063 789-76-99",
      "063 789 76 99",
      "+38 (063) 789-76-99",
      "+380637897699",
      "+380 63 789 76 99",
      "0637897699",
    ]) {
      assert.equal(linkifyPhonesHtml(`<p>Тел. ${n}.</p>`), `<p>Тел. ${LINK}.</p>`);
    }
  });

  it("keeps the surrounding markup", () => {
    assert.equal(
      linkifyPhonesHtml("<p>Консультант: <strong>063 789-76-99</strong>.</p>"),
      `<p>Консультант: <strong>${LINK}</strong>.</p>`
    );
  });

  it("leaves numbers that are already links and attributes alone", () => {
    const linked = '<a href="tel:+380637897699">063 789-76-99</a>';
    assert.equal(linkifyPhonesHtml(linked), linked);
    const attr = '<img alt="063 789-76-99" src="/a.jpg">';
    assert.equal(linkifyPhonesHtml(attr), attr);
  });

  it("does not touch other numbers", () => {
    const html = "<p>Ціна 199 999 грн, матриця 2560×1440, 1063 789 76 991.</p>";
    assert.equal(linkifyPhonesHtml(html), html);
  });
});

describe("the second number", () => {
  it("links 098 218-17-82 to itself", () => {
    const shown = "+380 98 218 17 82";
    for (const n of [
      "098 218-17-82",
      "098 218 17 82",
      "+38 (098) 218-17-82",
      "+380982181782",
      "+380 98 218 17 82",
    ]) {
      assert.equal(
        linkifyPhonesHtml(`<p>${n}</p>`),
        `<p><a href="tel:+380982181782" class="phone-link">${shown}</a></p>`,
        n
      );
    }
    assert.deepEqual(splitPhones("або 098 218-17-82"), [
      { text: "або ", phone: false },
      { text: shown, phone: true, tel: "tel:+380982181782" },
    ]);
  });
});

describe("splitPhones", () => {
  it("marks the number inside plain text", () => {
    assert.deepEqual(splitPhones("Дзвоніть 063 789-76-99 щодня"), [
      { text: "Дзвоніть ", phone: false },
      { text: DISPLAY, phone: true, tel: "tel:+380637897699" },
      { text: " щодня", phone: false },
    ]);
  });

  it("returns the text as is when there is no number", () => {
    assert.deepEqual(splitPhones("Без номера"), [{ text: "Без номера", phone: false }]);
  });
});
