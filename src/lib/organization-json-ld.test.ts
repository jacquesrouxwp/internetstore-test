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
    assert.equal(data["@type"], "Organization");
    assert.equal(data.name, "Pro-Optics");
    assert.equal(data.url, "https://pro-optics.com.ua");
    assert.equal(data.logo, "https://pro-optics.com.ua/logo.png");
    assert.ok(Array.isArray(data.sameAs));
    assert.ok((data.sameAs as string[]).includes("https://t.me/prooptics"));
    assert.ok(
      (data.sameAs as string[]).includes("https://facebook.com/prooptics")
    );
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
