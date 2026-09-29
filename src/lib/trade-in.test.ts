import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatTradeInTelegramHtml,
  normalizePhone,
  validateTradeIn,
  type TradeInRequest,
} from "./trade-in";

const good = {
  model: "Pulsar Axion XQ38",
  condition: "good" as const,
  name: "Сергій",
  phone: "0631112233",
};

describe("trade-in phone", () => {
  it("accepts the ways Ukrainians write their number", () => {
    for (const raw of [
      "0631112233",
      "063 111 22 33",
      "+38 063 111-22-33",
      "380631112233",
      "80631112233",
    ]) {
      assert.equal(normalizePhone(raw), "+380631112233", raw);
    }
  });

  it("rejects what we could not call back", () => {
    for (const raw of ["", "123", "не скажу", "12345678901234"]) {
      assert.equal(normalizePhone(raw), null, raw);
    }
  });
});

describe("trade-in validation", () => {
  it("passes a filled form and normalizes the phone", () => {
    const r = validateTradeIn({ ...good, askingPrice: "45 000" as unknown as number });
    assert.equal(r.ok, true);
    assert.equal(r.value!.phone, "+380631112233");
    assert.equal(r.value!.askingPrice, 45000);
  });

  it("does not require a price — the seller may want ours first", () => {
    const r = validateTradeIn(good);
    assert.equal(r.ok, true);
    assert.equal(r.value!.askingPrice, null);
  });

  it("names every missing field at once", () => {
    const r = validateTradeIn({ model: "x", condition: "wat" as never });
    assert.equal(r.ok, false);
    assert.deepEqual(Object.keys(r.errors).sort(), [
      "condition",
      "model",
      "name",
      "phone",
    ]);
  });

  it("drops values that are not ours to trust", () => {
    const r = validateTradeIn({
      ...good,
      extras: ["box", "yacht"] as never,
      defects: ["optics", "curse"] as never,
      photoUrls: ["https://ok/1.jpg", "javascript:alert(1)"] as never,
    });
    assert.deepEqual(r.value!.extras, ["box"]);
    assert.deepEqual(r.value!.defects, ["optics"]);
    assert.deepEqual(r.value!.photoUrls, ["https://ok/1.jpg"]);
  });

  it("refuses an absurd asking price", () => {
    const r = validateTradeIn({ ...good, askingPrice: 9_000_000 as never });
    assert.equal(r.ok, false);
    assert.ok(r.errors.askingPrice);
  });
});

describe("trade-in telegram message", () => {
  const base: TradeInRequest = {
    model: "Pulsar Axion XQ38",
    productSlug: "pulsar-axion-xq38",
    newPrice: 95000,
    condition: "good",
    extras: ["box", "docs"],
    defects: ["none"],
    askingPrice: 45000,
    comment: "Користувався сезон",
    name: "Сергій",
    phone: "+380631112233",
    contactVia: "Telegram",
    photoUrls: ["https://x/1.jpg", "https://x/2.jpg"],
    createdAt: "2026-09-29T09:00:00.000Z",
  };

  it("carries what the consultant needs to decide", () => {
    const html = formatTradeInTelegramHtml(base);
    assert.match(html, /Pulsar Axion XQ38/);
    assert.match(html, /Нова в каталозі: 95\s?000 грн/);
    assert.match(html, /Хоче отримати:<\/b>\s*45\s?000 грн/);
    assert.match(html, /коробка, документи/);
    assert.match(html, /\+380631112233/);
    assert.match(html, /фото 2/);
  });

  it("says plainly when no price was named", () => {
    const html = formatTradeInTelegramHtml({ ...base, askingPrice: null });
    assert.match(html, /Ціну не вказав/);
  });

  it("hides the defect row when there are none", () => {
    assert.ok(!/Дефекти/.test(formatTradeInTelegramHtml(base)));
    assert.match(
      formatTradeInTelegramHtml({ ...base, defects: ["optics"] }),
      /Дефекти:<\/b>\s*оптика/,
    );
  });

  it("escapes what the seller typed", () => {
    const html = formatTradeInTelegramHtml({
      ...base,
      comment: "<script>alert(1)</script>",
    });
    assert.ok(!html.includes("<script>"));
    assert.match(html, /&lt;script&gt;/);
  });
});
