import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterHiddenBrandProducts,
  isBrandHidden,
} from "./brand-priority";
import {
  isPromoTickerEnabled,
  isTemporarilyHiddenBlogPost,
  isTemporarilyHiddenBrand,
  isTemporarilyHiddenProduct,
} from "./temporarily-hidden-products";

describe("temporarily hidden Leonardo DRS IWS", () => {
  it("hides the monocular slug and the Leonardo DRS brand", () => {
    assert.equal(
      isTemporarilyHiddenProduct("leonardo-drs-iws-teploviziynyy-monokuliar"),
      true
    );
    assert.equal(isTemporarilyHiddenProduct("hikmicro-lynx"), false);
    assert.equal(isTemporarilyHiddenBrand("leonardo-drs"), true);
    assert.equal(isTemporarilyHiddenBrand("Leonardo DRS"), true);
    assert.equal(isBrandHidden("leonardo-drs"), true);
    assert.equal(isBrandHidden("Leonardo DRS"), true);
    assert.equal(isBrandHidden("hikmicro"), false);
  });

  it("drops the product from public lists and keeps other brands", () => {
    const kept = filterHiddenBrandProducts([
      {
        slug: "leonardo-drs-iws-teploviziynyy-monokuliar",
        brandSlug: "leonardo-drs",
        brandName: "Leonardo DRS",
      },
      { slug: "hikmicro-lynx", brandSlug: "hikmicro", brandName: "HikMicro" },
    ]);
    assert.deepEqual(
      kept.map((p) => p.slug),
      ["hikmicro-lynx"]
    );
  });

  it("hides the sales posts and leaves the ticker switch off", () => {
    assert.equal(
      isTemporarilyHiddenBlogPost("leonardo-drs-iws-unikalna-propozytsiia"),
      true
    );
    assert.equal(
      isTemporarilyHiddenBlogPost("leonardo-drs-istoriia-kompanii"),
      true
    );
    assert.equal(
      isTemporarilyHiddenBlogPost("top-15-teplovizoriv-dlia-polia-boiu"),
      false
    );
    assert.equal(isPromoTickerEnabled(), false);
  });
});
