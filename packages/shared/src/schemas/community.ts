import { z } from "zod";
import { EVENT_CATEGORIES, HALAL_STATUSES, INTERESTS, NOTIFICATION_TYPES, POST_KINDS, POST_TOPICS } from "../constants";
import { FacilitySchema } from "./booking";
import { IdentitySchema, LatLngSchema, dateKey, isoDate } from "./common";
import { FoodListingSchema } from "./ecofood";
import { ReportSchema } from "./towncare";

// ---------------------------------------------------------------- posts

export const PostSchema = z.object({
  id: z.string(),
  kind: z.enum(POST_KINDS),
  topic: z.enum(POST_TOPICS),
  body: z.string(),
  author: IdentitySchema,
  /** null = township-wide */
  neighbourhoodId: z.string().nullable(),
  createdAt: isoDate(),
  likes: z.number().int(),
  likedByMe: z.boolean(),
  comments: z.number().int(),
  isMine: z.boolean(),
  hidden: z.boolean(),
});
export type Post = z.infer<typeof PostSchema>;

export const PostCommentSchema = z.object({
  id: z.string(),
  body: z.string(),
  createdAt: isoDate(),
  author: IdentitySchema,
});
export type PostComment = z.infer<typeof PostCommentSchema>;

export const PostDetailSchema = PostSchema.extend({
  commentList: z.array(PostCommentSchema),
});
export type PostDetail = z.infer<typeof PostDetailSchema>;

export const CreatePostInput = z.object({
  body: z.string().trim().min(2, "Write something").max(1000),
  scope: z.enum(["neighbourhood", "township"]),
  topic: z.enum(POST_TOPICS),
});
export type CreatePostInputType = z.infer<typeof CreatePostInput>;

// ---------------------------------------------------------------- community events

export const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(EVENT_CATEGORIES),
  startsAt: isoDate(),
  endsAt: isoDate(),
  locationLabel: z.string(),
  location: LatLngSchema.nullable(),
  facilityId: z.string().nullable(),
  /** null = open to the whole township */
  neighbourhoodId: z.string().nullable(),
  organizer: IdentitySchema,
  /** Organised by Township Management */
  official: z.boolean(),
  /** RSVPs are an aggregate: who is going is never shown to other residents. */
  going: z.number().int(),
  goingByMe: z.boolean(),
  isMine: z.boolean(),
  createdAt: isoDate(),
});
export type CommunityEvent = z.infer<typeof EventSchema>;
export const EventListSchema = z.array(EventSchema);

export const CreateEventInput = z
  .object({
    title: z.string().trim().min(4, "Give the event a title").max(80),
    description: z.string().trim().max(600),
    category: z.enum(EVENT_CATEGORIES),
    date: dateKey(),
    startMinutes: z.number().int().min(0).max(24 * 60),
    endMinutes: z.number().int().min(0).max(24 * 60),
    locationLabel: z.string().trim().min(3, "Where is it happening?").max(80),
    facilityId: z.string().nullable(),
    scope: z.enum(["neighbourhood", "township"]),
  })
  .refine((v) => v.endMinutes > v.startMinutes, { message: "The event must end after it starts", path: ["endMinutes"] });
export type CreateEventInputType = z.infer<typeof CreateEventInput>;

// ---------------------------------------------------------------- places map

export const ShopPlaceSchema = z.object({
  userId: z.string(),
  shopName: z.string(),
  category: z.string(),
  halal: z.enum(HALAL_STATUSES),
  openingHours: z.string(),
  address: z.string(),
  location: LatLngSchema,
  /** Food the shop currently has on EcoFood. */
  activeListings: z.number().int(),
});
export type ShopPlace = z.infer<typeof ShopPlaceSchema>;

export const PlacesSchema = z.object({
  facilities: z.array(FacilitySchema),
  shops: z.array(ShopPlaceSchema),
});
export type Places = z.infer<typeof PlacesSchema>;

// ---------------------------------------------------------------- feed & alerts

export const FacilityUpdateSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  facilityName: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: isoDate(),
});
export type FacilityUpdate = z.infer<typeof FacilityUpdateSchema>;

export const FeedItemSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("post"), id: z.string(), at: isoDate(), post: PostSchema }),
  z.object({ type: z.literal("report"), id: z.string(), at: isoDate(), report: ReportSchema }),
  z.object({ type: z.literal("food"), id: z.string(), at: isoDate(), listing: FoodListingSchema }),
  z.object({ type: z.literal("facility"), id: z.string(), at: isoDate(), update: FacilityUpdateSchema }),
]);
export type FeedItem = z.infer<typeof FeedItemSchema>;
export const FeedSchema = z.array(FeedItemSchema);

export const AlertSchema = z.object({
  id: z.string(),
  kind: z.enum(["wildlife", "announcement"]),
  title: z.string(),
  body: z.string(),
  neighbourhoodId: z.string().nullable(),
  createdAt: isoDate(),
  link: z.string().nullable(),
});
export type Alert = z.infer<typeof AlertSchema>;
export const AlertListSchema = z.array(AlertSchema);

// ---------------------------------------------------------------- directory & profiles

export const PublicProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  role: z.enum(["resident", "shop"]),
  neighbourhoodId: z.string().nullable(),
  block: z.string().nullable(),
  bio: z.string(),
  interests: z.array(z.enum(INTERESTS)),
  badges: z.array(z.string()),
  joinedAt: isoDate(),
  stats: z.object({
    posts: z.number().int(),
    foodShared: z.number().int(),
    /** Only reports the person chose to put their name on. */
    signedReports: z.number().int(),
  }),
  shop: z
    .object({
      shopName: z.string(),
      category: z.string(),
      halal: z.enum(HALAL_STATUSES),
      openingHours: z.string(),
      address: z.string(),
    })
    .nullable(),
  isYou: z.boolean(),
});
export type PublicProfile = z.infer<typeof PublicProfileSchema>;
export const PublicProfileListSchema = z.array(PublicProfileSchema);

export const ProfileActivitySchema = z.object({
  profile: PublicProfileSchema,
  posts: z.array(PostSchema),
  listings: z.array(FoodListingSchema),
  reports: z.array(ReportSchema),
});
export type ProfileActivity = z.infer<typeof ProfileActivitySchema>;

// ---------------------------------------------------------------- notifications

export const NotificationSchema = z.object({
  id: z.string(),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string(),
  body: z.string(),
  link: z.string().nullable(),
  createdAt: isoDate(),
  read: z.boolean(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationListSchema = z.object({
  items: z.array(NotificationSchema),
  unread: z.number().int(),
});
export type NotificationList = z.infer<typeof NotificationListSchema>;

// ---------------------------------------------------------------- support tickets (assistant handoff)

export const SupportTicketSchema = z.object({
  id: z.string(),
  reference: z.string(),
  subject: z.string(),
  body: z.string(),
  status: z.enum(["open", "closed"]),
  source: z.enum(["assistant", "app"]),
  createdAt: isoDate(),
});
export type SupportTicket = z.infer<typeof SupportTicketSchema>;

export const CreateTicketInput = z.object({
  subject: z.string().trim().min(3, "Add a subject").max(100),
  body: z.string().trim().min(5, "Describe what you need").max(1000),
  source: z.enum(["assistant", "app"]),
});
export type CreateTicketInputType = z.infer<typeof CreateTicketInput>;

// ---------------------------------------------------------------- public landing stats

export const PublicStatsSchema = z.object({
  residents: z.number().int(),
  issuesResolved: z.number().int(),
  avgFixDays: z.number(),
  kgFoodSaved: z.number(),
});
export type PublicStats = z.infer<typeof PublicStatsSchema>;
