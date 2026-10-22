import { describe, expect, it } from "vitest";
import { checkBooking } from "./booking";
import type { BookingRow } from "./rows";

const bbq = {
  id: "bbq",
  openMinutes: 10 * 60,
  closeMinutes: 23 * 60,
  slotMinutes: 60,
  maxDurationMinutes: 240,
  advanceDays: 14,
};
const now = new Date("2026-10-20T00:00:00.000Z"); // 8:00 am MYT, 20 Oct

const existing = (over: Partial<BookingRow>): BookingRow => ({
  id: "b1",
  facilityId: "bbq",
  userId: "someone",
  kind: "resident",
  start: "2026-10-24T10:00:00.000Z", // 6:00 pm MYT
  end: "2026-10-24T12:00:00.000Z", // 8:00 pm MYT
  purpose: "BBQ",
  attendees: 10,
  status: "confirmed",
  decisionNote: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  ...over,
});

const req = (startHour: number, hours: number) => ({
  date: "2026-10-24",
  startMinutes: startHour * 60,
  durationMinutes: hours * 60,
});

describe("checkBooking", () => {
  it("accepts a free slot within the rules", () => {
    expect(checkBooking(bbq, req(14, 2), [existing({})], now)).toBeNull();
  });

  it("rejects overlaps with confirmed and pending bookings", () => {
    expect(checkBooking(bbq, req(17, 2), [existing({})], now)).toBe("conflict");
    expect(checkBooking(bbq, req(19, 1), [existing({ status: "pending" })], now)).toBe("conflict");
  });

  it("ignores cancelled and rejected bookings", () => {
    expect(checkBooking(bbq, req(18, 2), [existing({ status: "cancelled" }), existing({ id: "b2", status: "rejected" })], now)).toBeNull();
  });

  it("allows back-to-back bookings", () => {
    expect(checkBooking(bbq, req(20, 2), [existing({})], now)).toBeNull();
    expect(checkBooking(bbq, req(16, 2), [existing({})], now)).toBeNull();
  });

  it("lets a booking be rescheduled over its own old slot", () => {
    expect(checkBooking(bbq, req(19, 2), [existing({})], now, "b1")).toBeNull();
  });

  it("enforces opening hours, slot alignment and maximum duration", () => {
    expect(checkBooking(bbq, req(9, 1), [], now)).toBe("outside_hours");
    expect(checkBooking(bbq, req(22, 2), [], now)).toBe("outside_hours");
    expect(checkBooking(bbq, { date: "2026-10-24", startMinutes: 14 * 60 + 30, durationMinutes: 60 }, [], now)).toBe("misaligned");
    expect(checkBooking(bbq, { date: "2026-10-24", startMinutes: 14 * 60, durationMinutes: 90 }, [], now)).toBe("bad_duration");
    expect(checkBooking(bbq, req(12, 5), [], now)).toBe("too_long");
  });

  it("rejects times in the past or beyond the booking window", () => {
    expect(checkBooking(bbq, { date: "2026-10-19", startMinutes: 18 * 60, durationMinutes: 60 }, [], now)).toBe("in_past");
    expect(checkBooking(bbq, { date: "2026-11-10", startMinutes: 18 * 60, durationMinutes: 60 }, [], now)).toBe("too_far");
  });
});
