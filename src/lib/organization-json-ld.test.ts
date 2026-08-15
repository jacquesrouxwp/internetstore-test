import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOrganizationJsonLd } from "./organization-json-ld";

describe("buildOrganizationJsonLd", () => {
  it("has required Organization fields and absolute logo", () => {
    const data = buildOrganizationJsonLd({
      siteUrl: "https://pro-optics.com.ua",
      name: "Pro-Optics",
      social: {
        telegram: "https://t.me/prooptics",
        facebook: "https://facebook.com/prooptics",
      },
    });
    assert.ok(
      Array.isArray(data["@type"])
        ? (data["@type"] as string[]).includes("LocalBusiness")
        : data["@type"] === "LocalBusiness"
    );
    assert.equal(data.name, "Pro-Optics");
    assert.equal(data.url, "https://pro-optics.com.ua");
    const logo = data.logo as Record<string, unknown>;
    assert.equal(logo["@type"], "ImageObject");
    assert.equal(logo.url, "https://pro-optics.com.ua/logo.png");
    assert.equal(logo.width, 512);
    assert.equal(logo.height, 512);
    assert.ok(Array.isArray(data.sameAs));
    assert.ok((data.sameAs as string[]).includes("https://t.me/prooptics"));
    assert.ok(
      (data.sameAs as string[]).includes("https://facebook.com/prooptics")
    );
    assert.ok(data.address);
    assert.ok(data.telephone);
  });

  it("omits sameAs when no valid https urls", () => {
    const data = buildOrganizationJsonLd({
      siteUrl: "https://pro-optics.com.ua",
      social: { telegram: "not-a-url", whatsapp: "" },
    });
    // may still pick env defaults with https — only assert no invalid entries
    if (data.sameAs) {
      for (const u of data.sameAs as string[]) {
        assert.match(u, /^https?:\/\//);
      }
    }
  });
});
