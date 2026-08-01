import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeSpecs, resolutionString } from "./optics-pro-normalize";

// Real additionalProperty pairs pulled from a live product page
// (ua/teplovizori/teplovizory-hikmicro/teplovizor-hikmicro-lynx-le10-3-0),
// 2026-08-01 -- used as a fixture so the parser is proven against real markup.
const HIKMICRO_LYNX_LE10_SPECS = [
  { name: "Максимальна дальність виявлення, м", value: "900" },
  { name: "Матриця: пікселі, мкм, < NETD мК", value: "256х192, 12, 20" },
  { name: "Вбудований лазерний далекомір", value: "Ні" },
  { name: "Дисплей: технологія, пікселі", value: "AMOLED, 1024х768" },
  { name: "Збільшення, х", value: "1.4-11.2" },
  { name: "Роздільна здатність матриці, піксель", value: "256х192" },
  { name: "Крок пікселю, мкм", value: "12" },
  { name: "Різниця температур матриці (NETD) ", value: "20" },
  { name: "Частота матриці, Гц", value: "50" },
  { name: "Об’єктив, мм", value: "9.7" },
  { name: "Мінімальна кратність збільшення, х", value: "1.4" },
  { name: "Максимальна кратність збільшення, х", value: "11.2" },
  { name: "Дальність виявлення, м", value: "900" },
  { name: "Тип дисплею", value: "AMOLED" },
  { name: "Роздільна здатність дисплею, піксель", value: "1024х768" },
  { name: "Наявність мікрофону", value: "Так" },
  { name: "Об’єм вбудованої пам’яті, гб", value: "64" },
  { name: "Підтримка Wi-Fi", value: "Так" },
  { name: "Підтримка Bluetooth", value: "Ні" },
  { name: "Рівень захисту", value: "IP67" },
  { name: "Температура експлуатації, °С", value: "-30...+45" },
  { name: "Автономна робота, г", value: "5.5" },
  { name: "Акумулятор", value: "Змінний" },
  { name: "Тип акумулятора", value: "18650" },
  { name: "Габаритні розміри, мм", value: "156.3х53.6х49.5" },
  { name: "Гарантія, місяців", value: "24" },
  { name: "Вага, грам", value: "291.5" },
];

describe("normalizeSpecs", () => {
  it("extracts every scoring/filter field from a real product's specs", () => {
    const n = normalizeSpecs(HIKMICRO_LYNX_LE10_SPECS);
    assert.equal(n.detectionRangeM, 900);
    assert.equal(n.hPixels, 256);
    assert.equal(n.vPixels, 192);
    assert.equal(n.pixelPitchUm, 12);
    assert.equal(n.netdMk, 20);
    assert.equal(n.frequencyHz, 50);
    assert.equal(n.focalLengthMm, 9.7);
    assert.equal(n.magnificationMin, 1.4);
    assert.equal(n.magnificationMax, 11.2);
    assert.equal(n.display, "AMOLED");
    assert.equal(n.displayResolution, "1024х768");
    assert.equal(n.ip, "IP67");
    assert.equal(n.weightG, 291.5);
    assert.equal(n.dimensionsMm, "156.3х53.6х49.5");
    assert.equal(n.batteryType, "Змінний");
    assert.equal(n.batteryModel, "18650");
    assert.equal(n.batteryLifeH, 5.5);
    assert.equal(n.warrantyMonths, 24);
    assert.equal(n.hasWifi, true);
    assert.equal(n.hasBluetooth, false);
    assert.equal(n.memoryGb, 64);
    // raw pairs are preserved untouched
    assert.equal(n.raw["Тип акумулятора"], "18650");
    assert.equal(Object.keys(n.raw).length, HIKMICRO_LYNX_LE10_SPECS.length);
  });

  it("strips inequality markers from NETD-style values", () => {
    const n = normalizeSpecs([
      { name: "NETD, мК", value: "≤35" },
      { name: "Різниця температур матриці (NETD)", value: "< 25 мК" },
    ]);
    assert.equal(n.netdMk, 25);
  });

  it("does not invent fields that aren't present", () => {
    const n = normalizeSpecs([{ name: "Колір корпусу", value: "Чорний" }]);
    assert.equal(n.detectionRangeM, undefined);
    assert.equal(n.hPixels, undefined);
    assert.equal(n.raw["Колір корпусу"], "Чорний");
  });
});

describe("resolutionString", () => {
  it("formats as ASCII 'HxV'", () => {
    assert.equal(resolutionString(384, 288), "384x288");
  });
  it("returns null when incomplete", () => {
    assert.equal(resolutionString(undefined, 288), null);
    assert.equal(resolutionString(384, undefined), null);
  });
});
