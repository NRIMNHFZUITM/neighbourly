import { z } from "zod";
import { REPORT_CATEGORIES, REPORT_STATUSES } from "../constants";
import { IdentitySchema, LatLngSchema, isoDate } from "./common";

export const ReportSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(REPORT_CATEGORIES),
  status: z.enum(REPORT_STATUSES),
  photoUrl: z.string().nullable(),
  location: LatLngSchema,
  locationLabel: z.string(),
  neighbourhoodId: z.string(),
  reporter: IdentitySchema,
  isMine: z.boolean(),
  supporters: z.number().int(),
  supportedByMe: z.boolean(),
  comments: z.number().int(),
  assignedTeam: z.string().nullable(),
  /** Active wildlife sightings double as safety alerts for the neighbourhood. */
  isAlert: z.boolean(),
  createdAt: isoDate(),
  updatedAt: isoDate(),
  resolvedAt: isoDate().nullable(),
});
export type Report = z.infer<typeof ReportSchema>;

export const StatusEntrySchema = z.object({
  id: z.string(),
  status: z.enum(REPORT_STATUSES),
  note: z.string().nullable(),
  at: isoDate(),
  by: z.string(),
});
export type StatusEntry = z.infer<typeof StatusEntrySchema>;

export const ReportCommentSchema = z.object({
  id: z.string(),
  body: z.string(),
  createdAt: isoDate(),
  author: IdentitySchema,
  official: z.boolean(),
});
export type ReportComment = z.infer<typeof ReportCommentSchema>;

export const ReportDetailSchema = ReportSchema.extend({
  history: z.array(StatusEntrySchema),
  commentList: z.array(ReportCommentSchema),
});
export type ReportDetail = z.infer<typeof ReportDetailSchema>;

export const CreateReportInput = z.object({
  title: z.string().trim().min(5, "Give it a short title (5+ characters)").max(80),
  description: z.string().trim().min(10, "Describe the issue (10+ characters)").max(1000),
  category: z.enum(REPORT_CATEGORIES),
  location: LatLngSchema,
  locationLabel: z.string().trim().max(80).optional(),
  photoPath: z.string().nullable(),
  showName: z.boolean(),
});
export type CreateReportInputType = z.infer<typeof CreateReportInput>;

export const AddCommentInput = z.object({
  body: z.string().trim().min(1, "Write a comment").max(500),
});

export const ReportListSchema = z.array(ReportSchema);
