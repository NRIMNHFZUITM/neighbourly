import { describe, expect, it } from "vitest";
import { buildAvailability } from "./booking";
import {
  PrivacyError,
  canAppearInDirectory,
  presentAdminReport,
  presentBooking,
  presentEvent,
  presentListing,
  presentListingDetail,
  presentMe,
  presentPublicProfile,
  presentReport,
  presentReportComment,
  presentShopPlace,
  type PresentContext,
} from "./privacy";
import type { BookingRow, FacilityRow, FoodClaimRow, FoodListingRow, ReportRow, UserRow } from "./rows";

function user(over: Partial<UserRow> & Pick<UserRow, "id" | "name">): UserRow {
  return {
    email: `${over.id}@example.com`,
    passwordHash: "hash",
    role: "resident",
    verification: "verified",
    avatarUrl: `/avatars/${over.id}.png`,
    neighbourhoodId: "elmina-valley",
    block: "C",
    unitNo: "C-12",
    phone: "012-3456789",
    bio: "",
    interests: [],
    privacy: { showInDirectory: true, showNameOnReports: false, showNameOnClaims: false },
    notificationPrefs: { reports: true, food: true, bookings: true, community: true, alerts: true },
    onboarded: true,
    shop: null,
    verificationNote: null,
    verificationRequestedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    lastActiveAt: "2026-10-01T00:00:00.000Z",
    ...over,
  };
}

const aisyah = user({ id: "aisyah", name: "Aisyah Rahman" });
const daniel = user({ id: "daniel", name: "Daniel Lim", block: "A", unitNo: "A-03", phone: "019-8887777" });
const priya = user({ id: "priya", name: "Priya Nair", neighbourhoodId: "elmina-gardens", block: "B" });
const admin = user({ id: "admin", name: "Nadia Osman", role: "admin" });
const shop = user({
  id: "shop",
  name: "Encik Faizal",
  role: "shop",
  block: null,
  shop: {
    shopName: "Roti Sinar Bakery",
    category: "Bakery",
    halal: "halal",
    openingHours: "8am – 9pm",
    address: "Elmina Lakeside Mall",
    ssmNo: "202301012345",
    location: { lat: 3.1813, lng: 101.5101 },
  },
});
const users = new Map([aisyah, daniel, priya, admin, shop].map((u) => [u.id, u]));

const ctx = (viewer: UserRow): PresentContext => ({
  viewer: { id: viewer.id, role: viewer.role },
  getUser: (id) => users.get(id),
  fileUrl: (p) => p,
});

const report: ReportRow = {
  id: "r1",
  reporterId: "aisyah",
  title: "Pothole near Block C",
  description: "Deep pothole at the junction",
  category: "roads",
  status: "open",
  photoPath: null,
  location: { lat: 3.17, lng: 101.5 },
  locationLabel: "Persiaran Elmina",
  neighbourhoodId: "elmina-valley",
  showName: false,
  assignedTeam: null,
  createdAt: "2026-10-10T00:00:00.000Z",
  updatedAt: "2026-10-10T00:00:00.000Z",
  resolvedAt: null,
};
const agg = { supporterIds: ["daniel"], comments: 0 };

describe("public profiles and the directory", () => {
  it("never include contact details or the exact address", () => {
    const profile = presentPublicProfile(aisyah, { posts: 1, foodShared: 0, signedReports: 0 }, ctx(daniel).viewer);
    const json = JSON.stringify(profile);
    expect(json).not.toContain(aisyah.email);
    expect(json).not.toContain(aisyah.phone!);
    expect(json).not.toContain(aisyah.unitNo!);
    expect(Object.keys(profile)).not.toEqual(expect.arrayContaining(["email", "phone", "unitNo"]));
  });

  it("keeps a shop's SSM number private", () => {
    const profile = presentPublicProfile(shop, { posts: 0, foodShared: 3, signedReports: 0 }, ctx(daniel).viewer);
    expect(profile.name).toBe("Roti Sinar Bakery");
    expect(JSON.stringify(profile)).not.toContain("202301012345");
  });

  it("lists only verified residents who opted in, and never admins", () => {
    expect(canAppearInDirectory(aisyah)).toBe(true);
    expect(canAppearInDirectory(admin)).toBe(false);
    expect(canAppearInDirectory({ ...aisyah, verification: "pending" })).toBe(false);
    expect(canAppearInDirectory({ ...aisyah, privacy: { ...aisyah.privacy, showInDirectory: false } })).toBe(false);
  });

  it("never sends the password hash, even to the account owner", () => {
    expect(JSON.stringify(presentMe(aisyah))).not.toContain("hash");
  });
});

describe("TownCare reports", () => {
  it("show the reporter as 'Resident in Block X' to other residents, with nothing to link back", () => {
    const r = presentReport(report, agg, ctx(daniel));
    expect(r.reporter).toMatchObject({
      kind: "anonymous",
      displayName: "Resident in Block C · Elmina Valley",
      userId: null,
      avatarUrl: null,
    });
    expect(JSON.stringify(r)).not.toContain("Aisyah");
  });

  it("show the reporter's name when they opt in", () => {
    const r = presentReport({ ...report, showName: true }, agg, ctx(daniel));
    expect(r.reporter).toMatchObject({ kind: "person", displayName: "Aisyah Rahman", userId: "aisyah" });
  });

  it("let the reporter see their own report, flagged as hidden from others", () => {
    const r = presentReport(report, agg, ctx(aisyah));
    expect(r.isMine).toBe(true);
    expect(r.reporter).toMatchObject({ isYou: true, hiddenFromOthers: true, displayName: "Aisyah Rahman" });
  });

  it("let admins see who raised a report, with contact details", () => {
    const r = presentAdminReport(report, agg, [], ctx(admin));
    expect(r.reporter.kind).toBe("person");
    expect(r.reporterContact).toMatchObject({ name: "Aisyah Rahman", phone: "012-3456789", unitNo: "C-12" });
  });

  it("refuse admin views to residents", () => {
    expect(() => presentAdminReport(report, agg, [], ctx(daniel))).toThrow(PrivacyError);
  });

  it("keep the reporter anonymous in their own comments, whatever their default", () => {
    const withDefaultOn = { ...aisyah, privacy: { ...aisyah.privacy, showNameOnReports: true } };
    users.set("aisyah", withDefaultOn);
    try {
      const comment = presentReportComment(
        { id: "c1", reportId: "r1", authorId: "aisyah", body: "Still there", official: false, createdAt: report.createdAt },
        report,
        ctx(daniel),
      );
      expect(comment.author.kind).toBe("anonymous");
    } finally {
      users.set("aisyah", aisyah);
    }
  });

  it("show management replies as Township Management, not a staff name", () => {
    const comment = presentReportComment(
      { id: "c2", reportId: "r1", authorId: "admin", body: "Scheduled", official: true, createdAt: report.createdAt },
      report,
      ctx(daniel),
    );
    expect(comment.author).toMatchObject({ kind: "management", displayName: "Township Management" });
    expect(JSON.stringify(comment)).not.toContain("Nadia");
  });
});

describe("EcoFood", () => {
  const listing: FoodListingRow = {
    id: "f1",
    ownerId: "daniel",
    title: "Nasi lemak",
    description: "",
    foodType: "cooked",
    quantity: "6 packs",
    estWeightKg: 2.4,
    halal: "halal",
    dietaryTags: [],
    photoPath: null,
    pickupPoint: "Block A guardhouse",
    location: { lat: 3.17, lng: 101.5 },
    neighbourhoodId: "elmina-valley",
    pickupStart: "2026-10-20T10:00:00.000Z",
    pickupEnd: "2026-10-20T12:00:00.000Z",
    expiresAt: "2026-10-20T14:00:00.000Z",
    status: "available",
    priceNote: null,
    createdAt: "2026-10-20T09:00:00.000Z",
    collectedAt: null,
  };
  const claim: FoodClaimRow = {
    id: "cl1",
    listingId: "f1",
    claimerId: "aisyah",
    status: "requested",
    note: "Can come at 7",
    showName: false,
    pickupCode: "4821",
    createdAt: "2026-10-20T09:30:00.000Z",
    updatedAt: "2026-10-20T09:30:00.000Z",
  };

  it("show the giver by name, because listings are public", () => {
    expect(presentListing(listing, [claim], ctx(priya)).giver).toMatchObject({ kind: "person", displayName: "Daniel Lim" });
  });

  it("show claimers to the giver as 'Resident in Block X' by default", () => {
    const detail = presentListingDetail(listing, [claim], ctx(daniel));
    expect(detail.claims[0]!.claimer).toMatchObject({ kind: "anonymous", userId: null });
  });

  it("reveal the pickup code only once the giver confirms", () => {
    expect(presentListingDetail(listing, [claim], ctx(daniel)).claims[0]!.pickupCode).toBeNull();
    const confirmed = { ...claim, status: "confirmed" as const };
    expect(presentListingDetail(listing, [confirmed], ctx(daniel)).claims[0]!.pickupCode).toBe("4821");
    expect(presentListing(listing, [confirmed], ctx(aisyah)).myClaim!.pickupCode).toBe("4821");
  });

  it("hide other people's claims from residents who aren't involved", () => {
    const detail = presentListingDetail(listing, [claim], ctx(priya));
    expect(detail.claims).toEqual([]);
    expect(detail.requests).toBe(1);
    expect(JSON.stringify(detail)).not.toContain("Can come at 7");
  });

  it("always show shops under their shop name", () => {
    const r = presentListing({ ...listing, ownerId: "shop" }, [], ctx(priya));
    expect(r.fromShop).toBe(true);
    expect(r.giver).toMatchObject({ kind: "shop", displayName: "Roti Sinar Bakery" });
  });
});

describe("facility bookings", () => {
  const facility: FacilityRow = {
    id: "hall",
    name: "Hall",
    type: "hall",
    description: "",
    photoPath: null,
    photoCredit: null,
    capacity: 150,
    neighbourhoodId: "elmina-valley",
    locationLabel: "Elmina Valley",
    location: { lat: 3.17, lng: 101.5 },
    rules: [],
    amenities: [],
    openMinutes: 8 * 60,
    closeMinutes: 23 * 60,
    slotMinutes: 60,
    maxDurationMinutes: 360,
    advanceDays: 30,
    requiresApproval: true,
    active: true,
  };
  const booking = (over: Partial<BookingRow>): BookingRow => ({
    id: "b",
    facilityId: "hall",
    userId: "daniel",
    kind: "resident",
    start: "2026-10-24T02:00:00.000Z", // 10:00 MYT
    end: "2026-10-24T04:00:00.000Z",
    purpose: "Daniel's birthday party",
    attendees: 40,
    status: "confirmed",
    decisionNote: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...over,
  });
  const now = new Date("2026-10-20T00:00:00.000Z");

  it("show other residents only that a slot is taken: no booker, no purpose", () => {
    const days = buildAvailability(
      facility,
      [
        booking({ id: "b1" }),
        booking({ id: "b2", userId: "aisyah", start: "2026-10-24T06:00:00.000Z", end: "2026-10-24T07:00:00.000Z" }),
        booking({ id: "b3", userId: null, kind: "maintenance", start: "2026-10-24T08:00:00.000Z", end: "2026-10-24T09:00:00.000Z" }),
      ],
      ["2026-10-24"],
      "aisyah",
      now,
    );
    const json = JSON.stringify(days);
    expect(json).not.toContain("birthday");
    expect(json).not.toContain("daniel");
    const state = (minutes: number) => days[0]!.slots.find((s) => s.startMinutes === minutes)!.state;
    expect(state(10 * 60)).toBe("taken");
    expect(state(11 * 60)).toBe("taken");
    expect(state(14 * 60)).toBe("mine");
    expect(state(16 * 60)).toBe("maintenance");
    expect(state(12 * 60)).toBe("free");
  });

  it("show the purpose only to the booker and admins", () => {
    expect(presentBooking(booking({}), facility, { id: "daniel", role: "resident" }).purpose).toContain("birthday");
    expect(presentBooking(booking({}), facility, { id: "admin", role: "admin" }).purpose).toContain("birthday");
    expect(() => presentBooking(booking({}), facility, { id: "aisyah", role: "resident" })).toThrow(PrivacyError);
  });
});

describe("community events and the places map", () => {
  const event = {
    id: "e1",
    organizerId: "priya",
    title: "Gotong-royong",
    description: "",
    category: "community" as const,
    startsAt: "2026-10-24T00:00:00.000Z",
    endsAt: "2026-10-24T03:00:00.000Z",
    locationLabel: "Community garden",
    location: null,
    facilityId: null,
    neighbourhoodId: null,
    createdAt: "2026-10-20T00:00:00.000Z",
  };

  it("show the organiser by name but only a count of who is going", () => {
    const e = presentEvent(event, ["aisyah", "daniel"], ctx(priya));
    expect(e.organizer).toMatchObject({ kind: "person", displayName: "Priya Nair" });
    expect(e.going).toBe(2);
    const json = JSON.stringify(e);
    expect(json).not.toContain("aisyah");
    expect(json).not.toContain("daniel");
  });

  it("mark Township Management events as official", () => {
    expect(presentEvent({ ...event, organizerId: "admin" }, [], ctx(aisyah))).toMatchObject({ official: true, organizer: { kind: "management" } });
  });

  it("put verified shops on the map without their SSM number, and never residents", () => {
    const place = presentShopPlace(shop, 2);
    expect(place).toMatchObject({ shopName: "Roti Sinar Bakery", activeListings: 2 });
    expect(JSON.stringify(place)).not.toContain("202301012345");
    expect(presentShopPlace(aisyah, 0)).toBeNull();
    expect(presentShopPlace({ ...shop, verification: "pending" }, 0)).toBeNull();
  });
});
