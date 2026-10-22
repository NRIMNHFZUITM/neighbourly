import { INTEREST_LABELS, formatLongDate, neighbourhoodName } from "@neighbourly/shared";
import { EyeOff, Settings, Store } from "lucide-react";
import { Link, useParams } from "react-router";
import { NameAvatar } from "@/components/Avatar";
import { ErrorState, ListSkeleton, PageHeader, Section } from "@/components/layout";
import { HalalBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListingCard } from "../ecofood/ListingCard";
import { ReportCard } from "../towncare/ReportCard";
import { useProfile } from "./api";
import { PostCard } from "./PostCard";

export function ProfilePage() {
  const { id = "" } = useParams();
  const { data, isPending, isError, error, refetch } = useProfile(id);
  if (isPending) return <ListSkeleton rows={3} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const { profile: p, posts, listings, reports } = data;

  return (
    <div className="space-y-6">
      <PageHeader title={p.isYou ? "Your public profile" : p.name} back={{ to: "/community/neighbours", label: "Neighbours" }} />
      {p.isYou && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
          <p>This is exactly what verified neighbours see. Your contact details and unit number are never shown.</p>
          <Button asChild size="sm" variant="outline">
            <Link to="/settings">
              <Settings /> Privacy settings
            </Link>
          </Button>
        </div>
      )}
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <NameAvatar name={p.name} seed={p.id} src={p.avatarUrl} kind={p.role === "shop" ? "shop" : "person"} size="xl" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-neutral-900">{p.name}</h2>
          <p className="text-sm text-neutral-500">
            {p.role === "shop" ? (
              <span className="inline-flex items-center gap-1">
                <Store className="size-4" /> {p.shop?.category} · {p.shop?.address}
              </span>
            ) : (
              `Block ${p.block} · ${neighbourhoodName(p.neighbourhoodId)}`
            )}{" "}
            · Joined {formatLongDate(p.joinedAt)}
          </p>
          {p.bio && <p className="mt-2 text-neutral-700">{p.bio}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.badges.map((b) => (
              <Badge key={b} tone="green">
                {b}
              </Badge>
            ))}
            {p.interests.map((i) => (
              <Badge key={i}>{INTEREST_LABELS[i]}</Badge>
            ))}
            {p.shop && <HalalBadge halal={p.shop.halal} />}
          </div>
          {p.shop && <p className="mt-2 text-sm text-neutral-600">Open {p.shop.openingHours}</p>}
        </div>
        <dl className="grid grid-cols-3 gap-4 text-center sm:w-64">
          {[
            ["Posts", p.stats.posts],
            ["Food shared", p.stats.foodShared],
            ["Signed reports", p.stats.signedReports],
          ].map(([k, v]) => (
            <div key={k}>
              <dd className="text-xl font-semibold text-neutral-900">{v}</dd>
              <dt className="text-xs text-neutral-500">{k}</dt>
            </div>
          ))}
        </dl>
      </Card>

      {listings.length > 0 && (
        <Section title="Food shared">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Reports with their name">
        {reports.length ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {reports.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        ) : null}
        <p className="flex items-center gap-1.5 text-xs text-neutral-500">
          <EyeOff className="size-3.5" /> Anonymous reports never appear on profiles.
        </p>
      </Section>

      {posts.length > 0 && (
        <Section title="Posts">
          <div className="mx-auto max-w-2xl space-y-3 lg:mx-0">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
