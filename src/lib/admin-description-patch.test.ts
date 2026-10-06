import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_DESCRIPTION_LENGTH,
  MIN_DESCRIPTION_LENGTH,
  parseDescriptionPatch,
} from "./admin-description-patch";

const ID = "d3c1f1c4-79df-4673-9cc9-8c6e1b2e4054";
const TEXT = "Тепловізор для спостереження в темряві. ".repeat(10).trim();

describe("description patch", () => {
  it("accepts an id and two real descriptions", () => {
    const parsed = parseDescriptionPatch({ id: ID, descriptionUk: TEXT, descriptionRu: TEXT });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.patch.id, ID);
      assert.equal(parsed.patch.descriptionUk, TEXT);
    }
  });

  it("trims the texts it keeps", () => {
    const parsed = parseDescriptionPatch({
      id: ` ${ID} `,
      descriptionUk: `\n${TEXT}  `,
      descriptionRu: TEXT,
    });
    assert.ok(parsed.ok);
    if (parsed.ok) {
      assert.equal(parsed.patch.id, ID);
      assert.equal(parsed.patch.descriptionUk, TEXT);
    }
  });

  it("refuses an id that is not a uuid, so a slug or a SKU never reaches the database", () => {
    for (const id of ["", "77512", "pulsar-telos-lrf-xq35", undefined, 12, null]) {
      const parsed = parseDescriptionPatch({ id, descriptionUk: TEXT, descriptionRu: TEXT });
      assert.equal(parsed.ok, false, String(id));
    }
  });

  it("refuses to wipe or truncate a description", () => {
    for (const bad of ["", "   ", "Коротко.", "x".repeat(MIN_DESCRIPTION_LENGTH - 1)]) {
      assert.equal(parseDescriptionPatch({ id: ID, descriptionUk: bad, descriptionRu: TEXT }).ok, false);
      assert.equal(parseDescriptionPatch({ id: ID, descriptionUk: TEXT, descriptionRu: bad }).ok, false);
    }
  });

  it("refuses a text that is far too long", () => {
    const huge = "я".repeat(MAX_DESCRIPTION_LENGTH + 1);
    assert.equal(parseDescriptionPatch({ id: ID, descriptionUk: huge, descriptionRu: TEXT }).ok, false);
  });

  it("needs both languages and strings", () => {
    assert.equal(parseDescriptionPatch({ id: ID, descriptionUk: TEXT }).ok, false);
    assert.equal(parseDescriptionPatch({ id: ID, descriptionUk: TEXT, descriptionRu: 42 }).ok, false);
    assert.equal(parseDescriptionPatch(null).ok, false);
    assert.equal(parseDescriptionPatch("text").ok, false);
  });

  it("carries nothing but the id and the two texts", () => {
    const parsed = parseDescriptionPatch({
      id: ID,
      descriptionUk: TEXT,
      descriptionRu: TEXT,
      price: 1,
      specs: { x: "y" },
      isSale: true,
    });
    assert.ok(parsed.ok);
    if (parsed.ok) assert.deepEqual(Object.keys(parsed.patch).sort(), ["descriptionRu", "descriptionUk", "id"]);
  });
});
