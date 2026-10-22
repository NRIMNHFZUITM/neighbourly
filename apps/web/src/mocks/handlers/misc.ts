import { CreateTicketInput, presentNotification, presentTicket } from "@neighbourly/shared";
import { HttpResponse, http } from "msw";
import { z } from "zod";
import { fail, newId, notify, nowIso, parseBody, requireUser, route } from "../context";
import { db, resetDb } from "../db";

const UploadRequest = z.object({
  contentType: z.string(),
  size: z.number().int().positive(),
  purpose: z.enum(["report", "food"]),
});

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export const miscHandlers = [
  http.get(
    "/api/notifications",
    route(({ request }) => {
      const user = requireUser(request, { verified: false });
      const mine = db.notifications.filter((n) => n.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { items: mine.slice(0, 50).map(presentNotification), unread: mine.filter((n) => !n.readAt).length };
    }),
  ),

  http.post(
    "/api/notifications/read-all",
    route(({ request }) => {
      const user = requireUser(request, { verified: false });
      const now = nowIso();
      for (const n of db.notifications) if (n.userId === user.id && !n.readAt) n.readAt = now;
      return { ok: true };
    }),
  ),

  http.post(
    "/api/notifications/:id/read",
    route(({ request, params }) => {
      const user = requireUser(request, { verified: false });
      const n = db.notifications.find((x) => x.id === params.id && x.userId === user.id);
      if (n && !n.readAt) n.readAt = nowIso();
      return { ok: true };
    }),
  ),

  // Signed upload URL, like Supabase Storage's createSignedUploadUrl
  http.post(
    "/api/uploads",
    route(async ({ request }) => {
      requireUser(request);
      const input = await parseBody(request, UploadRequest);
      if (!input.contentType.startsWith("image/")) fail(400, "bad_type", "Only images can be uploaded.");
      if (input.size > 5 * 1024 * 1024) fail(400, "too_large", "Photos must be under 5 MB after resizing.");
      const path = `${input.purpose}s/${crypto.randomUUID()}.jpg`;
      return { uploadUrl: `/mock-storage/${path}?token=${crypto.randomUUID()}`, path };
    }),
  ),

  http.put("/mock-storage/*", async ({ request }) => {
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname.replace(/^\/mock-storage\//, ""));
    if (!url.searchParams.get("token")) return new HttpResponse(null, { status: 403 });
    const blob = await request.blob();
    db.files[path] = await blobToDataUrl(new Blob([blob], { type: request.headers.get("content-type") ?? "image/jpeg" }));
    return new HttpResponse(null, { status: 200 });
  }),

  http.post(
    "/api/support-tickets",
    route(async ({ request }) => {
      const user = requireUser(request);
      const input = await parseBody(request, CreateTicketInput);
      db.ticketCounter += 1;
      const row = {
        id: newId("t"),
        reference: `NB-${db.ticketCounter}`,
        userId: user.id,
        subject: input.subject,
        body: input.body,
        source: input.source,
        status: "open" as const,
        createdAt: nowIso(),
      };
      db.tickets.push(row);
      notify(user.id, {
        type: "ticket",
        title: `Ticket ${row.reference} received`,
        body: `Township Management will follow up on "${row.subject}".`,
        link: null,
      });
      return presentTicket(row);
    }),
  ),

  http.get(
    "/api/support-tickets/mine",
    route(({ request }) => {
      const user = requireUser(request);
      return db.tickets
        .filter((t) => t.userId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(presentTicket);
    }),
  ),

  http.post(
    "/api/demo/reset",
    route(async () => {
      await resetDb();
      return { ok: true };
    }),
  ),
];
