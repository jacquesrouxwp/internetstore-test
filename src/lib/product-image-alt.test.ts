import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  absoluteProductImageUrl,
  absoluteProductImageUrls,
  resolveProductImageAlt,
} from "./product-image-alt";

describe("resolveProductImageAlt", () => {
  it("uses custom alt when present", () => {
    assert.equal(
      resolveProductImageAlt("Name", ["Custom alt", ""], 0),
      "Custom alt"
    );
  });

  it("falls back to product name when alt empty", () => {
    assert.equal(
      resolveProductImageAlt("Тепловізор HikMicro LYNX LH19 3.0", ["", ""], 0),
      "Тепловізор HikMicro LYNX LH19 3.0"
    );
  });

  it("never returns empty string", () => {
    assert.equal(resolveProductImageAlt("", null, 0), "Товар");
  });
});

describe("absoluteProductImageUrl(s)", () => {
  const site = "https://pro-optics.com.ua";

  it("keeps https absolute", () => {
    assert.equal(
      absoluteProductImageUrl(
        "https://cdn.example.com/a.webp",
        site
      ),
      "https://cdn.example.com/a.webp"
    );
  });

  it("prefixes relative paths", () => {
    assert.equal(
      absoluteProductImageUrl("/products/x.jpg", site),
      "https://pro-optics.com.ua/products/x.jpg"
    );
  });

  it("dedupes and skips empty", () => {
    assert.deepEqual(
      absoluteProductImageUrls(
        ["/a.jpg", "", "/a.jpg", "https://x.com/b.webp"],
        site
      ),
      [
        "https://pro-optics.com.ua/a.jpg",
        "https://x.com/b.webp",
      ]
    );
  });
});
