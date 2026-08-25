import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dedupeRails, railIsWorthShowing, uniqueById } from "./home-rails";

const p = (id: string) => ({ id });
const ids = (list: { id: string }[]) => list.map((x) => x.id);

describe("dedupeRails", () => {
  it("never shows the same product twice across rails", () => {
    // The production bug: one item flagged top+hit+new+sale filled all four.
    const shared = p("habrok");
    const out = dedupeRails(
      [
        [shared, p("a"), p("b")],
        [shared, p("c"), p("d")],
        [shared, p("e"), p("f")],
        [shared, p("g"), p("h")],
      ],
      2
    );
    const all = out.flatMap(ids);
    assert.equal(new Set(all).size, all.length, `repeats in ${all.join(",")}`);
    assert.deepEqual(ids(out[0]), ["habrok", "a"]);
    assert.deepEqual(ids(out[1]), ["c", "d"]);
  });

  it("earlier rails have priority", () => {
    const out = dedupeRails([[p("x")], [p("x"), p("y")]], 2);
    assert.deepEqual(ids(out[0]), ["x"]);
    assert.deepEqual(ids(out[1]), ["y"]);
  });

  it("later rails still fill up when given enough candidates", () => {
    const out = dedupeRails(
      [
        [p("a"), p("b"), p("c")],
        [p("a"), p("b"), p("c"), p("d"), p("e")],
      ],
      3
    );
    assert.deepEqual(ids(out[0]), ["a", "b", "c"]);
    assert.deepEqual(ids(out[1]), ["d", "e"]);
  });

  it("respects ids reserved by a curated rail", () => {
    const out = dedupeRails([[p("featured"), p("a")]], 2, ["featured"]);
    assert.deepEqual(ids(out[0]), ["a"]);
  });

  it("never exceeds perRail", () => {
    const out = dedupeRails([[p("a"), p("b"), p("c"), p("d")]], 2);
    assert.equal(out[0].length, 2);
  });

  it("handles empty rails and empty input", () => {
    assert.deepEqual(dedupeRails([[], []], 4), [[], []]);
    assert.deepEqual(dedupeRails([], 4), []);
  });

  it("keeps rail count and order stable", () => {
    const out = dedupeRails([[p("a")], [], [p("b")]], 2);
    assert.equal(out.length, 3);
    assert.deepEqual(ids(out[2]), ["b"]);
  });
});

describe("uniqueById", () => {
  it("drops nulls from slugs that did not resolve", () => {
    assert.deepEqual(ids(uniqueById([p("a"), null, undefined, p("b")])), [
      "a",
      "b",
    ]);
  });

  it("drops repeats, keeping first order", () => {
    assert.deepEqual(ids(uniqueById([p("a"), p("b"), p("a")])), ["a", "b"]);
  });
});

describe("railIsWorthShowing", () => {
  it("hides a rail that would render as a broken row", () => {
    assert.equal(railIsWorthShowing([p("a"), p("b")]), false);
    assert.equal(railIsWorthShowing([]), false);
  });

  it("shows a rail once it has enough products", () => {
    assert.equal(railIsWorthShowing([p("a"), p("b"), p("c")]), true);
  });
});
