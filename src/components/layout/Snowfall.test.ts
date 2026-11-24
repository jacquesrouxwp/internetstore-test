import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inSnowSeason } from "./Snowfall";

describe("snow season", () => {
  it("snows from 24 November to 14 January, Kyiv time", () => {
    assert.equal(inSnowSeason(new Date("2026-11-24T08:00:00Z")), true);
    assert.equal(inSnowSeason(new Date("2026-12-31T20:00:00Z")), true);
    assert.equal(inSnowSeason(new Date("2027-01-14T12:00:00Z")), true);
    assert.equal(inSnowSeason(new Date("2027-01-15T12:00:00Z")), false);
    assert.equal(inSnowSeason(new Date("2026-11-23T12:00:00Z")), false);
    assert.equal(inSnowSeason(new Date("2026-07-01T12:00:00Z")), false);
  });
});
