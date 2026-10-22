import { DIETARY_LABELS, formatWindow, type FoodListing } from "@neighbourly/shared";
import { Clock3, MapPin, Store } from "lucide-react";
import { Link } from "react-router";
import { FoodPhoto } from "@/components/CoverArt";
import { IdentityLine } from "@/components/IdentityLine";
import { FoodStatusBadge, HalalBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

const CLAIM_LABEL = {
  requested: "Requested",
  confirmed: "Reserved for you",
  collected: "Collected",
  declined: "Went to someone else",
  cancelled: "Cancelled",
} as const;

export function ListingCard({ listing: l, className }: { listing: FoodListing; className?: string }) {
  return (
    <Link
      to={`/ecofood/${l.id}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-card transition hover:border-neutral-300 hover:shadow-md",
        className,
      )}
    >
      <div className="relative">
        <FoodPhoto src={l.photoUrl} foodType={l.foodType} alt="" className="h-36 w-full" size={52} />
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          <FoodStatusBadge status={l.status} />
          {l.fromShop && (
            <Badge tone="amber">
              <Store /> Local shop
            </Badge>
          )}
        </div>
        {l.priceNote && (
          <span className="absolute right-2 bottom-2 rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-bold text-neutral-900 shadow-sm">{l.priceNote}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <p className="line-clamp-1 font-semibold text-neutral-900">{l.title}</p>
        <p className="text-xs text-neutral-500">
          {l.quantity} · about {l.estWeightKg} kg
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          <HalalBadge halal={l.halal} />
          {l.dietaryTags.slice(0, 2).map((t) => (
            <Badge key={t}>{DIETARY_LABELS[t]}</Badge>
          ))}
          {l.dietaryTags.length > 2 && <Badge>+{l.dietaryTags.length - 2}</Badge>}
        </div>
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-neutral-600">
          <Clock3 className="size-3.5 shrink-0 text-neutral-400" /> {formatWindow(l.pickupStart, l.pickupEnd)}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-neutral-600">
          <MapPin className="size-3.5 shrink-0 text-neutral-400" /> <span className="truncate">{l.pickupPoint}</span>
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <IdentityLine identity={l.giver} size="xs" link={false} />
          {l.myClaim ? (
            <Badge tone={l.myClaim.status === "confirmed" ? "green" : "neutral"}>{CLAIM_LABEL[l.myClaim.status]}</Badge>
          ) : l.requests > 0 && l.status === "available" ? (
            <span className="shrink-0 text-xs text-neutral-500">{l.requests} requested</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
