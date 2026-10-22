/**
 * Storage-shaped records. These mirror the planned Postgres tables; today they live in the
 * in-browser mock database, later in Supabase. They are never sent to clients directly:
 * every response goes through a presenter in privacy.ts.
 */
import type {
  BookingStatus,
  ClaimStatus,
  DietaryTag,
  EventCategory,
  FoodStatus,
  FoodType,
  HalalStatus,
  Interest,
  NotificationType,
  PostKind,
  PostTopic,
  ReportCategory,
  ReportStatus,
  Role,
  VerificationStatus,
} from "./constants";
import type { NotificationPrefs, PrivacySettings, ShopProfile } from "./schemas/account";
import type { Facility } from "./schemas/booking";
import type { LatLng } from "./schemas/common";

export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  verification: VerificationStatus;
  name: string;
  avatarUrl: string | null;
  neighbourhoodId: string | null;
  block: string | null;
  unitNo: string | null;
  phone: string | null;
  bio: string;
  interests: Interest[];
  privacy: PrivacySettings;
  notificationPrefs: NotificationPrefs;
  onboarded: boolean;
  shop: ShopProfile | null;
  verificationNote: string | null;
  verificationRequestedAt: string | null;
  createdAt: string;
  lastActiveAt: string;
}

/** One-time codes printed on welcome letters, used for instant resident verification. */
export interface UnitRow {
  code: string;
  neighbourhoodId: string;
  block: string;
  unitNo: string;
  claimedBy: string | null;
}

export interface ReportRow {
  id: string;
  reporterId: string;
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  photoPath: string | null;
  location: LatLng;
  locationLabel: string;
  neighbourhoodId: string;
  /** Reporter opted in to show their name on this report. */
  showName: boolean;
  assignedTeam: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface ReportStatusRow {
  id: string;
  reportId: string;
  status: ReportStatus;
  note: string | null;
  changedBy: string;
  at: string;
}

export interface ReportCommentRow {
  id: string;
  reportId: string;
  authorId: string;
  body: string;
  official: boolean;
  createdAt: string;
}

export interface ReportSupporterRow {
  reportId: string;
  userId: string;
  createdAt: string;
}

export interface FoodListingRow {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  foodType: FoodType;
  quantity: string;
  estWeightKg: number;
  halal: HalalStatus;
  dietaryTags: DietaryTag[];
  photoPath: string | null;
  pickupPoint: string;
  location: LatLng;
  neighbourhoodId: string;
  pickupStart: string;
  pickupEnd: string;
  expiresAt: string;
  status: FoodStatus;
  priceNote: string | null;
  createdAt: string;
  collectedAt: string | null;
}

export interface FoodClaimRow {
  id: string;
  listingId: string;
  claimerId: string;
  status: ClaimStatus;
  note: string | null;
  /** Claimer opted in to show their name to the giver. */
  showName: boolean;
  pickupCode: string;
  createdAt: string;
  updatedAt: string;
}

export type FacilityRow = Omit<Facility, "photoUrl"> & {
  photoPath: string | null;
  active: boolean;
};

export interface BookingRow {
  id: string;
  facilityId: string;
  /** null for maintenance blocks */
  userId: string | null;
  kind: "resident" | "maintenance";
  start: string;
  end: string;
  purpose: string;
  attendees: number;
  status: BookingStatus;
  decisionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityUpdateRow {
  id: string;
  facilityId: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface PostRow {
  id: string;
  authorId: string;
  kind: PostKind;
  topic: PostTopic;
  body: string;
  neighbourhoodId: string | null;
  hidden: boolean;
  createdAt: string;
}

export interface PostCommentRow {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface PostLikeRow {
  postId: string;
  userId: string;
}

export interface EventRow {
  id: string;
  organizerId: string;
  title: string;
  description: string;
  category: EventCategory;
  startsAt: string;
  endsAt: string;
  locationLabel: string;
  location: LatLng | null;
  facilityId: string | null;
  neighbourhoodId: string | null;
  createdAt: string;
}

export interface EventRsvpRow {
  eventId: string;
  userId: string;
  createdAt: string;
}

export interface NotificationRow {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface TicketRow {
  id: string;
  reference: string;
  userId: string;
  subject: string;
  body: string;
  source: "assistant" | "app";
  status: "open" | "closed";
  createdAt: string;
}
