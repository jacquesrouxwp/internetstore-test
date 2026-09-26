import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Product } from "@/types";
import { MERCHANT_DISAPPROVED_IDS } from "@/data/merchant-disapproved-ids";
import {
  isMerchantEligible,
  merchantBlockReason,
} from "./merchant-eligibility";

function product(over: Partial<Product> = {}): Product {
  return {
    id: "1",
    slug: "hikmicro-lynx-lh19",
    sku: "HM-LH19",
    nameUk: "Тепловізор HikMicro LYNX LH19 3.0",
    nameRu: "Тепловизор HikMicro LYNX LH19 3.0",
    descriptionUk: "",
    descriptionRu: "",
    shortUk: null,
    shortRu: null,
    price: 45000,
    oldPrice: null,
    stock: 3,
    brandId: "b1",
    brandSlug: "hikmicro",
    brandName: "HikMicro",
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

describe("merchant eligibility", () => {
  it("keeps a handheld thermal monocular", () => {
    assert.equal(merchantBlockReason(product(), "HM-LH19"), null);
    assert.equal(isMerchantEligible(product(), "HM-LH19"), true);
  });

  it("drops anything in a weapon category", () => {
    for (const categorySlug of ["pricili", "pricili-pnb", "nasadky"]) {
      assert.equal(
        merchantBlockReason(product({ categorySlug }), "X1"),
        "weapon-category",
        categorySlug,
      );
    }
  });

  it("drops scopes and clip-ons by device type", () => {
    assert.equal(
      merchantBlockReason(product({ deviceType: "scope" }), "X2"),
      "weapon-device",
    );
    assert.equal(
      merchantBlockReason(product({ deviceType: "clipon" }), "X3"),
      "weapon-device",
    );
  });

  it("drops a mount filed under thermal imagers", () => {
    const mount = product({
      categorySlug: "aksesuary",
      deviceType: null,
      nameUk: "Швидкознімний кронштейн NVECTECH на Weaver",
      nameRu: "Быстросъёмный кронштейн NVECTECH на Weaver",
      slug: "nvectech-kronshteyn-weaver",
    });
    assert.equal(merchantBlockReason(mount, "123-66-A-W"), "disapproved");
    assert.equal(
      merchantBlockReason({ ...mount, sku: "NEW" } as Product, "NEW"),
      "weapon-name",
    );
  });

  it("drops an id Google already refused, whatever the category says", () => {
    const id = Array.from(MERCHANT_DISAPPROVED_IDS)[0];
    assert.equal(merchantBlockReason(product(), id), "disapproved");
  });

  it("carries the whole export of refused ids", () => {
    assert.ok(
      MERCHANT_DISAPPROVED_IDS.size > 600,
      `expected the 2026-09-26 export, got ${MERCHANT_DISAPPROVED_IDS.size}`,
    );
  });
});
