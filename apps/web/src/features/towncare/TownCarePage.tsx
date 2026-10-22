import { REPORT_CATEGORIES, REPORT_CATEGORY_META, type ReportCategory, type ReportStatus } from "@neighbourly/shared";
import { ClipboardCheck, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { EmptyState, ErrorState, FilterChips, ListSkeleton, PageHeader, SegmentedNav } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useReports } from "./api";
import { ReportCard } from "./ReportCard";

export const TOWNCARE_TABS = [
  { to: "/towncare", label: "My reports" },
  { to: "/towncare/all", label: "All reports" },
  { to: "/towncare/map", label: "Map" },
];

export function TownCareHeader() {
  return (
    <PageHeader
      title="TownCare"
      description="Report issues around City of Elmina and follow every step of the fix."
      actions={
        <Button asChild>
          <Link to="/towncare/new">
            <Plus /> Report an issue
          </Link>
        </Button>
      }
    />
  );
}

export const categoryOptions = [
  { value: "all" as const, label: "All" },
  ...REPORT_CATEGORIES.map((c) => ({ value: c, label: `${REPORT_CATEGORY_META[c].emoji} ${REPORT_CATEGORY_META[c].short}` })),
];

export const statusOptions = [
  { value: "all" as const, label: "Any status" },
  { value: "open" as const, label: "Open" },
  { value: "in_progress" as const, label: "In progress" },
  { value: "resolved" as const, label: "Resolved" },
];

export function TownCarePage({ mine = false }: { mine?: boolean }) {
  const [category, setCategory] = useState<ReportCategory | "all">("all");
  const [status, setStatus] = useState<ReportStatus | "all">("all");
  const reports = useReports({ category, status, scope: mine ? "mine" : "all" });

  return (
    <div>
      <TownCareHeader />
      <SegmentedNav items={TOWNCARE_TABS} className="mb-4" />
      <div className="mb-5 space-y-2.5">
        <FilterChips label="Category" value={category} onChange={setCategory} options={categoryOptions} />
        <FilterChips label="Status" value={status} onChange={setStatus} options={statusOptions} />
      </div>

      {reports.isPending ? (
        <ListSkeleton />
      ) : reports.isError ? (
        <ErrorState error={reports.error} onRetry={() => void reports.refetch()} />
      ) : reports.data.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck />}
          title={mine ? "You haven't raised or followed any reports yet" : "No reports match these filters"}
          description={mine ? "Spotted something broken? Report it and we'll keep you posted." : "Try another category or status."}
          action={
            mine ? (
              <Button asChild>
                <Link to="/towncare/new">
                  <Plus /> Report an issue
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {mine && <p className="mb-3 text-sm text-neutral-500">Reports you raised, plus ones you said “me too” to.</p>}
          <div className={cn("grid grid-cols-1 gap-3 lg:grid-cols-2", reports.isPlaceholderData && "opacity-60 transition-opacity")}>
            {reports.data.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
