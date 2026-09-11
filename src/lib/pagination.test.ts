import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogCanonicalPath,
  pageFromQuery,
  paginationHref,
  paginationItems,
} from "./pagination";

const BASE = "/catalog/teplovizori";

describe("paginationHref", () => {
  it("page 1 has no page param — same URL as the plain listing", () => {
    assert.equal(paginationHref(BASE, {}, 1), BASE);
    assert.equal(paginationHref(BASE, { page: "4" }, 1), BASE);
  });

  it("deeper pages carry ?page=N", () => {
    assert.equal(paginationHref(BASE, {}, 3), `${BASE}?page=3`);
  });

  it("keeps active filters, including repeated ones", () => {
    const href = paginationHref(BASE, { brand: ["pulsar", "agm"], sort: "price_asc" }, 2);
    const q = new URLSearchParams(href.split("?")[1]);
    assert.deepEqual(q.getAll("brand"), ["pulsar", "agm"]);
    assert.equal(q.get("sort"), "price_asc");
    assert.equal(q.get("page"), "2");
  });

  it("replaces the current page instead of appending a second one", () => {
    const href = paginationHref(BASE, { page: "5" }, 6);
    assert.equal(new URLSearchParams(href.split("?")[1]).getAll("page").length, 1);
    assert.ok(href.endsWith("page=6"));
  });

  it("drops empty params", () => {
    assert.equal(paginationHref(BASE, { brand: "", min: undefined }, 2), `${BASE}?page=2`);
  });
});

describe("paginationItems", () => {
  it("shows first, last, neighbours and ellipses", () => {
    assert.deepEqual(paginationItems(5, 10), [1, -1, 4, 5, 6, -1, 10]);
  });

  it("no ellipsis when every page fits", () => {
    assert.deepEqual(paginationItems(2, 3), [1, 2, 3]);
  });
});

describe("pageFromQuery", () => {
  it("clamps junk to page 1", () => {
    assert.equal(pageFromQuery({}), 1);
    assert.equal(pageFromQuery({ page: "0" }), 1);
    assert.equal(pageFromQuery({ page: "-3" }), 1);
    assert.equal(pageFromQuery({ page: "abc" }), 1);
    assert.equal(pageFromQuery({ page: "2.7" }), 2);
    assert.equal(pageFromQuery({ page: ["4", "9"] }), 4);
  });
});

describe("catalogCanonicalPath", () => {
  it("each plain page is canonical to itself (not to page 1)", () => {
    assert.equal(catalogCanonicalPath(BASE, {}), BASE);
    assert.equal(catalogCanonicalPath(BASE, { page: "3" }), `${BASE}?page=3`);
  });

  it("filtered or re-sorted views fold into the base listing", () => {
    assert.equal(catalogCanonicalPath(BASE, { brand: "pulsar" }), BASE);
    assert.equal(catalogCanonicalPath(BASE, { sort: "price_asc", page: "2" }), BASE);
    assert.equal(catalogCanonicalPath(BASE, { limit: "48" }), BASE);
  });

  it("an empty filter is not a facet", () => {
    assert.equal(catalogCanonicalPath(BASE, { brand: "", page: "2" }), `${BASE}?page=2`);
  });
});
