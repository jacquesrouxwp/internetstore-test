import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogPerformanceScores,
  detectionScore,
  imageQuality,
  netdScore,
  percentile,
  resolutionScore,
  scoreProduct,
  scores,
  specsFromProduct,
  thermalPerformance,
  valueForMoney,
  type Specs,
} from "./thermal-score";
import type { Product } from "@/types";

const base = (over: Partial<Specs> = {}): Specs => ({
  hPixels: 384,
  vPixels: 288,
  pixelPitchUm: 12,
  netdMk: 35,
  refreshHz: 50,
  detectionRangeM: 1500,
  priceEur: 800,
  ...over,
});

function fakeProduct(over: Partial<Product> = {}): Product {
  return {
    id: "1",
    slug: "test",
    nameUk: "Test",
    nameRu: "Test",
    price: 30000,
    stock: 1,
    rating: 4.5,
    reviewsCount: 1,
    isHit: false,
    isNew: false,
    isTop: false,
    isSale: false,
    images: [],
    specs: {},
    published: true,
    createdAt: new Date().toISOString(),
    ...over,
  };
}

describe("atomic scores", () => {
  it("resolution ladder", () => {
    assert.ok(resolutionScore(256) < resolutionScore(384));
    assert.ok(resolutionScore(384) < resolutionScore(640));
    assert.ok(resolutionScore(1280) >= 95);
  });

  it("NETD lower is better", () => {
    assert.ok(netdScore(20) > netdScore(40));
    assert.ok(netdScore(15) >= 98);
  });

  it("detection ladder", () => {
    assert.ok(detectionScore(400) < detectionScore(1500));
    assert.ok(detectionScore(3900) >= 95);
  });
});

describe("composites — RS75-class vs budget 256", () => {
  it("RS75: high perf, moderate value (expensive)", () => {
    // ~1280 / 12µm / ≤25 / D~3900 / ~€3500 (≈147k UAH)
    const rs75 = base({
      hPixels: 1280,
      vPixels: 1024,
      pixelPitchUm: 12,
      netdMk: 20,
      refreshHz: 50,
      detectionRangeM: 3900,
      priceEur: 3500,
    });
    const sc = scores(rs75);
    assert.ok(sc.thermalPerformance >= 85, `perf ${sc.thermalPerformance}`);
    assert.ok(sc.imageQuality >= 85, `iq ${sc.imageQuality}`);
    assert.ok(sc.detectionRange >= 90, `det ${sc.detectionRange}`);
    // expensive → value not top-tier
    assert.ok(sc.valueForMoney <= 70, `value ${sc.valueForMoney}`);
  });

  it("budget 256: lower perf, higher value", () => {
    const budget = base({
      hPixels: 256,
      vPixels: 192,
      netdMk: 40,
      refreshHz: 25,
      detectionRangeM: 800,
      priceEur: 400,
    });
    const sc = scores(budget);
    assert.ok(sc.thermalPerformance < 70, `perf ${sc.thermalPerformance}`);
    const rs75 = scores(
      base({
        hPixels: 1280,
        vPixels: 1024,
        netdMk: 20,
        detectionRangeM: 3900,
        priceEur: 3500,
        refreshHz: 50,
      })
    );
    assert.ok(sc.valueForMoney > rs75.valueForMoney);
  });

  it("determinism: same specs → same scores", () => {
    const s = base({ hPixels: 640, netdMk: 25, detectionRangeM: 2200 });
    assert.deepEqual(scores(s), scores(s));
    assert.equal(thermalPerformance(s), thermalPerformance({ ...s }));
    assert.equal(imageQuality(s), imageQuality({ ...s }));
    assert.equal(valueForMoney(s), valueForMoney({ ...s }));
  });
});

describe("percentile", () => {
  it("ranks correctly", () => {
    const all = [40, 50, 60, 70, 80];
    assert.equal(percentile(70, all), 60); // 40,50,60 strictly lower → 3/5
    assert.equal(percentile(40, all), 0);
    assert.equal(percentile(80, all), 80);
  });

  it("catalogPerformanceScores consistent order", () => {
    const products = [
      fakeProduct({
        id: "a",
        resolution: "256x192",
        detectionRangeM: 700,
        price: 18000,
        specs: { NETD: "40 mK", Частота: "25 Гц" },
      }),
      fakeProduct({
        id: "b",
        resolution: "640x512",
        detectionRangeM: 2300,
        price: 55000,
        specs: { NETD: "25 mK", Частота: "50 Гц" },
      }),
    ];
    const list = catalogPerformanceScores(products);
    assert.equal(list.length, 2);
    assert.ok(list[1] > list[0]);
  });
});

describe("specsFromProduct / scoreProduct", () => {
  it("parses matrix, NETD, range, converts UAH→EUR", () => {
    const p = fakeProduct({
      resolution: "640x512",
      detectionRangeM: 2100,
      price: 42000, // 1000 EUR at 42 UAH/EUR
      specs: { NETD: "≤25 mK", Частота: "50 Гц" },
    });
    const s = specsFromProduct(p);
    assert.equal(s.hPixels, 640);
    assert.equal(s.netdMk, 25);
    assert.equal(s.refreshHz, 50);
    assert.equal(s.detectionRangeM, 2100);
    assert.ok(Math.abs(s.priceEur - 1000) < 1);
    const sc = scoreProduct(p).scores;
    assert.ok(sc.thermalPerformance > 0 && sc.thermalPerformance <= 100);
  });

  it("fallback NETD/D by matrix when missing", () => {
    const p = fakeProduct({
      resolution: "384x288",
      detectionRangeM: null,
      specs: {},
      price: 30000,
    });
    const s = specsFromProduct(p);
    assert.equal(s.hPixels, 384);
    assert.ok(s.detectionRangeM >= 1000);
    assert.ok(s.netdMk >= 25);
  });
});
