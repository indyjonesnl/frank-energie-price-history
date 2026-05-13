import { describe, it, expect } from "vitest";
import { buildSvgChart } from "../src/lib/svg-chart";

describe("buildSvgChart", () => {
  it("renders bars for hourly data", () => {
    const svg = buildSvgChart({
      title: "Test",
      points: [
        { label: "00:00", value: 0.1 },
        { label: "01:00", value: 0.2 },
      ],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
    });
    expect(svg).toContain("<svg");
    expect(svg).toContain('role="img"');
    expect(svg).toContain("<title>Test</title>");
    expect(svg).toContain("00:00");
    expect(svg).toContain("01:00");
  });

  it("handles single-point input without dividing by zero", () => {
    const svg = buildSvgChart({
      title: "One",
      points: [{ label: "00:00", value: 0.1 }],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
    });
    expect(svg).toContain("<rect");
  });

  it("renders zero line when input includes negative values", () => {
    const svg = buildSvgChart({
      title: "Mixed",
      points: [
        { label: "00", value: -0.1 },
        { label: "01", value: 0.2 },
      ],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
    });
    expect(svg).toContain('stroke-dasharray="2 3"');
    expect(svg).toContain('fill="#f97316"');
    expect(svg).toContain('fill="#3b82f6"');
  });

  it("does not render zero line when all values are positive", () => {
    const svg = buildSvgChart({
      title: "Positive only",
      points: [
        { label: "00", value: 0.1 },
        { label: "01", value: 0.2 },
      ],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
    });
    // Zero-line uses "2 3" dash; average uses "4 2". Average is always rendered
    // for non-empty input, so only assert absence of the zero-line pattern.
    expect(svg).not.toContain('stroke-dasharray="2 3"');
  });

  it("renders y-axis min/max numeric labels (negative input keeps zero baseline)", () => {
    const svg = buildSvgChart({
      title: "Range",
      points: [
        { label: "00", value: -0.1 },
        { label: "01", value: 0.2 },
      ],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
    });
    expect(svg).toContain(">0.2000<"); // max tick (Math.max(0, dataMax))
    expect(svg).toContain(">-0.1000<"); // min tick (dataMin)
  });

  it("zooms Y range when all values are positive", () => {
    const svg = buildSvgChart({
      title: "Tight range",
      points: [
        { label: "A", value: 1.33 },
        { label: "B", value: 1.34 },
      ],
      unit: "EUR/m3",
      width: 400,
      height: 200,
    });
    // The y-axis MIN tick should NOT be 0.0000 — it should be near dataMin (1.33) minus a small pad.
    expect(svg).not.toContain(">0.0000<");
    expect(svg).toContain(">1.34"); // dataMax neighborhood appears in either max tick or annotation
  });

  it("keeps zero baseline when any value is negative", () => {
    const svg = buildSvgChart({
      title: "Mixed sign",
      points: [
        { label: "A", value: -0.05 },
        { label: "B", value: 0.1 },
      ],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
    });
    // Zero line should be present.
    expect(svg).toContain('stroke-dasharray="2 3"');
  });

  it("caps bar width at 80px when slot is wider", () => {
    const svg = buildSvgChart({
      title: "Two big bars",
      points: [
        { label: "A", value: 1.33 },
        { label: "B", value: 1.34 },
      ],
      unit: "EUR/m3",
      width: 800,
      height: 280,
    });
    // Each rect's width attribute should be <= 80, not the natural slot width (~370px).
    const widthMatches = svg.match(/<rect[^>]*width="(\d+(?:\.\d+)?)"/g) ?? [];
    expect(widthMatches.length).toBeGreaterThanOrEqual(2);
    for (const m of widthMatches) {
      const w = Number(m.match(/width="(\d+(?:\.\d+)?)"/)![1]);
      expect(w).toBeLessThanOrEqual(80);
    }
  });

  it("renders x-axis label when provided", () => {
    const svg = buildSvgChart({
      title: "With axis label",
      points: [{ label: "00", value: 0.1 }],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
      xAxisLabel: "Hour",
    });
    expect(svg).toContain(">Hour<");
  });

  it("omits x-axis label when not provided", () => {
    const svg = buildSvgChart({
      title: "No axis label",
      points: [{ label: "00", value: 0.1 }],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
    });
    // Doesn't crash; doesn't include "undefined"
    expect(svg).not.toContain("undefined");
  });

  it("renders day-boundary divider when index is in range", () => {
    const svg = buildSvgChart({
      title: "Two days",
      points: Array.from({ length: 48 }, (_, i) => ({ label: String(i), value: 0.1 + i * 0.001 })),
      unit: "EUR/kWh",
      width: 1500,
      height: 300,
      dayBoundaryIndex: 24,
    });
    // The dashed divider has stroke-dasharray="3 3"
    expect(svg).toContain('stroke-dasharray="3 3"');
  });

  it("omits day-boundary divider when index is 0 or out of range", () => {
    const svg = buildSvgChart({
      title: "Two days, no divider",
      points: Array.from({ length: 48 }, (_, i) => ({ label: String(i), value: 0.1 })),
      unit: "EUR/kWh",
      width: 1500,
      height: 300,
      dayBoundaryIndex: 0,
    });
    expect(svg).not.toContain('stroke-dasharray="3 3"');
  });

  it("renders annotation text on min and max bars by default", () => {
    // Use 4 points whose mid-bar values are distinct from the average (0.20),
    // so the mid-value assertion isn't satisfied by the average label.
    const svg = buildSvgChart({
      title: "Annotated",
      points: [
        { label: "00", value: 0.10 },
        { label: "01", value: 0.30 },
        { label: "02", value: 0.15 },
        { label: "03", value: 0.25 },
      ],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
    });
    expect(svg).toContain(">0.1000<");
    expect(svg).toContain(">0.3000<");
    expect(svg).not.toContain(">0.1500<"); // mid value not annotated
    expect(svg).not.toContain(">0.2500<"); // mid value not annotated
  });

  it("annotates every bar when annotateAll is true", () => {
    const svg = buildSvgChart({
      title: "All",
      points: [
        { label: "00", value: 0.10 },
        { label: "01", value: 0.30 },
        { label: "02", value: 0.20 },
      ],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
      annotateAll: true,
    });
    expect(svg).toContain(">0.1000<");
    expect(svg).toContain(">0.2000<");
    expect(svg).toContain(">0.3000<");
  });

  it("renders an average line with numeric label", () => {
    const svg = buildSvgChart({
      title: "With average",
      points: [
        { label: "00", value: 0.10 },
        { label: "01", value: 0.20 },
        { label: "02", value: 0.40 },
      ],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
    });
    // Average of [0.10, 0.20, 0.40] = (0.10+0.20+0.40)/3 = 0.2333…
    expect(svg).toContain('stroke-dasharray="4 2"'); // average line dash pattern (distinct from zero "2 3" and day-divider "3 3")
    expect(svg).toContain(">0.2333<"); // average label numeric
  });

  it("renders a warning marker when a point has warning=true", () => {
    const svg = buildSvgChart({
      title: "Warned",
      points: [
        { label: "00", value: 0.10, warning: true },
        { label: "01", value: 0.20 },
      ],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
    });
    expect(svg).toContain("⚠");
    expect(svg).toContain("Negative-price hours present");
  });

  it("warning marker has class for client-side hiding", () => {
    const svg = buildSvgChart({
      title: "Warned",
      points: [{ label: "00", value: 0.10, warning: true }],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
    });
    expect(svg).toContain('class="chart-warning"');
  });

  it("renders warning count next to symbol when warningCount is provided", () => {
    const svg = buildSvgChart({
      title: "Counted",
      points: [{ label: "00", value: 0.10, warning: true, warningCount: 4 }],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
    });
    expect(svg).toContain("⚠ 4");
    expect(svg).toContain('class="chart-warning"');
  });

  it("renders bare warning symbol when warningCount is undefined", () => {
    const svg = buildSvgChart({
      title: "Just warned",
      points: [{ label: "00", value: 0.10, warning: true }],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
    });
    // The marker text contains the symbol but not a number after it.
    expect(svg).toMatch(/<text class="chart-warning"[^>]*>(?:<title>[^<]*<\/title>)?⚠<\/text>/);
  });

  it("omits warning marker entirely when warning is false", () => {
    const svg = buildSvgChart({
      title: "No warn",
      points: [{ label: "00", value: 0.10, warningCount: 4 }],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
    });
    expect(svg).not.toContain("⚠");
  });

  it("does not render a warning marker when no point sets warning", () => {
    const svg = buildSvgChart({
      title: "No warn",
      points: [
        { label: "00", value: 0.10 },
        { label: "01", value: 0.20 },
      ],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
    });
    expect(svg).not.toContain("⚠");
  });

  it("wraps bars in <a> when href is provided", () => {
    const svg = buildSvgChart({
      title: "Linked",
      points: [
        { label: "00", value: 0.10, href: "/foo/" },
        { label: "01", value: 0.30 },
      ],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
    });
    expect(svg).toContain('<a href="/foo/"><rect');
    // Second bar without href is NOT wrapped.
    expect(/(?<!<a [^>]+>)<rect[^>]*data-label="01"/.test(svg)).toBe(true);
  });

  it("wraps x-axis label in <a> when point has href", () => {
    const svg = buildSvgChart({
      title: "Linked labels",
      points: [
        { label: "01", value: 0.10, href: "/foo/01/" },
        { label: "02", value: 0.20, href: "/foo/02/" },
        { label: "03", value: 0.30, href: "/foo/03/" },
      ],
      unit: "EUR/kWh",
      width: 800,
      height: 280,
    });
    // showAll triggers (3 short labels in 800px) → all three labels rendered, each wrapped.
    expect(svg).toContain('<a href="/foo/01/"><text');
    expect(svg).toContain('<a href="/foo/02/"><text');
    expect(svg).toContain('<a href="/foo/03/"><text');
  });

  it("shows every label on month-style input (30 short labels)", () => {
    const points = Array.from({ length: 30 }, (_, i) => ({
      label: String(i + 1).padStart(2, "0"),
      value: 0.1 + i * 0.005,
      href: `/day/2026-04-${String(i + 1).padStart(2, "0")}/`,
    }));
    const svg = buildSvgChart({
      title: "Month bars",
      points,
      unit: "EUR/kWh",
      width: 800,
      height: 280,
    });
    // Every day label should appear inside an <a>.
    expect(svg).toContain('<a href="/day/2026-04-01/"><text');
    expect(svg).toContain('<a href="/day/2026-04-15/"><text');
    expect(svg).toContain('<a href="/day/2026-04-30/"><text');
  });

  it("uses shortLabel for x-axis tick when present, but keeps label in <title>", () => {
    const svg = buildSvgChart({
      title: "With short labels",
      points: [
        { label: "January", shortLabel: "Jan", value: 0.10 },
        { label: "February", shortLabel: "Feb", value: 0.20 },
        { label: "March", shortLabel: "Mar", value: 0.15 },
      ],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
    });
    // x-axis tick uses short form
    expect(svg).toContain(">Jan<");
    expect(svg).toContain(">Feb<");
    // <title> and data-label keep full form
    expect(svg).toContain("<title>January: 0.1000 EUR/kWh</title>");
    expect(svg).toContain('data-label="January"');
  });

  it("falls back to label when shortLabel is not set", () => {
    const svg = buildSvgChart({
      title: "Without short labels",
      points: [
        { label: "A", value: 0.10 },
        { label: "B", value: 0.20 },
      ],
      unit: "EUR/kWh",
      width: 400,
      height: 200,
    });
    expect(svg).toContain(">A<");
    expect(svg).toContain(">B<");
  });

  it("keeps the downsample for narrow-slot inputs (24 hour labels)", () => {
    const points = Array.from({ length: 24 }, (_, i) => ({
      label: `${String(i).padStart(2, "0")}:00`,
      value: 0.1 + i * 0.01,
    }));
    const svg = buildSvgChart({
      title: "Day hours",
      points,
      unit: "EUR/kWh",
      width: 800,
      height: 280,
    });
    // Visible labels: 00:00 (i=0) and 23:00 (i=last). Some intermediate hours should be MISSING.
    expect(svg).toContain(">00:00<");
    expect(svg).toContain(">23:00<");
    // 11:00 falls between visible ticks under the downsample (every 4th by default at 24/6=4).
    // Confirm at least one intermediate hour is absent — pick 13:00 which lies between Math.ceil(24/6)=4 buckets.
    expect(svg).not.toContain(">13:00<");
  });
});
