import { formatWindow, type Booking } from "@neighbourly/shared";
import { CalendarDays, CalendarX2, Repeat, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/layout";
import { BookingStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/misc";
import { errorMessage } from "@/lib/api";
import { useCancelBooking, useFacility, useMyBookings, useRescheduleBooking } from "./api";
import { AvailabilityPicker, type SlotSelection } from "./AvailabilityPicker";
import { selectionLabel } from "./FacilityPage";
import { useNow } from "@/lib/use-now";

function RescheduleDialog({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { data: facility } = useFacility(booking.facilityId);
  const reschedule = useRescheduleBooking();
  const [slot, setSlot] = useState<SlotSelection | null>(null);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Reschedule booking" description={`${booking.facilityName}. Currently ${formatWindow(booking.start, booking.end)}.`} className="sm:max-w-2xl">
        {facility ? (
          <div className="space-y-4">
            <AvailabilityPicker facility={facility} value={slot} onChange={setSlot} allowMine />
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-neutral-600">{slot ? selectionLabel(slot) : "Pick a new slot"}</p>
              <Button
                disabled={!slot}
                loading={reschedule.isPending}
                onClick={() =>
                  slot &&
                  reschedule.mutate(
                    { id: booking.id, ...slot },
                    {
                      onSuccess: (b) => {
                        toast.success(b.status === "pending" ? "Moved. Waiting for approval again." : "Booking moved");
                        onClose();
                      },
                      onError: (err) => toast.error(errorMessage(err)),
                    },
                  )
                }
              >
                Move booking
              </Button>
            </div>
          </div>
        ) : (
          <ListSkeleton rows={2} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const cancel = useCancelBooking();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Cancel this booking?" description={`${booking.facilityName}, ${formatWindow(booking.start, booking.end)}. The slot will be freed for neighbours.`}>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Keep it
          </Button>
          <Button
            variant="destructive"
            loading={cancel.isPending}
            onClick={() =>
              cancel.mutate(booking.id, {
                onSuccess: () => {
                  toast("Booking cancelled");
                  onClose();
                },
                onError: (err) => toast.error(errorMessage(err)),
              })
            }
          >
            Cancel booking
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BookingCard({ booking, upcoming }: { booking: Booking; upcoming: boolean }) {
  const [dialog, setDialog] = useState<"reschedule" | "cancel" | null>(null);
  const active = booking.status === "confirmed" || booking.status === "pending";
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-neutral-900">{booking.facilityName}</p>
          <p className="text-sm text-neutral-600">{formatWindow(booking.start, booking.end)}</p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-neutral-600">
        <Users className="size-4 text-neutral-400" /> {booking.purpose} · {booking.attendees} guests
      </p>
      {booking.decisionNote && <p className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700">Note from management: {booking.decisionNote}</p>}
      {upcoming && active && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setDialog("reschedule")}>
            <Repeat /> Reschedule
          </Button>
          <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => setDialog("cancel")}>
            <CalendarX2 /> Cancel
          </Button>
        </div>
      )}
      {dialog === "reschedule" && <RescheduleDialog booking={booking} onClose={() => setDialog(null)} />}
      {dialog === "cancel" && <CancelDialog booking={booking} onClose={() => setDialog(null)} />}
    </Card>
  );
}

export function MyBookingsPage() {
  const { data, isPending, isError, error, refetch } = useMyBookings();
  const now = useNow();
  const upcoming = (data ?? []).filter((b) => new Date(b.end).getTime() > now);
  const past = (data ?? []).filter((b) => new Date(b.end).getTime() <= now).reverse();

  return (
    <div>
      <PageHeader title="My bookings" back={{ to: "/book", label: "Facilities" }} />
      {isPending ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList className="mb-4">
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="space-y-3">
            {upcoming.length === 0 ? (
              <EmptyState
                icon={<CalendarDays />}
                title="No upcoming bookings"
                action={
                  <Button asChild>
                    <Link to="/book">Book a facility</Link>
                  </Button>
                }
              />
            ) : (
              upcoming.map((b) => <BookingCard key={b.id} booking={b} upcoming />)
            )}
          </TabsContent>
          <TabsContent value="past" className="space-y-3">
            {past.length === 0 ? (
              <EmptyState icon={<CalendarDays />} title="No past bookings yet" />
            ) : (
              past.map((b) => <BookingCard key={b.id} booking={b} upcoming={false} />)
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
