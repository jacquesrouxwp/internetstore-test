import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { localizedProductName, splitProductName } from "./product-name";

const p = (nameUk: string, nameRu?: string) => ({ nameUk, nameRu: nameRu ?? nameUk });

describe("product name split", () => {
  it("takes the longest head, not the first that matches", () => {
    assert.equal(
      splitProductName("Тепловізійний бінокль Pulsar Merger LRF XP50").generic?.uk,
      "Тепловізійний бінокль",
    );
    assert.equal(
      splitProductName("Тепловізор Pulsar Axion XG30").generic?.uk,
      "Тепловізор",
    );
  });

  it("leaves a name it does not recognise alone", () => {
    const s = splitProductName("Щось геть невідоме XYZ");
    assert.equal(s.generic, null);
    assert.equal(s.rest, "Щось геть невідоме XYZ");
  });
});

describe("localized product name", () => {
  it("returns Ukrainian as stored", () => {
    assert.equal(
      localizedProductName(p("Тепловізор Pulsar Axion XG30"), "uk"),
      "Тепловізор Pulsar Axion XG30",
    );
  });

  it("translates the head when name_ru is just a copy", () => {
    assert.equal(
      localizedProductName(p("Тепловізор Pulsar Axion XG30"), "ru"),
      "Тепловизор Pulsar Axion XG30",
    );
    assert.equal(
      localizedProductName(p("Тепловізійний бінокль Pulsar Merger LRF XP50"), "ru"),
      "Тепловизионный бинокль Pulsar Merger LRF XP50",
    );
  });

  it("prefers a Russian name someone actually wrote", () => {
    assert.equal(
      localizedProductName(
        p("Тепловізор Pulsar Axion XG30", "Тепловизор Пульсар Аксион XG30"),
        "ru",
      ),
      "Тепловизор Пульсар Аксион XG30",
    );
  });

  it("puts the model first in English", () => {
    assert.equal(
      localizedProductName(p("Тепловізор Pulsar Axion XG30"), "en"),
      "Pulsar Axion XG30 Thermal Monocular",
    );
    assert.equal(
      localizedProductName(p("Приціл нічного бачення Pard NV008S LRF"), "en"),
      "Pard NV008S LRF Night Vision Sight",
    );
  });

  it("translates the donor's typos instead of carrying them over", () => {
    assert.equal(
      localizedProductName(p("Тепловізонна насадка Pulsar Core FXQ30"), "ru"),
      "Тепловизионная насадка Pulsar Core FXQ30",
    );
    assert.equal(
      localizedProductName(p("Цифровий пріціл Sytong HT-60"), "ru"),
      "Цифровой прицел Sytong HT-60",
    );
  });

  it("keeps an unknown name rather than inventing a translation", () => {
    assert.equal(localizedProductName(p("Невідомий прилад ABC"), "ru"), "Невідомий прилад ABC");
    assert.equal(localizedProductName(p("Невідомий прилад ABC"), "en"), "Невідомий прилад ABC");
  });

  it("handles a head with nothing after it", () => {
    assert.equal(localizedProductName(p("Наглазник"), "ru"), "Наглазник");
    assert.equal(localizedProductName(p("Наглазник"), "en"), "Eyecup");
  });
});
