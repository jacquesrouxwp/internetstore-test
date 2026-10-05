import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Product } from "@/types";
import { MERCHANT_DISAPPROVED_IDS } from "@/data/merchant-disapproved-ids";
import {
  mentionsWeapon,
  productPageDescription,
  stripWeaponSentences,
  stripWeaponSentencesKeepingParagraphs,
} from "./merchant-description";

function product(over: Partial<Product> = {}): Product {
  return {
    id: "1",
    slug: "infiray-xeye-2-e3-max-v2",
    sku: "TEST-XEYE-E3-MAX-V2",
    nameUk: "Тепловізор INFIRAY (IRAY) XEYE 2 E3 MAX V2",
    nameRu: "Тепловизор INFIRAY (IRAY) XEYE 2 E3 MAX V2",
    descriptionUk: "",
    descriptionRu: "",
    shortUk: null,
    shortRu: null,
    price: 30000,
    oldPrice: null,
    stock: 1,
    brandId: "b1",
    brandSlug: "infiray",
    brandName: "INFIRAY",
    categoryId: "c1",
    categorySlug: "teplovizori",
    deviceType: "mono",
    resolution: "384x288",
    rating: 0,
    reviewsCount: 0,
    images: ["/img.jpg"],
    specs: {},
    published: true,
    createdAt: "2026-01-01",
    ...over,
  } as Product;
}

// Taken from the live page of XEYE 2 E3 MAX V2 on 5 October.
const MONOCULAR_UK =
  "Тепловізор INFIRAY XEYE 2 E3 MAX V2 — монокуляр для спостереження. " +
  "Бренд INFIRAY у цій картці важливий для сумісності кріплень, живлення та сервісної логіки.\n\n" +
  "Матриця 384×288 дає запас по деталях. " +
  "Габарити 186х65х64 мм допомагають зрозуміти, як прилад сяде в рюкзак чи на зброю.\n\n" +
  "Для стрільби цього формфактора недостатньо — потрібен тепловізійний приціл або насадка.\n\n" +
  "Живлення від вбудованого акумулятора.";

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

describe("product page description", () => {
  it("keeps paragraphs and drops a paragraph that only talked about weapons", () => {
    const clean = stripWeaponSentencesKeepingParagraphs(MONOCULAR_UK);
    assert.equal(
      clean,
      "Тепловізор INFIRAY XEYE 2 E3 MAX V2 — монокуляр для спостереження.\n\n" +
        "Матриця 384×288 дає запас по деталях.\n\n" +
        "Живлення від вбудованого акумулятора.",
    );
  });

  it("cleans the page of a monocular Google is offered", () => {
    const text = productPageDescription(product({ descriptionUk: MONOCULAR_UK }), "uk");
    assert.ok(!mentionsWeapon(text), text);
    assert.match(text, /Матриця 384×288/);
  });

  it("cleans the Russian page from the Russian text", () => {
    const text = productPageDescription(
      product({
        descriptionRu:
          "Монокуляр для наблюдения. Для стрельбы этого формфактора недостаточно — нужен прицел.",
      }),
      "ru",
    );
    assert.equal(text, "Монокуляр для наблюдения.");
  });

  it("leaves a sight's page as written", () => {
    const sight = product({
      sku: "TEST-SIGHT-1",
      categorySlug: "pricili",
      deviceType: "scope",
      nameUk: "Тепловізійний приціл Pulsar Thermion 2",
      descriptionUk: "Приціл ставиться на планку Picatinny і тримає нуль після пострілу.",
    });
    assert.equal(productPageDescription(sight, "uk"), sight.descriptionUk);
  });

  it("takes weapon talk off an accessory page but keeps its mounts", () => {
    // Pulsar Battery Pack IPS7: the same generator phrase as on the monoculars.
    const battery = product({
      sku: "TEST-IPS7",
      categorySlug: "aksesuary",
      deviceType: null,
      nameUk: "Акумуляторний блок Pulsar Battery Pack IPS7 для Trail/Helion",
      descriptionUk:
        "Бренд PULSAR у цій картці важливий для сумісності кріплень, живлення та сервісної логіки. " +
        "Габарити 73x47x30 мм допомагають зрозуміти, як прилад сяде в рюкзак чи на зброю. " +
        "Ємність 6400 мА·год.",
    });
    assert.equal(
      productPageDescription(battery, "uk"),
      "Бренд PULSAR у цій картці важливий для сумісності кріплень, живлення та сервісної логіки. " +
        "Ємність 6400 мА·год.",
    );
  });

  it("leaves a product Google is not offered as written", () => {
    const refused = product({
      sku: Array.from(MERCHANT_DISAPPROVED_IDS)[0],
      descriptionUk: "Для стрільби цього формфактора недостатньо.",
    });
    assert.equal(productPageDescription(refused, "uk"), refused.descriptionUk);
  });

  it("leaves a helmet adapter's page as written", () => {
    const helmet = product({
      sku: "TEST-HELMET-1",
      categorySlug: "aksesuary",
      deviceType: null,
      nameUk: "Адаптер для встановлення тепловізорів на шолом Udapt THM-2",
      descriptionUk: "Кріплення потрібне, щоб зафіксувати тепловізійний прилад на шоломі.",
    });
    assert.equal(productPageDescription(helmet, "uk"), helmet.descriptionUk);
  });
});
