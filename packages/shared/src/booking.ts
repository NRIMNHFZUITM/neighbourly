import type { BookingRow, FacilityRow } from "./rows";
import type { AvailabilityDay, SlotState } from "./schemas/booking";
import { fromMyt } from "./time";

type FacilityRules = Pick<
  FacilityRow,
  "id" | "openMinutes" | "closeMinutes" | "slotMinutes" | "maxDurationMinutes" | "advanceDays"
>;

export const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

/** Pending requests hold their slot until management decides, so they block like confirmed ones. */
export const isBlocking = (b: Pick<BookingRow, "status">) => b.status === "confirmed" || b.status === "pending";

export type BookingProblem =
  | "bad_duration"
  | "misaligned"
  | "outside_hours"
  | "too_long"
  | "in_past"
  | "too_far"
  | "conflict";

export const BOOKING_PROBLEM_MESSAGES: Record<BookingProblem, string> = {
  bad_duration: "Choose a duration made of whole slots.",
  misaligned: "Bookings must start at the beginning of a slot.",
  outside_hours: "That time is outside the facility's opening hours.",
  too_long: "That's longer than the maximum booking for this facility.",
  in_past: "That time has already passed.",
  too_far: "That date is too far ahead for this facility.",
  conflict: "Someone has already booked part of that time. Pick another slot.",
};

export interface BookingRequest {
  date: string;
  startMinutes: number;
  durationMinutes: number;
}

/** Validates a booking request against the facility rules and existing bookings. */
export function checkBooking(
  facility: FacilityRules,
  req: BookingRequest,
  bookings: readonly BookingRow[],
  now: Date,
  ignoreBookingId?: string,
): BookingProblem | null {
  const { slotMinutes } = facility;
  if (req.durationMinutes <= 0 || req.durationMinutes % slotMinutes !== 0) return "bad_duration";
  if ((req.startMinutes - facility.openMinutes) % slotMinutes !== 0) return "misaligned";
  if (req.startMinutes < facility.openMinutes || req.startMinutes + req.durationMinutes > facility.closeMinutes) {
    return "outside_hours";
  }
  if (req.durationMinutes > facility.maxDurationMinutes) return "too_long";

  const start = fromMyt(req.date, req.startMinutes).getTime();
  const end = start + req.durationMinutes * 60_000;
  if (start <= now.getTime()) return "in_past";
  if (start > now.getTime() + facility.advanceDays * 86_400_000) return "too_far";

  const clash = bookings.some(
    (b) =>
      b.facilityId === facility.id &&
      b.id !== ignoreBookingId &&
      isBlocking(b) &&
      overlaps(start, end, new Date(b.start).getTime(), new Date(b.end).getTime()),
  );
  return clash ? "conflict" : null;
}

/**
 * Slot grid for the given dates. Output carries states only, never who booked or why,
 * so it is safe to show every resident.
 */
export function buildAvailability(
  facility: FacilityRules,
  bookings: readonly BookingRow[],
  dates: readonly string[],
  viewerId: string | null,
  now: Date,
): AvailabilityDay[] {
  const relevant = bookings.filter((b) => b.facilityId === facility.id && isBlocking(b));
  return dates.map((date) => {
    const slots = [];
    for (let m = facility.openMinutes; m + facility.slotMinutes <= facility.closeMinutes; m += facility.slotMinutes) {
      const start = fromMyt(date, m);
      const end = fromMyt(date, m + facility.slotMinutes);
      let state: SlotState = "free";
      if (start.getTime() < now.getTime()) {
        state = "past";
      } else {
        const hit = relevant.find((b) =>
          overlaps(start.getTime(), end.getTime(), new Date(b.start).getTime(), new Date(b.end).getTime()),
        );
        if (hit) state = hit.kind === "maintenance" ? "maintenance" : hit.userId === viewerId ? "mine" : "taken";
      }
      slots.push({ start: start.toISOString(), end: end.toISOString(), startMinutes: m, state });
    }
    return { date, slots };
  });
}
