import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeIfChanged } from "../scripts/fetch";

describe("writeIfChanged", () => {
  const tmp = mkdtempSync(join(tmpdir(), "feph-"));
  const target = join(tmp, "a.json");

  it("writes when file does not exist", () => {
    expect(writeIfChanged(target, { x: 1, fetched_at: "t1" })).toBe(true);
    expect(existsSync(target)).toBe(true);
  });

  it("does not rewrite when only fetched_at differs", () => {
    writeFileSync(target, JSON.stringify({ x: 1, fetched_at: "t1" }, null, 2));
    const before = readFileSync(target, "utf-8");
    expect(writeIfChanged(target, { x: 1, fetched_at: "t2" })).toBe(false);
    expect(readFileSync(target, "utf-8")).toBe(before);
  });

  it("rewrites when other fields differ", () => {
    writeFileSync(target, JSON.stringify({ x: 1, fetched_at: "t1" }, null, 2));
    expect(writeIfChanged(target, { x: 2, fetched_at: "t1" })).toBe(true);
  });

  it("does not rewrite when keys are reordered (stable-equality contract)", () => {
    writeFileSync(
      target,
      JSON.stringify({ x: 1, y: 2, fetched_at: "t1" }, null, 2),
    );
    const before = readFileSync(target, "utf-8");
    expect(writeIfChanged(target, { y: 2, x: 1, fetched_at: "t2" })).toBe(
      false,
    );
    expect(readFileSync(target, "utf-8")).toBe(before);
  });

  it("does not rewrite when nested keys are reordered", () => {
    writeFileSync(
      target,
      JSON.stringify({ a: { x: 1, y: 2 }, fetched_at: "t1" }, null, 2),
    );
    const before = readFileSync(target, "utf-8");
    expect(
      writeIfChanged(target, { a: { y: 2, x: 1 }, fetched_at: "t2" }),
    ).toBe(false);
    expect(readFileSync(target, "utf-8")).toBe(before);
  });
});
