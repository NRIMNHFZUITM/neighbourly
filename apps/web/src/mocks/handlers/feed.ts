import {
  presentListing,
  presentPost,
  presentReport,
  type Alert,
  type FeedItem,
} from "@neighbourly/shared";
import { http } from "msw";
import { ctxFor, findUser, requireUser, route } from "../context";
import { db } from "../db";
import { postAgg, visiblePosts } from "./community";
import { reportAgg } from "./towncare";

const DAY = 86_400_000;

export const feedHandlers = [
  http.get(
    "/api/feed",
    route(({ request, url }): FeedItem[] => {
      const user = requireUser(request);
      const scope = url.searchParams.get("scope") ?? "neighbourhood";
      const ctx = ctxFor(user);
      const now = Date.now();
      const inScope = (hood: string | null) => scope === "township" || hood === null || hood === user.neighbourhoodId;

      const items: FeedItem[] = [
        ...visiblePosts(user, scope).map((p) => ({ type: "post" as const, id: p.id, at: p.createdAt, post: presentPost(p, postAgg(p), ctx) })),
        // The last week of reports; older ones live in TownCare. The web app groups them by day.
        ...db.reports
          .filter((r) => now - new Date(r.createdAt).getTime() < 7 * DAY && inScope(r.neighbourhoodId))
          .map((r) => ({ type: "report" as const, id: r.id, at: r.createdAt, report: presentReport(r, reportAgg(r), ctx) })),
        ...db.food
          .filter((f) => f.status === "available" && (inScope(f.neighbourhoodId) || findUser(f.ownerId)?.role === "shop"))
          .map((f) => ({
            type: "food" as const,
            id: f.id,
            at: f.createdAt,
            listing: presentListing(f, db.claims.filter((c) => c.listingId === f.id), ctx),
          })),
        ...db.facilityUpdates
          .filter((u) => now - new Date(u.createdAt).getTime() < 7 * DAY)
          .map((u) => ({
            type: "facility" as const,
            id: u.id,
            at: u.createdAt,
            update: { ...u, facilityName: db.facilities.find((f) => f.id === u.facilityId)?.name ?? "Facility" },
          })),
      ];
      return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60);
    }),
  ),

  http.get(
    "/api/alerts",
    route(({ request }): Alert[] => {
      const user = requireUser(request);
      const now = Date.now();
      const near = (hood: string | null) => user.role === "admin" || hood === null || hood === user.neighbourhoodId;
      const wildlife: Alert[] = db.reports
        .filter((r) => r.category === "wildlife" && r.status !== "resolved" && now - new Date(r.createdAt).getTime() < 3 * DAY && near(r.neighbourhoodId))
        .map((r) => ({
          id: r.id,
          kind: "wildlife",
          title: r.title,
          body: r.locationLabel,
          neighbourhoodId: r.neighbourhoodId,
          createdAt: r.createdAt,
          link: `/towncare/${r.id}`,
        }));
      const announcements: Alert[] = db.posts
        .filter((p) => p.kind === "alert" && !p.hidden && now - new Date(p.createdAt).getTime() < 2 * DAY && near(p.neighbourhoodId))
        .map((p) => ({
          id: p.id,
          kind: "announcement",
          title: "Township Management",
          body: p.body,
          neighbourhoodId: p.neighbourhoodId,
          createdAt: p.createdAt,
          link: "/community",
        }));
      return [...wildlife, ...announcements].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }),
  ),
];
