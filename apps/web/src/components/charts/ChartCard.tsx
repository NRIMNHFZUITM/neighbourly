import { BarChart3, Table2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "../ui/card";
import { CHART } from "./theme";

export interface LegendItem {
  label: string;
  color: string;
  shape: "rect" | "line";
}

export interface TableData {
  columns: string[];
  rows: Array<Array<string | number>>;
}

/** Legend mirrors the mark: a rect for bars/areas, a short line for lines. Text stays in ink. */
export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-600">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          {item.shape === "rect" ? (
            <span className="size-2.5 rounded-[3px]" style={{ background: item.color }} aria-hidden />
          ) : (
            <span className="h-0.5 w-3.5 rounded-full" style={{ background: item.color }} aria-hidden />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function DataTable({ table, caption }: { table: TableData; caption: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
            {table.columns.map((c, i) => (
              <th key={c} scope="col" className={cn("px-2 py-2 font-semibold", i > 0 && "text-right")}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r} className="border-b border-neutral-100 last:border-0">
              {row.map((cell, i) => (
                <td key={i} className={cn("px-2 py-1.5 text-neutral-800", i > 0 && "text-right tabular-nums")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Chart container: title, legend (for two or more series), and a table-view toggle, the
 * accessible twin of every chart.
 */
export function ChartCard({
  title,
  description,
  legend,
  table,
  children,
  className,
}: {
  title: string;
  description?: string;
  legend?: LegendItem[];
  table: TableData;
  children: ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <Card className={cn("flex flex-col p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-neutral-900">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-neutral-500">{description}</p>}
        </div>
        <div className="flex shrink-0 rounded-lg bg-neutral-100 p-0.5" role="group" aria-label={`${title} view`}>
          {(
            [
              ["chart", BarChart3, "Chart"],
              ["table", Table2, "Table"],
            ] as const
          ).map(([v, Icon, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition",
                view === v ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800",
              )}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>
      {view === "chart" ? (
        <>
          {legend && legend.length > 1 && (
            <div className="mb-2">
              <Legend items={legend} />
            </div>
          )}
          <div className="min-h-0 flex-1" style={{ color: CHART.ink2 }}>
            {children}
          </div>
        </>
      ) : (
        <DataTable table={table} caption={title} />
      )}
    </Card>
  );
}

interface TooltipRow {
  name?: string | number;
  value?: number | string | ReadonlyArray<number | string>;
  color?: string;
  dataKey?: string | number | ((obj: unknown) => unknown);
}

/** One tooltip, every series at that point. Values lead, series names follow, keyed with a line. */
export function ChartTooltip({
  active,
  payload,
  label,
  unit,
  names,
}: {
  active?: boolean;
  payload?: ReadonlyArray<TooltipRow>;
  label?: string | number;
  unit?: string;
  names?: Record<string, string>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <div className="mb-1 font-semibold text-neutral-500">{label}</div>}
      <ul className="space-y-1">
        {payload.map((p, i) => {
          const key = typeof p.dataKey === "string" ? p.dataKey : String(p.name ?? i);
          return (
            <li key={key} className="flex items-center gap-2">
              <span className="h-0.5 w-3 rounded-full" style={{ background: p.color }} aria-hidden />
              <span className="font-bold text-neutral-900 tabular-nums">
                {typeof p.value === "number" ? `${p.value.toLocaleString("en")}${unit ? ` ${unit}` : ""}` : String(p.value)}
              </span>
              <span className="text-neutral-500">{names?.[key] ?? p.name}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
