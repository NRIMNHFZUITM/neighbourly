import { CreateBookingInput, formatDayRelative, formatMinutes, fromMyt, type Facility } from "@neighbourly/shared";
import { CalendarCheck2, Check, Clock3, MapPin, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { FacilityPhoto } from "@/components/CoverArt";
import { ErrorState, ListSkeleton, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { errorMessage } from "@/lib/api";
import { validate, type FieldErrors } from "@/lib/forms";
import { useCreateBooking, useFacility } from "./api";
import { AvailabilityPicker, type SlotSelection } from "./AvailabilityPicker";
import { FacilityBadge } from "./FacilitiesPage";

export function selectionLabel(s: SlotSelection) {
  return `${formatDayRelative(fromMyt(s.date, 12 * 60))}, ${formatMinutes(s.startMinutes)} – ${formatMinutes(s.startMinutes + s.durationMinutes)}`;
}

function BookingForm({ facility }: { facility: Facility }) {
  const navigate = useNavigate();
  const create = useCreateBooking();
  const [slot, setSlot] = useState<SlotSelection | null>(null);
  const [purpose, setPurpose] = useState("");
  const [attendees, setAttendees] = useState("10");
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!slot) return toast.error("Pick a time slot first.");
    const result = validate(CreateBookingInput, { facilityId: facility.id, ...slot, purpose, attendees: Number(attendees) });
    if (result.errors) return setErrors(result.errors);
    if (result.data.attendees > facility.capacity) return setErrors({ attendees: `This space fits up to ${facility.capacity} people` });
    create.mutate(result.data, {
      onSuccess: (b) => {
        toast.success(b.status === "pending" ? "Request sent to Township Management" : "Booked! See you there.", {
          description: `${facility.name}, ${selectionLabel(slot)}`,
        });
        navigate("/book/mine");
      },
      onError: (err) => toast.error(errorMessage(err)),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <AvailabilityPicker facility={facility} value={slot} onChange={setSlot} />
      {slot && (
        <div className="space-y-4 rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
          <p className="flex items-center gap-2 font-semibold text-brand-900">
            <CalendarCheck2 className="size-5" /> {selectionLabel(slot)}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
            <Field label="What's it for?" htmlFor="purpose" error={errors.purpose} hint="Only Township Management sees this.">
              <Input id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Family BBQ" maxLength={120} />
            </Field>
            <Field label="Guests" htmlFor="attendees" error={errors.attendees}>
              <Input id="attendees" type="number" min={1} max={facility.capacity} value={attendees} onChange={(e) => setAttendees(e.target.value)} />
            </Field>
          </div>
          <Button type="submit" size="lg" className="w-full sm:w-auto" loading={create.isPending}>
            {facility.requiresApproval ? "Request booking" : "Book now"}
          </Button>
          {facility.requiresApproval && (
            <p className="text-xs text-neutral-500">This facility needs approval. The slot is held for you while Township Management reviews it.</p>
          )}
        </div>
      )}
    </form>
  );
}

export function FacilityPage() {
  const { facilityId = "" } = useParams();
  const { data: facility, isPending, isError, error, refetch } = useFacility(facilityId);
  if (isPending) return <ListSkeleton rows={3} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader title={facility.name} back={{ to: "/book", label: "Facilities" }} actions={<FacilityBadge requiresApproval={facility.requiresApproval} />} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0 p-4 sm:p-5">
          <h2 className="mb-4 font-bold text-neutral-900">Choose a time</h2>
          <BookingForm facility={facility} />
        </Card>
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <FacilityPhoto src={facility.photoUrl} type={facility.type} alt={facility.name} className="h-48 w-full" size={56} />
            {facility.photoCredit && (
              <p className="border-b border-neutral-100 px-4 py-1.5 text-[11px] leading-snug text-neutral-400">Representative photo: {facility.photoCredit}</p>
            )}
            <div className="space-y-2 p-4 text-sm text-neutral-600">
              <p>{facility.description}</p>
              <p className="flex items-center gap-2">
                <Users className="size-4 text-neutral-400" /> Up to {facility.capacity} people
              </p>
              <p className="flex items-center gap-2">
                <Clock3 className="size-4 text-neutral-400" /> {formatMinutes(facility.openMinutes)} – {formatMinutes(facility.closeMinutes)}, max{" "}
                {facility.maxDurationMinutes / 60} hours
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="size-4 text-neutral-400" /> {facility.locationLabel}
              </p>
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-bold text-neutral-900">Amenities</h3>
            <ul className="space-y-1.5 text-sm text-neutral-600">
              {facility.amenities.map((a) => (
                <li key={a} className="flex items-center gap-2">
                  <Check className="size-4 text-brand-600" /> {a}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-bold text-neutral-900">Rules</h3>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-neutral-600">
              {facility.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
