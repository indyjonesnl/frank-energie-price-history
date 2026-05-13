import { describe, it, expect } from "vitest";
import { isActive, canonical, withBase } from "../src/lib/seo";

describe("isActive", () => {
  it("matches identical paths", () => {
    expect(isActive("/today/", "/today/")).toBe(true);
  });
  it("normalizes trailing slash", () => {
    expect(isActive("/today", "/today/")).toBe(true);
    expect(isActive("/today/", "/today")).toBe(true);
  });
  it("rejects different paths", () => {
    expect(isActive("/today/", "/year/2026/")).toBe(false);
  });
});

describe("canonical", () => {
  it("produces full URL with base path", () => {
    expect(canonical("/today/")).toBe(
      "https://indyjonesnl.github.io/frank-energie-price-history/today/",
    );
  });
});

describe("withBase", () => {
  it("prepends the base path", () => {
    expect(withBase("/today/")).toBe("/frank-energie-price-history/today/");
  });
});
