import { formatRelative, type Report } from "@neighbourly/shared";
import { MapPin, MessageSquare, ShieldAlert, ThumbsUp } from "lucide-react";
import { Link } from "react-router";
import { ReportPhoto } from "@/components/CoverArt";
import { CategoryBadge, ReportStatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export function ReportCard({ report: r, compact, className }: { report: Report; compact?: boolean; className?: string }) {
  return (
    <Link
      to={`/towncare/${r.id}`}
      className={cn(
        "flex gap-3 rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-card transition hover:border-neutral-300 hover:shadow-md",
        className,
      )}
    >
      <ReportPhoto
        src={r.photoUrl}
        category={r.category}
        alt=""
        className={cn("shrink-0 rounded-xl", compact ? "size-16" : "size-20 sm:size-24")}
        size={compact ? 26 : 32}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <ReportStatusBadge status={r.status} />
          <CategoryBadge category={r.category} />
          {r.isAlert && (
            <Badge tone="amber">
              <ShieldAlert /> Alert
            </Badge>
          )}
        </div>
        <p className="mt-1.5 line-clamp-2 leading-snug font-semibold text-neutral-900">{r.title}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-neutral-500">
          <MapPin className="size-3.5 shrink-0" /> <span className="truncate">{r.locationLabel}</span>
        </p>
        <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
          <span className="truncate">
            {r.reporter.isYou ? "You" : r.reporter.displayName} · {formatRelative(r.createdAt)}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1" title="Neighbours who said 'me too'">
            <ThumbsUp className={cn("size-3.5", r.supportedByMe && "fill-brand-600 text-brand-600")} /> {r.supporters}
          </span>
          <span className="flex shrink-0 items-center gap-1" title="Comments">
            <MessageSquare className="size-3.5" /> {r.comments}
          </span>
        </div>
      </div>
    </Link>
  );
}
