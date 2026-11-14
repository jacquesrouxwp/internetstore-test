import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  publicStoreEmail,
  STORE_PHONE_2_DISPLAY,
  STORE_PHONE_2_TEL,
  STORE_PHONE_DISPLAY,
  STORE_PHONE_TEL,
} from "./contact";

describe("store phones", () => {
  it("lists 098 first, shows both as +380 XX XXX XX XX and dials the same +380 number", () => {
    assert.equal(STORE_PHONE_DISPLAY, "+380 98 218 17 82");
    assert.equal(STORE_PHONE_2_DISPLAY, "+380 63 789 76 99");
    assert.equal(STORE_PHONE_TEL, "tel:+380982181782");
    assert.equal(STORE_PHONE_2_TEL, "tel:+380637897699");
  });
});

describe("publicStoreEmail", () => {
  it("drops addresses on the unregistered pro-optics.ua domain", () => {
    assert.equal(publicStoreEmail("info@pro-optics.ua"), null);
    assert.equal(publicStoreEmail(" INFO@Pro-Optics.UA "), null);
  });

  it("keeps real addresses and ignores empty values", () => {
    assert.equal(publicStoreEmail("info@pro-optics.com.ua"), "info@pro-optics.com.ua");
    assert.equal(publicStoreEmail(""), null);
    assert.equal(publicStoreEmail(null), null);
  });
});
