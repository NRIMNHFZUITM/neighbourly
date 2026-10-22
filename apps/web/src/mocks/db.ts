/**
 * In-browser sample database for the clickable prototype. It mirrors the planned Postgres
 * tables (packages/shared/src/rows.ts) and is saved to IndexedDB, so demo changes survive
 * a page reload. The real API replaces this once Supabase is set up.
 */
import type {
  BookingRow,
  EventRow,
  EventRsvpRow,
  FacilityRow,
  FacilityUpdateRow,
  FoodClaimRow,
  FoodListingRow,
  NotificationRow,
  PostCommentRow,
  PostLikeRow,
  PostRow,
  ReportCommentRow,
  ReportRow,
  ReportStatusRow,
  ReportSupporterRow,
  TicketRow,
  UnitRow,
  UserRow,
} from "@neighbourly/shared";
import { get, set } from "idb-keyval";
import { createSeed, SEED_VERSION } from "./seed";

export const DB_VERSION = SEED_VERSION;
const STORAGE_KEY = "neighbourly-demo-db";
const DAY_MS = 86_400_000;

export interface MockDb {
  version: number;
  seededAt: string;
  users: UserRow[];
  units: UnitRow[];
  reports: ReportRow[];
  reportHistory: ReportStatusRow[];
  reportComments: ReportCommentRow[];
  reportSupporters: ReportSupporterRow[];
  food: FoodListingRow[];
  claims: FoodClaimRow[];
  facilities: FacilityRow[];
  bookings: BookingRow[];
  facilityUpdates: FacilityUpdateRow[];
  posts: PostRow[];
  postComments: PostCommentRow[];
  postLikes: PostLikeRow[];
  events: EventRow[];
  eventRsvps: EventRsvpRow[];
  notifications: NotificationRow[];
  tickets: TicketRow[];
  /** Uploaded photos (storage path -> data URL). */
  files: Record<string, string>;
  ticketCounter: number;
}

/** Live binding: handlers always see the current database, including after a reset. */
export let db: MockDb = createSeed(new Date());

/**
 * Moves every timestamp forward by whole days since the data was seeded, so the demo always
 * looks current ("2 hours ago") and booking slots stay on the hour.
 */
function catchUp(data: MockDb, now: Date): MockDb {
  const days = Math.floor((now.getTime() - new Date(data.seededAt).getTime()) / DAY_MS);
  if (days < 1) return data;
  const shift = days * DAY_MS;
  const json = JSON.stringify(data).replace(
    /"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)"/g,
    (_, iso: string) => `"${new Date(new Date(iso).getTime() + shift).toISOString()}"`,
  );
  return JSON.parse(json) as MockDb;
}

export async function loadDb(): Promise<void> {
  let stored: MockDb | undefined;
  try {
    stored = await get<MockDb>(STORAGE_KEY);
  } catch {
    stored = undefined; // storage blocked: keep the fresh seed in memory
  }
  if (stored?.version === DB_VERSION) db = catchUp(stored, new Date());
  await saveNow();
}

async function saveNow(): Promise<void> {
  try {
    await set(STORAGE_KEY, db);
  } catch {
    // Storage unavailable (private window): changes last until the tab closes.
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
export function persist(): void {
  clearTimeout(timer);
  timer = setTimeout(() => void saveNow(), 200);
}

export async function resetDb(): Promise<void> {
  db = createSeed(new Date());
  await saveNow();
}
