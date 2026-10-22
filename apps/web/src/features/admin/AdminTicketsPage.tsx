import { formatRelative, neighbourhoodName } from "@neighbourly/shared";
import { CheckCircle2, LifeBuoy, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { errorMessage } from "@/lib/api";
import { useAdminTickets, useCloseTicket } from "./api";

export function AdminTicketsPage() {
  const { data, isPending, isError, error, refetch } = useAdminTickets();
  const close = useCloseTicket();
  return (
    <div>
      <PageHeader title="Support tickets" description="Questions the assistant couldn't answer, and requests residents sent directly." />
      {isPending ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <EmptyState icon={<LifeBuoy />} title="No tickets" />
      ) : (
        <div className="space-y-3">
          {data.map((t) => (
            <Card key={t.id} className={t.status === "closed" ? "p-4 opacity-60" : "p-4"}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-neutral-400">
                    {t.reference} · {formatRelative(t.createdAt)}
                  </p>
                  <p className="font-bold text-neutral-900">{t.subject}</p>
                </div>
                <div className="flex gap-1.5">
                  {t.source === "assistant" && (
                    <Badge tone="violet">
                      <Sparkles /> From assistant
                    </Badge>
                  )}
                  <Badge tone={t.status === "open" ? "amber" : "neutral"}>{t.status === "open" ? "Open" : "Closed"}</Badge>
                </div>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap text-neutral-700">{t.body}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                <span>
                  {t.requester.name} · Unit {t.requester.unitNo ?? "–"}, {neighbourhoodName(t.requester.neighbourhoodId) ?? ""}
                </span>
                <a href={`mailto:${t.requester.email}`} className="flex items-center gap-1 hover:underline">
                  <Mail className="size-3.5" /> {t.requester.email}
                </a>
              </div>
              {t.status === "open" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => close.mutate(t.id, { onSuccess: () => toast.success(`${t.reference} closed`), onError: (e) => toast.error(errorMessage(e)) })}
                  loading={close.isPending && close.variables === t.id}
                >
                  <CheckCircle2 /> Mark resolved
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
