import { FACILITY_TYPE_META, formatMinutes, formatWindow, neighbourhoodName } from "@neighbourly/shared";
import { CalendarCheck2, Clock3, MapPin, ShieldCheck, Users, Zap } from "lucide-react";
import { Link } from "react-router";
import { FacilityPhoto } from "@/components/CoverArt";
import { ErrorState, ListSkeleton, PageHeader } from "@/components/layout";
import { BookingStatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFacilities, useMyBookings } from "./api";
import { useNow } from "@/lib/use-now";

function NextBooking() {
  const { data } = useMyBookings();
  const now = useNow();
  const next = data?.find((b) => new Date(b.end).getTime() > now && (b.status === "confirmed" || b.status === "pending"));
  if (!next) return null;
  return (
    <Link
      to="/book/mine"
      className="mb-5 flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 transition hover:bg-brand-100/60"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-700 text-white">
        <CalendarCheck2 className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-brand-800">Your next booking</p>
        <p className="truncate font-semibold text-neutral-900">{next.facilityName}</p>
        <p className="text-sm text-neutral-600">{formatWindow(next.start, next.end)}</p>
      </div>
      <BookingStatusBadge status={next.status} />
    </Link>
  );
}

export function FacilityBadge({ requiresApproval }: { requiresApproval: boolean }) {
  return requiresApproval ? (
    <Badge tone="amber">
      <ShieldCheck /> Needs approval
    </Badge>
  ) : (
    <Badge tone="green">
      <Zap /> Instant booking
    </Badge>
  );
}

export function FacilitiesPage() {
  const facilities = useFacilities();
  return (
    <div>
      <PageHeader
        title="Book a facility"
        description="Halls, the gym studio, the BBQ pit and meeting rooms. You'll see which slots are free, but never who booked them."
        actions={
          <Button asChild variant="outline">
            <Link to="/book/mine">My bookings</Link>
          </Button>
        }
      />
      <NextBooking />
      {facilities.isPending ? (
        <ListSkeleton />
      ) : facilities.isError ? (
        <ErrorState error={facilities.error} onRetry={() => void facilities.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {facilities.data.map((f) => (
            <Link
              key={f.id}
              to={`/book/${f.id}`}
              className="group overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-card transition hover:border-neutral-300 hover:shadow-md"
            >
              <FacilityPhoto src={f.photoUrl} type={f.type} alt="" className="h-40 w-full" size={56} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-neutral-400">{FACILITY_TYPE_META[f.type].label}</p>
                    <h2 className="font-bold text-neutral-900">{f.name}</h2>
                  </div>
                  <FacilityBadge requiresApproval={f.requiresApproval} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm text-neutral-600">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-4 text-neutral-400" /> Up to {f.capacity}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="size-4 text-neutral-400" /> {formatMinutes(f.openMinutes)} – {formatMinutes(f.closeMinutes)}
                  </span>
                  <span className="col-span-2 flex items-center gap-1.5">
                    <MapPin className="size-4 text-neutral-400" /> {f.locationLabel} · {neighbourhoodName(f.neighbourhoodId)}
                  </span>
                </div>
                <span className="mt-4 inline-flex text-sm font-semibold text-brand-700 group-hover:underline">Check availability →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
