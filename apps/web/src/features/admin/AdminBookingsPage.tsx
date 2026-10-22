import {
  MaintenanceBlockInput,
  addDaysToKey,
  formatMinutes,
  formatWindow,
  mytDateKey,
  type AdminBooking,
  type MaintenanceBlockInputType,
} from "@neighbourly/shared";
import { CalendarCheck2, CheckCircle2, Mail, Phone, Wrench, XCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/layout";
import { BookingStatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/misc";
import { errorMessage } from "@/lib/api";
import { validate, type FieldErrors } from "@/lib/forms";
import { useFacilities } from "../booking/api";
import { useAdminBookings, useCreateMaintenance, useDecideBooking } from "./api";

function RequestCard({ b }: { b: AdminBooking }) {
  const decide = useDecideBooking();
  const [note, setNote] = useState("");
  const act = (action: "approve" | "reject") =>
    decide.mutate(
      { id: b.id, action, note: note.trim() || undefined },
      { onSuccess: () => toast.success(action === "approve" ? "Approved. Resident notified." : "Rejected. Resident notified."), onError: (e) => toast.error(errorMessage(e)) },
    );
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-neutral-900">{b.facilityName}</p>
          <p className="text-sm text-neutral-600">{formatWindow(b.start, b.end)}</p>
        </div>
        <BookingStatusBadge status={b.status} />
      </div>
      <p className="mt-2 text-sm text-neutral-800">
        “{b.purpose}” · {b.attendees} guests
      </p>
      {b.booker && (
        <div className="mt-3 rounded-xl bg-neutral-50 p-3 text-sm">
          <p className="font-semibold text-neutral-900">{b.booker.name}</p>
          <p className="text-xs text-neutral-500">
            Unit {b.booker.unitNo}, Block {b.booker.block}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-neutral-600">
            {b.booker.phone && (
              <span className="flex items-center gap-1">
                <Phone className="size-3.5" /> {b.booker.phone}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Mail className="size-3.5" /> {b.booker.email}
            </span>
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to the resident (optional)" className="h-10 flex-1" maxLength={200} />
        <div className="flex gap-2">
          <Button size="sm" className="h-10" onClick={() => act("approve")} loading={decide.isPending && decide.variables?.action === "approve"}>
            <CheckCircle2 /> Approve
          </Button>
          <Button size="sm" variant="outline" className="h-10" onClick={() => act("reject")} loading={decide.isPending && decide.variables?.action === "reject"}>
            <XCircle /> Reject
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MaintenanceForm() {
  const facilities = useFacilities();
  const create = useCreateMaintenance();
  const today = mytDateKey(new Date());
  const [form, setForm] = useState<MaintenanceBlockInputType>({ facilityId: "fac-bbq", date: addDaysToKey(today, 1), startMinutes: 10 * 60, durationMinutes: 120, reason: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const facility = facilities.data?.find((f) => f.id === form.facilityId);
  const starts = facility
    ? Array.from({ length: (facility.closeMinutes - facility.openMinutes) / facility.slotMinutes }, (_, i) => facility.openMinutes + i * facility.slotMinutes)
    : [];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validate(MaintenanceBlockInput, form);
    if (result.errors) return setErrors(result.errors);
    create.mutate(result.data, {
      onSuccess: () => {
        toast.success("Maintenance scheduled", { description: "Clashing bookings were cancelled and residents notified. A facility update is on the Home feed." });
        setForm({ ...form, reason: "" });
      },
      onError: (err) => toast.error(errorMessage(err)),
    });
  };

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Facility" htmlFor="m-fac">
            <Select id="m-fac" value={form.facilityId} onChange={(e) => setForm({ ...form, facilityId: e.target.value })}>
              {facilities.data?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date" htmlFor="m-date">
            <Input id="m-date" type="date" min={today} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Start" htmlFor="m-start">
            <Select id="m-start" value={form.startMinutes} onChange={(e) => setForm({ ...form, startMinutes: Number(e.target.value) })}>
              {starts.map((m) => (
                <option key={m} value={m}>
                  {formatMinutes(m)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Duration" htmlFor="m-dur">
            <Select id="m-dur" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}>
              {[60, 120, 180, 240, 480].map((m) => (
                <option key={m} value={m}>
                  {m / 60} hours
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Reason" htmlFor="m-reason" error={errors.reason}>
          <Input id="m-reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Grill cleaning & servicing" maxLength={120} />
        </Field>
        <p className="text-xs text-neutral-500">Any resident bookings in this window are cancelled automatically, and those residents are notified.</p>
        <Button type="submit" loading={create.isPending}>
          <Wrench /> Block for maintenance
        </Button>
      </form>
    </Card>
  );
}

function Upcoming() {
  const { data, isPending, isError, error } = useAdminBookings("upcoming");
  if (isPending) return <ListSkeleton />;
  if (isError) return <ErrorState error={error} />;
  return (
    <Card className="divide-y divide-neutral-100">
      {data.map((b) => (
        <div key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
          <span className="w-48 font-semibold text-neutral-900">{b.facilityName}</span>
          <span className="w-56 text-neutral-600">{formatWindow(b.start, b.end)}</span>
          <span className="flex-1 text-neutral-600">{b.kind === "maintenance" ? <Badge tone="amber">Maintenance: {b.purpose}</Badge> : `${b.booker?.name ?? ""} · ${b.purpose}`}</span>
          <BookingStatusBadge status={b.status} />
        </div>
      ))}
    </Card>
  );
}

export function AdminBookingsPage() {
  const pending = useAdminBookings("pending");
  return (
    <div>
      <PageHeader title="Facility bookings" description="Approve hall requests and block slots for maintenance. Residents only ever see that a slot is taken." />
      <Tabs defaultValue="requests">
        <TabsList className="mb-4">
          <TabsTrigger value="requests">Requests ({pending.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>
        <TabsContent value="requests" className="space-y-3">
          {pending.isPending ? (
            <ListSkeleton />
          ) : pending.isError ? (
            <ErrorState error={pending.error} />
          ) : pending.data.length === 0 ? (
            <EmptyState icon={<CalendarCheck2 />} title="No requests waiting" description="New requests for facilities that need approval will appear here." />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {pending.data.map((b) => (
                <RequestCard key={b.id} b={b} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="upcoming">
          <Upcoming />
        </TabsContent>
        <TabsContent value="maintenance">
          <MaintenanceForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
