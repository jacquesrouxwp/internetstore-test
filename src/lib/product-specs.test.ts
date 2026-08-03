import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSpecRows,
  isInternalSpecKey,
  stripInternalSpecs,
} from "./product-specs";

describe("isInternalSpecKey", () => {
  it("flags underscore-prefixed bookkeeping keys", () => {
    assert.equal(isInternalSpecKey("_sourceUrl"), true);
    assert.equal(isInternalSpecKey("_importedAt"), true);
    assert.equal(isInternalSpecKey(" _rewriteNeeded"), true);
  });

  it("leaves real characteristics alone", () => {
    assert.equal(isInternalSpecKey("Матриця"), false);
    assert.equal(isInternalSpecKey("NETD"), false);
    assert.equal(isInternalSpecKey("netdMk"), false);
  });
});

describe("stripInternalSpecs", () => {
  it("removes only the internal keys", () => {
    const out = stripInternalSpecs({
      "Матриця": "384x288",
      _sourceSite: "optics-pro.com.ua",
      _sourceUrl: "https://www.optics-pro.com.ua/ua/x/y",
      NETD: "20",
    });
    assert.deepEqual(out, { "Матриця": "384x288", NETD: "20" });
  });

  it("tolerates null/undefined", () => {
    assert.deepEqual(stripInternalSpecs(null), {});
    assert.deepEqual(stripInternalSpecs(undefined), {});
  });
});

describe("buildSpecRows — internal keys never reach the storefront", () => {
  // Regression: these were rendered as visible rows in the public
  // characteristics table, exposing the donor site URL to shoppers.
  it("drops import bookkeeping keys", () => {
    const rows = buildSpecRows(
      {
        "Матриця": "384x288",
        _sourceSite: "optics-pro.com.ua",
        _sourceUrl: "https://www.optics-pro.com.ua/ua/x/y",
        _importedAt: "2026-08-01T10:59:29.614Z",
        _rewriteNeeded: "true",
        _imagesFlagged: "donor-gallery-had-unrelated-brand-photos-dropped",
      },
      { locale: "uk" }
    );
    const keys = rows.map((r) => r.label);
    assert.ok(!keys.some((k) => k.startsWith("_")), `leaked: ${keys.join(", ")}`);
    assert.ok(
      !JSON.stringify(rows).includes("optics-pro.com.ua"),
      "donor URL must not reach the storefront"
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].value, "384x288");
  });

  // Regression: the importer's normalized keys duplicated the donor's own
  // rows, so each value appeared twice -- "Вага, грам 291.5" and a raw
  // "weightG 291.5" right next to it.
  it("hides the normalized filter keys but keeps their Ukrainian twins", () => {
    const rows = buildSpecRows(
      {
        "Вага, грам": "291.5",
        weightG: "291.5",
        "Рівень захисту": "IP67",
        ip: "IP67",
        netdMk: "20",
        memoryGb: "64",
        batteryLifeH: "5.5",
      },
      { locale: "uk" }
    );
    const labels = rows.map((r) => r.label);
    assert.ok(labels.includes("Вага, грам"), "human row must survive");
    assert.ok(
      !labels.some((l) => /^(weightG|ip|netdMk|memoryGb|batteryLifeH)$/.test(l)),
      `technical keys leaked: ${labels.join(", ")}`
    );
  });

  it("does not hide a latin-named donor characteristic", () => {
    const rows = buildSpecRows({ microUSB: "Type-C" }, { locale: "uk" });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].label, "microUSB");
  });

  it("still renders genuine characteristics", () => {
    const rows = buildSpecRows(
      { "Матриця": "640x512", NETD: "≤25 мК" },
      { locale: "uk", detectionRangeM: 1800 }
    );
    const values = rows.map((r) => r.value);
    assert.ok(values.includes("640x512"));
    assert.ok(values.includes("≤25 мК"));
    assert.ok(values.includes("1800"));
  });
});
