import {
  REPORT_CATEGORY_META,
  REPORT_STATUS_LABELS,
  REPORT_STATUSES,
  formatLongDate,
  formatRelative,
  formatTime,
  type ReportDetail,
} from "@neighbourly/shared";
import { CheckCircle2, Circle, MapPin, MessageSquare, ShieldAlert, ThumbsUp, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Marker } from "react-leaflet";
import { useParams } from "react-router";
import { toast } from "sonner";
import { ReportPhoto } from "@/components/CoverArt";
import { IdentityLine } from "@/components/IdentityLine";
import { ErrorState, ListSkeleton, PageHeader } from "@/components/layout";
import { TownMap } from "@/components/map/TownMap";
import { pinIcon } from "@/components/map/pins";
import { CategoryBadge, REPORT_STATUS_STYLE, ReportStatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAddReportComment, useReport, useToggleSupport } from "./api";

function Timeline({ report }: { report: ReportDetail }) {
  const reached = new Map(report.history.map((h) => [h.status, h]));
  const currentIndex = REPORT_STATUSES.indexOf(report.status);
  return (
    <ol className="relative space-y-5">
      {REPORT_STATUSES.map((status, i) => {
        const entry = [...report.history].reverse().find((h) => h.status === status);
        const done = i <= currentIndex && (reached.has(status) || i < currentIndex);
        const Icon = REPORT_STATUS_STYLE[status].icon;
        return (
          <li key={status} className="relative flex gap-3">
            {i < REPORT_STATUSES.length - 1 && (
              <span className={cn("absolute top-7 left-[13px] h-[calc(100%-4px)] w-0.5", i < currentIndex ? "bg-brand-500" : "bg-neutral-200")} aria-hidden />
            )}
            <span
              className={cn(
                "relative grid size-7 shrink-0 place-items-center rounded-full",
                done ? "bg-brand-600 text-white" : "bg-neutral-100 text-neutral-400",
              )}
            >
              {done ? <Icon className="size-4" /> : <Circle className="size-3.5" />}
            </span>
            <div className="min-w-0 pb-1">
              <p className={cn("text-sm font-semibold", done ? "text-neutral-900" : "text-neutral-400")}>{REPORT_STATUS_LABELS[status]}</p>
              {entry ? (
                <>
                  <p className="text-xs text-neutral-500">
                    {formatLongDate(entry.at)}, {formatTime(entry.at)} · {entry.by}
                  </p>
                  {entry.note && <p className="mt-1 rounded-lg bg-neutral-50 px-2.5 py-1.5 text-sm text-neutral-700">{entry.note}</p>}
                </>
              ) : (
                <p className="text-xs text-neutral-400">Not yet</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Comments({ report }: { report: ReportDetail }) {
  const add = useAddReportComment(report.id);
  const [body, setBody] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    add.mutate(body.trim(), { onSuccess: () => setBody(""), onError: (err) => toast.error(errorMessage(err)) });
  };
  return (
    <Card className="p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 font-bold text-neutral-900">
        <MessageSquare className="size-4" /> Comments ({report.commentList.length})
      </h2>
      <ul className="space-y-3">
        {report.commentList.map((c) => (
          <li key={c.id} className={cn("rounded-xl p-3", c.official ? "bg-brand-50 ring-1 ring-brand-100" : "bg-neutral-50")}>
            <IdentityLine identity={c.author} meta={formatRelative(c.createdAt)} size="xs" />
            <p className="mt-2 text-sm whitespace-pre-wrap text-neutral-800">{c.body}</p>
          </li>
        ))}
        {report.commentList.length === 0 && <li className="text-sm text-neutral-500">No comments yet.</li>}
      </ul>
      <form onSubmit={submit} className="mt-4 space-y-2">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add an update or ask a question…" maxLength={500} className="min-h-20" />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-neutral-500">Shown with your block, not your name, unless you've chosen to show it.</p>
          <Button type="submit" size="sm" disabled={!body.trim()} loading={add.isPending}>
            Post
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function ReportDetailPage() {
  const { id = "" } = useParams();
  const { data: report, isPending, isError, error, refetch } = useReport(id);
  const support = useToggleSupport(id);

  if (isPending) return <ListSkeleton rows={3} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader title={report.title} back={{ to: "/towncare", label: "TownCare" }} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <ReportPhoto
            src={report.photoUrl}
            category={report.category}
            alt={report.title}
            className="h-56 w-full rounded-2xl sm:h-72"
            size={64}
          />
          <div className="flex flex-wrap items-center gap-2">
            <ReportStatusBadge status={report.status} />
            <CategoryBadge category={report.category} />
            {report.isAlert && (
              <Badge tone="amber">
                <ShieldAlert /> Active wildlife alert
              </Badge>
            )}
            {report.assignedTeam && <Badge tone="violet">Assigned: {report.assignedTeam}</Badge>}
          </div>
          <IdentityLine identity={report.reporter} meta={`Reported ${formatRelative(report.createdAt)} · ${REPORT_CATEGORY_META[report.category].label}`} />
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-neutral-800">{report.description}</p>

          <Card className="overflow-hidden">
            <TownMap center={report.location} zoom={16} interactive={false} className="h-48">
              <Marker position={[report.location.lat, report.location.lng]} icon={pinIcon(REPORT_STATUS_STYLE[report.status].pin, REPORT_CATEGORY_META[report.category].emoji)} />
            </TownMap>
            <p className="flex items-center gap-1.5 px-4 py-3 text-sm text-neutral-600">
              <MapPin className="size-4 text-neutral-400" /> {report.locationLabel}
            </p>
          </Card>

          <div className="lg:hidden">
            <Comments report={report} />
          </div>
        </div>

        <div className="space-y-5">
          <Card className="p-4 sm:p-5">
            <h2 className="mb-4 font-bold text-neutral-900">Progress</h2>
            <Timeline report={report} />
          </Card>
          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-brand-50 text-brand-700">
                <Users className="size-5" />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-neutral-900">
                  {report.supporters} {report.supporters === 1 ? "neighbour" : "neighbours"} said “me too”
                </p>
                <p className="text-xs text-neutral-500">Shows management how many residents are affected.</p>
              </div>
            </div>
            {report.isMine ? (
              <p className="mt-3 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600">
                You raised this report. You'll be notified every time its status changes.
              </p>
            ) : (
              <Button
                className="mt-4 w-full"
                variant={report.supportedByMe ? "secondary" : "outline"}
                onClick={() =>
                  support.mutate(undefined, {
                    onSuccess: (r) => toast.success(r.supportedByMe ? "Added your “me too”. You'll get updates." : "Removed your “me too”."),
                    onError: (err) => toast.error(errorMessage(err)),
                  })
                }
                loading={support.isPending}
                disabled={report.status === "resolved"}
              >
                {report.supportedByMe ? <CheckCircle2 /> : <ThumbsUp />}
                {report.supportedByMe ? "You said me too" : "Me too, I've seen this"}
              </Button>
            )}
          </Card>
          <div className="hidden lg:block">
            <Comments report={report} />
          </div>
        </div>
      </div>
    </div>
  );
}
