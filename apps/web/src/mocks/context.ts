/** Request helpers for the in-browser sample API: auth, validation, errors and notifications. */
import {
  NEIGHBOURHOODS,
  PrivacyError,
  TOWNSHIP,
  type NotificationPrefs,
  type NotificationRow,
  type PresentContext,
  type UserRow,
} from "@neighbourly/shared";
import { HttpResponse, delay } from "msw";
import type { z } from "zod";
import { db, persist } from "./db";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function fail(status: number, code: string, message: string): never {
  throw new HttpError(status, code, message);
}

export const TOKEN_PREFIX = "demo.";
export const tokenFor = (user: UserRow) => `${TOKEN_PREFIX}${user.id}`;

export const findUser = (id: string) => db.users.find((u) => u.id === id);

export function currentUser(request: Request): UserRow | null {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token?.startsWith(TOKEN_PREFIX)) return null;
  return findUser(token.slice(TOKEN_PREFIX.length)) ?? null;
}

/** Signed-in user. By default they must also be verified (admins always pass). */
export function requireUser(request: Request, opts: { verified?: boolean } = {}): UserRow {
  const user = currentUser(request);
  if (!user) fail(401, "unauthorized", "Please log in again.");
  if (opts.verified !== false && user.role !== "admin" && user.verification !== "verified") {
    fail(403, "not_verified", "Verify your residence to use this feature.");
  }
  user.lastActiveAt = new Date().toISOString();
  return user;
}

export function requireAdmin(request: Request): UserRow {
  const user = requireUser(request);
  if (user.role !== "admin") fail(403, "forbidden", "This is only available to Township Management.");
  return user;
}

export function fileUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("/") || path.startsWith("data:")) return path;
  return db.files[path] ?? null;
}

export function ctxFor(user: UserRow): PresentContext {
  return { viewer: { id: user.id, role: user.role }, getUser: findUser, fileUrl };
}

export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    fail(400, "invalid_json", "The request body wasn't valid JSON.");
  }
  const result = schema.safeParse(json);
  if (!result.success) fail(400, "invalid_request", result.error.issues[0]?.message ?? "Invalid request");
  return result.data;
}

export const nowIso = () => new Date().toISOString();
export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

export function notify(
  userId: string,
  n: Pick<NotificationRow, "type" | "title" | "body" | "link">,
  pref?: keyof NotificationPrefs,
): void {
  const user = findUser(userId);
  if (!user) return;
  if (pref && !user.notificationPrefs[pref]) return;
  db.notifications.unshift({ id: newId("n"), userId, ...n, createdAt: nowIso(), readAt: null });
}

export function nearestNeighbourhood(point: { lat: number; lng: number }): string {
  let best: string = NEIGHBOURHOODS[0].id;
  let bestDist = Infinity;
  for (const n of NEIGHBOURHOODS) {
    const d = (n.center.lat - point.lat) ** 2 + (n.center.lng - point.lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = n.id;
    }
  }
  return best;
}

export function insideTownship(point: { lat: number; lng: number }): boolean {
  const b = TOWNSHIP.bounds;
  const pad = 0.01;
  return point.lat >= b.south - pad && point.lat <= b.north + pad && point.lng >= b.west - pad && point.lng <= b.east + pad;
}

type Params = Record<string, string>;
interface RouteArgs {
  request: Request;
  params: Params;
  url: URL;
}

/**
 * Wraps a handler with a small network delay (so loading states are visible), JSON
 * responses, error mapping and persistence after successful writes.
 */
export function route(fn: (args: RouteArgs) => unknown) {
  return async ({ request, params }: { request: Request; params: Record<string, unknown> }) => {
    await delay(120 + Math.random() * 220);
    try {
      const result = await fn({ request, params: params as Params, url: new URL(request.url) });
      if (request.method !== "GET") persist();
      if (result instanceof Response) return result;
      return HttpResponse.json(result as never);
    } catch (err) {
      if (err instanceof HttpError) {
        return HttpResponse.json({ error: err.code, message: err.message }, { status: err.status });
      }
      if (err instanceof PrivacyError) {
        return HttpResponse.json({ error: "forbidden", message: err.message }, { status: 403 });
      }
      console.error("[demo api]", err);
      return HttpResponse.json({ error: "server_error", message: "Something went wrong in the demo API." }, { status: 500 });
    }
  };
}
