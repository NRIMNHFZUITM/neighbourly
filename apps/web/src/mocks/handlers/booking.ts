import {
  BOOKING_PROBLEM_MESSAGES,
  CreateBookingInput,
  RescheduleBookingInput,
  addDaysToKey,
  buildAvailability,
  checkBooking,
  formatDay,
  formatTime,
  fromMyt,
  mytDateKey,
  presentBooking,
  presentFacility,
  type BookingRow,
  type FacilityRow,
} from "@neighbourly/shared";
import { http } from "msw";
import { fail, fileUrl, newId, notify, nowIso, parseBody, requireUser, route } from "../context";
import { db } from "../db";

export function findFacility(id: string): FacilityRow {
  const f = db.facilities.find((x) => x.id === id && x.active);
  if (!f) fail(404, "not_found", "That facility doesn't exist.");
  return f;
}

export const facilityFor = (b: BookingRow) => db.facilities.find((f) => f.id === b.facilityId)!;

export const bookingWhen = (b: Pick<BookingRow, "start" | "end">) => `${formatDay(b.start)}, ${formatTime(b.start)} – ${formatTime(b.end)}`;

export const bookingHandlers = [
  http.get(
    "/api/facilities",
    route(({ request }) => {
      requireUser(request);
      return db.facilities.filter((f) => f.active).map((f) => presentFacility(f, { fileUrl }));
    }),
  ),

  http.get(
    "/api/facilities/:id",
    route(({ request, params }) => {
      requireUser(request);
      return presentFacility(findFacility(params.id!), { fileUrl });
    }),
  ),

  http.get(
    "/api/facilities/:id/availability",
    route(({ request, params, url }) => {
      const user = requireUser(request);
      const facility = findFacility(params.id!);
      const from = url.searchParams.get("from") ?? mytDateKey(new Date());
      const days = Math.min(Number(url.searchParams.get("days") ?? 7), 31);
      const dates = Array.from({ length: days }, (_, i) => addDaysToKey(from, i));
      return buildAvailability(facility, db.bookings, dates, user.id, new Date());
    }),
  ),

  http.post(
    "/api/bookings",
    route(async ({ request }) => {
      const user = requireUser(request);
      const input = await parseBody(request, CreateBookingInput);
      const facility = findFacility(input.facilityId);
      const problem = checkBooking(facility, input, db.bookings, new Date());
      if (problem) fail(problem === "conflict" ? 409 : 400, problem, BOOKING_PROBLEM_MESSAGES[problem]);
      const start = fromMyt(input.date, input.startMinutes);
      const row: BookingRow = {
        id: newId("b"),
        facilityId: facility.id,
        userId: user.id,
        kind: "resident",
        start: start.toISOString(),
        end: new Date(start.getTime() + input.durationMinutes * 60_000).toISOString(),
        purpose: input.purpose,
        attendees: input.attendees,
        status: facility.requiresApproval ? "pending" : "confirmed",
        decisionNote: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      db.bookings.push(row);
      notify(
        user.id,
        row.status === "confirmed"
          ? { type: "booking_confirmed", title: `${facility.name} booked`, body: bookingWhen(row), link: "/book/mine" }
          : { type: "booking_confirmed", title: "Booking request sent", body: `${facility.name}, ${bookingWhen(row)}. Township Management will review it.`, link: "/book/mine" },
        "bookings",
      );
      return presentBooking(row, facility, { id: user.id, role: user.role });
    }),
  ),

  http.get(
    "/api/bookings/mine",
    route(({ request }) => {
      const user = requireUser(request);
      return db.bookings
        .filter((b) => b.userId === user.id && b.kind === "resident")
        .sort((a, b) => a.start.localeCompare(b.start))
        .map((b) => presentBooking(b, facilityFor(b), { id: user.id, role: user.role }));
    }),
  ),

  http.post(
    "/api/bookings/:id/cancel",
    route(({ request, params }) => {
      const user = requireUser(request);
      const row = db.bookings.find((b) => b.id === params.id && b.userId === user.id);
      if (!row) fail(404, "not_found", "That booking doesn't exist.");
      if (!["pending", "confirmed"].includes(row.status)) fail(409, "not_active", "This booking is no longer active.");
      if (new Date(row.start).getTime() < Date.now()) fail(409, "started", "This booking has already started.");
      row.status = "cancelled";
      row.updatedAt = nowIso();
      return presentBooking(row, facilityFor(row), { id: user.id, role: user.role });
    }),
  ),

  http.post(
    "/api/bookings/:id/reschedule",
    route(async ({ request, params }) => {
      const user = requireUser(request);
      const row = db.bookings.find((b) => b.id === params.id && b.userId === user.id);
      if (!row) fail(404, "not_found", "That booking doesn't exist.");
      if (!["pending", "confirmed"].includes(row.status)) fail(409, "not_active", "Only active bookings can be rescheduled.");
      const input = await parseBody(request, RescheduleBookingInput);
      const facility = facilityFor(row);
      const problem = checkBooking(facility, input, db.bookings, new Date(), row.id);
      if (problem) fail(problem === "conflict" ? 409 : 400, problem, BOOKING_PROBLEM_MESSAGES[problem]);
      const start = fromMyt(input.date, input.startMinutes);
      row.start = start.toISOString();
      row.end = new Date(start.getTime() + input.durationMinutes * 60_000).toISOString();
      if (facility.requiresApproval) row.status = "pending";
      row.updatedAt = nowIso();
      return presentBooking(row, facility, { id: user.id, role: user.role });
    }),
  ),
];
