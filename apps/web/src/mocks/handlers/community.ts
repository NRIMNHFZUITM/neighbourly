import {
  AddCommentInput,
  CreateEventInput,
  CreatePostInput,
  EVENT_CATEGORIES,
  POST_TOPICS,
  canAppearInDirectory,
  fromMyt,
  presentEvent,
  presentListing,
  presentPost,
  presentPostComment,
  presentPublicProfile,
  presentReport,
  type EventRow,
  type PostRow,
  type ProfileActivity,
  type UserRow,
} from "@neighbourly/shared";
import { http } from "msw";
import { ctxFor, fail, findUser, newId, notify, nowIso, parseBody, requireUser, route } from "../context";
import { db } from "../db";
import { reportAgg } from "./towncare";

export const postAgg = (p: PostRow) => ({
  likeUserIds: db.postLikes.filter((l) => l.postId === p.id).map((l) => l.userId),
  comments: db.postComments.filter((c) => c.postId === p.id).length,
});

export function visiblePosts(viewer: UserRow, scope: string | null): PostRow[] {
  return db.posts
    .filter((p) => !p.hidden || viewer.role === "admin")
    .filter((p) => scope !== "neighbourhood" || p.neighbourhoodId === null || p.neighbourhoodId === viewer.neighbourhoodId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** "official" = announcements and alerts from Township Management. */
function matchesTopic(p: PostRow, topic: string | null): boolean {
  if (!topic) return true;
  if (topic === "official") return p.kind !== "post";
  return (POST_TOPICS as readonly string[]).includes(topic) && p.topic === topic;
}

// ---------------------------------------------------------------- events

const eventGoing = (e: EventRow) => db.eventRsvps.filter((r) => r.eventId === e.id).map((r) => r.userId);

/** Township-wide events, plus the viewer's own neighbourhood. Admins see everything. */
const canSeeEvent = (e: EventRow, viewer: UserRow) =>
  viewer.role === "admin" || e.neighbourhoodId === null || e.neighbourhoodId === viewer.neighbourhoodId || e.organizerId === viewer.id;

function findEvent(id: string, viewer: UserRow): EventRow {
  const e = db.events.find((x) => x.id === id && canSeeEvent(x, viewer));
  if (!e) fail(404, "not_found", "That event doesn't exist or has been cancelled.");
  return e;
}

export function upcomingEvents(viewer: UserRow, now = Date.now()): EventRow[] {
  return db.events
    .filter((e) => canSeeEvent(e, viewer) && new Date(e.endsAt).getTime() > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function findPost(id: string, viewer: UserRow): PostRow {
  const p = db.posts.find((x) => x.id === id && (!x.hidden || viewer.role === "admin"));
  if (!p) fail(404, "not_found", "That post doesn't exist.");
  return p;
}

const postDetail = (p: PostRow, viewer: UserRow) => ({
  ...presentPost(p, postAgg(p), ctxFor(viewer)),
  commentList: db.postComments
    .filter((c) => c.postId === p.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((c) => presentPostComment(c, ctxFor(viewer))),
});

function profileStats(user: UserRow) {
  return {
    posts: db.posts.filter((p) => p.authorId === user.id && !p.hidden).length,
    foodShared: db.food.filter((f) => f.ownerId === user.id).length,
    signedReports: db.reports.filter((r) => r.reporterId === user.id && r.showName).length,
  };
}

export const communityHandlers = [
  http.get(
    "/api/posts",
    route(({ request, url }) => {
      const user = requireUser(request);
      const topic = url.searchParams.get("topic");
      return visiblePosts(user, url.searchParams.get("scope"))
        .filter((p) => matchesTopic(p, topic))
        .map((p) => presentPost(p, postAgg(p), ctxFor(user)));
    }),
  ),

  http.post(
    "/api/posts",
    route(async ({ request }) => {
      const user = requireUser(request);
      const input = await parseBody(request, CreatePostInput);
      const row: PostRow = {
        id: newId("p"),
        authorId: user.id,
        kind: user.role === "admin" ? "announcement" : "post",
        topic: input.topic,
        body: input.body,
        neighbourhoodId: input.scope === "neighbourhood" ? user.neighbourhoodId : null,
        hidden: false,
        createdAt: nowIso(),
      };
      db.posts.push(row);
      return presentPost(row, postAgg(row), ctxFor(user));
    }),
  ),

  http.get(
    "/api/posts/:id",
    route(({ request, params }) => {
      const user = requireUser(request);
      return postDetail(findPost(params.id!, user), user);
    }),
  ),

  http.post(
    "/api/posts/:id/comments",
    route(async ({ request, params }) => {
      const user = requireUser(request);
      const post = findPost(params.id!, user);
      const { body } = await parseBody(request, AddCommentInput);
      db.postComments.push({ id: newId("pc"), postId: post.id, authorId: user.id, body, createdAt: nowIso() });
      if (post.authorId !== user.id) {
        notify(
          post.authorId,
          { type: "report_comment", title: `${user.shop?.shopName ?? user.name} commented on your post`, body: body.slice(0, 90), link: "/community" },
          "community",
        );
      }
      return postDetail(post, user);
    }),
  ),

  http.post(
    "/api/posts/:id/like",
    route(({ request, params }) => {
      const user = requireUser(request);
      const post = findPost(params.id!, user);
      const idx = db.postLikes.findIndex((l) => l.postId === post.id && l.userId === user.id);
      if (idx >= 0) db.postLikes.splice(idx, 1);
      else db.postLikes.push({ postId: post.id, userId: user.id });
      return presentPost(post, postAgg(post), ctxFor(user));
    }),
  ),

  http.get(
    "/api/events",
    route(({ request, url }) => {
      const user = requireUser(request);
      const category = url.searchParams.get("category");
      const scope = url.searchParams.get("scope");
      return upcomingEvents(user)
        .filter((e) => !category || ((EVENT_CATEGORIES as readonly string[]).includes(category) && e.category === category))
        .filter((e) => scope !== "neighbourhood" || e.neighbourhoodId === user.neighbourhoodId)
        .map((e) => presentEvent(e, eventGoing(e), ctxFor(user)));
    }),
  ),

  http.post(
    "/api/events",
    route(async ({ request }) => {
      const user = requireUser(request);
      const input = await parseBody(request, CreateEventInput);
      const startsAt = fromMyt(input.date, input.startMinutes);
      if (startsAt.getTime() < Date.now()) fail(400, "in_past", "Pick a start time that hasn't passed yet.");
      const facility = input.facilityId ? db.facilities.find((f) => f.id === input.facilityId && f.active) : null;
      if (input.facilityId && !facility) fail(400, "bad_facility", "That facility doesn't exist.");
      const row: EventRow = {
        id: newId("e"),
        organizerId: user.id,
        title: input.title,
        description: input.description,
        category: input.category,
        startsAt: startsAt.toISOString(),
        endsAt: fromMyt(input.date, input.endMinutes).toISOString(),
        locationLabel: input.locationLabel,
        location: facility ? { ...facility.location } : null,
        facilityId: facility?.id ?? null,
        neighbourhoodId: input.scope === "neighbourhood" ? user.neighbourhoodId : null,
        createdAt: nowIso(),
      };
      db.events.push(row);
      // Organisers are going to their own event.
      db.eventRsvps.push({ eventId: row.id, userId: user.id, createdAt: row.createdAt });
      return presentEvent(row, eventGoing(row), ctxFor(user));
    }),
  ),

  http.post(
    "/api/events/:id/rsvp",
    route(({ request, params }) => {
      const user = requireUser(request);
      const event = findEvent(params.id!, user);
      const idx = db.eventRsvps.findIndex((r) => r.eventId === event.id && r.userId === user.id);
      if (idx >= 0) db.eventRsvps.splice(idx, 1);
      else db.eventRsvps.push({ eventId: event.id, userId: user.id, createdAt: nowIso() });
      return presentEvent(event, eventGoing(event), ctxFor(user));
    }),
  ),

  http.delete(
    "/api/events/:id",
    route(({ request, params }) => {
      const user = requireUser(request);
      const event = findEvent(params.id!, user);
      if (event.organizerId !== user.id && user.role !== "admin") fail(403, "forbidden", "Only the organiser can cancel this event.");
      for (const r of db.eventRsvps.filter((x) => x.eventId === event.id && x.userId !== user.id)) {
        notify(r.userId, { type: "alert", title: "Event cancelled", body: `${event.title} has been cancelled by the organiser.`, link: "/community/events" }, "community");
      }
      db.events = db.events.filter((e) => e.id !== event.id);
      db.eventRsvps = db.eventRsvps.filter((r) => r.eventId !== event.id);
      return { ok: true };
    }),
  ),

  http.get(
    "/api/neighbours",
    route(({ request, url }) => {
      const user = requireUser(request);
      const p = url.searchParams;
      const hood = p.get("neighbourhood");
      const interest = p.get("interest");
      const q = p.get("q")?.toLowerCase().trim();
      return db.users
        .filter((u) => canAppearInDirectory(u))
        .filter((u) => !hood || u.neighbourhoodId === hood)
        .filter((u) => !interest || u.interests.includes(interest as never))
        .filter((u) => !q || u.name.toLowerCase().includes(q) || (u.shop?.shopName.toLowerCase().includes(q) ?? false))
        .map((u) => presentPublicProfile(u, profileStats(u), { id: user.id, role: user.role }))
        .sort((a, b) => Number(b.isYou) - Number(a.isYou) || b.stats.foodShared + b.stats.posts - (a.stats.foodShared + a.stats.posts));
    }),
  ),

  http.get(
    "/api/users/:id",
    route(({ request, params }): ProfileActivity => {
      const viewer = requireUser(request);
      const user = findUser(params.id!);
      if (!user || user.role === "admin" || user.verification !== "verified") fail(404, "not_found", "That profile isn't available.");
      const ctx = ctxFor(viewer);
      return {
        profile: presentPublicProfile(user, profileStats(user), { id: viewer.id, role: viewer.role }),
        posts: db.posts
          .filter((p) => p.authorId === user.id && !p.hidden)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 10)
          .map((p) => presentPost(p, postAgg(p), ctx)),
        listings: db.food
          .filter((f) => f.ownerId === user.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 6)
          .map((f) => presentListing(f, db.claims.filter((c) => c.listingId === f.id), ctx)),
        // Only reports the person chose to sign. Anonymous reports never appear on a profile.
        reports: db.reports
          .filter((r) => r.reporterId === user.id && r.showName)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 6)
          .map((r) => presentReport(r, reportAgg(r), ctx)),
      };
    }),
  ),
];
