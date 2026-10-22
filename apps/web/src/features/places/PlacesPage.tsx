import {
  FACILITY_TYPE_META,
  HALAL_LABELS,
  formatMinutes,
  neighbourhoodName,
  type Facility,
  type LatLng,
  type ShopPlace,
} from "@neighbourly/shared";
import { ChevronRight, Clock3, ExternalLink, Leaf, MapPin, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Marker } from "react-leaflet";
import { Link } from "react-router";
import { FacilityPhoto } from "@/components/CoverArt";
import { ErrorState, FilterChips, PageHeader } from "@/components/layout";
import { FitToPoints, MapFocus, TownMap } from "@/components/map/TownMap";
import { pinIcon } from "@/components/map/pins";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { FacilityBadge } from "../booking/FacilitiesPage";
import { usePlaces } from "./api";

type Place =
  | { kind: "facility"; id: string; name: string; location: LatLng; facility: Facility }
  | { kind: "shop"; id: string; name: string; location: LatLng; shop: ShopPlace };
type Filter = "all" | Place["kind"];

/** Facilities wear the brand red, shops the brand yellow (darkened so the pin reads on the map). */
const PIN = { facility: "#d71920", shop: "#b86e00" } as const;
const SHOP_EMOJI = "🛍️";
const MAP_ID = "places-map";

const emojiFor = (p: Place) => (p.kind === "facility" ? FACILITY_TYPE_META[p.facility.type].emoji : SHOP_EMOJI);
const directionsUrl = (p: LatLng) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;

function Legend() {
  return (
    <div className="absolute bottom-3 left-3 z-[500] rounded-xl bg-white/95 px-3 py-2 text-xs shadow-md">
      <ul className="space-y-1">
        <li className="flex items-center gap-2 text-neutral-700">
          <span className="size-3 rounded-full ring-2 ring-white" style={{ background: PIN.facility }} aria-hidden /> Facility
        </li>
        <li className="flex items-center gap-2 text-neutral-700">
          <span className="size-3 rounded-full ring-2 ring-white" style={{ background: PIN.shop }} aria-hidden /> Local shop
        </li>
      </ul>
    </div>
  );
}

/** Full details in the side panel; `compact` keeps the phone overlay from covering the map. */
function PlaceDetail({ place, onClose, compact = false, className }: { place: Place; onClose?: () => void; compact?: boolean; className?: string }) {
  const facility = place.kind === "facility" ? place.facility : null;
  const shop = place.kind === "shop" ? place.shop : null;
  const kicker = facility
    ? FACILITY_TYPE_META[facility.type].label
    : compact
      ? `${shop!.category} · ${HALAL_LABELS[shop!.halal]}`
      : shop!.category;
  const where = facility ? `${facility.locationLabel} · ${neighbourhoodName(facility.neighbourhoodId)}` : shop!.address;
  const hours = facility ? `${formatMinutes(facility.openMinutes)} – ${formatMinutes(facility.closeMinutes)}` : shop!.openingHours;
  const primary = facility ? { to: `/book/${place.id}`, label: "Check availability" } : { to: `/community/u/${shop!.userId}`, label: "View shop" };

  return (
    <article className={cn("relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-card", className)}>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 z-10 rounded-full bg-white/90 p-1.5 text-neutral-500 shadow hover:text-neutral-900"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      )}
      {facility && !compact && <FacilityPhoto src={facility.photoUrl} type={facility.type} alt="" className="h-28 w-full" size={40} />}
      <div className={compact ? "p-3.5" : "p-4"}>
        <p className="pr-8 text-xs font-semibold text-neutral-400">{kicker}</p>
        <h2 className="pr-8 font-bold text-neutral-900">{place.name}</h2>
        {shop && !compact && (
          <div className="mt-1.5">
            <Badge tone={shop.halal === "halal" ? "green" : "neutral"}>{HALAL_LABELS[shop.halal]}</Badge>
          </div>
        )}
        <div className={cn("space-y-1 text-sm text-neutral-600", compact ? "mt-1" : "mt-2")}>
          <p className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 size-4 shrink-0 text-neutral-400" />
            <span className={cn(compact && "truncate")}>{where}</span>
          </p>
          {!compact && (
            <p className="flex items-start gap-1.5">
              <Clock3 className="mt-0.5 size-4 shrink-0 text-neutral-400" /> {hours}
            </p>
          )}
          {facility && !compact && (
            <p className="flex items-center gap-1.5">
              <Users className="size-4 shrink-0 text-neutral-400" /> Up to {facility.capacity} people
            </p>
          )}
          {shop && shop.activeListings > 0 && (
            <p className="flex items-center gap-1.5 font-semibold text-green-800">
              <Leaf className="size-4 shrink-0" /> Sharing {shop.activeListings} {shop.activeListings === 1 ? "listing" : "listings"} on EcoFood now
            </p>
          )}
        </div>
        {facility && !compact && (
          <div className="mt-2.5">
            <FacilityBadge requiresApproval={facility.requiresApproval} />
          </div>
        )}
        <div className={cn("flex gap-2", compact ? "mt-3" : "mt-4")}>
          <Button asChild size="sm" className="flex-1">
            <Link to={primary.to}>{primary.label}</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={directionsUrl(place.location)} target="_blank" rel="noreferrer">
              Directions <ExternalLink />
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}

function PlaceRow({ place, active, onSelect }: { place: Place; active: boolean; onSelect: () => void }) {
  const sub =
    place.kind === "facility"
      ? `${place.facility.locationLabel} · ${neighbourhoodName(place.facility.neighbourhoodId)}`
      : `${place.shop.category} · ${place.shop.address}`;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
        active ? "border-brand-300 bg-brand-50" : "border-transparent hover:bg-white",
      )}
    >
      <span
        className="grid size-9 shrink-0 place-items-center rounded-full text-base text-white ring-2 ring-white"
        style={{ background: PIN[place.kind] }}
        aria-hidden
      >
        {emojiFor(place)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-neutral-900">{place.name}</span>
        <span className="block truncate text-xs text-neutral-500">{sub}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-neutral-400" />
    </button>
  );
}

export function PlacesPage() {
  const places = usePlaces();
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** On phones the list sits under the map, so bring the map (and its detail card) into view. */
  const selectFromList = (id: string) => {
    setSelectedId(id);
    if (!window.matchMedia("(min-width: 768px)").matches) document.getElementById(MAP_ID)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const all = useMemo<Place[]>(
    () => [
      ...(places.data?.facilities ?? []).map((f) => ({ kind: "facility" as const, id: f.id, name: f.name, location: f.location, facility: f })),
      ...(places.data?.shops ?? []).map((s) => ({ kind: "shop" as const, id: s.userId, name: s.shopName, location: s.location, shop: s })),
    ],
    [places.data],
  );
  const shown = all.filter((p) => filter === "all" || p.kind === filter);
  const selected = shown.find((p) => p.id === selectedId) ?? null;
  const count = (kind: Place["kind"]) => all.filter((p) => p.kind === kind).length;

  const groups = [
    { kind: "facility" as const, title: "Facilities" },
    { kind: "shop" as const, title: "Local shops" },
  ].filter((g) => filter === "all" || g.kind === filter);

  return (
    <div>
      <PageHeader title="Places" description="Every bookable facility and verified local shop in City of Elmina." />
      <div className="mb-4">
        <FilterChips
          label="Show"
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setSelectedId(null);
          }}
          options={[
            { value: "all", label: "All places" },
            { value: "facility", label: `🏛️ Facilities${places.data ? ` (${count("facility")})` : ""}` },
            { value: "shop", label: `${SHOP_EMOJI} Local shops${places.data ? ` (${count("shop")})` : ""}` },
          ]}
        />
      </div>
      {places.isError ? (
        <ErrorState error={places.error} onRetry={() => void places.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_340px]">
          <div id={MAP_ID} className="relative self-start">
            <TownMap className="h-[max(300px,calc(100dvh-30rem))] rounded-2xl border border-neutral-200 md:h-[620px]">
              <FitToPoints points={all.map((p) => p.location)} />
              <MapFocus target={selected?.location ?? null} />
              {shown.map((p) => (
                <Marker
                  key={p.id}
                  position={[p.location.lat, p.location.lng]}
                  icon={pinIcon(PIN[p.kind], emojiFor(p), p.id === selectedId)}
                  title={p.name}
                  eventHandlers={{ click: () => setSelectedId(p.id) }}
                />
              ))}
            </TownMap>
            <Legend />
            {selected && (
              <div className="absolute inset-x-3 bottom-3 z-[600] md:hidden">
                <PlaceDetail place={selected} onClose={() => setSelectedId(null)} compact className="shadow-xl" />
              </div>
            )}
          </div>
          <aside className="space-y-4">
            {selected && <PlaceDetail place={selected} onClose={() => setSelectedId(null)} className="hidden md:block" />}
            {places.isPending ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              groups.map((g) => {
                const items = shown.filter((p) => p.kind === g.kind);
                return (
                  <section key={g.kind} aria-label={g.title}>
                    <h2 className="mb-1 px-1 text-xs font-bold tracking-wider text-neutral-400 uppercase">{g.title}</h2>
                    {items.length === 0 ? (
                      <p className="px-1 text-sm text-neutral-500">None yet.</p>
                    ) : (
                      <div className="space-y-0.5">
                        {items.map((p) => (
                          <PlaceRow key={p.id} place={p} active={p.id === selectedId} onSelect={() => selectFromList(p.id)} />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
