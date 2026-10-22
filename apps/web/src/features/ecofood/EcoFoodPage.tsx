import { FOOD_TYPES, FOOD_TYPE_META, type FoodType } from "@neighbourly/shared";
import { HeartHandshake, Plus, Scale, Store, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { fmt1 } from "@/components/charts/theme";
import { EmptyState, ErrorState, FilterChips, ListSkeleton, PageHeader, SegmentedNav } from "@/components/layout";
import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useFoodListings, useImpact } from "./api";
import { ListingCard } from "./ListingCard";

export const ECOFOOD_TABS = [
  { to: "/ecofood", label: "Available" },
  { to: "/ecofood/mine", label: "My food" },
  { to: "/ecofood/impact", label: "Impact" },
];

export function EcoFoodHeader() {
  return (
    <PageHeader
      title="EcoFood"
      description="Share surplus food with neighbours, and pick up local shops' end-of-day leftovers."
      actions={
        <Button asChild>
          <Link to="/ecofood/new">
            <Plus /> Share food
          </Link>
        </Button>
      }
    />
  );
}

export function EcoFoodPage({ mine = false }: { mine?: boolean }) {
  const [type, setType] = useState<FoodType | "all">("all");
  const [source, setSource] = useState<"all" | "residents" | "shops">("all");
  const [halal, setHalal] = useState<"any" | "halal">("any");
  const listings = useFoodListings({ view: mine ? "mine" : "active", type, source, halal: halal === "halal" });
  const impact = useImpact();

  return (
    <div>
      <EcoFoodHeader />
      {!mine && impact.data && (
        <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
          <StatTile label="Saved this month" value={fmt1.format(impact.data.community.kgThisMonth)} unit="kg" icon={<Scale />} />
          <StatTile label="Neighbours helped" value={impact.data.community.neighboursHelped} icon={<HeartHandshake />} />
          <StatTile label="Shops taking part" value={impact.data.community.shopsParticipating} icon={<Store />} />
        </div>
      )}
      <SegmentedNav items={ECOFOOD_TABS} className="mb-4" />
      {!mine && (
        <div className="mb-5 space-y-2.5">
          <FilterChips
            label="Food type"
            value={type}
            onChange={setType}
            options={[{ value: "all", label: "All food" }, ...FOOD_TYPES.map((t) => ({ value: t, label: `${FOOD_TYPE_META[t].emoji} ${FOOD_TYPE_META[t].label}` }))]}
          />
          <div className="flex flex-wrap gap-2.5">
            <FilterChips
              label="Shared by"
              value={source}
              onChange={setSource}
              options={[
                { value: "all", label: "Everyone" },
                { value: "residents", label: "Neighbours" },
                { value: "shops", label: "Local shops" },
              ]}
            />
            <FilterChips
              label="Halal"
              value={halal}
              onChange={setHalal}
              options={[
                { value: "any", label: "Any" },
                { value: "halal", label: "Halal only" },
              ]}
            />
          </div>
        </div>
      )}

      {listings.isPending ? (
        <ListSkeleton />
      ) : listings.isError ? (
        <ErrorState error={listings.error} onRetry={() => void listings.refetch()} />
      ) : listings.data.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed />}
          title={mine ? "Nothing here yet" : "No food matches these filters"}
          description={mine ? "Food you share or request will show up here." : "Check back this evening, when shops post their end-of-day surplus."}
          action={
            <Button asChild>
              <Link to="/ecofood/new">
                <Plus /> Share food
              </Link>
            </Button>
          }
        />
      ) : (
        <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3", listings.isPlaceholderData && "opacity-60 transition-opacity")}>
          {listings.data.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
