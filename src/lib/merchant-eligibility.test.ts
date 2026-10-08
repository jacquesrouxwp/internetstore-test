import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Product } from "@/types";
import { MERCHANT_DISAPPROVED_IDS } from "@/data/merchant-disapproved-ids";
import {
  isMerchantEligible,
  merchantBlockReason,
  merchantItemId,
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

describe("accessories on a weapon rail", () => {
  const powerSupply = product({
    sku: "ARMASIGHT-EPS",
    slug: "armasight-dzherelo-zhyvlennya",
    categorySlug: "aksesuary",
    deviceType: null,
    nameUk: "Джерело зовнішнього живлення Armasight",
    nameRu: "Источник внешнего питания Armasight",
    descriptionUk:
      "Кріплення типу Picatinny та Weaver ставить блок на ту саму рейку поруч із оптикою. " +
      "Корпус займає короткий відрізок рейки, тож блок лишається на зброї.",
  });

  it("refuses an accessory whose own text puts it on the rail", () => {
    assert.equal(merchantBlockReason(powerSupply, "ARMASIGHT-EPS"), "weapon-rail");
  });

  it("keeps an accessory that mounts on a helmet", () => {
    const helmet = product({
      sku: "UDAPT-THM-2",
      slug: "udapt-thm-2",
      categorySlug: "aksesuary",
      deviceType: null,
      nameUk: "Адаптер для встановлення тепловізорів на шолом Udapt THM-2",
      nameRu: "Адаптер для установки тепловизоров на шлем Udapt THM-2",
      descriptionUk:
        "Кріплення потрібне, щоб зафіксувати тепловізійний прилад на шоломі. " +
        "Габарит тримає кронштейн близько до шолома.",
    });
    assert.equal(merchantBlockReason(helmet, "UDAPT-THM-2"), null);
  });

  it("does not hold a rail against a device", () => {
    // Pulsar Digiforce X970: a Weaver rail for an IR illuminator.
    const nightVision = product({
      sku: "PULSAR-X970",
      categorySlug: "pnb",
      deviceType: "mono",
      nameUk: "Цифровий монокуляр нічного бачення Pulsar Digiforce X970",
      descriptionUk: "У паспорті також є позиція «Кріплення»: Планка Weaver для дод.",
    });
    assert.equal(merchantBlockReason(nightVision, "PULSAR-X970"), null);
  });
});

describe("feed ids", () => {
  it("publishes the SKU as the id, or the slug when there is none", () => {
    assert.equal(merchantItemId({ sku: " HM-LH19 ", slug: "x" }), "HM-LH19");
    assert.equal(merchantItemId({ sku: null, slug: "hikmicro-lynx" } as never), "hikmicro-lynx");
    assert.equal(merchantItemId({ sku: "", slug: "a".repeat(80) }).length, 50);
    // 46 characters, 53 bytes: Google counts bytes, so the slug is used instead.
    const long = { sku: "Батарея HikMicro THUNDER 2.0 Battery HM-3644DC", slug: "hikmicro-battery-hm-3644dc" };
    assert.equal(merchantItemId(long), "hikmicro-battery-hm-3644dc");
    // A Cyrillic SKU that fits in 50 bytes stays as it is.
    assert.equal(merchantItemId({ sku: "Тепловизор PULSAR Quantum XD38S (50 Hz)", slug: "x" }), "Тепловизор PULSAR Quantum XD38S (50 Hz)");
  });
});
