import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CHART } from "./charts/theme";

/** Tiny trend line: context gray, with the current period marked in the accent. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 32;
  const pad = 4;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const x = (i: number) => pad + (i * (w - pad * 2)) / (values.length - 1);
  const y = (v: number) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const last = values.length - 1;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("h-8 w-full", className)} preserveAspectRatio="none" aria-hidden>
      <polyline points={points} fill="none" stroke={CHART.context} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(last)} cy={y(values[last]!)} r={4} fill={CHART.series[0]} stroke={CHART.surface} strokeWidth={2} />
    </svg>
  );
}

/**
 * Stat tile: label (sentence case) · value (semibold, proportional figures) · optional
 * delta or hint · optional sparkline.
 */
export function StatTile({
  label,
  value,
  unit,
  hint,
  icon,
  trend,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  trend?: number[];
  tone?: "default" | "brand";
  className?: string;
}) {
  return (
    <div
      data-stat={label}
      className={cn(
        "flex flex-col rounded-2xl border p-4 shadow-card",
        tone === "brand" ? "border-brand-200 bg-brand-50/70" : "border-neutral-200/80 bg-white",
        className,
      )}
    >
      <div className="flex items-start gap-2 text-sm leading-snug font-medium text-neutral-500 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-neutral-400">
        {icon}
        <span>{label}</span>
      </div>
      <div data-stat-value className="mt-1.5 text-2xl font-semibold tracking-tight text-neutral-900">
        {value}
        {unit && <span className="ml-1 text-base font-medium text-neutral-500">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 text-xs text-neutral-500">{hint}</div>}
      {trend && <Sparkline values={trend} className="mt-2" />}
    </div>
  );
}
