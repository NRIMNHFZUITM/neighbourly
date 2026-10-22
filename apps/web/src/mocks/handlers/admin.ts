import {
  AddCommentInput,
  CreateAlertInput,
  DecisionInput,
  MaintenanceBlockInput,
  REPORT_CATEGORIES,
  REPORT_STATUS_LABELS,
  UpdateReportInput,
  formatHHMM,
  fromMyt,
  hoursBetween,
  overlaps,
  presentAdminBooking,
  presentAdminReport,
  presentAdminTicket,
  presentPost,
  presentVerificationRequest,
  startOfWeek,
  weekLabel,
  type AdminOverview,
  type BookingRow,
  type ReportCategory,
  type ReportRow,
} from "@neighbourly/shared";
import { http } from "msw";
import { ctxFor, fail, findUser, newId, notify, nowIso, parseBody, requireAdmin, route } from "../context";
import { db } from "../db";
import { bookingWhen, facilityFor, findFacility } from "./booking";
import { impactFor } from "./ecofood";
import { postAgg } from "./community";
import { findReport, reportAgg } from "./towncare";

const DAY = 86_400_000;
const round1 = (n: number) => Math.round(n * 10) / 10;

const history = (r: ReportRow) =>
  db.reportHistory.filter((h) => h.reportId === r.id).sort((a, b) => a.at.localeCompare(b.at));

function overview(): AdminOverview {
  const now = Date.now();
  const within = (iso: string | null, days: number) => !!iso && now - new Date(iso).getTime() < days * DAY;
  const residents = db.users.filter((u) => u.role === "resident");
  const resolvedRecent = db.reports.filter((r) => r.resolvedAt && within(r.resolvedAt, 60));
  const avg = (rows: ReportRow[]) =>
    rows.length ? rows.reduce((s, r) => s + hoursBetween(r.createdAt, r.resolvedAt!), 0) / rows.length : 0;
  const weeks = Array.from({ length: 8 }, (_, i) => startOfWeek(now - (7 - i) * 7 * DAY).getTime());
  const inWeek = (iso: string, start: number) => {
    const t = new Date(iso).getTime();
    return t >= start && t < start + 7 * DAY;
  };
  const impact = impactFor(null);
  const residentBookings = db.bookings.filter((b) => b.kind === "resident");
  const recentBookings = residentBookings.filter((b) => within(b.createdAt, 30) && ["confirmed", "pending"].includes(b.status));

  return {
    kpis: {
      activeResidents: residents.filter((u) => u.verification === "verified" && within(u.lastActiveAt, 30)).length,
      verifiedResidents: residents.filter((u) => u.verification === "verified").length,
      pendingVerifications: db.users.filter((u) => u.verification === "pending").length,
      openReports: db.reports.filter((r) => r.status === "open").length,
      inProgressReports: db.reports.filter((r) => r.status === "in_progress").length,
      resolvedThisMonth: db.reports.filter((r) => within(r.resolvedAt, 30)).length,
      avgResolutionHours: round1(avg(resolvedRecent)),
      foodSavedKgThisMonth: impact.community.kgThisMonth,
      foodSavedKgTotal: impact.community.kgSaved,
      bookingsThisMonth: recentBookings.length,
      pendingBookings: residentBookings.filter((b) => b.status === "pending").length,
      wildlifeAlerts7d: db.reports.filter((r) => r.category === "wildlife" && within(r.createdAt, 7)).length,
      openTickets: db.tickets.filter((t) => t.status === "open").length,
    },
    reportsByWeek: weeks.map((start) => {
      const row = { week: weekLabel(start) } as AdminOverview["reportsByWeek"][number];
      for (const c of REPORT_CATEGORIES) {
        row[c] = db.reports.filter((r) => r.category === c && inWeek(r.createdAt, start)).length;
      }
      return row;
    }),
    resolutionByCategory: REPORT_CATEGORIES.map((category: ReportCategory) => {
      const rows = resolvedRecent.filter((r) => r.category === category);
      return { category, avgHours: round1(avg(rows)), resolved: rows.length };
    }),
    foodByWeek: impact.weekly,
    wildlifeByWeek: weeks.map((start) => ({
      week: weekLabel(start),
      count: db.reports.filter((r) => r.category === "wildlife" && inWeek(r.createdAt, start)).length,
    })),
    bookingsByFacility: db.facilities.map((f) => {
      const rows = recentBookings.filter((b) => b.facilityId === f.id);
      return {
        facilityId: f.id,
        name: f.name,
        bookings: rows.length,
        hours: round1(rows.reduce((s, b) => s + hoursBetween(b.start, b.end), 0)),
      };
    }),
    statusSplit: {
      open: db.reports.filter((r) => r.status === "open").length,
      in_progress: db.reports.filter((r) => r.status === "in_progress").length,
      resolved: db.reports.filter((r) => r.status === "resolved").length,
    },
  };
}

export const adminHandlers = [
  http.get("/api/admin/overview", route(({ request }) => (requireAdmin(request), overview()))),

  http.get(
    "/api/admin/reports",
    route(({ request, url }) => {
      const admin = requireAdmin(request);
      const status = url.searchParams.get("status");
      const category = url.searchParams.get("category");
      return db.reports
        .filter((r) => !status || r.status === status)
        .filter((r) => !category || r.category === category)
        .sort((a, b) => {
          const rank = (s: string) => (s === "open" ? 0 : s === "in_progress" ? 1 : 2);
          return rank(a.status) - rank(b.status) || b.createdAt.localeCompare(a.createdAt);
        })
        .map((r) => presentAdminReport(r, reportAgg(r), history(r), ctxFor(admin)));
    }),
  ),

  http.patch(
    "/api/admin/reports/:id",
    route(async ({ request, params }) => {
      const admin = requireAdmin(request);
      const row = findReport(params.id!);
      const input = await parseBody(request, UpdateReportInput);
      const now = nowIso();
      if (input.assignedTeam !== undefined) row.assignedTeam = input.assignedTeam;
      if (input.status && input.status !== row.status) {
        row.status = input.status;
        row.resolvedAt = input.status === "resolved" ? now : null;
        db.reportHistory.push({ id: newId("h"), reportId: row.id, status: input.status, note: input.note || null, changedBy: admin.id, at: now });
        const label = REPORT_STATUS_LABELS[input.status];
        const message = input.note ? input.note : input.status === "resolved" ? "Thanks for helping keep Elmina in shape." : "The team is working on it.";
        notify(row.reporterId, { type: "report_status", title: `Your report is now ${label.toLowerCase()}`, body: `${row.title}: ${message}`, link: `/towncare/${row.id}` }, "reports");
        for (const s of db.reportSupporters.filter((x) => x.reportId === row.id)) {
          notify(s.userId, { type: "report_status", title: `A report you follow is now ${label.toLowerCase()}`, body: row.title, link: `/towncare/${row.id}` }, "reports");
        }
      } else if (input.note) {
        db.reportComments.push({ id: newId("c"), reportId: row.id, authorId: admin.id, body: input.note, official: true, createdAt: now });
      }
      row.updatedAt = now;
      return presentAdminReport(row, reportAgg(row), history(row), ctxFor(admin));
    }),
  ),

  http.post(
    "/api/admin/reports/:id/reply",
    route(async ({ request, params }) => {
      const admin = requireAdmin(request);
      const row = findReport(params.id!);
      const { body } = await parseBody(request, AddCommentInput);
      db.reportComments.push({ id: newId("c"), reportId: row.id, authorId: admin.id, body, official: true, createdAt: nowIso() });
      notify(row.reporterId, { type: "report_comment", title: `Township Management replied on "${row.title}"`, body: body.slice(0, 100), link: `/towncare/${row.id}` }, "reports");
      return presentAdminReport(row, reportAgg(row), history(row), ctxFor(admin));
    }),
  ),

  http.get(
    "/api/admin/bookings",
    route(({ request, url }) => {
      const admin = requireAdmin(request);
      const view = url.searchParams.get("view") ?? "pending"; // pending | upcoming
      const now = Date.now();
      return db.bookings
        .filter((b) => (view === "pending" ? b.status === "pending" : ["confirmed", "pending"].includes(b.status) && new Date(b.end).getTime() > now))
        .sort((a, b) => a.start.localeCompare(b.start))
        .slice(0, 60)
        .map((b) => presentAdminBooking(b, facilityFor(b), ctxFor(admin)));
    }),
  ),

  ...(["approve", "reject"] as const).map((action) =>
    http.post(
      `/api/admin/bookings/:id/${action}`,
      route(async ({ request, params }) => {
        const admin = requireAdmin(request);
        const { note } = await parseBody(request, DecisionInput);
        const row = db.bookings.find((b) => b.id === params.id);
        if (!row || row.status !== "pending") fail(404, "not_found", "That request has already been handled.");
        row.status = action === "approve" ? "confirmed" : "rejected";
        row.decisionNote = note || null;
        row.updatedAt = nowIso();
        const facility = facilityFor(row);
        if (row.userId) {
          notify(
            row.userId,
            action === "approve"
              ? { type: "booking_confirmed", title: `${facility.name} booking approved`, body: `${bookingWhen(row)}${note ? `. ${note}` : ""}`, link: "/book/mine" }
              : { type: "booking_rejected", title: `${facility.name} request not approved`, body: note || "Please pick another date or contact Township Management.", link: "/book/mine" },
            "bookings",
          );
        }
        return presentAdminBooking(row, facility, ctxFor(admin));
      }),
    ),
  ),

  http.post(
    "/api/admin/maintenance",
    route(async ({ request }) => {
      const admin = requireAdmin(request);
      const input = await parseBody(request, MaintenanceBlockInput);
      const facility = findFacility(input.facilityId);
      const start = fromMyt(input.date, input.startMinutes).getTime();
      const end = start + input.durationMinutes * 60_000;
      // Resident bookings in the way are cancelled, and the residents are told why.
      for (const b of db.bookings) {
        if (b.facilityId !== facility.id || b.kind !== "resident" || !["confirmed", "pending"].includes(b.status)) continue;
        if (!overlaps(start, end, new Date(b.start).getTime(), new Date(b.end).getTime())) continue;
        b.status = "cancelled";
        b.decisionNote = `Cancelled for maintenance: ${input.reason}`;
        b.updatedAt = nowIso();
        if (b.userId) {
          notify(b.userId, { type: "booking_rejected", title: `${facility.name} booking cancelled`, body: `${bookingWhen(b)} clashes with scheduled maintenance (${input.reason}). Sorry for the inconvenience.`, link: "/book/mine" }, "bookings");
        }
      }
      const row: BookingRow = {
        id: newId("b"),
        facilityId: facility.id,
        userId: null,
        kind: "maintenance",
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        purpose: input.reason,
        attendees: 0,
        status: "confirmed",
        decisionNote: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      db.bookings.push(row);
      db.facilityUpdates.push({
        id: newId("fu"),
        facilityId: facility.id,
        title: `${facility.name}: maintenance scheduled`,
        body: `Closed on ${bookingWhen(row)} for ${input.reason.toLowerCase()}. (${formatHHMM(input.startMinutes)} start)`,
        createdAt: nowIso(),
      });
      return presentAdminBooking(row, facility, ctxFor(admin));
    }),
  ),

  http.get(
    "/api/admin/verifications",
    route(({ request }) => {
      const admin = requireAdmin(request);
      return db.users
        .filter((u) => u.verification === "pending")
        .sort((a, b) => (a.verificationRequestedAt ?? "").localeCompare(b.verificationRequestedAt ?? ""))
        .map((u) => presentVerificationRequest(u, { id: admin.id, role: admin.role }));
    }),
  ),

  ...(["approve", "reject"] as const).map((action) =>
    http.post(
      `/api/admin/verifications/:userId/${action}`,
      route(({ request, params }) => {
        const admin = requireAdmin(request);
        const user = findUser(params.userId!);
        if (!user || user.verification !== "pending") fail(404, "not_found", "That request has already been handled.");
        user.verification = action === "approve" ? "verified" : "rejected";
        notify(
          user.id,
          action === "approve"
            ? { type: "verification", title: "You're verified!", body: "Welcome to Neighbourly, City of Elmina's community app.", link: "/home" }
            : { type: "verification", title: "Verification not approved", body: "Please visit the Township Management Office with proof of residence.", link: null },
        );
        return presentVerificationRequest(user, { id: admin.id, role: admin.role });
      }),
    ),
  ),

  http.get(
    "/api/admin/tickets",
    route(({ request }) => {
      const admin = requireAdmin(request);
      return db.tickets
        .slice()
        .sort((a, b) => Number(a.status === "closed") - Number(b.status === "closed") || b.createdAt.localeCompare(a.createdAt))
        .map((t) => presentAdminTicket(t, ctxFor(admin)));
    }),
  ),

  http.post(
    "/api/admin/tickets/:id/close",
    route(({ request, params }) => {
      const admin = requireAdmin(request);
      const t = db.tickets.find((x) => x.id === params.id);
      if (!t) fail(404, "not_found", "That ticket doesn't exist.");
      t.status = "closed";
      notify(t.userId, { type: "ticket", title: `Ticket ${t.reference} closed`, body: `Township Management has closed "${t.subject}".`, link: null });
      return presentAdminTicket(t, ctxFor(admin));
    }),
  ),

  http.post(
    "/api/admin/alerts",
    route(async ({ request }) => {
      const admin = requireAdmin(request);
      const input = await parseBody(request, CreateAlertInput);
      const row = {
        id: newId("p"),
        authorId: admin.id,
        kind: "alert" as const,
        topic: "safety" as const,
        body: `${input.title}: ${input.body}`,
        neighbourhoodId: input.neighbourhoodId,
        hidden: false,
        createdAt: nowIso(),
      };
      db.posts.push(row);
      for (const u of db.users) {
        if (u.role !== "resident" || (input.neighbourhoodId && u.neighbourhoodId !== input.neighbourhoodId)) continue;
        notify(u.id, { type: "alert", title: input.title, body: input.body.slice(0, 100), link: "/home" }, "alerts");
      }
      return presentPost(row, postAgg(row), ctxFor(admin));
    }),
  ),

  ...(["hide", "unhide"] as const).map((action) =>
    http.post(
      `/api/admin/posts/:id/${action}`,
      route(({ request, params }) => {
        const admin = requireAdmin(request);
        const post = db.posts.find((p) => p.id === params.id);
        if (!post) fail(404, "not_found", "That post doesn't exist.");
        post.hidden = action === "hide";
        return presentPost(post, postAgg(post), ctxFor(admin));
      }),
    ),
  ),
];
