export function ctPerKwh(eurPerKwh: number): string {
  return (eurPerKwh * 100).toFixed(2);
}
export function ctPerM3(eurPerM3: number): string {
  return (eurPerM3 * 100).toFixed(2);
}
export function humanDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
export function hourLabel(iso: string): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Amsterdam",
  });
  return fmt.format(new Date(iso));
}
export function hourRange(from: string, to: string): string {
  return `${hourLabel(from)}–${hourLabel(to)}`;
}
export function humanMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, 15));
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
export function monthName(yearMonth: string, abbr = false): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, 15));
  const s = d.toLocaleDateString("en-GB", { month: abbr ? "short" : "long" });
  // ICU's "short" form may emit "Sept" (4 chars) for September on some platforms.
  // Normalize to a strict three-letter abbreviation so all 12 ticks render uniformly.
  return abbr ? s.slice(0, 3) : s;
}
