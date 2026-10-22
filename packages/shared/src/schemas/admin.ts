import { z } from "zod";
import { REPORT_CATEGORIES, REPORT_STATUSES, ROLES } from "../constants";
import { ShopProfileSchema } from "./account";
import { BookingSchema } from "./booking";
import { dateKey, isoDate } from "./common";
import { SupportTicketSchema } from "./community";
import { ReportSchema, StatusEntrySchema } from "./towncare";

/** Private resident details. Only ever produced for admin viewers. */
export const PrivateContactSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  neighbourhoodId: z.string().nullable(),
  block: z.string().nullable(),
  unitNo: z.string().nullable(),
  phone: z.string().nullable(),
});
export type PrivateContact = z.infer<typeof PrivateContactSchema>;

export const AdminReportSchema = ReportSchema.extend({
  reporterContact: PrivateContactSchema,
  history: z.array(StatusEntrySchema),
});
export type AdminReport = z.infer<typeof AdminReportSchema>;
export const AdminReportListSchema = z.array(AdminReportSchema);

export const UpdateReportInput = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
  assignedTeam: z.string().nullable().optional(),
  note: z.string().trim().max(300).optional(),
});
export type UpdateReportInputType = z.infer<typeof UpdateReportInput>;

export const AdminBookingSchema = BookingSchema.extend({
  booker: PrivateContactSchema.nullable(),
  kind: z.enum(["resident", "maintenance"]),
});
export type AdminBooking = z.infer<typeof AdminBookingSchema>;
export const AdminBookingListSchema = z.array(AdminBookingSchema);

export const DecisionInput = z.object({
  note: z.string().trim().max(200).optional(),
});

export const MaintenanceBlockInput = z.object({
  facilityId: z.string(),
  date: dateKey(),
  startMinutes: z.number().int().min(0).max(24 * 60),
  durationMinutes: z.number().int().min(30).max(24 * 60),
  reason: z.string().trim().min(3, "Add a reason").max(120),
});
export type MaintenanceBlockInputType = z.infer<typeof MaintenanceBlockInput>;

export const VerificationRequestSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(ROLES),
  requestedAt: isoDate(),
  neighbourhoodId: z.string().nullable(),
  block: z.string().nullable(),
  unitNo: z.string().nullable(),
  note: z.string().nullable(),
  shop: ShopProfileSchema.nullable(),
});
export type VerificationRequest = z.infer<typeof VerificationRequestSchema>;
export const VerificationRequestListSchema = z.array(VerificationRequestSchema);

export const AdminTicketSchema = SupportTicketSchema.extend({
  requester: PrivateContactSchema,
});
export type AdminTicket = z.infer<typeof AdminTicketSchema>;
export const AdminTicketListSchema = z.array(AdminTicketSchema);

export const CreateAlertInput = z.object({
  title: z.string().trim().min(3).max(80),
  body: z.string().trim().min(5).max(500),
  neighbourhoodId: z.string().nullable(),
});
export type CreateAlertInputType = z.infer<typeof CreateAlertInput>;

const categoryCounts = Object.fromEntries(REPORT_CATEGORIES.map((c) => [c, z.number().int()])) as Record<
  (typeof REPORT_CATEGORIES)[number],
  z.ZodNumber
>;

export const AdminOverviewSchema = z.object({
  kpis: z.object({
    activeResidents: z.number().int(),
    verifiedResidents: z.number().int(),
    pendingVerifications: z.number().int(),
    openReports: z.number().int(),
    inProgressReports: z.number().int(),
    resolvedThisMonth: z.number().int(),
    avgResolutionHours: z.number(),
    foodSavedKgThisMonth: z.number(),
    foodSavedKgTotal: z.number(),
    bookingsThisMonth: z.number().int(),
    pendingBookings: z.number().int(),
    wildlifeAlerts7d: z.number().int(),
    openTickets: z.number().int(),
  }),
  reportsByWeek: z.array(z.object({ week: z.string(), ...categoryCounts })),
  resolutionByCategory: z.array(
    z.object({ category: z.enum(REPORT_CATEGORIES), avgHours: z.number(), resolved: z.number().int() }),
  ),
  foodByWeek: z.array(z.object({ week: z.string(), residentsKg: z.number(), shopsKg: z.number() })),
  wildlifeByWeek: z.array(z.object({ week: z.string(), count: z.number().int() })),
  bookingsByFacility: z.array(
    z.object({ facilityId: z.string(), name: z.string(), bookings: z.number().int(), hours: z.number() }),
  ),
  statusSplit: z.object({ open: z.number().int(), in_progress: z.number().int(), resolved: z.number().int() }),
});
export type AdminOverview = z.infer<typeof AdminOverviewSchema>;
