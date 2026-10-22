import { roundedTopRect } from "./theme";

/**
 * Bar shape for stacked columns: a 2px surface gap between segments, and the 4px rounded
 * data-end only on the top-most non-empty segment (square at the baseline).
 */
export function stackedBarShape(keys: readonly string[]) {
  return function StackedSegment(props: unknown) {
    const { x = 0, y = 0, width = 0, height = 0, fill, payload, dataKey } = props as {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      fill?: string;
      payload?: Record<string, unknown>;
      dataKey?: string;
    };
    if (!height || height <= 0 || !payload || !dataKey) return <g />;
    const idx = keys.indexOf(dataKey);
    const value = (k: string) => Number(payload[k] ?? 0);
    const hasBelow = keys.slice(0, idx).some((k) => value(k) > 0);
    const isTop = !keys.slice(idx + 1).some((k) => value(k) > 0);
    const h = hasBelow ? Math.max(0, height - 2) : height;
    return <path d={roundedTopRect(x, y, width, h, isTop ? 4 : 0)} fill={fill} />;
  };
}
