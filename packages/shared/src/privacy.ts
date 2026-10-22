/**
 * Privacy presenters: the only code that turns stored records into what a viewer may see.
 * Each presenter copies an explicit allow-list of fields, so a new private column can never
 * leak by accident. The rules come from section 4 of the project plan:
 *
 * | Data                                 | Verified residents          | Owner & admins          |
 * | Public profile, posts, food listings | Yes (private fields hidden) | Everything              |
 * | Report titles and status             | Yes, reporter anonymous     | Reporter identity       |
 * | Facility calendar                    | Taken slots only, no names  | Purpose and booker      |
 * | Contact details, exact address       | Never                       | Yes                     |
 *
 * Reporters, report commenters and food claimers appear as "Resident in Block X" unless
 * they opt in to showing their name.
 */
import { neighbourhoodName, type Role } from "./constants";
import type {
  BookingRow,
  EventRow,
  FacilityRow,
  FoodClaimRow,
  FoodListingRow,
  NotificationRow,
  PostCommentRow,
  PostRow,
  ReportCommentRow,
  ReportRow,
  ReportStatusRow,
  TicketRow,
  UserRow,
} from "./rows";
import type { Me } from "./schemas/account";
import type { AdminBooking, AdminReport, AdminTicket, PrivateContact, VerificationRequest } from "./schemas/admin";
import type { Booking, Facility } from "./schemas/booking";
import type {
  CommunityEvent,
  Notification,
  Post,
  PostComment,
  PublicProfile,
  ShopPlace,
  SupportTicket,
} from "./schemas/community";
import type { Identity } from "./schemas/common";
import type { FoodClaim, FoodListing, FoodListingDetail } from "./schemas/ecofood";
import type { Report, ReportComment, ReportDetail, StatusEntry } from "./schemas/towncare";

export interface Viewer {
  id: string;
  role: Role;
}

export interface PresentContext {
  viewer: Viewer;
  getUser: (id: string) => UserRow | undefined;
  fileUrl: (path: string | null) => string | null;
}

export class PrivacyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrivacyError";
  }
}

export const isAdmin = (viewer: Viewer) => viewer.role === "admin";

export function assertAdmin(viewer: Viewer): void {
  if (!isAdmin(viewer)) throw new PrivacyError("This information is only available to Township Management.");
}

export const MANAGEMENT_NAME = "Township Management";

/** "Resident in Block C · Elmina Valley" */
export function anonymousLabel(user: Pick<UserRow, "block" | "neighbourhoodId">): string {
  const area = neighbourhoodName(user.neighbourhoodId);
  if (user.block && area) return `Resident in Block ${user.block} · ${area}`;
  if (area) return `Resident of ${area}`;
  return "Verified resident";
}

const UNKNOWN_IDENTITY: Identity = {
  kind: "anonymous",
  displayName: "Former resident",
  userId: null,
  avatarUrl: null,
  neighbourhoodId: null,
  block: null,
  isYou: false,
  hiddenFromOthers: true,
};

/**
 * How `user` appears to `viewer`. With `anonymous: true`, residents see only the block label,
 * with no userId or avatar to link back to a profile. The person themselves and admins still
 * see who it is, flagged with hiddenFromOthers.
 */
export function presentIdentity(user: UserRow | undefined, viewer: Viewer, opts: { anonymous: boolean }): Identity {
  if (!user) return UNKNOWN_IDENTITY;
  const isYou = user.id === viewer.id;

  if (user.role === "admin") {
    return {
      kind: "management",
      displayName: MANAGEMENT_NAME,
      userId: null,
      avatarUrl: null,
      neighbourhoodId: null,
      block: null,
      isYou,
      hiddenFromOthers: false,
    };
  }

  if (user.role === "shop" && user.shop) {
    // Businesses are public by nature: they always appear under their shop name.
    return {
      kind: "shop",
      displayName: user.shop.shopName,
      userId: user.id,
      avatarUrl: user.avatarUrl,
      neighbourhoodId: user.neighbourhoodId,
      block: null,
      isYou,
      hiddenFromOthers: false,
    };
  }

  if (opts.anonymous && !isYou && !isAdmin(viewer)) {
    return {
      kind: "anonymous",
      displayName: anonymousLabel(user),
      userId: null,
      avatarUrl: null,
      neighbourhoodId: user.neighbourhoodId,
      block: user.block,
      isYou: false,
      hiddenFromOthers: true,
    };
  }

  return {
    kind: "person",
    displayName: user.name,
    userId: user.id,
    avatarUrl: user.avatarUrl,
    neighbourhoodId: user.neighbourhoodId,
    block: user.block,
    isYou,
    hiddenFromOthers: opts.anonymous,
  };
}

/** Private contact card. Admin-only. */
export function presentContact(user: UserRow, viewer: Viewer): PrivateContact {
  assertAdmin(viewer);
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    neighbourhoodId: user.neighbourhoodId,
    block: user.block,
    unitNo: user.unitNo,
    phone: user.phone,
  };
}

// ---------------------------------------------------------------- account

export function presentMe(user: UserRow): Me {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    verification: user.verification,
    avatarUrl: user.avatarUrl,
    neighbourhoodId: user.neighbourhoodId,
    block: user.block,
    unitNo: user.unitNo,
    phone: user.phone,
    bio: user.bio,
    interests: [...user.interests],
    privacy: { ...user.privacy },
    notificationPrefs: { ...user.notificationPrefs },
    onboarded: user.onboarded,
    shop: user.shop ? { ...user.shop } : null,
    createdAt: user.createdAt,
  };
}

export function canAppearInDirectory(user: UserRow): boolean {
  return user.role !== "admin" && user.verification === "verified" && user.privacy.showInDirectory;
}

export interface ProfileStats {
  posts: number;
  foodShared: number;
  signedReports: number;
}

export function profileBadges(user: UserRow, stats: ProfileStats, now = new Date()): string[] {
  const badges: string[] = [];
  if (user.role === "shop") badges.push("Local business");
  if (stats.foodShared > 0) badges.push("Shares surplus food");
  if (stats.signedReports > 0) badges.push("Township helper");
  if (stats.posts >= 2) badges.push("Community voice");
  if (now.getTime() - new Date(user.createdAt).getTime() < 30 * 86_400_000) badges.push("New neighbour");
  return badges;
}

export function presentPublicProfile(user: UserRow, stats: ProfileStats, viewer: Viewer, now = new Date()): PublicProfile {
  if (user.role === "admin") throw new PrivacyError("Management accounts have no public profile.");
  return {
    id: user.id,
    name: user.role === "shop" && user.shop ? user.shop.shopName : user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    neighbourhoodId: user.neighbourhoodId,
    block: user.role === "shop" ? null : user.block,
    bio: user.bio,
    interests: [...user.interests],
    badges: profileBadges(user, stats, now),
    joinedAt: user.createdAt,
    stats: { ...stats },
    shop: user.shop
      ? {
          shopName: user.shop.shopName,
          category: user.shop.category,
          halal: user.shop.halal,
          openingHours: user.shop.openingHours,
          address: user.shop.address,
        }
      : null,
    isYou: user.id === viewer.id,
  };
}

// ---------------------------------------------------------------- TownCare

export interface ReportAggregates {
  supporterIds: readonly string[];
  comments: number;
}

export function presentReport(row: ReportRow, agg: ReportAggregates, ctx: PresentContext): Report {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    photoUrl: ctx.fileUrl(row.photoPath),
    location: { ...row.location },
    locationLabel: row.locationLabel,
    neighbourhoodId: row.neighbourhoodId,
    reporter: presentIdentity(ctx.getUser(row.reporterId), ctx.viewer, { anonymous: !row.showName }),
    isMine: row.reporterId === ctx.viewer.id,
    supporters: agg.supporterIds.length,
    supportedByMe: agg.supporterIds.includes(ctx.viewer.id),
    comments: agg.comments,
    assignedTeam: row.assignedTeam,
    isAlert: row.category === "wildlife" && row.status !== "resolved",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    resolvedAt: row.resolvedAt,
  };
}

export function presentStatusEntry(entry: ReportStatusRow, report: ReportRow, ctx: PresentContext): StatusEntry {
  const changer = ctx.getUser(entry.changedBy);
  const by =
    !changer || changer.role === "admin"
      ? MANAGEMENT_NAME
      : presentIdentity(changer, ctx.viewer, { anonymous: !report.showName }).displayName;
  return { id: entry.id, status: entry.status, note: entry.note, at: entry.at, by };
}

export function presentReportComment(row: ReportCommentRow, report: ReportRow, ctx: PresentContext): ReportComment {
  const author = ctx.getUser(row.authorId);
  // The reporter keeps the anonymity they chose for this report; other commenters follow
  // their own default, so a comment can never reveal who raised the report.
  const showName = row.authorId === report.reporterId ? report.showName : (author?.privacy.showNameOnReports ?? false);
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt,
    author: presentIdentity(author, ctx.viewer, { anonymous: !showName }),
    official: row.official,
  };
}

export function presentReportDetail(
  row: ReportRow,
  agg: ReportAggregates,
  history: readonly ReportStatusRow[],
  comments: readonly ReportCommentRow[],
  ctx: PresentContext,
): ReportDetail {
  return {
    ...presentReport(row, agg, ctx),
    history: history.map((h) => presentStatusEntry(h, row, ctx)),
    commentList: comments.map((c) => presentReportComment(c, row, ctx)),
  };
}

export function presentAdminReport(
  row: ReportRow,
  agg: ReportAggregates,
  history: readonly ReportStatusRow[],
  ctx: PresentContext,
): AdminReport {
  assertAdmin(ctx.viewer);
  const reporter = ctx.getUser(row.reporterId);
  return {
    ...presentReport(row, agg, ctx),
    reporterContact: reporter
      ? presentContact(reporter, ctx.viewer)
      : { userId: row.reporterId, name: "Unknown", email: "", neighbourhoodId: null, block: null, unitNo: null, phone: null },
    history: history.map((h) => presentStatusEntry(h, row, ctx)),
  };
}

// ---------------------------------------------------------------- EcoFood

export function presentClaim(row: FoodClaimRow, listing: FoodListingRow, ctx: PresentContext): FoodClaim {
  const { viewer } = ctx;
  const involved = viewer.id === row.claimerId || viewer.id === listing.ownerId || isAdmin(viewer);
  if (!involved) throw new PrivacyError("Claims are only visible to the giver and the claimer.");
  const codeVisible = row.status === "confirmed" || row.status === "collected";
  return {
    id: row.id,
    status: row.status,
    note: row.note,
    createdAt: row.createdAt,
    claimer: presentIdentity(ctx.getUser(row.claimerId), viewer, { anonymous: !row.showName }),
    pickupCode: codeVisible ? row.pickupCode : null,
  };
}

export function presentListing(row: FoodListingRow, claims: readonly FoodClaimRow[], ctx: PresentContext): FoodListing {
  const owner = ctx.getUser(row.ownerId);
  const mine = claims.find((c) => c.claimerId === ctx.viewer.id && c.status !== "cancelled");
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    foodType: row.foodType,
    quantity: row.quantity,
    estWeightKg: row.estWeightKg,
    halal: row.halal,
    dietaryTags: [...row.dietaryTags],
    photoUrl: ctx.fileUrl(row.photoPath),
    pickupPoint: row.pickupPoint,
    location: { ...row.location },
    neighbourhoodId: row.neighbourhoodId,
    pickupStart: row.pickupStart,
    pickupEnd: row.pickupEnd,
    expiresAt: row.expiresAt,
    status: row.status,
    // Food listings are public: the giver is shown by name (or shop name).
    giver: presentIdentity(owner, ctx.viewer, { anonymous: false }),
    fromShop: owner?.role === "shop",
    priceNote: row.priceNote,
    isMine: row.ownerId === ctx.viewer.id,
    requests: claims.filter((c) => c.status === "requested").length,
    myClaim: mine ? presentClaim(mine, row, ctx) : null,
    createdAt: row.createdAt,
  };
}

export function presentListingDetail(
  row: FoodListingRow,
  claims: readonly FoodClaimRow[],
  ctx: PresentContext,
): FoodListingDetail {
  const canSeeClaims = row.ownerId === ctx.viewer.id || isAdmin(ctx.viewer);
  return {
    ...presentListing(row, claims, ctx),
    claims: canSeeClaims ? claims.map((c) => presentClaim(c, row, ctx)) : [],
  };
}

// ---------------------------------------------------------------- facilities & bookings

export function presentFacility(row: FacilityRow, ctx: Pick<PresentContext, "fileUrl">): Facility {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description,
    photoUrl: ctx.fileUrl(row.photoPath),
    photoCredit: row.photoCredit,
    capacity: row.capacity,
    neighbourhoodId: row.neighbourhoodId,
    locationLabel: row.locationLabel,
    location: { ...row.location },
    rules: [...row.rules],
    amenities: [...row.amenities],
    openMinutes: row.openMinutes,
    closeMinutes: row.closeMinutes,
    slotMinutes: row.slotMinutes,
    maxDurationMinutes: row.maxDurationMinutes,
    advanceDays: row.advanceDays,
    requiresApproval: row.requiresApproval,
  };
}

/** A booking with its purpose. Only for the person who made it, or an admin. */
export function presentBooking(row: BookingRow, facility: FacilityRow, viewer: Viewer): Booking {
  if (row.userId !== viewer.id && !isAdmin(viewer)) {
    throw new PrivacyError("Booking details are only visible to the booker and Township Management.");
  }
  return {
    id: row.id,
    facilityId: row.facilityId,
    facilityName: facility.name,
    start: row.start,
    end: row.end,
    purpose: row.purpose,
    attendees: row.attendees,
    status: row.status,
    requiresApproval: facility.requiresApproval,
    decisionNote: row.decisionNote,
    createdAt: row.createdAt,
  };
}

export function presentAdminBooking(row: BookingRow, facility: FacilityRow, ctx: PresentContext): AdminBooking {
  assertAdmin(ctx.viewer);
  const booker = row.userId ? ctx.getUser(row.userId) : undefined;
  return {
    ...presentBooking(row, facility, ctx.viewer),
    booker: booker ? presentContact(booker, ctx.viewer) : null,
    kind: row.kind,
  };
}

// ---------------------------------------------------------------- community

export interface PostAggregates {
  likeUserIds: readonly string[];
  comments: number;
}

export function presentPost(row: PostRow, agg: PostAggregates, ctx: PresentContext): Post {
  return {
    id: row.id,
    kind: row.kind,
    topic: row.topic,
    body: row.body,
    // Posts are public within the verified community.
    author: presentIdentity(ctx.getUser(row.authorId), ctx.viewer, { anonymous: false }),
    neighbourhoodId: row.neighbourhoodId,
    createdAt: row.createdAt,
    likes: agg.likeUserIds.length,
    likedByMe: agg.likeUserIds.includes(ctx.viewer.id),
    comments: agg.comments,
    isMine: row.authorId === ctx.viewer.id,
    hidden: row.hidden,
  };
}

/**
 * Events are public within the community and the organiser is shown by name. RSVPs are
 * counted only: other residents never see who is going.
 */
export function presentEvent(row: EventRow, goingUserIds: readonly string[], ctx: PresentContext): CommunityEvent {
  const organizer = ctx.getUser(row.organizerId);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    locationLabel: row.locationLabel,
    location: row.location ? { ...row.location } : null,
    facilityId: row.facilityId,
    neighbourhoodId: row.neighbourhoodId,
    organizer: presentIdentity(organizer, ctx.viewer, { anonymous: false }),
    official: organizer?.role === "admin",
    going: goingUserIds.length,
    goingByMe: goingUserIds.includes(ctx.viewer.id),
    isMine: row.organizerId === ctx.viewer.id,
    createdAt: row.createdAt,
  };
}

/** A verified shop on the Places map: public business details only (never the SSM number). */
export function presentShopPlace(user: UserRow, activeListings: number): ShopPlace | null {
  if (user.role !== "shop" || user.verification !== "verified" || !user.shop?.location) return null;
  return {
    userId: user.id,
    shopName: user.shop.shopName,
    category: user.shop.category,
    halal: user.shop.halal,
    openingHours: user.shop.openingHours,
    address: user.shop.address,
    location: { ...user.shop.location },
    activeListings,
  };
}

export function presentPostComment(row: PostCommentRow, ctx: PresentContext): PostComment {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt,
    author: presentIdentity(ctx.getUser(row.authorId), ctx.viewer, { anonymous: false }),
  };
}

// ---------------------------------------------------------------- notifications & tickets

export function presentNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    createdAt: row.createdAt,
    read: row.readAt !== null,
  };
}

export function presentTicket(row: TicketRow): SupportTicket {
  return {
    id: row.id,
    reference: row.reference,
    subject: row.subject,
    body: row.body,
    status: row.status,
    source: row.source,
    createdAt: row.createdAt,
  };
}

export function presentAdminTicket(row: TicketRow, ctx: PresentContext): AdminTicket {
  assertAdmin(ctx.viewer);
  const user = ctx.getUser(row.userId);
  return {
    ...presentTicket(row),
    requester: user
      ? presentContact(user, ctx.viewer)
      : { userId: row.userId, name: "Unknown", email: "", neighbourhoodId: null, block: null, unitNo: null, phone: null },
  };
}

export function presentVerificationRequest(user: UserRow, viewer: Viewer): VerificationRequest {
  assertAdmin(viewer);
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    requestedAt: user.verificationRequestedAt ?? user.createdAt,
    neighbourhoodId: user.neighbourhoodId,
    block: user.block,
    unitNo: user.unitNo,
    note: user.verificationNote,
    shop: user.shop ? { ...user.shop } : null,
  };
}
