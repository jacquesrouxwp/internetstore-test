import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterHiddenBrands,
  isBrandHidden,
  sortBrandsByPriority,
  visibleBrandGridBrands,
} from "./brand-priority";
import type { Brand } from "@/types";

function b(slug: string, name: string): Brand {
  return { id: slug, slug, name, logoUrl: null };
}

describe("sortBrandsByPriority", () => {
  it("puts the 7 priority brands first, in the fixed order, regardless of input order", () => {
    const input = [
      b("konus", "KONUS"),
      b("pard", "PARD"),
      b("delta", "Delta"),
      b("guide", "Guide"),
      b("agm", "AGM"),
      b("rix", "Rix"),
      b("thermtec", "ThermTec"),
      b("hikmicro", "HikMicro"),
      b("infiray", "INFIRAY"),
      b("pulsar", "PULSAR"),
    ];
    const sorted = sortBrandsByPriority(input);
    assert.deepEqual(
      sorted.slice(0, 7).map((x) => x.slug),
      ["agm", "hikmicro", "infiray", "pulsar", "thermtec", "pard", "guide"]
    );
    assert.ok(!sorted.some((x) => x.slug === "rix"));
  });

  it("keeps non-priority brands after, alphabetically; drops hidden brands", () => {
    const input = [b("rix", "Rix"), b("konus", "KONUS"), b("agm", "AGM")];
    const sorted = sortBrandsByPriority(input);
    assert.deepEqual(
      sorted.map((x) => x.slug),
      ["agm", "konus"]
    );
  });

  it("does not mutate the input array", () => {
    const input = [b("konus", "KONUS"), b("agm", "AGM")];
    const copy = [...input];
    sortBrandsByPriority(input);
    assert.deepEqual(input, copy);
  });
});

describe("isBrandHidden / filterHiddenBrands", () => {
  it("hides rix", () => {
    assert.equal(isBrandHidden("rix"), true);
    assert.equal(isBrandHidden("hikmicro"), false);
    assert.deepEqual(
      filterHiddenBrands([b("rix", "Rix"), b("agm", "AGM")]).map((x) => x.slug),
      ["agm"]
    );
  });
});

describe("visibleBrandGridBrands", () => {
  it("drops the brands excluded from the homepage grid, keeps the rest", () => {
    const input = [
      b("agm", "AGM"),
      b("dipol", "Dipol"),
      b("rix", "Rix"),
      b("hikmicro", "HikMicro"),
      b("conotech", "Cono Tech"),
      b("konus", "KONUS"),
      b("seek", "Seek Thermal"),
      b("guide", "Guide"),
      b("leupold", "Leupold"),
    ];
    assert.deepEqual(
      visibleBrandGridBrands(input).map((x) => x.slug),
      ["agm", "hikmicro", "guide", "leupold"]
    );
  });

  it("preserves the incoming order", () => {
    const input = [b("guide", "Guide"), b("rix", "Rix"), b("agm", "AGM")];
    assert.deepEqual(
      visibleBrandGridBrands(input).map((x) => x.slug),
      ["guide", "agm"]
    );
  });
});
