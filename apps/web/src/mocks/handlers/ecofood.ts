import {
  ClaimInput,
  CreateFoodInput,
  presentIdentity,
  presentListing,
  presentListingDetail,
  startOfWeek,
  weekLabel,
  type FoodListingRow,
  type Impact,
  type UserRow,
} from "@neighbourly/shared";
import { http } from "msw";
import { ctxFor, fail, findUser, insideTownship, nearestNeighbourhood, newId, notify, nowIso, parseBody, requireUser, route } from "../context";
import { db } from "../db";

const DAY = 86_400_000;
const claimsFor = (listingId: string) => db.claims.filter((c) => c.listingId === listingId);
const kg = (n: number) => Math.round(n * 10) / 10;

/** Listings whose pickup window has passed without anyone reserving them expire. */
export function expireStale(): void {
  const now = Date.now();
  for (const f of db.food) {
    if (f.status === "available" && new Date(f.pickupEnd).getTime() < now) f.status = "expired";
  }
}

function findListing(id: string): FoodListingRow {
  const row = db.food.find((f) => f.id === id);
  if (!row) fail(404, "not_found", "That listing doesn't exist.");
  return row;
}

const detail = (row: FoodListingRow, viewer: UserRow) => presentListingDetail(row, claimsFor(row.id), ctxFor(viewer));

/** How the claimer appears to the giver, for notification text. */
const claimerLabel = (claimerId: string, showName: boolean, ownerId: string) => {
  const owner = findUser(ownerId);
  return presentIdentity(findUser(claimerId), { id: ownerId, role: owner?.role ?? "resident" }, { anonymous: !showName }).displayName;
};

export function impactFor(user: UserRow | null): Impact {
  const collected = db.food.filter((f) => f.status === "collected" && f.collectedAt);
  const isShop = (ownerId: string) => findUser(ownerId)?.role === "shop";
  const now = Date.now();
  const weeks = Array.from({ length: 8 }, (_, i) => startOfWeek(now - (7 - i) * 7 * DAY).getTime());
  const weekly = weeks.map((start) => {
    const inWeek = collected.filter((f) => {
      const t = new Date(f.collectedAt!).getTime();
      return t >= start && t < start + 7 * DAY;
    });
    return {
      week: weekLabel(start),
      residentsKg: kg(inWeek.filter((f) => !isShop(f.ownerId)).reduce((s, f) => s + f.estWeightKg, 0)),
      shopsKg: kg(inWeek.filter((f) => isShop(f.ownerId)).reduce((s, f) => s + f.estWeightKg, 0)),
    };
  });
  const collectedClaims = db.claims.filter((c) => c.status === "collected");
  const mineGiven = user ? collected.filter((f) => f.ownerId === user.id) : [];
  const mineReceived = user ? collectedClaims.filter((c) => c.claimerId === user.id) : [];
  const listingById = new Map(db.food.map((f) => [f.id, f]));
  return {
    me: {
      shared: user ? db.food.filter((f) => f.ownerId === user.id).length : 0,
      givenKg: kg(mineGiven.reduce((s, f) => s + f.estWeightKg, 0)),
      received: mineReceived.length,
      receivedKg: kg(mineReceived.reduce((s, c) => s + (listingById.get(c.listingId)?.estWeightKg ?? 0), 0)),
    },
    community: {
      listings: db.food.length,
      collected: collected.length,
      kgSaved: kg(collected.reduce((s, f) => s + f.estWeightKg, 0)),
      kgThisMonth: kg(collected.filter((f) => now - new Date(f.collectedAt!).getTime() < 30 * DAY).reduce((s, f) => s + f.estWeightKg, 0)),
      neighboursHelped: new Set(collectedClaims.map((c) => c.claimerId)).size,
      shopsParticipating: new Set(db.food.filter((f) => isShop(f.ownerId)).map((f) => f.ownerId)).size,
      kgFromShops: kg(collected.filter((f) => isShop(f.ownerId)).reduce((s, f) => s + f.estWeightKg, 0)),
      kgFromResidents: kg(collected.filter((f) => !isShop(f.ownerId)).reduce((s, f) => s + f.estWeightKg, 0)),
    },
    weekly,
  };
}

export const ecofoodHandlers = [
  http.get(
    "/api/food",
    route(({ request, url }) => {
      const user = requireUser(request);
      expireStale();
      const p = url.searchParams;
      const view = p.get("view") ?? "active"; // active | mine
      const type = p.get("type");
      const halalOnly = p.get("halal") === "true";
      const source = p.get("source"); // shops | residents
      const myClaims = new Set(db.claims.filter((c) => c.claimerId === user.id && c.status !== "cancelled").map((c) => c.listingId));
      return db.food
        .filter((f) =>
          view === "mine" ? f.ownerId === user.id || myClaims.has(f.id) : f.status === "available" || f.status === "reserved",
        )
        .filter((f) => !type || f.foodType === type)
        .filter((f) => !halalOnly || f.halal === "halal")
        .filter((f) => !source || (source === "shops") === (findUser(f.ownerId)?.role === "shop"))
        .sort((a, b) => {
          // Available first, then newest
          const rank = (s: string) => (s === "available" ? 0 : s === "reserved" ? 1 : 2);
          return rank(a.status) - rank(b.status) || b.createdAt.localeCompare(a.createdAt);
        })
        .slice(0, view === "mine" ? 50 : 40)
        .map((f) => presentListing(f, claimsFor(f.id), ctxFor(user)));
    }),
  ),

  http.get(
    "/api/food/impact",
    route(({ request }) => impactFor(requireUser(request))),
  ),

  http.get(
    "/api/food/:id",
    route(({ request, params }) => {
      expireStale();
      return detail(findListing(params.id!), requireUser(request));
    }),
  ),

  http.post(
    "/api/food",
    route(async ({ request }) => {
      const user = requireUser(request);
      const input = await parseBody(request, CreateFoodInput);
      if (!insideTownship(input.location)) fail(400, "outside_township", "The pickup point must be inside City of Elmina.");
      if (new Date(input.pickupEnd).getTime() < Date.now()) fail(400, "past_window", "The pickup window has already passed.");
      const row: FoodListingRow = {
        id: newId("f"),
        ownerId: user.id,
        title: input.title,
        description: input.description,
        foodType: input.foodType,
        quantity: input.quantity,
        estWeightKg: input.estWeightKg,
        halal: input.halal,
        dietaryTags: input.dietaryTags,
        photoPath: input.photoPath,
        pickupPoint: input.pickupPoint,
        location: input.location,
        neighbourhoodId: user.neighbourhoodId ?? nearestNeighbourhood(input.location),
        pickupStart: input.pickupStart,
        pickupEnd: input.pickupEnd,
        expiresAt: input.expiresAt,
        status: "available",
        priceNote: user.role === "shop" ? input.priceNote || "Free" : null,
        createdAt: nowIso(),
        collectedAt: null,
      };
      db.food.push(row);
      return detail(row, user);
    }),
  ),

  http.post(
    "/api/food/:id/claims",
    route(async ({ request, params }) => {
      const user = requireUser(request);
      const row = findListing(params.id!);
      const { note } = await parseBody(request, ClaimInput);
      if (row.ownerId === user.id) fail(400, "own_listing", "This is your own listing.");
      if (row.status !== "available") fail(409, "not_available", "Sorry, this food is no longer available.");
      if (claimsFor(row.id).some((c) => c.claimerId === user.id && ["requested", "confirmed"].includes(c.status))) {
        fail(409, "already_requested", "You've already requested this.");
      }
      const claim = {
        id: newId("cl"),
        listingId: row.id,
        claimerId: user.id,
        status: "requested" as const,
        note: note || null,
        showName: user.privacy.showNameOnClaims,
        pickupCode: String(Math.floor(1000 + Math.random() * 9000)),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      db.claims.push(claim);
      notify(
        row.ownerId,
        {
          type: "food_request",
          title: `New request for "${row.title}"`,
          body: `${claimerLabel(user.id, claim.showName, row.ownerId)} would like to pick it up.${note ? ` "${note}"` : ""}`,
          link: `/ecofood/${row.id}`,
        },
        "food",
      );
      return detail(row, user);
    }),
  ),

  http.post(
    "/api/food/:id/claims/:claimId/confirm",
    route(({ request, params }) => {
      const user = requireUser(request);
      const row = findListing(params.id!);
      if (row.ownerId !== user.id) fail(403, "forbidden", "Only the person sharing this food can confirm requests.");
      if (row.status !== "available") fail(409, "not_available", "This listing is already reserved.");
      const claim = claimsFor(row.id).find((c) => c.id === params.claimId);
      if (!claim || claim.status !== "requested") fail(404, "not_found", "That request is no longer open.");
      claim.status = "confirmed";
      claim.updatedAt = nowIso();
      row.status = "reserved";
      const giver = presentIdentity(user, { id: claim.claimerId, role: "resident" }, { anonymous: false }).displayName;
      notify(
        claim.claimerId,
        {
          type: "food_confirmed",
          title: `${giver} confirmed your request`,
          body: `"${row.title}" is reserved for you at ${row.pickupPoint}. Pickup code ${claim.pickupCode}.`,
          link: `/ecofood/${row.id}`,
        },
        "food",
      );
      for (const other of claimsFor(row.id)) {
        if (other.id === claim.id || other.status !== "requested") continue;
        other.status = "declined";
        other.updatedAt = nowIso();
        notify(
          other.claimerId,
          { type: "food_declined", title: `"${row.title}" went to another neighbour`, body: "Thanks for asking. Keep an eye out for new listings!", link: "/ecofood" },
          "food",
        );
      }
      return detail(row, user);
    }),
  ),

  http.post(
    "/api/food/:id/claims/:claimId/decline",
    route(({ request, params }) => {
      const user = requireUser(request);
      const row = findListing(params.id!);
      if (row.ownerId !== user.id) fail(403, "forbidden", "Only the person sharing this food can decline requests.");
      const claim = claimsFor(row.id).find((c) => c.id === params.claimId);
      if (!claim || claim.status !== "requested") fail(404, "not_found", "That request is no longer open.");
      claim.status = "declined";
      claim.updatedAt = nowIso();
      notify(
        claim.claimerId,
        { type: "food_declined", title: `Your request for "${row.title}" wasn't accepted`, body: "Keep an eye out for new listings!", link: "/ecofood" },
        "food",
      );
      return detail(row, user);
    }),
  ),

  http.post(
    "/api/food/:id/claims/:claimId/cancel",
    route(({ request, params }) => {
      const user = requireUser(request);
      const row = findListing(params.id!);
      const claim = claimsFor(row.id).find((c) => c.id === params.claimId && c.claimerId === user.id);
      if (!claim || !["requested", "confirmed"].includes(claim.status)) fail(404, "not_found", "That request is no longer open.");
      const wasConfirmed = claim.status === "confirmed";
      claim.status = "cancelled";
      claim.updatedAt = nowIso();
      if (wasConfirmed) {
        row.status = "available";
        notify(row.ownerId, { type: "food_request", title: `Pickup cancelled for "${row.title}"`, body: "Your listing is available again.", link: `/ecofood/${row.id}` }, "food");
      }
      return detail(row, user);
    }),
  ),

  http.post(
    "/api/food/:id/collected",
    route(({ request, params }) => {
      const user = requireUser(request);
      const row = findListing(params.id!);
      if (row.ownerId !== user.id) fail(403, "forbidden", "Only the person sharing this food can mark it collected.");
      if (row.status !== "reserved") fail(409, "not_reserved", "Confirm a request before marking it collected.");
      const claim = claimsFor(row.id).find((c) => c.status === "confirmed");
      row.status = "collected";
      row.collectedAt = nowIso();
      if (claim) {
        claim.status = "collected";
        claim.updatedAt = nowIso();
        notify(
          claim.claimerId,
          { type: "food_confirmed", title: "Enjoy your food!", body: `Picking up "${row.title}" kept about ${row.estWeightKg} kg out of landfill.`, link: "/ecofood/impact" },
          "food",
        );
      }
      return detail(row, user);
    }),
  ),

  http.post(
    "/api/food/:id/cancel",
    route(({ request, params }) => {
      const user = requireUser(request);
      const row = findListing(params.id!);
      if (row.ownerId !== user.id) fail(403, "forbidden", "Only the person sharing this food can remove it.");
      if (row.status === "collected") fail(409, "collected", "This food has already been collected.");
      row.status = "expired";
      for (const c of claimsFor(row.id)) {
        if (!["requested", "confirmed"].includes(c.status)) continue;
        c.status = "cancelled";
        c.updatedAt = nowIso();
        notify(c.claimerId, { type: "food_declined", title: `"${row.title}" is no longer available`, body: "The giver removed this listing.", link: "/ecofood" }, "food");
      }
      return detail(row, user);
    }),
  ),
];
