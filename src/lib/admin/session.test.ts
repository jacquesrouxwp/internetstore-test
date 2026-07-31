import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

// A signing secret must exist before the module reads it.
process.env.ADMIN_SESSION_SECRET = "test-secret-please-ignore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mod: typeof import("./session");
before(async () => {
  mod = await import("./session");
});

describe("admin session token — sign / verify", () => {
  it("round-trips a freshly signed token", async () => {
    const token = await mod.signAdminSession();
    assert.ok(token, "expected a token");
    assert.equal(await mod.verifyAdminSession(token), true);
  });

  it("rejects a missing / empty / malformed token", async () => {
    assert.equal(await mod.verifyAdminSession(undefined), false);
    assert.equal(await mod.verifyAdminSession(""), false);
    assert.equal(await mod.verifyAdminSession("garbage"), false);
    assert.equal(await mod.verifyAdminSession("only.one"), false);
  });

  it("rejects the old constant backdoor value", async () => {
    assert.equal(await mod.verifyAdminSession("1"), false);
  });

  it("rejects a tampered signature", async () => {
    const token = (await mod.signAdminSession())!;
    const [payload, sig] = token.split(".");
    const flipped = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
    assert.equal(await mod.verifyAdminSession(`${payload}.${flipped}`), false);
  });

  it("rejects a tampered payload (signature no longer matches)", async () => {
    const token = (await mod.signAdminSession())!;
    const [, sig] = token.split(".");
    // A different but validly-encoded payload
    const forged = Buffer.from(
      JSON.stringify({ v: 1, iat: 0, exp: 9999999999 })
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    assert.equal(await mod.verifyAdminSession(`${forged}.${sig}`), false);
  });

  it("rejects an expired token", async () => {
    // Sign 8 days in the past (TTL is 7 days).
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const token = (await mod.signAdminSession(eightDaysAgo))!;
    assert.equal(await mod.verifyAdminSession(token), false);
    // ...but it was valid at issue time.
    assert.equal(
      await mod.verifyAdminSession(token, eightDaysAgo + 1000),
      true
    );
  });

  it("rejects a token signed with a different secret", async () => {
    const token = (await mod.signAdminSession())!;
    process.env.ADMIN_SESSION_SECRET = "a-completely-different-secret";
    try {
      assert.equal(await mod.verifyAdminSession(token), false);
    } finally {
      process.env.ADMIN_SESSION_SECRET = "test-secret-please-ignore";
    }
  });
});

describe("isAdminPublicPath", () => {
  it("only the login screen is public", () => {
    assert.equal(mod.isAdminPublicPath("/admin"), true);
    assert.equal(mod.isAdminPublicPath("/admin/"), true);
    assert.equal(mod.isAdminPublicPath("/admin/login"), true);
    assert.equal(mod.isAdminPublicPath("/admin/dashboard"), false);
    assert.equal(mod.isAdminPublicPath("/admin/products"), false);
    assert.equal(mod.isAdminPublicPath("/admin/orders/123"), false);
  });
});
