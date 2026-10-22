import {
  CreateEventInput,
  EVENT_CATEGORIES,
  EVENT_CATEGORY_META,
  addDaysToKey,
  formatDayRelative,
  formatLongDate,
  formatMinutes,
  formatTime,
  mytDateKey,
  neighbourhoodName,
  type CommunityEvent,
  type EventCategory,
} from "@neighbourly/shared";
import { CalendarHeart, CalendarX2, Check, Clock, Lock, MapPin, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { IdentityLine } from "@/components/IdentityLine";
import { EmptyState, ErrorState, FilterChips, ListSkeleton } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { validate, type FieldErrors } from "@/lib/forms";
import { useCurrentUser } from "../auth/api";
import { useFacilities } from "../booking/api";
import { useCancelEvent, useCreateEvent, useEvents, useRsvpEvent, type Scope } from "./api";
import { CommunityHeader } from "./CommunityPage";
import { useNow } from "@/lib/use-now";

const weekdayShort = (iso: string) => new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", weekday: "short" }).format(new Date(iso));
const dayOfMonth = (iso: string) => new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric" }).format(new Date(iso));

/** "Today, " or "Tomorrow, " when that's more useful than the date on the badge. */
export function relativeDayPrefix(iso: string): string {
  const rel = formatDayRelative(iso);
  return rel === "Today" || rel === "Tomorrow" ? `${rel}, ` : "";
}

/** Calendar-page style date: weekday on a red strip, day of the month below. */
export function DateBadge({ iso, className }: { iso: string; className?: string }) {
  return (
    <div
      className={cn("w-12 shrink-0 self-start overflow-hidden rounded-xl border border-neutral-200 bg-white text-center", className)}
      title={formatLongDate(iso)}
      aria-hidden
    >
      <div className="bg-brand-700 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">{weekdayShort(iso)}</div>
      <div className="py-1 text-lg leading-none font-bold text-neutral-900">{dayOfMonth(iso)}</div>
    </div>
  );
}

export function EventCard({ event, className }: { event: CommunityEvent; className?: string }) {
  const rsvp = useRsvpEvent();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const meta = EVENT_CATEGORY_META[event.category];
  const now = useNow();
  const live = new Date(event.startsAt).getTime() <= now && now < new Date(event.endsAt).getTime();

  const toggle = () =>
    rsvp.mutate(event.id, {
      onSuccess: (e) => toast(e.goingByMe ? `You're going to ${e.title}` : "RSVP removed"),
      onError: (err) => toast.error(errorMessage(err)),
    });

  return (
    <article className={cn("flex gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-card", className)}>
      <DateBadge iso={event.startsAt} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-neutral-500">
            {meta.emoji} {meta.label}
          </span>
          {live && <Badge tone="green">Happening now</Badge>}
          {event.neighbourhoodId && <Badge>{neighbourhoodName(event.neighbourhoodId)} only</Badge>}
        </div>
        <h3 className="mt-1 font-bold text-neutral-900">{event.title}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-600">
          <Clock className="size-4 shrink-0 text-neutral-400" />
          <span className="sr-only">{formatLongDate(event.startsAt)}, </span>
          {relativeDayPrefix(event.startsAt)}
          {formatTime(event.startsAt)} – {formatTime(event.endsAt)}
        </p>
        <p className="mt-0.5 flex items-start gap-1.5 text-sm text-neutral-600">
          <MapPin className="mt-0.5 size-4 shrink-0 text-neutral-400" />
          {event.facilityId ? (
            <Link to={`/book/${event.facilityId}`} className="hover:underline">
              {event.locationLabel}
            </Link>
          ) : (
            <span>{event.locationLabel}</span>
          )}
        </p>
        {event.description && <p className="mt-2 line-clamp-3 text-sm text-neutral-700">{event.description}</p>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <IdentityLine identity={event.organizer} size="xs" meta={`${event.going} going`} />
          {event.isMine ? (
            <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => setConfirmCancel(true)}>
              <CalendarX2 /> Cancel event
            </Button>
          ) : (
            <Button size="sm" variant={event.goingByMe ? "secondary" : "outline"} onClick={toggle} loading={rsvp.isPending} aria-pressed={event.goingByMe}>
              {event.goingByMe ? (
                <>
                  <Check /> Going
                </>
              ) : (
                "I'm going"
              )}
            </Button>
          )}
        </div>
      </div>
      {confirmCancel && <CancelEventDialog event={event} onClose={() => setConfirmCancel(false)} />}
    </article>
  );
}

function CancelEventDialog({ event, onClose }: { event: CommunityEvent; onClose: () => void }) {
  const cancel = useCancelEvent();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Cancel this event?" description={`${event.title}. Everyone who said they're going will be notified.`}>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Keep it
          </Button>
          <Button
            variant="destructive"
            loading={cancel.isPending}
            onClick={() =>
              cancel.mutate(event.id, {
                onSuccess: () => {
                  toast("Event cancelled");
                  onClose();
                },
                onError: (err) => toast.error(errorMessage(err)),
              })
            }
          >
            Cancel event
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Half-hour start times from 6:00 am to 11:30 pm. */
const TIMES = Array.from({ length: 36 }, (_, i) => 6 * 60 + i * 30);

function CreateEventDialog({ onClose }: { onClose: () => void }) {
  const me = useCurrentUser();
  const create = useCreateEvent();
  const facilities = useFacilities();
  const today = mytDateKey(new Date());
  const area = neighbourhoodName(me.neighbourhoodId);
  const [form, setForm] = useState({
    title: "",
    category: "community" as EventCategory,
    date: addDaysToKey(today, 3),
    startMinutes: 9 * 60,
    endMinutes: 11 * 60,
    facilityId: "",
    locationLabel: "",
    description: "",
    scope: "township" as Scope,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const pickFacility = (id: string) => {
    const facility = facilities.data?.find((f) => f.id === id);
    setForm((f) => ({ ...f, facilityId: id, locationLabel: facility ? facility.name : f.locationLabel }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validate(CreateEventInput, { ...form, facilityId: form.facilityId || null });
    if (result.errors) return setErrors(result.errors);
    setErrors({});
    create.mutate(result.data, {
      onSuccess: (event) => {
        toast.success(`${event.title} is on the calendar`);
        onClose();
      },
      onError: (err) => toast.error(errorMessage(err)),
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Create an event" description="Neighbours can see it in Community and say they're going. Only the number going is shown.">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="What's happening?" htmlFor="ev-title" error={errors.title}>
            <Input id="ev-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Durian party at the BBQ pit" maxLength={80} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Category" htmlFor="ev-cat">
              <Select id="ev-cat" value={form.category} onChange={(e) => set("category", e.target.value as EventCategory)}>
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {EVENT_CATEGORY_META[c].emoji} {EVENT_CATEGORY_META[c].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date" htmlFor="ev-date" error={errors.date}>
              <Input id="ev-date" type="date" min={today} max={addDaysToKey(today, 90)} value={form.date} onChange={(e) => set("date", e.target.value)} />
            </Field>
            <Field label="Starts" htmlFor="ev-start">
              <Select
                id="ev-start"
                value={form.startMinutes}
                onChange={(e) => {
                  const start = Number(e.target.value);
                  setForm((f) => ({ ...f, startMinutes: start, endMinutes: f.endMinutes > start ? f.endMinutes : Math.min(start + 120, 24 * 60) }));
                }}
              >
                {TIMES.map((m) => (
                  <option key={m} value={m}>
                    {formatMinutes(m)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ends" htmlFor="ev-end" error={errors.endMinutes}>
              <Select id="ev-end" value={form.endMinutes} onChange={(e) => set("endMinutes", Number(e.target.value))}>
                {[...TIMES.slice(1), 24 * 60].map((m) => (
                  <option key={m} value={m}>
                    {m === 24 * 60 ? "Midnight" : formatMinutes(m)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label="Venue"
            htmlFor="ev-venue"
            hint={form.facilityId ? "Remember to book the facility for this time in Facilities." : "Pick a bookable facility, or type any other place below."}
          >
            <Select id="ev-venue" value={form.facilityId} onChange={(e) => pickFacility(e.target.value)}>
              <option value="">Somewhere else</option>
              {facilities.data?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Where exactly?" htmlFor="ev-where" error={errors.locationLabel}>
            <Input
              id="ev-where"
              value={form.locationLabel}
              onChange={(e) => set("locationLabel", e.target.value)}
              placeholder="e.g. Central Park lake, near the jetty"
              maxLength={80}
            />
          </Field>
          <Field label="Details (optional)" htmlFor="ev-desc" error={errors.description}>
            <Textarea
              id="ev-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What to bring, who it's for, how to find you…"
              maxLength={600}
              rows={3}
            />
          </Field>
          <Field label="Who can see it" htmlFor="ev-scope">
            <Select id="ev-scope" value={form.scope} onChange={(e) => set("scope", e.target.value as Scope)}>
              <option value="township">All of City of Elmina</option>
              {area && <option value="neighbourhood">{area} only</option>}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Create event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const categoryOptions: Array<{ value: EventCategory | "all"; label: string }> = [
  { value: "all", label: "All events" },
  ...EVENT_CATEGORIES.map((c) => ({ value: c, label: `${EVENT_CATEGORY_META[c].emoji} ${EVENT_CATEGORY_META[c].label}` })),
];

export function EventsPage() {
  const [category, setCategory] = useState<EventCategory | "all">("all");
  const [creating, setCreating] = useState(false);
  const events = useEvents(category);

  return (
    <div className="mx-auto max-w-2xl">
      <CommunityHeader
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> Create event
          </Button>
        }
      />
      <div className="mb-3">
        <FilterChips label="Category" value={category} onChange={setCategory} options={categoryOptions} />
      </div>
      <p className="mb-4 flex items-center gap-1.5 text-xs text-neutral-500">
        <Lock className="size-3.5 shrink-0" /> Only the number of people going is shown. Nobody can see who RSVP'd.
      </p>

      {events.isPending ? (
        <ListSkeleton />
      ) : events.isError ? (
        <ErrorState error={events.error} onRetry={() => void events.refetch()} />
      ) : events.data.length === 0 ? (
        <EmptyState
          icon={<CalendarHeart />}
          title={category === "all" ? "No upcoming events yet" : `No upcoming ${EVENT_CATEGORY_META[category].label.toLowerCase()} events`}
          description="Organising something? Put it on the calendar so neighbours can join."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> Create event
            </Button>
          }
        />
      ) : (
        <div className={cn("space-y-3", events.isPlaceholderData && "opacity-60 transition-opacity")}>
          {events.data.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
      {creating && <CreateEventDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
