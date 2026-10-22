/**
 * Chart tokens from the data-viz reference palette, validated on our white card surface
 * (scripts/validate_palette.js, light mode: all hard checks pass; aqua, yellow and magenta
 * sit below 3:1 contrast, so every chart ships a legend and a table view as relief).
 * Categorical slots are assigned in this fixed order and never cycled.
 */
export const CHART = {
  surface: "#ffffff",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  muted: "#898781",
  ink: "#0b0b0b",
  ink2: "#52514e",
  series: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
  /** De-emphasis gray for sparklines and context marks. */
  context: "#c3c2b7",
  successText: "#006300",
  criticalText: "#d03b3b",
} as const;

export const axisTick = { fill: CHART.muted, fontSize: 12 } as const;

export const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
export const fmt1 = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });

/** Rectangle with only the top corners rounded (data-end rounded, square at the baseline). */
export function roundedTopRect(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0 || w <= 0) return "";
  const rr = Math.max(0, Math.min(r, h, w / 2));
  if (rr === 0) return `M${x},${y}h${w}v${h}h${-w}Z`;
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
