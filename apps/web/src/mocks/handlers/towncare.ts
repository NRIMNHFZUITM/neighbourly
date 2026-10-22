import {
  AddCommentInput,
  CreateReportInput,
  neighbourhoodName,
  presentIdentity,
  presentReport,
  presentReportDetail,
  type ReportRow,
} from "@neighbourly/shared";
import { http } from "msw";
import { ctxFor, fail, insideTownship, nearestNeighbourhood, newId, notify, nowIso, parseBody, requireUser, route } from "../context";
import { db } from "../db";

export const reportAgg = (r: ReportRow) => ({
  supporterIds: db.reportSupporters.filter((s) => s.reportId === r.id).map((s) => s.userId),
  comments: db.reportComments.filter((c) => c.reportId === r.id).length,
});

const byNewest = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);
const byOldest = (a: { at?: string; createdAt?: string }, b: { at?: string; createdAt?: string }) =>
  (a.at ?? a.createdAt ?? "").localeCompare(b.at ?? b.createdAt ?? "");

export function findReport(id: string): ReportRow {
  const row = db.reports.find((r) => r.id === id);
  if (!row) fail(404, "not_found", "That report doesn't exist.");
  return row;
}

export function reportDetail(row: ReportRow, viewer: Parameters<typeof ctxFor>[0]) {
  return presentReportDetail(
    row,
    reportAgg(row),
    db.reportHistory.filter((h) => h.reportId === row.id).sort(byOldest),
    db.reportComments.filter((c) => c.reportId === row.id).sort(byOldest),
    ctxFor(viewer),
  );
}

export const towncareHandlers = [
  http.get(
    "/api/reports",
    route(({ request, url }) => {
      const user = requireUser(request);
      const p = url.searchParams;
      const category = p.get("category");
      const status = p.get("status");
      const neighbourhood = p.get("neighbourhood");
      const mine = p.get("scope") === "mine";
      const supported = new Set(db.reportSupporters.filter((s) => s.userId === user.id).map((s) => s.reportId));
      return db.reports
        .filter((r) => !category || r.category === category)
        .filter((r) => !status || r.status === status)
        .filter((r) => !neighbourhood || r.neighbourhoodId === neighbourhood)
        .filter((r) => !mine || r.reporterId === user.id || supported.has(r.id))
        .sort(byNewest)
        .map((r) => presentReport(r, reportAgg(r), ctxFor(user)));
    }),
  ),

  http.get(
    "/api/reports/:id",
    route(({ request, params }) => reportDetail(findReport(params.id!), requireUser(request))),
  ),

  http.post(
    "/api/reports",
    route(async ({ request }) => {
      const user = requireUser(request);
      const input = await parseBody(request, CreateReportInput);
      if (!insideTownship(input.location)) fail(400, "outside_township", "Drop the pin inside City of Elmina.");
      const neighbourhoodId = nearestNeighbourhood(input.location);
      const now = nowIso();
      const row: ReportRow = {
        id: newId("r"),
        reporterId: user.id,
        title: input.title,
        description: input.description,
        category: input.category,
        status: "open",
        photoPath: input.photoPath,
        location: input.location,
        locationLabel: input.locationLabel || `Pinned location, ${neighbourhoodName(neighbourhoodId)}`,
        neighbourhoodId,
        showName: input.showName,
        assignedTeam: null,
        createdAt: now,
        updatedAt: now,
        resolvedAt: null,
      };
      db.reports.push(row);
      db.reportHistory.push({ id: newId("h"), reportId: row.id, status: "open", note: null, changedBy: user.id, at: now });

      // Wildlife sightings alert the neighbourhood straight away.
      if (row.category === "wildlife") {
        for (const neighbour of db.users) {
          if (neighbour.id === user.id || neighbour.neighbourhoodId !== neighbourhoodId || neighbour.role !== "resident") continue;
          notify(
            neighbour.id,
            { type: "alert", title: "Wildlife alert near you", body: row.title, link: `/towncare/${row.id}` },
            "alerts",
          );
        }
      }
      return presentReport(row, reportAgg(row), ctxFor(user));
    }),
  ),

  http.post(
    "/api/reports/:id/support",
    route(({ request, params }) => {
      const user = requireUser(request);
      const row = findReport(params.id!);
      if (row.reporterId === user.id) fail(400, "own_report", "You raised this report, so you're already following it.");
      const idx = db.reportSupporters.findIndex((s) => s.reportId === row.id && s.userId === user.id);
      if (idx >= 0) db.reportSupporters.splice(idx, 1);
      else db.reportSupporters.push({ reportId: row.id, userId: user.id, createdAt: nowIso() });
      return presentReport(row, reportAgg(row), ctxFor(user));
    }),
  ),

  http.post(
    "/api/reports/:id/comments",
    route(async ({ request, params }) => {
      const user = requireUser(request);
      const row = findReport(params.id!);
      const { body } = await parseBody(request, AddCommentInput);
      db.reportComments.push({
        id: newId("c"),
        reportId: row.id,
        authorId: user.id,
        body,
        official: user.role === "admin",
        createdAt: nowIso(),
      });
      if (row.reporterId !== user.id) {
        const reporter = db.users.find((u) => u.id === row.reporterId);
        const shownAs = presentIdentity(user, { id: row.reporterId, role: reporter?.role ?? "resident" }, {
          anonymous: user.role !== "admin" && !user.privacy.showNameOnReports,
        }).displayName;
        notify(
          row.reporterId,
          { type: "report_comment", title: `New comment on "${row.title}"`, body: `${shownAs}: ${body.slice(0, 80)}`, link: `/towncare/${row.id}` },
          "reports",
        );
      }
      return reportDetail(row, user);
    }),
  ),
];
