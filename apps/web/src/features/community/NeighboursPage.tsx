import { INTERESTS, INTEREST_LABELS, NEIGHBOURHOODS, neighbourhoodName, type PublicProfile } from "@neighbourly/shared";
import { Lock, Search, Store, UsersRound } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { Link } from "react-router";
import { NameAvatar } from "@/components/Avatar";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { useNeighbours } from "./api";
import { CommunityHeader } from "./CommunityPage";

export function ProfileCard({ p }: { p: PublicProfile }) {
  return (
    <Link
      to={`/community/u/${p.id}`}
      className="flex gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-card transition hover:border-neutral-300 hover:shadow-md"
    >
      <NameAvatar name={p.name} seed={p.id} src={p.avatarUrl} kind={p.role === "shop" ? "shop" : "person"} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-semibold text-neutral-900">
          <span className="truncate">{p.name}</span>
          {p.isYou && <Badge tone="brand">You</Badge>}
        </p>
        <p className="text-xs text-neutral-500">
          {p.role === "shop" ? (
            <span className="inline-flex items-center gap-1">
              <Store className="size-3.5" /> {p.shop?.category} · {p.shop?.address}
            </span>
          ) : (
            `Block ${p.block} · ${neighbourhoodName(p.neighbourhoodId)}`
          )}
        </p>
        {p.bio && <p className="mt-1.5 line-clamp-2 text-sm text-neutral-600">{p.bio}</p>}
        <div className="mt-2 flex flex-wrap gap-1">
          {p.badges.slice(0, 2).map((b) => (
            <Badge key={b} tone="green">
              {b}
            </Badge>
          ))}
          {p.interests.slice(0, 3).map((i) => (
            <Badge key={i}>{INTEREST_LABELS[i]}</Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}

export function NeighboursPage() {
  const [neighbourhood, setNeighbourhood] = useState("all");
  const [interest, setInterest] = useState("all");
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const list = useNeighbours({ neighbourhood, interest, q: deferredQ });

  return (
    <div>
      <CommunityHeader />
      <p className="mb-3 text-sm text-neutral-500">Verified residents and local shops who chose to be listed.</p>
      <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px_200px]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or shop" className="pl-10" aria-label="Search neighbours" />
        </div>
        <Select value={neighbourhood} onChange={(e) => setNeighbourhood(e.target.value)} aria-label="Neighbourhood">
          <option value="all">All neighbourhoods</option>
          {NEIGHBOURHOODS.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </Select>
        <Select value={interest} onChange={(e) => setInterest(e.target.value)} aria-label="Interest">
          <option value="all">Any interest</option>
          {INTERESTS.map((i) => (
            <option key={i} value={i}>
              {INTEREST_LABELS[i]}
            </option>
          ))}
        </Select>
      </div>
      <p className="mb-4 flex items-center gap-1.5 text-xs text-neutral-500">
        <Lock className="size-3.5" /> Phone numbers, emails and unit numbers are never shown. You can hide yourself in Privacy & settings.
      </p>
      {list.isPending ? (
        <ListSkeleton />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.data.length === 0 ? (
        <EmptyState icon={<UsersRound />} title="No neighbours match" description="Try a different search or filter." />
      ) : (
        <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3", list.isPlaceholderData && "opacity-60")}>
          {list.data.map((p) => (
            <ProfileCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
