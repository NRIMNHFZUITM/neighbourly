/**
 * Township configuration and domain vocabulary.
 * Coordinates come from OpenStreetMap (Nominatim) lookups of City of Elmina, Shah Alam.
 */

export const TOWNSHIP = {
  id: "city-of-elmina",
  name: "City of Elmina",
  locality: "Shah Alam, Selangor",
  timeZone: "Asia/Kuala_Lumpur",
  center: { lat: 3.1885, lng: 101.5085 },
  defaultZoom: 14,
  bounds: { south: 3.158, west: 101.485, north: 3.218, east: 101.535 },
} as const;

export const NEIGHBOURHOODS = [
  { id: "elmina-valley", name: "Elmina Valley", center: { lat: 3.1704, lng: 101.5033 } },
  { id: "elmina-green", name: "Elmina Green", center: { lat: 3.2075, lng: 101.4975 } },
  { id: "elmina-gardens", name: "Elmina Gardens", center: { lat: 3.1902, lng: 101.5195 } },
] as const;

export type NeighbourhoodId = (typeof NEIGHBOURHOODS)[number]["id"];
export const NEIGHBOURHOOD_IDS = NEIGHBOURHOODS.map((n) => n.id) as [NeighbourhoodId, ...NeighbourhoodId[]];

export function neighbourhoodName(id: string | null | undefined): string | null {
  return NEIGHBOURHOODS.find((n) => n.id === id)?.name ?? null;
}

export function neighbourhoodCenter(id: string | null | undefined) {
  return NEIGHBOURHOODS.find((n) => n.id === id)?.center ?? TOWNSHIP.center;
}

export const BLOCKS = ["A", "B", "C", "D", "E", "F"] as const;
export type Block = (typeof BLOCKS)[number];

// ---------------------------------------------------------------- accounts

export const ROLES = ["resident", "shop", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const VERIFICATION_STATUSES = ["unverified", "pending", "verified", "rejected"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const INTERESTS = ["food", "safety", "kids", "wildlife", "fitness", "gardening", "pets", "volunteering"] as const;
export type Interest = (typeof INTERESTS)[number];

export const INTEREST_LABELS: Record<Interest, string> = {
  food: "Food sharing",
  safety: "Safety",
  kids: "Kids & families",
  wildlife: "Wildlife & nature",
  fitness: "Fitness",
  gardening: "Gardening",
  pets: "Pets",
  volunteering: "Volunteering",
};

// ---------------------------------------------------------------- TownCare

export const REPORT_CATEGORIES = ["roads", "streetlights", "parks", "cleanliness", "wildlife", "other"] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const REPORT_CATEGORY_META: Record<
  ReportCategory,
  { label: string; short: string; description: string; team: string; emoji: string }
> = {
  roads: {
    label: "Roads & potholes",
    short: "Roads",
    description: "Potholes, damaged roads, faded road markings",
    team: "Roads & Drainage",
    emoji: "🚧",
  },
  streetlights: {
    label: "Streetlights",
    short: "Lights",
    description: "Lights that are out, flickering or on in the day",
    team: "Electrical",
    emoji: "💡",
  },
  parks: {
    label: "Parks & playgrounds",
    short: "Parks",
    description: "Broken equipment, fallen branches, overgrown grass",
    team: "Landscape",
    emoji: "🌳",
  },
  cleanliness: {
    label: "Cleanliness & drains",
    short: "Cleanliness",
    description: "Overflowing bins, illegal dumping, clogged drains",
    team: "Cleaning",
    emoji: "🧹",
  },
  wildlife: {
    label: "Wildlife sighting",
    short: "Wildlife",
    description: "Monkeys, snakes, monitor lizards or wild boar",
    team: "Wildlife & Safety",
    emoji: "🐒",
  },
  other: {
    label: "Others",
    short: "Others",
    description: "Anything else, like a broken gate, damaged signage or a noise problem",
    team: "Facilities",
    emoji: "📝",
  },
};

export const REPORT_STATUSES = ["open", "in_progress", "resolved"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

export const TEAMS = [
  "Roads & Drainage",
  "Electrical",
  "Landscape",
  "Cleaning",
  "Wildlife & Safety",
  "Facilities",
] as const;

// ---------------------------------------------------------------- EcoFood

export const FOOD_TYPES = ["cooked", "bakery", "produce", "groceries", "drinks", "other"] as const;
export type FoodType = (typeof FOOD_TYPES)[number];

export const FOOD_TYPE_META: Record<FoodType, { label: string; emoji: string }> = {
  cooked: { label: "Cooked food", emoji: "🍛" },
  bakery: { label: "Bread & pastries", emoji: "🥐" },
  produce: { label: "Fruit & vegetables", emoji: "🥭" },
  groceries: { label: "Groceries & dry goods", emoji: "🥫" },
  drinks: { label: "Drinks", emoji: "🧃" },
  other: { label: "Other", emoji: "🍱" },
};

export const HALAL_STATUSES = ["halal", "non_halal", "not_sure"] as const;
export type HalalStatus = (typeof HALAL_STATUSES)[number];

export const HALAL_LABELS: Record<HalalStatus, string> = {
  halal: "Halal",
  non_halal: "Non-halal",
  not_sure: "Halal status unknown",
};

export const DIETARY_TAGS = [
  "vegetarian",
  "vegan",
  "contains_nuts",
  "contains_dairy",
  "contains_egg",
  "contains_seafood",
  "contains_gluten",
] as const;
export type DietaryTag = (typeof DIETARY_TAGS)[number];

export const DIETARY_LABELS: Record<DietaryTag, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  contains_nuts: "Contains nuts",
  contains_dairy: "Contains dairy",
  contains_egg: "Contains egg",
  contains_seafood: "Contains seafood",
  contains_gluten: "Contains gluten",
};

export const FOOD_STATUSES = ["available", "reserved", "collected", "expired"] as const;
export type FoodStatus = (typeof FOOD_STATUSES)[number];

export const FOOD_STATUS_LABELS: Record<FoodStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  collected: "Collected",
  expired: "Expired",
};

export const CLAIM_STATUSES = ["requested", "confirmed", "collected", "declined", "cancelled"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

// ---------------------------------------------------------------- Facility booking

export const FACILITY_TYPES = ["hall", "gym", "bbq", "meeting_room"] as const;
export type FacilityType = (typeof FACILITY_TYPES)[number];

export const FACILITY_TYPE_META: Record<FacilityType, { label: string; emoji: string }> = {
  hall: { label: "Multipurpose hall", emoji: "🏛️" },
  gym: { label: "Gym & fitness studio", emoji: "🏋️" },
  bbq: { label: "BBQ area", emoji: "🔥" },
  meeting_room: { label: "Meeting room", emoji: "💼" },
};

export const BOOKING_STATUSES = ["pending", "confirmed", "rejected", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Awaiting approval",
  confirmed: "Confirmed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

// ---------------------------------------------------------------- Community & notifications

export const POST_KINDS = ["post", "announcement", "alert"] as const;
export type PostKind = (typeof POST_KINDS)[number];

export const POST_TOPICS = ["general", "lost_found", "recommendations", "giveaways", "safety", "activities"] as const;
export type PostTopic = (typeof POST_TOPICS)[number];

export const POST_TOPIC_META: Record<PostTopic, { label: string; emoji: string }> = {
  general: { label: "General", emoji: "💬" },
  lost_found: { label: "Lost & found", emoji: "🔎" },
  recommendations: { label: "Recommendations", emoji: "⭐" },
  giveaways: { label: "Giveaways", emoji: "🎁" },
  safety: { label: "Safety", emoji: "🛡️" },
  activities: { label: "Activities", emoji: "🏸" },
};

export const EVENT_CATEGORIES = ["community", "sports", "kids", "nature", "food", "learning"] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_CATEGORY_META: Record<EventCategory, { label: string; emoji: string }> = {
  community: { label: "Community", emoji: "🤝" },
  sports: { label: "Sports & fitness", emoji: "🏃" },
  kids: { label: "Kids & family", emoji: "🧸" },
  nature: { label: "Nature & green", emoji: "🌿" },
  food: { label: "Food & festive", emoji: "🍲" },
  learning: { label: "Talks & workshops", emoji: "🎓" },
};

export const NOTIFICATION_TYPES = [
  "report_status",
  "report_comment",
  "food_request",
  "food_confirmed",
  "food_declined",
  "booking_confirmed",
  "booking_rejected",
  "verification",
  "alert",
  "ticket",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// ---------------------------------------------------------------- App pages (used by the assistant to link residents)

export const SITE_PAGES = [
  { path: "/home", label: "Home" },
  { path: "/towncare/new", label: "Report an issue" },
  { path: "/towncare", label: "My reports" },
  { path: "/towncare/all", label: "All TownCare reports" },
  { path: "/towncare/map", label: "Reports map" },
  { path: "/ecofood", label: "EcoFood listings" },
  { path: "/ecofood/mine", label: "My food" },
  { path: "/ecofood/new", label: "Share surplus food" },
  { path: "/ecofood/impact", label: "Food impact" },
  { path: "/book", label: "Book a facility" },
  { path: "/book/mine", label: "My bookings" },
  { path: "/community", label: "Community feed" },
  { path: "/community/events", label: "Community events" },
  { path: "/community/neighbours", label: "Neighbour directory" },
  { path: "/places", label: "Places map" },
  { path: "/notifications", label: "Notifications" },
  { path: "/settings", label: "Privacy & settings" },
  { path: "/assistant", label: "Assistant" },
  { path: "/admin", label: "Township dashboard" },
] as const;
