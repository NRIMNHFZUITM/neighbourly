import { REPORT_CATEGORY_META, REPORT_STATUS_LABELS, REPORT_STATUSES, type Report, type ReportStatus } from "@neighbourly/shared";
import { X } from "lucide-react";
import { useState } from "react";
import { Marker } from "react-leaflet";
import { Link } from "react-router";
import { FilterChips, SegmentedNav } from "@/components/layout";
import { FitToPoints, MapFocus, TownMap } from "@/components/map/TownMap";
import { pinIcon } from "@/components/map/pins";
import { REPORT_STATUS_STYLE } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useReports } from "./api";
import { ReportCard } from "./ReportCard";
import { TOWNCARE_TABS, TownCareHeader, statusOptions } from "./TownCarePage";

function MapLegend() {
  return (
    <div className="absolute bottom-3 left-3 z-[500] rounded-xl bg-white/95 px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-neutral-700">Status</p>
      <ul className="space-y-1">
        {REPORT_STATUSES.map((s) => (
          <li key={s} className="flex items-center gap-2 text-neutral-600">
            <span className="size-3 rounded-full ring-2 ring-white" style={{ background: REPORT_STATUS_STYLE[s].pin }} aria-hidden />
            {REPORT_STATUS_LABELS[s]}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReportsMapPage() {
  const [status, setStatus] = useState<ReportStatus | "all">("all");
  const reports = useReports({ status });
  const [selected, setSelected] = useState<Report | null>(null);
  const list = reports.data ?? [];

  return (
    <div>
      <TownCareHeader />
      <SegmentedNav items={TOWNCARE_TABS} className="mb-4" />
      <div className="mb-4">
        <FilterChips label="Status" value={status} onChange={setStatus} options={statusOptions} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_340px]">
        <div className="relative">
          <TownMap className="h-[max(320px,calc(100dvh-27rem))] rounded-2xl border border-neutral-200 md:h-[620px]">
            <FitToPoints points={reports.data?.map((r) => r.location) ?? []} />
            <MapFocus target={selected?.location ?? null} />
            {list.map((r) => (
              <Marker
                key={r.id}
                position={[r.location.lat, r.location.lng]}
                icon={pinIcon(REPORT_STATUS_STYLE[r.status].pin, REPORT_CATEGORY_META[r.category].emoji, selected?.id === r.id)}
                title={r.title}
                eventHandlers={{ click: () => setSelected(r) }}
              />
            ))}
          </TownMap>
          <MapLegend />
          {selected && (
            <div className="absolute inset-x-3 bottom-3 z-[600] md:hidden">
              <div className="relative">
                <ReportCard report={selected} compact className="pr-10 shadow-xl" />
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="absolute top-2 right-2 rounded-full bg-white p-1.5 text-neutral-500 shadow"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
        <aside className="hidden space-y-3 md:block">
          {selected ? (
            <div className="space-y-3">
              <ReportCard report={selected} />
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link to={`/towncare/${selected.id}`}>View details</Link>
                </Button>
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Clear
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-5 text-sm text-neutral-500">
              <p className="font-semibold text-neutral-800">{list.length} reports on the map</p>
              <p className="mt-1">Select a pin to see the details. Pins are coloured by status and show the category.</p>
            </div>
          )}
          <div className="space-y-2">
            {list
              .filter((r) => r.status !== "resolved")
              .slice(0, 5)
              .map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelected(r)}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-white"
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: REPORT_STATUS_STYLE[r.status].pin }} aria-hidden />
                  <span className="truncate">{r.title}</span>
                </button>
              ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
