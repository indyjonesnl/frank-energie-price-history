import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { type NormalizedDay } from "./schema";
import { normalize } from "../../scripts/lib/normalize";

const ROOT_DEFAULT = "public/api/v1/data";

export function loadAllDays(root = ROOT_DEFAULT): NormalizedDay[] {
  const out: NormalizedDay[] = [];
  for (const year of safeReaddir(root)) {
    if (!/^\d{4}$/.test(year)) continue;
    for (const month of safeReaddir(join(root, year))) {
      if (!/^\d{2}$/.test(month)) continue;
      for (const file of safeReaddir(join(root, year, month))) {
        if (!file.endsWith(".json") || file === "index.json") continue;
        const date = `${year}-${month}-${file.replace(".json", "")}`;
        const raw = JSON.parse(
          readFileSync(join(root, year, month, file), "utf-8"),
        );
        const fetchedAt =
          typeof raw === "object" && raw !== null && "_fetched_at" in raw
            ? String((raw as Record<string, unknown>)._fetched_at)
            : new Date().toISOString();
        out.push(normalize(raw, date, fetchedAt));
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function safeReaddir(p: string): string[] {
  try {
    return statSync(p).isDirectory() ? readdirSync(p) : [];
  } catch {
    return [];
  }
}

export function availableYears(root = ROOT_DEFAULT): string[] {
  try {
    return readdirSync(root)
      .filter((d) => /^\d{4}$/.test(d))
      .sort();
  } catch {
    return [];
  }
}
