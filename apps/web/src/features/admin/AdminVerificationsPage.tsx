import { HALAL_LABELS, formatRelative, neighbourhoodName } from "@neighbourly/shared";
import { CheckCircle2, ShieldCheck, Store, UserRound, XCircle } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { errorMessage } from "@/lib/api";
import { useDecideVerification, useVerifications } from "./api";

export function AdminVerificationsPage() {
  const { data, isPending, isError, error, refetch } = useVerifications();
  const decide = useDecideVerification();
  const act = (userId: string, action: "approve" | "reject", name: string) =>
    decide.mutate(
      { userId, action },
      { onSuccess: () => toast.success(action === "approve" ? `${name} is now verified` : `${name}'s request was rejected`), onError: (e) => toast.error(errorMessage(e)) },
    );

  return (
    <div>
      <PageHeader title="Verifications" description="Residents without a unit code and new local shops wait here for approval. Check details against your records." />
      {isPending ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <EmptyState icon={<ShieldCheck />} title="All caught up" description="No one is waiting for verification." />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {data.map((v) => (
            <Card key={v.userId} className="p-4">
              <div className="flex items-start gap-3">
                <span className={v.role === "shop" ? "grid size-10 place-items-center rounded-full bg-amber-100 text-amber-800" : "grid size-10 place-items-center rounded-full bg-sky-100 text-sky-800"}>
                  {v.role === "shop" ? <Store className="size-5" /> : <UserRound className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-neutral-900">{v.shop?.shopName ?? v.name}</p>
                    <Badge tone={v.role === "shop" ? "amber" : "sky"}>{v.role === "shop" ? "Shop application" : "Resident"}</Badge>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {v.email} · requested {formatRelative(v.requestedAt)}
                  </p>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl bg-neutral-50 p-3 text-sm">
                {v.shop ? (
                  <>
                    <dt className="text-neutral-500">Owner</dt>
                    <dd className="font-medium text-neutral-900">{v.name}</dd>
                    <dt className="text-neutral-500">SSM no.</dt>
                    <dd className="font-mono font-medium text-neutral-900">{v.shop.ssmNo}</dd>
                    <dt className="text-neutral-500">Type</dt>
                    <dd className="font-medium text-neutral-900">{v.shop.category}</dd>
                    <dt className="text-neutral-500">Halal</dt>
                    <dd className="font-medium text-neutral-900">{HALAL_LABELS[v.shop.halal]}</dd>
                    <dt className="text-neutral-500">Address</dt>
                    <dd className="font-medium text-neutral-900">{v.shop.address}</dd>
                  </>
                ) : (
                  <>
                    <dt className="text-neutral-500">Neighbourhood</dt>
                    <dd className="font-medium text-neutral-900">{neighbourhoodName(v.neighbourhoodId)}</dd>
                    <dt className="text-neutral-500">Unit</dt>
                    <dd className="font-medium text-neutral-900">
                      {v.unitNo}, Block {v.block}
                    </dd>
                  </>
                )}
              </dl>
              {v.note && <p className="mt-2 text-sm text-neutral-600">“{v.note}”</p>}
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => act(v.userId, "approve", v.name)} loading={decide.isPending && decide.variables?.userId === v.userId && decide.variables.action === "approve"}>
                  <CheckCircle2 /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => act(v.userId, "reject", v.name)} loading={decide.isPending && decide.variables?.userId === v.userId && decide.variables.action === "reject"}>
                  <XCircle /> Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
