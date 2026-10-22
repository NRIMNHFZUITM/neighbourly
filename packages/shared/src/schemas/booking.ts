import { z } from "zod";
import { BOOKING_STATUSES, FACILITY_TYPES } from "../constants";
import { LatLngSchema, dateKey, isoDate } from "./common";

export const FacilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(FACILITY_TYPES),
  description: z.string(),
  photoUrl: z.string().nullable(),
  /** Attribution for licensed photos, e.g. "Photo: Chongkian, CC BY-SA 4.0, via Wikimedia Commons". */
  photoCredit: z.string().nullable(),
  capacity: z.number().int(),
  neighbourhoodId: z.string(),
  locationLabel: z.string(),
  location: LatLngSchema,
  rules: z.array(z.string()),
  amenities: z.array(z.string()),
  /** Opening hours as minutes since midnight, Malaysia time. */
  openMinutes: z.number().int(),
  closeMinutes: z.number().int(),
  slotMinutes: z.number().int(),
  maxDurationMinutes: z.number().int(),
  /** How many days ahead residents can book. */
  advanceDays: z.number().int(),
  requiresApproval: z.boolean(),
});
export type Facility = z.infer<typeof FacilitySchema>;

/**
 * Availability deliberately carries no booker or purpose: other residents only see
 * that a slot is taken (privacy rule: "blocked slots only, no names").
 */
export const SLOT_STATES = ["free", "taken", "maintenance", "mine", "past"] as const;
export type SlotState = (typeof SLOT_STATES)[number];

export const SlotSchema = z.object({
  start: isoDate(),
  end: isoDate(),
  startMinutes: z.number().int(),
  state: z.enum(SLOT_STATES),
});
export type Slot = z.infer<typeof SlotSchema>;

export const AvailabilityDaySchema = z.object({
  date: dateKey(),
  slots: z.array(SlotSchema),
});
export type AvailabilityDay = z.infer<typeof AvailabilityDaySchema>;

export const BookingSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  facilityName: z.string(),
  start: isoDate(),
  end: isoDate(),
  purpose: z.string(),
  attendees: z.number().int(),
  status: z.enum(BOOKING_STATUSES),
  requiresApproval: z.boolean(),
  decisionNote: z.string().nullable(),
  createdAt: isoDate(),
});
export type Booking = z.infer<typeof BookingSchema>;

export const CreateBookingInput = z.object({
  facilityId: z.string(),
  date: dateKey(),
  startMinutes: z.number().int().min(0).max(24 * 60),
  durationMinutes: z.number().int().min(15).max(24 * 60),
  purpose: z.string().trim().min(3, "Tell management what it's for").max(120),
  attendees: z.number().int().min(1).max(500),
});
export type CreateBookingInputType = z.infer<typeof CreateBookingInput>;

export const RescheduleBookingInput = z.object({
  date: dateKey(),
  startMinutes: z.number().int().min(0).max(24 * 60),
  durationMinutes: z.number().int().min(15).max(24 * 60),
});
export type RescheduleBookingInputType = z.infer<typeof RescheduleBookingInput>;

export const FacilityListSchema = z.array(FacilitySchema);
export const AvailabilitySchema = z.array(AvailabilityDaySchema);
export const BookingListSchema = z.array(BookingSchema);
