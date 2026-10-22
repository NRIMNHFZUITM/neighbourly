import {
  LoginInput,
  RequestApprovalInput,
  ShopApplicationInput,
  SignupInput,
  UpdateMeInput,
  VerifyUnitInput,
  presentMe,
  type DemoAccount,
  type PublicStats,
  type UserRow,
} from "@neighbourly/shared";
import { http } from "msw";
import { z } from "zod";
import { fail, newId, notify, nowIso, parseBody, requireUser, route, tokenFor, findUser } from "../context";
import { db } from "../db";

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const session = (user: UserRow) => ({ token: tokenFor(user), user: presentMe(user) });

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    userId: "u-aisyah",
    name: "Aisyah Rahman",
    role: "resident",
    headline: "Resident · Block C, Elmina Valley",
    description: "Reports issues, shares food and books the BBQ pit",
  },
  {
    userId: "u-daniel",
    name: "Daniel Lim",
    role: "resident",
    headline: "Resident · Block A, Elmina Valley",
    description: "Shares fruit from his garden and requests food",
  },
  {
    userId: "u-rotisinar",
    name: "Roti Sinar Bakery",
    role: "shop",
    headline: "Local shop · Elmina Lakeside Mall",
    description: "Posts end-of-day bread on EcoFood",
  },
  {
    userId: "u-admin",
    name: "Township Management",
    role: "admin",
    headline: "Admin · Nadia Osman",
    description: "Dashboard, report management, bookings and verifications",
  },
];

export const authHandlers = [
  http.get("/api/auth/demo-accounts", route(() => DEMO_ACCOUNTS)),

  http.post(
    "/api/auth/login",
    route(async ({ request }) => {
      const { email, password } = await parseBody(request, LoginInput);
      const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user || user.passwordHash !== (await sha256(password))) {
        fail(401, "invalid_credentials", "That email and password don't match. Demo accounts use the password demo1234.");
      }
      user.lastActiveAt = nowIso();
      return session(user);
    }),
  ),

  http.post(
    "/api/auth/demo-login",
    route(async ({ request }) => {
      const { userId } = await parseBody(request, z.object({ userId: z.string() }));
      const user = findUser(userId);
      if (!user) fail(404, "not_found", "Demo account not found. Try resetting the demo data.");
      user.lastActiveAt = nowIso();
      return session(user);
    }),
  ),

  http.post(
    "/api/auth/signup",
    route(async ({ request }) => {
      const input = await parseBody(request, SignupInput);
      if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
        fail(409, "email_taken", "An account with that email already exists. Try logging in.");
      }
      const user: UserRow = {
        id: newId("u"),
        email: input.email,
        passwordHash: await sha256(input.password),
        role: input.accountType,
        verification: "unverified",
        name: input.name,
        avatarUrl: null,
        neighbourhoodId: null,
        block: null,
        unitNo: null,
        phone: null,
        bio: "",
        interests: [],
        privacy: { showInDirectory: true, showNameOnReports: false, showNameOnClaims: false },
        notificationPrefs: { reports: true, food: true, bookings: true, community: true, alerts: true },
        onboarded: false,
        shop: null,
        verificationNote: null,
        verificationRequestedAt: null,
        createdAt: nowIso(),
        lastActiveAt: nowIso(),
      };
      db.users.push(user);
      return session(user);
    }),
  ),

  http.post(
    "/api/auth/verify-unit",
    route(async ({ request }) => {
      const user = requireUser(request, { verified: false });
      const { code } = await parseBody(request, VerifyUnitInput);
      const unit = db.units.find((u) => u.code.toUpperCase() === code.trim().toUpperCase());
      if (!unit || (unit.claimedBy && unit.claimedBy !== user.id)) {
        fail(400, "invalid_code", "That code doesn't match an unclaimed unit. Check your welcome letter, or request approval instead.");
      }
      unit.claimedBy = user.id;
      Object.assign(user, {
        verification: "verified",
        neighbourhoodId: unit.neighbourhoodId,
        block: unit.block,
        unitNo: unit.unitNo,
        verificationRequestedAt: nowIso(),
      });
      notify(user.id, {
        type: "verification",
        title: "You're verified!",
        body: "Welcome to Neighbourly. You can now report issues, share food and book facilities.",
        link: "/home",
      });
      return presentMe(user);
    }),
  ),

  http.post(
    "/api/auth/request-approval",
    route(async ({ request }) => {
      const user = requireUser(request, { verified: false });
      const input = await parseBody(request, RequestApprovalInput);
      Object.assign(user, {
        verification: "pending",
        neighbourhoodId: input.neighbourhoodId,
        block: input.block,
        unitNo: input.unitNo,
        verificationNote: input.note || null,
        verificationRequestedAt: nowIso(),
      });
      return presentMe(user);
    }),
  ),

  http.post(
    "/api/auth/shop-application",
    route(async ({ request }) => {
      const user = requireUser(request, { verified: false });
      if (user.role !== "shop") fail(400, "not_shop", "Only shop accounts can apply as a shop.");
      const { neighbourhoodId, ...shop } = await parseBody(request, ShopApplicationInput);
      Object.assign(user, {
        shop,
        neighbourhoodId,
        verification: "pending",
        verificationRequestedAt: nowIso(),
        verificationNote: `SSM ${shop.ssmNo}`,
      });
      return presentMe(user);
    }),
  ),

  http.get("/api/me", route(({ request }) => presentMe(requireUser(request, { verified: false })))),

  http.patch(
    "/api/me",
    route(async ({ request }) => {
      const user = requireUser(request, { verified: false });
      const input = await parseBody(request, UpdateMeInput);
      if (input.name !== undefined) user.name = input.name;
      if (input.bio !== undefined) user.bio = input.bio;
      if (input.phone !== undefined) user.phone = input.phone || null;
      if (input.interests) user.interests = input.interests;
      if (input.privacy) user.privacy = { ...user.privacy, ...input.privacy };
      if (input.notificationPrefs) user.notificationPrefs = { ...user.notificationPrefs, ...input.notificationPrefs };
      if (input.onboarded !== undefined) user.onboarded = input.onboarded;
      return presentMe(user);
    }),
  ),

  http.post("/api/auth/logout", route(() => ({ ok: true }))),

  http.get(
    "/api/public/stats",
    route((): PublicStats => {
      const resolved = db.reports.filter((r) => r.resolvedAt);
      const avgFixDays = resolved.length
        ? resolved.reduce((s, r) => s + (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime()), 0) /
          resolved.length /
          86_400_000
        : 0;
      return {
        residents: db.users.filter((u) => u.role === "resident" && u.verification === "verified").length,
        issuesResolved: resolved.length,
        avgFixDays: Math.round(avgFixDays * 10) / 10,
        kgFoodSaved: Math.round(db.food.filter((f) => f.status === "collected").reduce((s, f) => s + f.estWeightKg, 0)),
      };
    }),
  ),
];
