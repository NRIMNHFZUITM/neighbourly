import { z } from "zod";
import { BLOCKS, HALAL_STATUSES, INTERESTS, NEIGHBOURHOOD_IDS, ROLES, VERIFICATION_STATUSES } from "../constants";
import { LatLngSchema, isoDate } from "./common";

export const PrivacySettingsSchema = z.object({
  /** Appear in the neighbour directory. */
  showInDirectory: z.boolean(),
  /** Default for new TownCare reports: show my name instead of "Resident in Block X". */
  showNameOnReports: z.boolean(),
  /** Show my name to the giver when I request food, instead of "Resident in Block X". */
  showNameOnClaims: z.boolean(),
});
export type PrivacySettings = z.infer<typeof PrivacySettingsSchema>;

export const NotificationPrefsSchema = z.object({
  reports: z.boolean(),
  food: z.boolean(),
  bookings: z.boolean(),
  community: z.boolean(),
  alerts: z.boolean(),
});
export type NotificationPrefs = z.infer<typeof NotificationPrefsSchema>;

export const ShopProfileSchema = z.object({
  shopName: z.string().trim().min(2).max(60),
  category: z.string().trim().min(2).max(40),
  halal: z.enum(HALAL_STATUSES),
  openingHours: z.string().trim().min(3).max(60),
  address: z.string().trim().min(5).max(120),
  /** SSM business registration number, used by admins to verify the shop. Never shown publicly. */
  ssmNo: z.string().trim().min(6).max(20).nullable(),
  /** Shop front location for the Places map. Shop addresses are public, unlike residents'. */
  location: LatLngSchema.nullable(),
});
export type ShopProfile = z.infer<typeof ShopProfileSchema>;

/** The signed-in user's own account, including private fields. */
export const MeSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(ROLES),
  verification: z.enum(VERIFICATION_STATUSES),
  avatarUrl: z.string().nullable(),
  neighbourhoodId: z.string().nullable(),
  block: z.string().nullable(),
  unitNo: z.string().nullable(),
  phone: z.string().nullable(),
  bio: z.string(),
  interests: z.array(z.enum(INTERESTS)),
  privacy: PrivacySettingsSchema,
  notificationPrefs: NotificationPrefsSchema,
  onboarded: z.boolean(),
  shop: ShopProfileSchema.nullable(),
  createdAt: isoDate(),
});
export type Me = z.infer<typeof MeSchema>;

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: MeSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const DemoAccountSchema = z.object({
  userId: z.string(),
  name: z.string(),
  role: z.enum(ROLES),
  headline: z.string(),
  description: z.string(),
});
export type DemoAccount = z.infer<typeof DemoAccountSchema>;

export const LoginInput = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const SignupInput = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").max(100),
  accountType: z.enum(["resident", "shop"]),
});
export type SignupInputType = z.infer<typeof SignupInput>;

export const VerifyUnitInput = z.object({
  code: z.string().trim().min(4, "Enter the code from your welcome letter").max(32),
});

export const RequestApprovalInput = z.object({
  neighbourhoodId: z.enum(NEIGHBOURHOOD_IDS),
  block: z.enum(BLOCKS),
  unitNo: z.string().trim().min(1, "Enter your unit number").max(10),
  note: z.string().trim().max(300).optional(),
});
export type RequestApprovalInputType = z.infer<typeof RequestApprovalInput>;

export const ShopApplicationInput = ShopProfileSchema.extend({
  ssmNo: z.string().trim().min(6, "Enter your SSM registration number").max(20),
  neighbourhoodId: z.enum(NEIGHBOURHOOD_IDS),
});
export type ShopApplicationInputType = z.infer<typeof ShopApplicationInput>;

export const UpdateMeInput = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  bio: z.string().trim().max(240).optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  interests: z.array(z.enum(INTERESTS)).optional(),
  privacy: PrivacySettingsSchema.partial().optional(),
  notificationPrefs: NotificationPrefsSchema.partial().optional(),
  onboarded: z.boolean().optional(),
});
export type UpdateMeInputType = z.infer<typeof UpdateMeInput>;
