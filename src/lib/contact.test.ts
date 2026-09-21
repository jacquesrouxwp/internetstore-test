import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicStoreEmail } from "./contact";

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
