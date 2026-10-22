import {
  REPORT_CATEGORIES,
  REPORT_CATEGORY_META,
  REPORT_STATUSES,
  REPORT_STATUS_LABELS,
  TEAMS,
  formatLongDate,
  formatRelative,
  formatTime,
  neighbourhoodName,
  type AdminReport,
  type ReportStatus,
} from "@neighbourly/shared";
import { Lock, Mail, MapPin, MessageSquareReply, Phone, ThumbsUp, X } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { ReportPhoto } from "@/components/CoverArt";
import { IdentityLine } from "@/components/IdentityLine";
import { EmptyState, ErrorState, FilterChips, ListSkeleton, PageHeader } from "@/components/layout";
import { CategoryBadge, REPORT_STATUS_STYLE, ReportStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, SheetContent } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/field";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useIsDesktop } from "@/lib/use-media-query";
import { useAdminReports, useReplyToReport, useUpdateReport } from "./api";

function ReportManager({ report, onClose }: { report: AdminReport; onClose: () => void }) {
  const update = useUpdateReport();
  const reply = useReplyToReport();
  const [status, setStatus] = useState<ReportStatus>(report.status);
  const [team, setTeam] = useState(report.assignedTeam ?? REPORT_CATEGORY_META[report.category].team);
  const [note, setNote] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const c = report.reporterContact;

  const save = () =>
    update.mutate(
      { id: report.id, status, assignedTeam: team, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(status !== report.status ? `Marked ${REPORT_STATUS_LABELS[status].toLowerCase()}. Reporter notified.` : "Report updated");
          setNote("");
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start gap-3 border-b border-neutral-100 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <ReportStatusBadge status={report.status} />
            <CategoryBadge category={report.category} />
          </div>
          <h2 className="mt-2 font-bold text-neutral-900">{report.title}</h2>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
            <MapPin className="size-3.5" /> {report.locationLabel}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X />
        </Button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <ReportPhoto src={report.photoUrl} category={report.category} alt={report.title} className="h-44 w-full rounded-xl" size={52} />
        <p className="text-sm whitespace-pre-wrap text-neutral-700">{report.description}</p>
        <p className="flex items-center gap-1.5 text-sm text-neutral-600">
          <ThumbsUp className="size-4 text-neutral-400" /> {report.supporters} residents affected · reported {formatRelative(report.createdAt)}
        </p>

        <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide text-violet-800 uppercase">
            <Lock className="size-3.5" /> Reporter, visible to Township Management only
          </p>
          <IdentityLine identity={report.reporter} link={false} meta={`Unit ${c.unitNo ?? "–"}, Block ${c.block ?? "–"}, ${neighbourhoodName(c.neighbourhoodId) ?? ""}`} />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-700">
            {c.phone && (
              <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 hover:underline">
                <Phone className="size-3.5 text-neutral-400" /> {c.phone}
              </a>
            )}
            <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:underline">
              <Mail className="size-3.5 text-neutral-400" /> {c.email}
            </a>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-neutral-200 p-3">
          <p className="text-sm font-bold text-neutral-900">Update status</p>
          <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Status">
            {REPORT_STATUSES.map((s) => {
              const Icon = REPORT_STATUS_STYLE[s].icon;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={status === s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold transition",
                    status === s ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:border-neutral-300",
                  )}
                >
                  <Icon className="size-3.5" /> {REPORT_STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>
          <Field label="Assigned team" htmlFor="team">
            <Select id="team" value={team} onChange={(e) => setTeam(e.target.value)}>
              {TEAMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Note for the reporter (optional)" htmlFor="note" hint="Shown on the report's progress timeline">
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Contractor scheduled for Thursday morning" className="min-h-20" maxLength={300} />
          </Field>
          <Button onClick={save} loading={update.isPending} className="w-full">
            {status !== report.status ? `Mark ${REPORT_STATUS_LABELS[status].toLowerCase()} & notify` : "Save"}
          </Button>
        </div>

        <div className="space-y-2 rounded-xl border border-neutral-200 p-3">
          <p className="flex items-center gap-1.5 text-sm font-bold text-neutral-900">
            <MessageSquareReply className="size-4" /> Public reply
          </p>
          <Textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Reply as Township Management…" className="min-h-20" maxLength={500} />
          <Button
            variant="outline"
            size="sm"
            disabled={!replyBody.trim()}
            loading={reply.isPending}
            onClick={() =>
              reply.mutate(
                { id: report.id, body: replyBody.trim() },
                { onSuccess: () => (setReplyBody(""), toast.success("Reply posted")), onError: (err) => toast.error(errorMessage(err)) },
              )
            }
          >
            Post reply
          </Button>
        </div>

        <div>
          <p className="mb-2 text-sm font-bold text-neutral-900">History</p>
          <ol className="space-y-2 border-l-2 border-neutral-200 pl-4">
            {report.history.map((h) => (
              <li key={h.id} className="text-sm">
                <span className="font-semibold text-neutral-900">{REPORT_STATUS_LABELS[h.status]}</span>
                <span className="text-neutral-500">
                  {" "}
                  · {formatLongDate(h.at)}, {formatTime(h.at)} · {h.by}
                </span>
                {h.note && <p className="text-neutral-600">{h.note}</p>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export function AdminReportsPage() {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<ReportStatus | "all">("all");
  const [category, setCategory] = useState("all");
  const reports = useAdminReports({ status, category });
  const isDesktop = useIsDesktop();
  const focusId = params.get("focus");
  const selected = reports.data?.find((r) => r.id === focusId) ?? null;
  const select = (id: string | null) => setParams(id ? { focus: id } : {}, { replace: true });

  return (
    <div>
      <PageHeader title="Report management" description="Assign, update and reply to TownCare reports. Every status change notifies the reporter and supporters." />
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <FilterChips
          label="Status"
          value={status}
          onChange={setStatus}
          options={[{ value: "all", label: "All" }, ...REPORT_STATUSES.map((s) => ({ value: s, label: REPORT_STATUS_LABELS[s] }))]}
        />
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 w-auto" aria-label="Category">
          <option value="all">All categories</option>
          {REPORT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {REPORT_CATEGORY_META[c].label}
            </option>
          ))}
        </Select>
      </div>

      {reports.isPending ? (
        <ListSkeleton />
      ) : reports.isError ? (
        <ErrorState error={reports.error} onRetry={() => void reports.refetch()} />
      ) : reports.data.length === 0 ? (
        <EmptyState icon={<MapPin />} title="No reports match these filters" />
      ) : (
        <Card className={cn("overflow-hidden", reports.isPlaceholderData && "opacity-60")}>
          <table className="w-full text-sm">
            <thead className="hidden border-b border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-500 md:table-header-group">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Report</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Reporter</th>
                <th className="px-3 py-2.5 text-right font-semibold">Me too</th>
                <th className="px-4 py-2.5 text-right font-semibold">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {reports.data.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => select(r.id)}
                  className={cn("cursor-pointer align-top transition hover:bg-neutral-50", focusId === r.id && "bg-brand-50/60")}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 text-lg" aria-hidden>
                        {REPORT_CATEGORY_META[r.category].emoji}
                      </span>
                      <div className="min-w-0">
                        <button type="button" className="text-left font-semibold text-neutral-900 hover:underline" onClick={() => select(r.id)}>
                          {r.title}
                        </button>
                        <p className="text-xs text-neutral-500">
                          {r.locationLabel}
                          {r.assignedTeam ? ` · ${r.assignedTeam}` : ""}
                        </p>
                        <div className="mt-1.5 flex gap-2 md:hidden">
                          <ReportStatusBadge status={r.status} />
                          <span className="text-xs text-neutral-500">{formatRelative(r.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 md:table-cell">
                    <ReportStatusBadge status={r.status} />
                  </td>
                  <td className="hidden px-3 py-3 md:table-cell">
                    <p className="font-medium text-neutral-800">{r.reporterContact.name}</p>
                    <p className="text-xs text-neutral-500">{r.reporter.hiddenFromOthers ? "Anonymous to residents" : "Name shown"}</p>
                  </td>
                  <td className="hidden px-3 py-3 text-right tabular-nums md:table-cell">{r.supporters}</td>
                  <td className="hidden px-4 py-3 text-right text-xs whitespace-nowrap text-neutral-500 md:table-cell">{formatRelative(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && select(null)}>
        {selected &&
          (isDesktop ? (
            <SheetContent title={selected.title} className="max-w-lg">
              <ReportManager key={selected.id} report={selected} onClose={() => select(null)} />
            </SheetContent>
          ) : (
            <DialogContent title={`Manage report: ${selected.title}`} bare>
              <div className="h-[84dvh] min-h-0">
                <ReportManager key={selected.id} report={selected} onClose={() => select(null)} />
              </div>
            </DialogContent>
          ))}
      </Dialog>
    </div>
  );
}
