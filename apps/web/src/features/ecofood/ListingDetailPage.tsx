import {
  DIETARY_LABELS,
  FOOD_TYPE_META,
  anonymousLabel,
  formatDayRelative,
  formatRelative,
  formatTime,
  formatWindow,
  type FoodClaim,
  type FoodListingDetail,
} from "@neighbourly/shared";
import { CheckCircle2, Clock3, Hourglass, MapPin, PackageCheck, PartyPopper, ShieldCheck, Store, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { Marker } from "react-leaflet";
import { useParams } from "react-router";
import { toast } from "sonner";
import { FoodPhoto } from "@/components/CoverArt";
import { IdentityLine } from "@/components/IdentityLine";
import { ErrorState, ListSkeleton, PageHeader } from "@/components/layout";
import { TownMap } from "@/components/map/TownMap";
import { pinIcon } from "@/components/map/pins";
import { FoodStatusBadge, HalalBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import { errorMessage } from "@/lib/api";
import { useCurrentUser } from "../auth/api";
import { useCancelClaim, useCancelListing, useConfirmClaim, useDeclineClaim, useFoodListing, useMarkCollected, useRequestFood } from "./api";

function PickupCode({ code }: { code: string }) {
  return (
    <div className="rounded-2xl bg-brand-700 p-4 text-center text-white">
      <p className="text-xs font-semibold tracking-wide text-brand-100 uppercase">Pickup code</p>
      <p className="mt-1 font-mono text-4xl font-bold tracking-[0.3em]">{code}</p>
      <p className="mt-1 text-xs text-brand-100">Show this when you collect, so no phone numbers need to be swapped.</p>
    </div>
  );
}

function ClaimerActions({ listing }: { listing: FoodListingDetail }) {
  const me = useCurrentUser();
  const [note, setNote] = useState("");
  const request = useRequestFood(listing.id);
  const cancel = useCancelClaim(listing.id);
  const claim = listing.myClaim;
  const onError = (err: unknown) => toast.error(errorMessage(err));

  if (claim?.status === "confirmed") {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 font-semibold text-green-800">
          <CheckCircle2 className="size-5" /> Reserved for you
        </p>
        <PickupCode code={claim.pickupCode ?? "----"} />
        <p className="text-sm text-neutral-600">
          Collect at <span className="font-semibold">{listing.pickupPoint}</span>, {formatWindow(listing.pickupStart, listing.pickupEnd)}.
        </p>
        <Button variant="ghost" size="sm" className="text-neutral-500" onClick={() => cancel.mutate(claim.id, { onError })} loading={cancel.isPending}>
          I can't make it, cancel
        </Button>
      </div>
    );
  }
  if (claim?.status === "requested") {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 font-semibold text-amber-800">
          <Hourglass className="size-5" /> Request sent
        </p>
        <p className="text-sm text-neutral-600">
          {listing.giver.displayName} will confirm who gets it. You'll get a notification with a pickup code once it's yours.
        </p>
        <Button variant="outline" size="sm" onClick={() => cancel.mutate(claim.id, { onError })} loading={cancel.isPending}>
          Cancel request
        </Button>
      </div>
    );
  }
  if (claim?.status === "collected") {
    return (
      <p className="flex items-center gap-2 font-semibold text-green-800">
        <PartyPopper className="size-5" /> You collected this. Thanks for saving food!
      </p>
    );
  }
  if (listing.status !== "available") {
    return (
      <p className="flex items-center gap-2 text-sm font-semibold text-neutral-600">
        <XCircle className="size-5" />
        {listing.status === "reserved" ? "Reserved for another neighbour." : listing.status === "collected" ? "Already collected." : "No longer available."}
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {claim?.status === "declined" && <p className="text-sm text-neutral-500">Your earlier request wasn't accepted, but you can ask again.</p>}
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note, e.g. “I can come at 7 pm”" maxLength={200} className="min-h-20" />
      <Button className="w-full" size="lg" onClick={() => request.mutate(note, { onSuccess: () => toast.success("Request sent"), onError })} loading={request.isPending}>
        Request this food
      </Button>
      <p className="text-xs text-neutral-500">
        The giver will see you as <span className="font-semibold">{me.privacy.showNameOnClaims ? me.name : anonymousLabel(me)}</span>.
      </p>
    </div>
  );
}

function ClaimRow({ listing, claim }: { listing: FoodListingDetail; claim: FoodClaim }) {
  const confirm = useConfirmClaim(listing.id);
  const decline = useDeclineClaim(listing.id);
  const onError = (err: unknown) => toast.error(errorMessage(err));
  return (
    <li className="rounded-xl border border-neutral-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <IdentityLine identity={claim.claimer} meta={formatRelative(claim.createdAt)} size="xs" />
        {claim.status !== "requested" && <Badge tone={claim.status === "confirmed" ? "green" : "neutral"}>{claim.status}</Badge>}
      </div>
      {claim.note && <p className="mt-2 rounded-lg bg-neutral-50 px-2.5 py-1.5 text-sm text-neutral-700">“{claim.note}”</p>}
      {claim.status === "requested" && listing.status === "available" && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={() => confirm.mutate(claim.id, { onSuccess: () => toast.success("Confirmed. We've sent them the pickup code."), onError })} loading={confirm.isPending}>
            <CheckCircle2 /> Confirm
          </Button>
          <Button size="sm" variant="ghost" onClick={() => decline.mutate(claim.id, { onError })} loading={decline.isPending}>
            Decline
          </Button>
        </div>
      )}
    </li>
  );
}

function OwnerActions({ listing }: { listing: FoodListingDetail }) {
  const collected = useMarkCollected(listing.id);
  const cancel = useCancelListing(listing.id);
  const confirmed = listing.claims.find((c) => c.status === "confirmed");
  const requests = listing.claims.filter((c) => c.status === "requested");
  const onError = (err: unknown) => toast.error(errorMessage(err));

  if (listing.status === "collected") {
    return (
      <div className="rounded-2xl bg-green-50 p-4 text-green-900">
        <p className="flex items-center gap-2 font-semibold">
          <PartyPopper className="size-5" /> Collected! About {listing.estWeightKg} kg kept out of landfill.
        </p>
        <p className="mt-1 text-sm">Thank you for sharing. It's been added to the community's food saved.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {listing.status === "reserved" && confirmed && (
        <div className="space-y-3 rounded-2xl bg-brand-50 p-4">
          <p className="text-sm font-semibold text-brand-900">Reserved for {confirmed.claimer.displayName}</p>
          <p className="text-sm text-brand-900">
            Their pickup code is <span className="font-mono text-lg font-bold tracking-widest">{confirmed.pickupCode}</span>. Check it matches when they
            collect.
          </p>
          <Button className="w-full" onClick={() => collected.mutate(undefined, { onSuccess: () => toast.success("Marked as collected. Food saved! 🎉"), onError })} loading={collected.isPending}>
            <PackageCheck /> Mark as collected
          </Button>
        </div>
      )}
      {listing.status === "available" && (
        <div>
          <p className="mb-2 text-sm font-semibold text-neutral-900">
            {requests.length ? `${requests.length} ${requests.length === 1 ? "request" : "requests"}. Choose who gets it.` : "No requests yet."}
          </p>
          <ul className="space-y-2">
            {requests.map((c) => (
              <ClaimRow key={c.id} listing={listing} claim={c} />
            ))}
          </ul>
          <p className="mt-2 text-xs text-neutral-500">Requesters appear by block unless they've chosen to show their name.</p>
        </div>
      )}
      {(listing.status === "available" || listing.status === "reserved") && (
        <Button
          variant="ghost"
          size="sm"
          className="text-rose-600 hover:bg-rose-50"
          onClick={() => cancel.mutate(undefined, { onSuccess: () => toast("Listing removed"), onError })}
          loading={cancel.isPending}
        >
          <Trash2 /> Remove listing
        </Button>
      )}
    </div>
  );
}

export function ListingDetailPage() {
  const { id = "" } = useParams();
  const { data: listing, isPending, isError, error, refetch } = useFoodListing(id);
  if (isPending) return <ListSkeleton rows={3} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader title={listing.title} back={{ to: "/ecofood", label: "EcoFood" }} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <FoodPhoto src={listing.photoUrl} foodType={listing.foodType} alt={listing.title} className="h-56 w-full rounded-2xl sm:h-72" size={72} />
          <div className="flex flex-wrap gap-2">
            <FoodStatusBadge status={listing.status} />
            <HalalBadge halal={listing.halal} />
            {listing.dietaryTags.map((t) => (
              <Badge key={t}>{DIETARY_LABELS[t]}</Badge>
            ))}
            {listing.fromShop && (
              <Badge tone="amber">
                <Store /> Local shop
              </Badge>
            )}
          </div>
          {listing.description && <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-neutral-800">{listing.description}</p>}
          <Card className="divide-y divide-neutral-100">
            {[
              ["Food", `${FOOD_TYPE_META[listing.foodType].emoji} ${FOOD_TYPE_META[listing.foodType].label}`],
              ["Quantity", `${listing.quantity} (about ${listing.estWeightKg} kg)`],
              ["Pickup", formatWindow(listing.pickupStart, listing.pickupEnd)],
              ["Best before", `${formatDayRelative(listing.expiresAt)}, ${formatTime(listing.expiresAt)}`],
              ["Price", listing.priceNote ?? "Free"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="text-neutral-500">{k}</span>
                <span className="text-right font-semibold text-neutral-900">{v}</span>
              </div>
            ))}
          </Card>
          <Card className="overflow-hidden">
            <TownMap center={listing.location} zoom={16} interactive={false} className="h-44">
              <Marker position={[listing.location.lat, listing.location.lng]} icon={pinIcon("#16a34a", FOOD_TYPE_META[listing.foodType].emoji)} />
            </TownMap>
            <p className="flex items-center gap-1.5 px-4 py-3 text-sm text-neutral-700">
              <MapPin className="size-4 text-neutral-400" /> {listing.pickupPoint}
            </p>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-4 sm:p-5">{listing.isMine ? <OwnerActions listing={listing} /> : <ClaimerActions listing={listing} />}</Card>
          <Card className="space-y-3 p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Shared by</p>
            <IdentityLine identity={listing.giver} meta={`Posted ${formatRelative(listing.createdAt)}`} size="md" />
            {!listing.isMine && listing.requests > 0 && listing.status === "available" && (
              <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                <Clock3 className="size-3.5" /> {listing.requests} {listing.requests === 1 ? "neighbour has" : "neighbours have"} asked for this
              </p>
            )}
          </Card>
          <Card className="flex gap-3 p-4 text-sm text-neutral-600">
            <ShieldCheck className="size-5 shrink-0 text-brand-700" />
            <p>Check that food looks and smells right and that packaging is intact. Eat cooked food soon after collecting it.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
