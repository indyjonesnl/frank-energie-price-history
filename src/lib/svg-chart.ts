export interface ChartPoint {
  label: string;
  value: number;
  href?: string;
  warning?: boolean;
  warningCount?: number;
  shortLabel?: string;
}
export interface ChartInput {
  title: string;
  points: ChartPoint[];
  unit: string;
  width: number;
  height: number;
  xAxisLabel?: string;
  dayBoundaryIndex?: number;
  annotateAll?: boolean;
}

export function buildSvgChart(input: ChartInput): string {
  const { title, points, unit, width, height, xAxisLabel } = input;
  if (points.length === 0)
    return `<svg role="img" width="${width}" height="${height}"><title>${escape(title)}</title></svg>`;
  const padding = {
    top: 28,
    right: 8,
    bottom: xAxisLabel ? 60 : 40,
    left: 68,
  };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const values = points.map((p) => p.value);
  const dataMax = Math.max(...values);
  const dataMin = Math.min(...values);
  const hasNegative = dataMin < 0;
  let max: number;
  let min: number;
  if (hasNegative) {
    // Preserve zero baseline so negative bars hang below the zero line.
    max = Math.max(0, dataMax);
    min = dataMin;
  } else {
    // All values are non-negative: zoom in to the data range so small differences are visible.
    // Add a small headroom/footroom (5% of span, with a floor) so bars don't touch chart edges.
    const span = dataMax - dataMin;
    const pad = span > 0 ? span * 0.05 : Math.max(dataMax * 0.05, 0.0001);
    max = dataMax + pad;
    min = Math.max(0, dataMin - pad);
  }
  const range = max - min || 1;
  const barW = innerW / points.length;
  const MAX_BAR_PX = 80;
  const renderBarW = Math.min(barW - 2, MAX_BAR_PX);

  const zeroY = padding.top + ((max - 0) / range) * innerH;
  // Bars anchor to the zero line when 0 is inside the visible range; otherwise they
  // anchor to the chart bottom (the visible baseline for an all-positive zoomed range).
  const barBaseY =
    min <= 0 && max >= 0 ? zeroY : padding.top + innerH;

  // Determine min/max indices to drive default annotations.
  let minIdx = 0;
  let maxIdx = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].value < points[minIdx].value) minIdx = i;
    if (points[i].value > points[maxIdx].value) maxIdx = i;
  }

  const annotation = (idx: number, p: ChartPoint, valueY: number): string => {
    const shouldAnnotate =
      input.annotateAll === true || idx === minIdx || idx === maxIdx;
    if (!shouldAnnotate) return "";
    const x = padding.left + idx * barW + barW / 2;
    // Above for non-negative, below for negative.
    const above = p.value >= 0;
    const idealY = above ? Math.min(valueY, zeroY) - 4 : Math.max(valueY, zeroY) + 12;
    // Stay inside the chart area; clamp.
    const clampedY = Math.max(
      padding.top + 8,
      Math.min(idealY, padding.top + innerH - 2),
    );
    // When the ideal position falls outside the chart (e.g. the min bar reaches the
    // bottom edge or the max bar reaches the top), the clamp pushes the text on top of
    // the colored bar — switch to white fill so it stays readable.
    const wasClamped = clampedY !== idealY;
    // Always halo the text with a contrasting outline so it stays readable regardless
    // of the underlying bar fill, the avg line, or adjacent labels.
    const fill = wasClamped ? "#ffffff" : "#0f172a";
    const stroke = wasClamped ? "#0f172a" : "#ffffff";
    return `<text x="${x}" y="${clampedY}" text-anchor="middle" font-size="14" fill="${fill}" stroke="${stroke}" stroke-width="3" paint-order="stroke" font-weight="600">${p.value.toFixed(4)}</text>`;
  };

  const warningMarker = (
    idx: number,
    p: ChartPoint,
    valueY: number,
  ): string => {
    if (!p.warning) return "";
    const cx = padding.left + idx * barW + barW / 2;
    const above = p.value >= 0;
    // Stack above (or below) the value annotation when both are present on the same bar.
    // Annotation sits at ±4 from the bar's edge; the warning needs room for a font-size 16
    // glyph above font-size 14 number, so ±26 offset gives a clean visual gap.
    const hasAnnotation =
      input.annotateAll === true || idx === minIdx || idx === maxIdx;
    const offset = hasAnnotation ? 26 : 14;
    const baseY = above
      ? Math.min(valueY, zeroY) - offset
      : Math.max(valueY, zeroY) + offset + 8;
    // For max bars the annotation gets clamped INSIDE the bar near the top edge
    // (with white fill); the warning must clamp to a higher position so the two
    // don't overlap. Allow the warning into the chart's top-padding zone.
    const cy = Math.max(
      14,
      Math.min(baseY, padding.top + innerH - 4),
    );
    // Shrink warning font when slot is narrow (e.g. month pages with 28-31 day bars
    // packed into ~25 px each — the `⚠ 14`-sized markers would otherwise overlap).
    const warningFontSize = barW < 32 ? 11 : 16;
    // Drop the space between the symbol and the count on narrow slots to save a few px.
    const sep = barW < 32 ? "" : " ";
    const content = typeof p.warningCount === "number" && p.warningCount > 0
      ? `⚠${sep}${p.warningCount}`
      : "⚠";
    return `<text class="chart-warning" x="${cx}" y="${cy}" text-anchor="middle" font-size="${warningFontSize}" fill="#f97316" aria-label="Negative-price hours present"><title>One or more hours had a negative price within this period.</title>${content}</text>`;
  };

  const bars = points
    .map((p, i) => {
      const valueY = padding.top + ((max - p.value) / range) * innerH;
      const slotCenter = padding.left + i * barW + barW / 2;
      const x = slotCenter - renderBarW / 2;
      const y = Math.min(barBaseY, valueY);
      const h = Math.abs(barBaseY - valueY);
      const fill = p.value < 0 ? "#f97316" : "#3b82f6";
      const rect = `<rect x="${x}" y="${y}" width="${renderBarW}" height="${h}" fill="${fill}" data-value="${p.value}" data-label="${escape(p.label)}"><title>${escape(p.label)}: ${p.value.toFixed(4)} ${escape(unit)}</title></rect>`;
      const wrapped = p.href ? `<a href="${escape(p.href)}">${rect}</a>` : rect;
      return wrapped + annotation(i, p, valueY) + warningMarker(i, p, valueY);
    })
    .join("");

  const zeroLine =
    min < 0
      ? `<line x1="${padding.left}" x2="${width - padding.right}" y1="${zeroY}" y2="${zeroY}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="2 3" />`
      : "";

  // Average line + label.
  const avg = points.reduce((s, p) => s + p.value, 0) / points.length;
  const avgY = padding.top + ((max - avg) / range) * innerH;
  const avgLine = `<line x1="${padding.left}" x2="${width - padding.right}" y1="${avgY}" y2="${avgY}" stroke="#10b981" stroke-width="1" stroke-dasharray="4 2" />`;
  const avgLabel = `<text x="${padding.left - 4}" y="${avgY + 4}" text-anchor="end" font-size="13" fill="#10b981" font-weight="600">${avg.toFixed(4)}</text>`;

  const dayDivider =
    typeof input.dayBoundaryIndex === "number" &&
    input.dayBoundaryIndex > 0 &&
    input.dayBoundaryIndex < points.length
      ? (() => {
          const dx = padding.left + input.dayBoundaryIndex * barW;
          return `<line x1="${dx}" x2="${dx}" y1="${padding.top}" y2="${padding.top + innerH}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3" />`;
        })()
      : "";

  // Estimate roughly how many pixels each label needs (avg char ≈ 7px at font-size 13).
  const avgPxPerChar = 7;
  const tickStr = (p: ChartPoint) => p.shortLabel ?? p.label;
  const maxLabelWidth =
    Math.max(0, ...points.map((p) => tickStr(p).length)) * avgPxPerChar;
  const pxPerSlot = innerW / points.length;
  const showAll = pxPerSlot >= maxLabelWidth + 4;
  const everyNth = showAll ? 1 : Math.max(1, Math.ceil(points.length / 6));

  const xLabels = points
    .filter(
      (_, i) =>
        showAll ||
        i === 0 ||
        i === points.length - 1 ||
        i % everyNth === 0,
    )
    .map((p) => {
      const i = points.indexOf(p);
      const x = padding.left + i * barW + barW / 2;
      const y = padding.top + innerH + 16;
      const tickText = p.shortLabel ?? p.label;
      const text = `<text x="${x}" y="${y}" text-anchor="middle" font-size="13" fill="#475569">${escape(tickText)}</text>`;
      return p.href ? `<a href="${escape(p.href)}">${text}</a>` : text;
    })
    .join("");

  // Y-axis numeric ticks (min and max). max appears at chart top, min at chart bottom.
  const yMaxLabel = `<text x="${padding.left - 4}" y="${padding.top + 4}" text-anchor="end" font-size="13" fill="#475569">${max.toFixed(4)}</text>`;
  const yMinLabel = `<text x="${padding.left - 4}" y="${padding.top + innerH}" text-anchor="end" font-size="13" fill="#475569">${min.toFixed(4)}</text>`;

  // Unit label, top-left above the max tick.
  const unitLabel = `<text x="${padding.left - 4}" y="${padding.top - 8}" text-anchor="end" font-size="12" fill="#64748b">${escape(unit)}</text>`;

  // Optional X-axis label, centered below tick labels.
  const xAxisLabelEl = xAxisLabel
    ? `<text x="${padding.left + innerW / 2}" y="${height - 10}" text-anchor="middle" font-size="14" fill="#475569">${escape(xAxisLabel)}</text>`
    : "";

  return `<svg role="img" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><title>${escape(title)}</title><desc>Bar chart of ${points.length} values, range ${min.toFixed(4)} to ${max.toFixed(4)} ${escape(unit)}</desc>${unitLabel}${yMaxLabel}${yMinLabel}${zeroLine}${avgLine}${avgLabel}${dayDivider}${bars}${xLabels}${xAxisLabelEl}</svg>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
