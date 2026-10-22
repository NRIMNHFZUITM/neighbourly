/**
 * Sample data for City of Elmina. Neighbourhood names, Elmina Valley Central Park, Elmina
 * Lakeside Mall and the Persiaran street names are real places (OpenStreetMap). People,
 * shops, reports, listings and bookings are fictional. Timestamps are generated relative to
 * "now" so the demo always looks lived-in.
 */
import {
  addDaysToKey,
  fromMyt,
  mytDateKey,
  mytMinutesOfDay,
  overlaps,
  type BookingRow,
  type EventCategory,
  type EventRow,
  type EventRsvpRow,
  type FacilityRow,
  type FacilityUpdateRow,
  type FoodClaimRow,
  type FoodListingRow,
  type FoodType,
  type Interest,
  type NotificationRow,
  type PostCommentRow,
  type PostLikeRow,
  type PostRow,
  type PostTopic,
  type ReportCategory,
  type ReportCommentRow,
  type ReportRow,
  type ReportStatusRow,
  type ReportSupporterRow,
  type TicketRow,
  type UnitRow,
  type UserRow,
} from "@neighbourly/shared";
import type { MockDb } from "./db";

/** Bump to reseed every browser's demo data after a breaking change to the seed. */
export const SEED_VERSION = 3;
export const DEMO_PASSWORD = "demo1234";
const DEMO_PASSWORD_HASH = "0ead2060b65992dca4769af601a1b3a35ef38cfad2c2c465bb160ea764157c5d"; // sha256("demo1234")

const H = 3_600_000;
const D = 24 * H;

type Hood = "elmina-valley" | "elmina-green" | "elmina-gardens";
const CENTERS: Record<Hood, { lat: number; lng: number }> = {
  "elmina-valley": { lat: 3.1704, lng: 101.5033 },
  "elmina-green": { lat: 3.2075, lng: 101.4975 },
  "elmina-gardens": { lat: 3.1902, lng: 101.5195 },
};
const HOOD_NAMES: Record<Hood, string> = {
  "elmina-valley": "Elmina Valley",
  "elmina-green": "Elmina Green",
  "elmina-gardens": "Elmina Gardens",
};
const HOODS = Object.keys(CENTERS) as Hood[];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeed(now: Date): MockDb {
  const rand = mulberry32(20261019);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
  const between = (a: number, b: number) => a + rand() * (b - a);
  const int = (a: number, b: number) => Math.floor(between(a, b + 1));
  const sample = <T>(arr: readonly T[], n: number): T[] => [...arr].sort(() => rand() - 0.5).slice(0, n);

  const nowMs = now.getTime();
  const iso = (ms: number) => new Date(ms).toISOString();
  const ago = (ms: number) => iso(nowMs - ms);
  const today = mytDateKey(now);
  /** A Malaysia-time clock time on a day relative to today. */
  const onDay = (dayOffset: number, hour: number, minute = 0) => fromMyt(addDaysToKey(today, dayOffset), hour * 60 + minute).getTime();
  const jitter = (c: { lat: number; lng: number }, spread = 0.0035) => ({
    lat: +(c.lat + between(-spread, spread)).toFixed(5),
    lng: +(c.lng + between(-spread, spread)).toFixed(5),
  });

  let seq = 0;
  const nid = (prefix: string) => `${prefix}-${(++seq).toString(36).padStart(3, "0")}`;
  const phone = () => `01${int(0, 9)}-${int(100, 999)} ${int(1000, 9999)}`;
  const pickupCode = () => String(int(1000, 9999));

  // ------------------------------------------------------------------ people
  const prefsAll = { reports: true, food: true, bookings: true, community: true, alerts: true };
  const resident = (
    id: string,
    name: string,
    hood: Hood,
    block: string,
    unit: number,
    extra: Partial<UserRow> = {},
  ): UserRow => ({
    id,
    email: `${id.replace(/^u-/, "")}@neighbourly.demo`,
    passwordHash: DEMO_PASSWORD_HASH,
    role: "resident",
    verification: "verified",
    name,
    avatarUrl: null,
    neighbourhoodId: hood,
    block,
    unitNo: `${block}-${String(unit).padStart(2, "0")}`,
    phone: phone(),
    bio: "",
    interests: [],
    privacy: { showInDirectory: true, showNameOnReports: false, showNameOnClaims: false },
    notificationPrefs: { ...prefsAll },
    onboarded: true,
    shop: null,
    verificationNote: null,
    verificationRequestedAt: null,
    createdAt: ago(int(45, 420) * D),
    lastActiveAt: ago(between(0.1, 12) * D),
    ...extra,
  });

  const users: UserRow[] = [
    resident("u-aisyah", "Aisyah Rahman", "elmina-valley", "C", 12, {
      bio: "Mum of two. Loves baking and the Saturday morning park runs at Central Park.",
      interests: ["food", "kids", "safety"],
      createdAt: ago(210 * D),
      lastActiveAt: ago(5 * 60_000),
    }),
    resident("u-daniel", "Daniel Lim", "elmina-valley", "A", 7, {
      bio: "Weekend cyclist. Happy to share extra fruit from the rambutan tree.",
      interests: ["fitness", "food", "gardening"],
      privacy: { showInDirectory: true, showNameOnReports: false, showNameOnClaims: true },
    }),
    resident("u-priya", "Priya Nair", "elmina-gardens", "B", 21, {
      bio: "Community garden volunteer. Ask me about composting!",
      interests: ["gardening", "volunteering", "food"],
      privacy: { showInDirectory: true, showNameOnReports: true, showNameOnClaims: true },
    }),
    resident("u-farid", "Farid Hassan", "elmina-valley", "B", 3, {
      bio: "Neighbourhood watch volunteer for Block B.",
      interests: ["safety", "wildlife"],
    }),
    resident("u-meiling", "Tan Mei Ling", "elmina-gardens", "E", 15, {
      bio: "Two kids, one very energetic dog.",
      interests: ["kids", "pets", "food"],
    }),
    resident("u-arjun", "Arjun Subramaniam", "elmina-valley", "E", 9, {
      bio: "Runs a free beginners' yoga session on Wednesdays.",
      interests: ["fitness", "volunteering"],
    }),
    resident("u-siti", "Siti Aminah Yusof", "elmina-green", "C", 2, {
      bio: "Retired teacher. Always cooking too much for kenduri!",
      interests: ["food", "gardening"],
    }),
    resident("u-kevin", "Kevin Ong", "elmina-gardens", "A", 11, {
      bio: "Dog dad. Software engineer working from home.",
      interests: ["pets", "fitness"],
    }),
    resident("u-lakshmi", "Lakshmi Devi", "elmina-valley", "D", 18, {
      bio: "Organising a charity bake sale for the animal shelter.",
      interests: ["food", "kids", "volunteering"],
      privacy: { showInDirectory: true, showNameOnReports: true, showNameOnClaims: false },
    }),
    resident("u-amirul", "Amirul Hakim", "elmina-gardens", "C", 7, {
      bio: "Birdwatcher. Spotted 40 species around the Central Park lake so far.",
      interests: ["wildlife", "volunteering"],
    }),
    resident("u-grace", "Grace Chong", "elmina-green", "B", 14, {
      bio: "Cat mum to Mochi and Kopi.",
      interests: ["pets", "kids"],
    }),
    resident("u-rizal", "Rizal Azman", "elmina-valley", "F", 5, { interests: ["safety", "fitness"] }),
    resident("u-jessica", "Jessica Wong", "elmina-green", "E", 20, {
      bio: "Balcony gardener. Too many chilli plants.",
      interests: ["food", "gardening"],
    }),
    resident("u-muthu", "Muthu Krishnan", "elmina-gardens", "D", 6, { interests: ["volunteering", "safety"] }),
    // Waiting for admin approval (shows up in the verification queue)
    resident("u-hannah", "Nur Hannah Zulkifli", "elmina-green", "A", 9, {
      verification: "pending",
      verificationRequestedAt: ago(5 * H),
      verificationNote: "Moved in last week and still waiting for my welcome letter.",
      onboarded: false,
      createdAt: ago(6 * H),
    }),
    resident("u-benjamin", "Benjamin Teoh", "elmina-gardens", "F", 2, {
      verification: "pending",
      verificationRequestedAt: ago(26 * H),
      verificationNote: "Tenant. I can show my tenancy agreement at the management office.",
      onboarded: false,
      createdAt: ago(27 * H),
    }),
  ];

  const extraNames = [
    "Ahmad Faizal", "Nurul Ain Ismail", "Wong Kar Yee", "Ravi Shankar", "Siti Nadhirah", "Lim Jia Hui",
    "Haziq Azhar", "Kavitha Raj", "Ong Wei Jie", "Farah Nabila", "Suresh Kumar", "Chua Mei Xin",
    "Iman Syahirah", "Danial Haikal", "Tan Chee Keong", "Meena Pillai", "Aiman Hakimi", "Yap Shu Ting",
    "Zulkifli Omar", "Deepa Menon", "Ho Jun Wei", "Alya Maisarah", "Vikram Raj", "Ng Siew Lan",
    "Syafiq Rosli", "Revathi Devi", "Chong Kah Mun", "Balqis Humaira", "Goh Teck Seng", "Haris Iskandar",
  ];
  const interestPool: Interest[] = ["food", "safety", "kids", "wildlife", "fitness", "gardening", "pets", "volunteering"];
  extraNames.forEach((name, i) => {
    const hood = pick(HOODS);
    users.push(
      resident(`u-r${String(i + 1).padStart(2, "0")}`, name, hood, pick(["A", "B", "C", "D", "E", "F"]), int(1, 24), {
        interests: sample(interestPool, int(1, 3)),
        privacy: { showInDirectory: rand() < 0.65, showNameOnReports: rand() < 0.15, showNameOnClaims: rand() < 0.3 },
        lastActiveAt: ago((rand() < 0.85 ? between(0.2, 25) : between(35, 90)) * D),
      }),
    );
  });

  const shop = (
    id: string,
    owner: string,
    hood: Hood,
    shopInfo: NonNullable<UserRow["shop"]>,
    extra: Partial<UserRow> = {},
  ): UserRow => ({
    ...resident(id, owner, hood, "A", 1),
    role: "shop",
    block: null,
    unitNo: null,
    shop: shopInfo,
    bio: "",
    interests: ["food"],
    ...extra,
  });

  users.push(
    shop("u-rotisinar", "Faizal Rahim", "elmina-valley", {
      shopName: "Roti Sinar Bakery",
      category: "Bakery",
      halal: "halal",
      openingHours: "7:00 am – 9:00 pm daily",
      address: "Elmina Lakeside Mall, Persiaran Garcinia",
      ssmNo: "202301045512",
      location: { lat: 3.1813, lng: 101.5101 },
    }, { bio: "Fresh bread every morning. We share what's left every evening at 8:30 pm." }),
    shop("u-greenbowl", "Chloe Lau", "elmina-gardens", {
      shopName: "Green Bowl Café",
      category: "Vegetarian café",
      halal: "halal",
      openingHours: "8:00 am – 6:00 pm, closed Mondays",
      address: "Elmina Gardens shoplots",
      ssmNo: "202201078834",
      location: { lat: 3.1912, lng: 101.5176 },
    }, { bio: "Plant-based bowls and curries made with local produce." }),
    shop("u-ahseng", "Lee Ah Seng", "elmina-green", {
      shopName: "Ah Seng Kopitiam",
      category: "Coffee shop",
      halal: "non_halal",
      openingHours: "6:30 am – 3:00 pm daily",
      address: "Elmina Green commercial row",
      ssmNo: "201901023377",
      location: { lat: 3.2052, lng: 101.4996 },
    }, { bio: "Kopi, kaya toast and char siu buns since 2019." }),
    shop("u-pakmat", "Mohd Rahmat", "elmina-valley", {
      shopName: "Kedai Buah Pak Mat",
      category: "Fruit stall",
      halal: "halal",
      openingHours: "9:00 am – 7:00 pm, weekends",
      address: "Elmina Valley weekend market",
      ssmNo: "202601009876",
      location: { lat: 3.173, lng: 101.5065 },
    }, {
      verification: "pending",
      verificationRequestedAt: ago(3 * H),
      verificationNote: "Weekend fruit stall. Would like to share unsold fruit on Sunday evenings.",
      onboarded: false,
      createdAt: ago(4 * H),
    }),
  );

  users.push({
    ...resident("u-admin", "Nadia Osman", "elmina-valley", "A", 1),
    role: "admin",
    neighbourhoodId: null,
    block: null,
    unitNo: null,
    bio: "Township Manager, City of Elmina",
    privacy: { showInDirectory: false, showNameOnReports: true, showNameOnClaims: true },
    email: "nadia@neighbourly.demo",
    lastActiveAt: ago(20 * 60_000),
  });

  const residents = users.filter((u) => u.role === "resident" && u.verification === "verified");
  const residentsIn = (hood: Hood) => residents.filter((u) => u.neighbourhoodId === hood);
  const shops = users.filter((u) => u.role === "shop" && u.verification === "verified");

  // ------------------------------------------------------------------ verification codes
  const units: UnitRow[] = users
    .filter((u) => u.role === "resident" && u.verification === "verified")
    .map((u) => ({
      code: `ELM-${u.neighbourhoodId!.slice(7, 8).toUpperCase()}${u.unitNo!.replace("-", "")}-${int(1000, 9999)}`,
      neighbourhoodId: u.neighbourhoodId!,
      block: u.block!,
      unitNo: u.unitNo!,
      claimedBy: u.id,
    }));
  // Unclaimed codes for live sign-up demos (shown as hints on the verify page)
  units.push(
    { code: "ELM-VC14-4821", neighbourhoodId: "elmina-valley", block: "C", unitNo: "C-14", claimedBy: null },
    { code: "ELM-GA03-7702", neighbourhoodId: "elmina-green", block: "A", unitNo: "A-03", claimedBy: null },
    { code: "ELM-DE10-3315", neighbourhoodId: "elmina-gardens", block: "E", unitNo: "E-10", claimedBy: null },
  );

  // ------------------------------------------------------------------ TownCare
  const reports: ReportRow[] = [];
  const reportHistory: ReportStatusRow[] = [];
  const reportComments: ReportCommentRow[] = [];
  const reportSupporters: ReportSupporterRow[] = [];

  const progressNotes: Record<ReportCategory, string> = {
    roads: "Assigned to Roads & Drainage. Contractor scheduled to patch it this week.",
    streetlights: "Electrical team will replace the lamp on their next round.",
    parks: "Landscape team has been notified and will inspect.",
    cleanliness: "Cleaning crew dispatched.",
    wildlife: "Wildlife & Safety team informed. Patrols increased in the area.",
    other: "Facilities team will inspect and follow up.",
  };
  const resolvedNotes: Record<ReportCategory, string> = {
    roads: "Pothole patched and road surface levelled.",
    streetlights: "Lamp replaced and tested.",
    parks: "Repaired. Thanks for reporting!",
    cleanliness: "Area cleared and bins emptied.",
    wildlife: "Area checked and secured. Residents reminded to keep bin lids closed.",
    other: "Fixed by the Facilities team. Thanks for letting us know!",
  };
  const teams: Record<ReportCategory, string> = {
    roads: "Roads & Drainage",
    streetlights: "Electrical",
    parks: "Landscape",
    cleanliness: "Cleaning",
    wildlife: "Wildlife & Safety",
    other: "Facilities",
  };

  interface ReportSpec {
    reporter: string;
    title: string;
    description: string;
    category: ReportCategory;
    hood: Hood;
    location: { lat: number; lng: number };
    label: string;
    createdMs: number;
    progressMs?: number;
    resolvedMs?: number;
    showName?: boolean;
    supporters?: number;
  }

  const addReport = (s: ReportSpec): ReportRow => {
    const id = nid("r");
    const status = s.resolvedMs ? "resolved" : s.progressMs ? "in_progress" : "open";
    const row: ReportRow = {
      id,
      reporterId: s.reporter,
      title: s.title,
      description: s.description,
      category: s.category,
      status,
      photoPath: null,
      location: s.location,
      locationLabel: s.label,
      neighbourhoodId: s.hood,
      showName: s.showName ?? false,
      assignedTeam: s.progressMs || s.resolvedMs ? teams[s.category] : null,
      createdAt: iso(s.createdMs),
      updatedAt: iso(s.resolvedMs ?? s.progressMs ?? s.createdMs),
      resolvedAt: s.resolvedMs ? iso(s.resolvedMs) : null,
    };
    reports.push(row);
    reportHistory.push({ id: nid("h"), reportId: id, status: "open", note: null, changedBy: s.reporter, at: row.createdAt });
    if (s.progressMs) {
      reportHistory.push({ id: nid("h"), reportId: id, status: "in_progress", note: progressNotes[s.category], changedBy: "u-admin", at: iso(s.progressMs) });
    }
    if (s.resolvedMs) {
      reportHistory.push({ id: nid("h"), reportId: id, status: "resolved", note: resolvedNotes[s.category], changedBy: "u-admin", at: iso(s.resolvedMs) });
    }
    const pool = residentsIn(s.hood).filter((u) => u.id !== s.reporter);
    for (const u of sample(pool, Math.min(pool.length, s.supporters ?? int(0, 4)))) {
      reportSupporters.push({ reportId: id, userId: u.id, createdAt: iso(s.createdMs + between(0.5, 30) * H) });
    }
    return row;
  };

  const pothole = addReport({
    reporter: "u-farid",
    title: "Deep pothole at the Persiaran Elmina junction",
    description: "Big pothole on the left lane just before the junction into Elmina Valley 4. Cars are swerving to avoid it, which is dangerous in the evening.",
    category: "roads",
    hood: "elmina-valley",
    location: { lat: 3.1697, lng: 101.5003 },
    label: "Persiaran Elmina, near Elmina Valley 4",
    createdMs: nowMs - 3 * D,
    progressMs: nowMs - 2 * D,
    supporters: 9,
  });
  addReport({
    reporter: "u-rizal",
    title: "Streetlight out along Persiaran Dillenia",
    description: "Two lamps in a row are not working. The stretch is completely dark after 8 pm.",
    category: "streetlights",
    hood: "elmina-valley",
    location: { lat: 3.19, lng: 101.5051 },
    label: "Persiaran Dillenia",
    createdMs: nowMs - 26 * H,
    supporters: 5,
  });
  const monkeys = addReport({
    reporter: "u-farid",
    title: "Monkeys raiding bins behind Block B",
    description: "A group of about six macaques tore open rubbish bags behind Block B this morning. One got onto a porch.",
    category: "wildlife",
    hood: "elmina-valley",
    location: { lat: 3.1712, lng: 101.5021 },
    label: "Behind Block B, Elmina Valley",
    createdMs: nowMs - 6 * H,
    supporters: 4,
  });
  const snake = addReport({
    reporter: "u-grace",
    title: "Snake spotted near the Elmina Green playground",
    description: "About 1.5 m long, dark colour, went into the bushes beside the slide. Kids were playing nearby.",
    category: "wildlife",
    hood: "elmina-green",
    location: { lat: 3.2069, lng: 101.4968 },
    label: "Elmina Green playground",
    createdMs: nowMs - 30 * H,
    progressMs: nowMs - 28 * H,
    supporters: 3,
  });
  addReport({
    reporter: "u-lakshmi",
    title: "Broken swing at the Central Park playground",
    description: "One of the swing chains has snapped and the seat is hanging at an angle.",
    category: "parks",
    hood: "elmina-valley",
    location: { lat: 3.1795, lng: 101.515 },
    label: "Elmina Valley Central Park playground",
    createdMs: nowMs - 12 * D,
    progressMs: nowMs - 11 * D,
    resolvedMs: nowMs - 9 * D,
    showName: true,
    supporters: 6,
  });
  addReport({
    reporter: "u-r04",
    title: "Overflowing bins near Elmina Lakeside Mall",
    description: "The public bins by the bus stop are overflowing and rubbish is blowing onto the road.",
    category: "cleanliness",
    hood: "elmina-valley",
    location: { lat: 3.1812, lng: 101.5105 },
    label: "Bus stop, Elmina Lakeside Mall",
    createdMs: nowMs - 6 * D,
    progressMs: nowMs - 6 * D + 4 * H,
    resolvedMs: nowMs - 5 * D,
  });
  addReport({
    reporter: "u-muthu",
    title: "Clogged drain after heavy rain",
    description: "Water pooled on the road for hours after yesterday's storm. The drain grate is blocked with leaves and plastic.",
    category: "cleanliness",
    hood: "elmina-gardens",
    location: { lat: 3.1908, lng: 101.5201 },
    label: "Near Block D, Elmina Gardens",
    createdMs: nowMs - 4 * D,
    progressMs: nowMs - 3 * D,
    supporters: 4,
  });
  addReport({
    reporter: "u-arjun",
    title: "Fallen branch blocking the jogging track",
    description: "A large branch came down across the track on the lake side. People are walking on the grass to get around it.",
    category: "parks",
    hood: "elmina-valley",
    location: { lat: 3.1784, lng: 101.517 },
    label: "Central Park jogging track",
    createdMs: nowMs - 9 * D,
    progressMs: nowMs - 9 * D + 2 * H,
    resolvedMs: nowMs - 9 * D + 7 * H,
  });
  addReport({
    reporter: "u-kevin",
    title: "Faded zebra crossing near the Gardens clubhouse",
    description: "The zebra crossing paint has almost completely worn off. Drivers don't slow down for pedestrians.",
    category: "roads",
    hood: "elmina-gardens",
    location: { lat: 3.1915, lng: 101.5188 },
    label: "Elmina Gardens clubhouse",
    createdMs: nowMs - 2 * D,
    supporters: 3,
  });
  addReport({
    reporter: "u-r07",
    title: "Flickering streetlight in the Block E lane",
    description: "The lamp outside Block E flickers on and off all night.",
    category: "streetlights",
    hood: "elmina-valley",
    location: { lat: 3.1716, lng: 101.5047 },
    label: "Block E lane, Elmina Valley",
    createdMs: nowMs - 15 * D,
    progressMs: nowMs - 14 * D,
    resolvedMs: nowMs - 13 * D,
  });
  addReport({
    reporter: "u-amirul",
    title: "Monitor lizard in the roadside drain",
    description: "A large monitor lizard has been sitting in the drain beside Block C for two days.",
    category: "wildlife",
    hood: "elmina-gardens",
    location: { lat: 3.1897, lng: 101.5212 },
    label: "Block C, Elmina Gardens",
    createdMs: nowMs - 20 * D,
    progressMs: nowMs - 20 * D + 3 * H,
    resolvedMs: nowMs - 19 * D,
  });
  addReport({
    reporter: "u-jessica",
    title: "Renovation debris dumped by the roadside",
    description: "Bags of broken tiles and cement have been left at the corner since the weekend.",
    category: "cleanliness",
    hood: "elmina-green",
    location: { lat: 3.2081, lng: 101.4983 },
    label: "Corner of Block E, Elmina Green",
    createdMs: nowMs - 20 * H,
    supporters: 2,
  });
  addReport({
    reporter: "u-siti",
    title: "Uneven paving on the Elmina Green walkway",
    description: "Several paving blocks have lifted. An elderly neighbour tripped last week.",
    category: "roads",
    hood: "elmina-green",
    location: { lat: 3.2059, lng: 101.4979 },
    label: "Elmina Green walkway",
    createdMs: nowMs - 5 * D,
    supporters: 3,
  });
  addReport({
    reporter: "u-r02",
    title: "Guardhouse barrier gate keeps getting stuck",
    description: "The barrier at the Elmina Valley guardhouse jams halfway up every few cars, causing a queue onto Persiaran Elmina in the morning rush.",
    category: "other",
    hood: "elmina-valley",
    location: { lat: 3.1689, lng: 101.5018 },
    label: "Elmina Valley guardhouse",
    createdMs: nowMs - 2 * D - 5 * H,
    supporters: 6,
  });
  addReport({
    reporter: "u-r12",
    title: "Wild boar seen near the forest-edge fence",
    description: "A wild boar with two young was walking along the fence at dusk.",
    category: "wildlife",
    hood: "elmina-green",
    location: { lat: 3.2098, lng: 101.4952 },
    label: "Forest edge, Elmina Green",
    createdMs: nowMs - 25 * D,
    progressMs: nowMs - 25 * D + 2 * H,
    resolvedMs: nowMs - 24 * D,
  });
  // Aisyah's own reports, so "My reports" tells a story
  addReport({
    reporter: "u-aisyah",
    title: "Street lamp out in front of Block C",
    description: "The lamp right outside Block C has been off for three nights. It's very dark walking back from the bus stop.",
    category: "streetlights",
    hood: "elmina-valley",
    location: { lat: 3.1708, lng: 101.504 },
    label: "In front of Block C, Elmina Valley",
    createdMs: nowMs - 18 * D,
    progressMs: nowMs - 17 * D,
    resolvedMs: nowMs - 15 * D,
    supporters: 4,
  });
  const slide = addReport({
    reporter: "u-aisyah",
    title: "Playground slide has a sharp broken edge",
    description: "The plastic edge at the bottom of the slide has cracked and is sharp. My daughter scratched her leg on it.",
    category: "parks",
    hood: "elmina-valley",
    location: { lat: 3.1701, lng: 101.5051 },
    label: "Block C playground, Elmina Valley",
    createdMs: nowMs - 5 * D,
    progressMs: nowMs - 4 * D,
    supporters: 3,
  });

  // History for the dashboard charts: eight weeks of reports, mostly resolved
  const templates: Record<ReportCategory, string[]> = {
    roads: ["Pothole near Block {b}", "Cracked road surface near Block {b}", "Sunken manhole cover by Block {b}", "Faded road markings near Block {b}"],
    streetlights: ["Streetlight out near Block {b}", "Flickering lamp by Block {b}", "Two lamps off in the Block {b} lane"],
    parks: ["Broken bench at the Block {b} park", "Overgrown grass at the Block {b} playground", "Loose paving on the Block {b} park path"],
    cleanliness: ["Overflowing bin at Block {b}", "Rubbish dumped near Block {b}", "Clogged drain beside Block {b}"],
    wildlife: ["Monkeys near the Block {b} bins", "Snake sighting near Block {b}", "Monitor lizard in the drain at Block {b}"],
    other: ["Broken barrier gate at the Block {b} entrance", "Damaged signboard near Block {b}", "Faulty CCTV camera at the Block {b} guardhouse"],
  };
  const resolveHours: Record<ReportCategory, [number, number]> = {
    roads: [48, 190],
    streetlights: [20, 80],
    parks: [30, 140],
    cleanliness: [6, 40],
    wildlife: [3, 24],
    other: [24, 120],
  };
  const weighted: ReportCategory[] = ["roads", "roads", "streetlights", "streetlights", "cleanliness", "cleanliness", "cleanliness", "parks", "parks", "wildlife", "other"];
  for (let i = 0; i < 34; i++) {
    const category = pick(weighted);
    const hood = pick(HOODS);
    const block = pick(["A", "B", "C", "D", "E", "F"]);
    const created = nowMs - between(7, 56) * D;
    const [lo, hi] = resolveHours[category];
    const resolveAfter = between(lo, hi) * H;
    const stillOpen = rand() < 0.08;
    addReport({
      reporter: pick(residentsIn(hood)).id,
      title: pick(templates[category]).replace("{b}", block),
      description: "Reported via TownCare.",
      category,
      hood,
      location: jitter(CENTERS[hood]),
      label: `Near Block ${block}, ${HOOD_NAMES[hood]}`,
      createdMs: created,
      progressMs: created + Math.min(resolveAfter * 0.3, 20 * H),
      resolvedMs: stillOpen ? undefined : Math.min(created + resolveAfter, nowMs - H),
    });
  }

  reportComments.push(
    { id: nid("c"), reportId: pothole.id, authorId: "u-r03", body: "Almost damaged my tyre on it this morning. Please fix soon!", official: false, createdAt: ago(2.6 * D) },
    { id: nid("c"), reportId: pothole.id, authorId: "u-admin", body: "Thanks everyone. Our contractor will patch this on Thursday morning. Please slow down near the junction until then.", official: true, createdAt: ago(2 * D) },
    { id: nid("c"), reportId: monkeys.id, authorId: "u-r01", body: "Saw them again at 7 am. They tore open three bags.", official: false, createdAt: ago(4 * H) },
    { id: nid("c"), reportId: snake.id, authorId: "u-admin", body: "Bomba has been informed and the playground is temporarily cordoned off. We'll update once it's cleared.", official: true, createdAt: ago(27 * H) },
    { id: nid("c"), reportId: slide.id, authorId: "u-admin", body: "The replacement part has been ordered. Meanwhile we've taped off the slide.", official: true, createdAt: ago(3.5 * D) },
  );

  // ------------------------------------------------------------------ EcoFood
  const food: FoodListingRow[] = [];
  const claims: FoodClaimRow[] = [];

  /** Pickup windows that start soon, but not in the middle of the night. */
  const nextHour = Math.ceil(nowMs / H) * H;
  const hourNow = mytMinutesOfDay(nextHour) / 60;
  const pickupBase = hourNow >= 21 ? onDay(1, 9) : hourNow < 7 ? onDay(0, 9) : nextHour;
  const windowAt = (offsetH: number, durH: number) => {
    const start = pickupBase + offsetH * H;
    return { pickupStart: iso(start), pickupEnd: iso(start + durH * H), expiresAt: iso(start + (durH + 4) * H) };
  };

  type ListingSpec = Omit<FoodListingRow, "id" | "location" | "neighbourhoodId" | "photoPath" | "collectedAt" | "status" | "description" | "priceNote"> &
    Partial<Pick<FoodListingRow, "status" | "description" | "priceNote" | "location">>;
  const addListing = (s: ListingSpec): FoodListingRow => {
    const owner = users.find((u) => u.id === s.ownerId)!;
    const hood = (owner.neighbourhoodId ?? "elmina-valley") as Hood;
    const row: FoodListingRow = {
      description: "",
      priceNote: owner.role === "shop" ? "Free" : null,
      status: "available",
      location: jitter(CENTERS[hood], 0.0015),
      ...s,
      id: nid("f"),
      neighbourhoodId: hood,
      photoPath: null,
      collectedAt: null,
    };
    food.push(row);
    return row;
  };
  const addClaim = (listing: FoodListingRow, claimerId: string, status: FoodClaimRow["status"], createdMs: number, note: string | null = null) => {
    const claimer = users.find((u) => u.id === claimerId)!;
    const row: FoodClaimRow = {
      id: nid("cl"),
      listingId: listing.id,
      claimerId,
      status,
      note,
      showName: claimer.privacy.showNameOnClaims,
      pickupCode: pickupCode(),
      createdAt: iso(createdMs),
      updatedAt: iso(createdMs),
    };
    claims.push(row);
    return row;
  };

  const rambutan = addListing({
    ownerId: "u-daniel",
    title: "Rambutans from my tree",
    description: "Freshly picked this morning, sweet and juicy. Bring your own bag!",
    foodType: "produce",
    quantity: "About 2 kg",
    estWeightKg: 2,
    halal: "halal",
    dietaryTags: ["vegan"],
    pickupPoint: "Block A guardhouse, Elmina Valley",
    ...windowAt(1, 3),
    createdAt: ago(2 * H),
  });
  addClaim(rambutan, "u-kevin", "requested", nowMs - 50 * 60_000, "Could pick up after work at 6:30?");

  addListing({
    ownerId: "u-rotisinar",
    title: "End-of-day bread & buns",
    description: "Today's unsold loaves and buns. Still soft. Perfect for tomorrow's breakfast.",
    foodType: "bakery",
    quantity: "10 loaves + 12 buns",
    estWeightKg: 4.5,
    halal: "halal",
    dietaryTags: ["contains_gluten", "contains_dairy", "contains_egg"],
    pickupPoint: "Roti Sinar counter, Elmina Lakeside Mall",
    location: { lat: 3.1813, lng: 101.5101 },
    ...windowAt(3, 1),
    createdAt: ago(40 * 60_000),
  });
  addListing({
    ownerId: "u-siti",
    title: "Nasi lemak from a kenduri (6 packs)",
    description: "Extra packs from this morning's kenduri, with sambal, egg and peanuts. Kept chilled.",
    foodType: "cooked",
    quantity: "6 packs",
    estWeightKg: 2.4,
    halal: "halal",
    dietaryTags: ["contains_egg", "contains_nuts", "contains_seafood"],
    pickupPoint: "Block C lobby, Elmina Green",
    ...windowAt(0, 2),
    createdAt: ago(75 * 60_000),
  });
  addListing({
    ownerId: "u-greenbowl",
    title: "Vegetable curry & rice (8 portions)",
    description: "Mild vegetable curry with brown rice, packed in recyclable boxes.",
    foodType: "cooked",
    quantity: "8 portions",
    estWeightKg: 3.2,
    halal: "halal",
    dietaryTags: ["vegetarian"],
    pickupPoint: "Green Bowl Café, Elmina Gardens shoplots",
    priceNote: "RM 3 per portion (usually RM 12)",
    ...windowAt(1, 2),
    createdAt: ago(30 * 60_000),
  });
  addListing({
    ownerId: "u-ahseng",
    title: "Char siu buns (non-halal)",
    description: "Steamed this morning. Reheat for 5 minutes.",
    foodType: "bakery",
    quantity: "15 buns",
    estWeightKg: 1.5,
    halal: "non_halal",
    dietaryTags: ["contains_gluten"],
    pickupPoint: "Ah Seng Kopitiam counter",
    ...windowAt(0, 3),
    createdAt: ago(3 * H),
  });
  addListing({
    ownerId: "u-priya",
    title: "Homegrown kangkung & chillies",
    description: "From the community garden plot. Washed and bundled.",
    foodType: "produce",
    quantity: "5 bundles",
    estWeightKg: 0.8,
    halal: "halal",
    dietaryTags: ["vegan"],
    pickupPoint: "Community garden gate, Elmina Gardens",
    ...windowAt(2, 4),
    createdAt: ago(5 * H),
  });
  const milo = addListing({
    ownerId: "u-lakshmi",
    title: "Unopened Milo packets & biscuits",
    description: "Sealed and within expiry. We bought too much for the bake sale.",
    foodType: "groceries",
    quantity: "6 packets + 3 tins",
    estWeightKg: 1.6,
    halal: "halal",
    dietaryTags: ["contains_dairy", "contains_gluten"],
    pickupPoint: "Block D guardhouse, Elmina Valley",
    status: "reserved",
    ...windowAt(1, 4),
    createdAt: ago(6 * H),
  });
  const miloClaim = addClaim(milo, "u-aisyah", "confirmed", nowMs - 4 * H, "Thank you! I can come by after school pickup.");
  miloClaim.pickupCode = "2914";
  addListing({
    ownerId: "u-kevin",
    title: "Tray of eggs (best before Friday)",
    description: "30 eggs, we're travelling and won't finish them.",
    foodType: "groceries",
    quantity: "30 eggs",
    estWeightKg: 1.8,
    halal: "halal",
    dietaryTags: ["contains_egg"],
    pickupPoint: "Block A lobby, Elmina Gardens",
    ...windowAt(2, 3),
    createdAt: ago(8 * H),
  });
  const cake = addListing({
    ownerId: "u-aisyah",
    title: "Homemade banana cake (half)",
    description: "Baked yesterday, moist and fresh. Too much for our family of four!",
    foodType: "bakery",
    quantity: "Half a cake (about 8 slices)",
    estWeightKg: 0.6,
    halal: "halal",
    dietaryTags: ["contains_egg", "contains_dairy", "contains_gluten"],
    pickupPoint: "Block C guardhouse, Elmina Valley",
    ...windowAt(1, 3),
    createdAt: ago(90 * 60_000),
  });
  addClaim(cake, "u-daniel", "requested", nowMs - 55 * 60_000, "My kids love banana cake! Can collect at 7 pm.");
  addClaim(cake, "u-farid", "requested", nowMs - 35 * 60_000, null);
  addListing({
    ownerId: "u-jessica",
    title: "Mandarin oranges",
    description: "A whole box from a relative. Sweet and seedless.",
    foodType: "produce",
    quantity: "About 20 oranges",
    estWeightKg: 2.5,
    halal: "halal",
    dietaryTags: ["vegan"],
    pickupPoint: "Block E guardhouse, Elmina Green",
    ...windowAt(0, 4),
    createdAt: ago(4 * H),
  });
  addListing({
    ownerId: "u-r09",
    title: "Leftover party sandwiches",
    description: "Tuna and egg sandwiches from yesterday's party.",
    foodType: "cooked",
    quantity: "1 tray",
    estWeightKg: 1.2,
    halal: "halal",
    dietaryTags: ["contains_egg", "contains_seafood", "contains_gluten"],
    pickupPoint: "Block B lobby",
    status: "expired",
    pickupStart: ago(28 * H),
    pickupEnd: ago(26 * H),
    expiresAt: ago(24 * H),
    createdAt: ago(30 * H),
  });

  // Eight weeks of collected listings for the impact charts
  const residentTitles: Array<[string, FoodType, number]> = [
    ["Fried rice (4 portions)", "cooked", 1.6],
    ["Bananas from our tree", "produce", 2.2],
    ["Homemade kuih", "bakery", 0.8],
    ["Instant noodle packets", "groceries", 1.0],
    ["Mangoes", "produce", 2.5],
    ["Curry chicken (family portion)", "cooked", 1.8],
    ["Unopened bread loaf", "bakery", 0.6],
    ["Oranges", "produce", 1.7],
    ["Vegetable soup", "cooked", 1.4],
    ["Sealed biscuit tins", "groceries", 1.2],
    ["Papaya", "produce", 1.5],
    ["Leftover party sandwiches", "cooked", 1.1],
  ];
  const shopTitles: Record<string, Array<[string, FoodType, number]>> = {
    "u-rotisinar": [["End-of-day bread & buns", "bakery", 4.2], ["Pastries and croissants", "bakery", 2.4], ["Sandwich loaves", "bakery", 3.1]],
    "u-greenbowl": [["Vegetable curry portions", "cooked", 3.0], ["Salad bowls", "produce", 2.1], ["Lentil soup", "cooked", 2.6]],
    "u-ahseng": [["Kaya toast sets", "bakery", 1.8], ["Char siu buns", "bakery", 1.5], ["Steamed buns", "bakery", 1.7]],
  };
  for (let i = 0; i < 62; i++) {
    const fromShop = rand() < 0.38;
    const owner = fromShop ? pick(shops) : pick(residents);
    const [title, foodType, baseKg] = fromShop ? pick(shopTitles[owner.id]!) : pick(residentTitles);
    const created = nowMs - between(1.2, 56) * D;
    const listing = addListing({
      ownerId: owner.id,
      title,
      foodType,
      quantity: fromShop ? "Assorted" : "Family portion",
      estWeightKg: +(baseKg * between(0.7, 1.4)).toFixed(1),
      halal: owner.shop?.halal ?? (rand() < 0.88 ? "halal" : "non_halal"),
      dietaryTags: [],
      pickupPoint: fromShop ? `${owner.shop!.shopName} counter` : `Block ${owner.block} guardhouse`,
      status: "collected",
      pickupStart: iso(created + 1 * H),
      pickupEnd: iso(created + 3 * H),
      expiresAt: iso(created + 6 * H),
      createdAt: iso(created),
    });
    listing.collectedAt = iso(created + between(1.2, 2.8) * H);
    const claimer = pick(residents.filter((u) => u.id !== owner.id));
    addClaim(listing, claimer.id, "collected", created + 0.5 * H);
  }

  // ------------------------------------------------------------------ facilities & bookings
  const facilities: FacilityRow[] = [
    {
      id: "fac-hall",
      name: "Elmina Valley Multipurpose Hall",
      type: "hall",
      description: "Air-conditioned hall for celebrations, community events and classes. Includes a kitchenette and PA system.",
      photoPath: "/images/facilities/hall.jpg",
      photoCredit: "“Jementah Multipurpose Hall” by Chongkian, CC BY-SA 4.0, via Wikimedia Commons (cropped)",
      capacity: 150,
      neighbourhoodId: "elmina-valley",
      locationLabel: "Elmina Valley Community Centre",
      location: { lat: 3.1722, lng: 101.5058 },
      rules: [
        "Events must end and the hall must be cleared by 11:00 pm.",
        "No nails, staples or glitter on walls and ceilings.",
        "Amplified music until 10:00 pm.",
        "The person who booked must be present throughout.",
      ],
      amenities: ["Air-conditioning", "PA system", "Tables & chairs for 150", "Kitchenette", "Accessible toilets"],
      openMinutes: 8 * 60,
      closeMinutes: 23 * 60,
      slotMinutes: 60,
      maxDurationMinutes: 6 * 60,
      advanceDays: 30,
      requiresApproval: true,
      active: true,
    },
    {
      id: "fac-gym",
      name: "Gym & Fitness Studio",
      type: "gym",
      description: "Studio with mirrors, mats and free weights at the Elmina Green Clubhouse. Book it for group classes or private sessions.",
      photoPath: "/images/facilities/gym.jpg",
      photoCredit: "“Interior of new modern gym with equipment” by Shixart1985, CC BY 2.0, via Wikimedia Commons (cropped)",
      capacity: 15,
      neighbourhoodId: "elmina-green",
      locationLabel: "Elmina Green Clubhouse",
      location: { lat: 3.2063, lng: 101.4991 },
      rules: [
        "Proper sports attire and closed shoes.",
        "Under-16s must be accompanied by an adult.",
        "Wipe down equipment and re-rack weights.",
      ],
      amenities: ["Treadmills", "Free weights", "Yoga mats", "Sound system", "Water dispenser"],
      openMinutes: 6 * 60,
      closeMinutes: 22 * 60,
      slotMinutes: 60,
      maxDurationMinutes: 2 * 60,
      advanceDays: 14,
      requiresApproval: false,
      active: true,
    },
    {
      id: "fac-bbq",
      name: "Central Park BBQ Pit",
      type: "bbq",
      description: "Covered BBQ area beside the lake at Elmina Valley Central Park, with two charcoal grills and seating for 30.",
      photoPath: "/images/facilities/bbq.jpg",
      photoCredit: "“Barbecue pits in Changi Point park 2015” by Apetrov09703, CC BY-SA 4.0, via Wikimedia Commons (cropped)",
      capacity: 30,
      neighbourhoodId: "elmina-valley",
      locationLabel: "Elmina Valley Central Park",
      location: { lat: 3.1789, lng: 101.5139 },
      rules: [
        "Use the BBQ pit only. No open fires elsewhere in the park.",
        "Bring your own charcoal and make sure the fire is out before you leave.",
        "Keep children away from lit grills.",
        "Clear food scraps promptly. Monkeys are attracted to leftovers.",
      ],
      amenities: ["2 charcoal grills", "Covered seating for 30", "Sink & water point", "Lighting until 11 pm"],
      openMinutes: 10 * 60,
      closeMinutes: 23 * 60,
      slotMinutes: 60,
      maxDurationMinutes: 4 * 60,
      advanceDays: 14,
      requiresApproval: false,
      active: true,
    },
    {
      id: "fac-meeting",
      name: "Elmina Gardens Meeting Room",
      type: "meeting_room",
      description: "Quiet room for residents' meetings, tuition and small workshops.",
      photoPath: "/images/facilities/meeting-room.jpg",
      photoCredit: "“Large meeting room” by Breather, CC0, via Wikimedia Commons",
      capacity: 12,
      neighbourhoodId: "elmina-gardens",
      locationLabel: "Elmina Gardens Clubhouse",
      location: { lat: 3.1893, lng: 101.5183 },
      rules: ["No cooking; light snacks are fine.", "Return furniture to the original layout."],
      amenities: ["TV screen with HDMI", "Whiteboard", "Wi-Fi", "Seats 12"],
      openMinutes: 9 * 60,
      closeMinutes: 22 * 60,
      slotMinutes: 60,
      maxDurationMinutes: 3 * 60,
      advanceDays: 14,
      requiresApproval: false,
      active: true,
    },
  ];

  const bookings: BookingRow[] = [];
  const fits = (facilityId: string, start: number, end: number) =>
    !bookings.some(
      (b) =>
        b.facilityId === facilityId &&
        (b.status === "confirmed" || b.status === "pending") &&
        overlaps(start, end, new Date(b.start).getTime(), new Date(b.end).getTime()),
    );
  const addBooking = (
    facilityId: string,
    userId: string | null,
    dayOffset: number,
    startHour: number,
    hours: number,
    purpose: string,
    attendees: number,
    status: BookingRow["status"],
    kind: BookingRow["kind"] = "resident",
    createdMs?: number,
  ): BookingRow | null => {
    const start = onDay(dayOffset, startHour);
    const end = start + hours * H;
    if (!fits(facilityId, start, end)) return null;
    const created = createdMs ?? Math.min(start - between(1, 6) * D, nowMs - H);
    const row: BookingRow = {
      id: nid("b"),
      facilityId,
      userId,
      kind,
      start: iso(start),
      end: iso(end),
      purpose,
      attendees,
      status,
      decisionNote: null,
      createdAt: iso(created),
      updatedAt: iso(created),
    };
    bookings.push(row);
    return row;
  };

  const weekday = new Date(onDay(0, 12) + 8 * H).getUTCDay(); // 0 = Sunday, in Malaysia time
  const daysToSaturday = ((6 - weekday + 7) % 7) || 7;

  // Curated upcoming bookings for the demo
  addBooking("fac-bbq", "u-aisyah", daysToSaturday, 18, 3, "Family BBQ with neighbours from Block C", 14, "confirmed", "resident", nowMs - 26 * H);
  addBooking("fac-meeting", "u-aisyah", 4, 20, 1, "Block C parents' book club", 8, "confirmed", "resident", nowMs - 2 * D);
  addBooking("fac-hall", "u-daniel", daysToSaturday + 1, 11, 4, "My son's 7th birthday party", 60, "pending", "resident", nowMs - 9 * H);
  addBooking("fac-hall", "u-priya", 9, 9, 3, "Elmina Gardens residents' association AGM", 80, "pending", "resident", nowMs - 20 * H);
  addBooking("fac-hall", "u-lakshmi", 12, 14, 4, "Charity bake sale for the animal shelter", 100, "pending", "resident", nowMs - 3 * H);
  const maintenance = addBooking("fac-bbq", null, 3, 10, 3, "Grill cleaning & servicing", 0, "confirmed", "maintenance", nowMs - D);
  addBooking("fac-gym", "u-arjun", 2, 7, 1, "Beginners' yoga (free, all welcome)", 12, "confirmed");
  addBooking("fac-hall", "u-admin", 10, 10, 2, "Fire safety talk with Bomba (township event)", 120, "confirmed", "resident", nowMs - 4 * D);

  const purposes: Record<string, string[]> = {
    "fac-hall": ["Birthday party", "Aqiqah ceremony", "Residents' meeting", "Wedding reception", "Kids' art class", "Badminton practice"],
    "fac-gym": ["Personal training", "Group workout", "Yoga session", "Zumba class", "HIIT circuit"],
    "fac-bbq": ["Family BBQ", "Friends' gathering", "Birthday BBQ", "Office team BBQ", "Reunion dinner"],
    "fac-meeting": ["Book club", "Tuition session", "Residents' committee", "Online interview", "Craft workshop"],
  };
  for (let day = -30; day <= 13; day++) {
    for (const f of facilities) {
      const dow = (weekday + day + 70) % 7;
      const weekend = dow === 0 || dow === 6;
      const p = { "fac-hall": 0.3, "fac-gym": 0.7, "fac-bbq": weekend ? 0.85 : 0.3, "fac-meeting": 0.45 }[f.id]! * (day > 0 ? 0.55 : 1);
      const count = rand() < p ? (f.id === "fac-gym" && rand() < 0.5 ? 2 : 1) : 0;
      for (let k = 0; k < count; k++) {
        const maxSlots = f.maxDurationMinutes / 60;
        const hours = int(1, Math.min(3, maxSlots));
        const startHour = int(f.openMinutes / 60, f.closeMinutes / 60 - hours);
        if (day === 0 && onDay(0, startHour) < nowMs) continue;
        addBooking(
          f.id,
          pick(residents).id,
          day,
          startHour,
          hours,
          pick(purposes[f.id]!),
          int(4, Math.min(f.capacity, 60)),
          "confirmed",
        );
      }
    }
  }

  const facilityUpdates: FacilityUpdateRow[] = maintenance
    ? [
        {
          id: nid("fu"),
          facilityId: "fac-bbq",
          title: "BBQ pit closed for servicing",
          body: "The Central Park BBQ Pit is closed 10:00 am – 1:00 pm for grill cleaning and servicing. Bookings resume after.",
          createdAt: ago(D),
        },
      ]
    : [];

  // ------------------------------------------------------------------ community
  const posts: PostRow[] = [];
  const postComments: PostCommentRow[] = [];
  const postLikes: PostLikeRow[] = [];
  const addPost = (authorId: string, body: string, createdMs: number, topic: PostTopic, opts: Partial<PostRow> = {}, likes = int(0, 9)) => {
    const row: PostRow = {
      id: nid("p"),
      authorId,
      kind: "post",
      topic,
      body,
      neighbourhoodId: null,
      hidden: false,
      createdAt: iso(createdMs),
      ...opts,
    };
    posts.push(row);
    for (const u of sample(residents.filter((r) => r.id !== authorId), likes)) postLikes.push({ postId: row.id, userId: u.id });
    return row;
  };

  addPost("u-admin", "Wildlife alert: monkey activity around Block B, Elmina Valley. Please keep bin lids closed, don't leave food outside, and never feed the monkeys. 🐒", nowMs - 5 * H, "safety", { kind: "alert", neighbourhoodId: "elmina-valley" }, 6);
  addPost("u-admin", "Fogging is scheduled in Elmina Valley this Thursday, 7–9 am. Please keep windows closed and cover any water containers. Thank you for helping keep Elmina dengue-free. 🦟", nowMs - 20 * H, "safety", { kind: "announcement" }, 11);
  const gotong = addPost("u-priya", "Gotong-royong at the community garden this Saturday, 8 am! Gloves, tools and cold drinks provided. Kids welcome 🌱", nowMs - 2 * D, "activities", {}, 14);
  const lostCat = addPost("u-grace", "Lost cat: Mochi, an orange tabby with a blue collar. Last seen near Block B, Elmina Green yesterday evening. Please comment here if you see her 🙏", nowMs - 22 * H, "lost_found", { neighbourhoodId: "elmina-green" }, 9);
  addPost("u-daniel", "Anyone up for a Sunday morning cycle around Central Park? Meeting at the lake at 7 am, easy pace 🚲", nowMs - 3 * D, "activities", {}, 5);
  addPost("u-aisyah", "Big thank you to the team who fixed the streetlight outside Block C so quickly. Walking back from the bus stop at night feels so much safer now! 💡", nowMs - 14 * D, "general", { neighbourhoodId: "elmina-valley" }, 12);
  addPost("u-kevin", "Found a set of keys with a blue keychain near the Gardens clubhouse. I've left them with the guard.", nowMs - 4 * D, "lost_found", {}, 3);
  const swim = addPost("u-meiling", "Can anyone recommend a swimming coach for kids (6 and 9) around Elmina?", nowMs - 6 * D, "recommendations", {}, 2);
  addPost("u-siti", "Giving away about 20 children's books (ages 5–8), all in good condition. Comment if you'd like them!", nowMs - 2.5 * D, "giveaways", {}, 7);
  addPost("u-rotisinar", "We now post our end-of-day bread on EcoFood every evening at 8:30 pm. Thank you for helping us waste less! 🥖", nowMs - 5 * D, "general", {}, 16);
  addPost("u-arjun", "Free beginners' yoga at the Gym & Fitness Studio this week, 7 am. Bring a mat if you have one 🧘", nowMs - 1.2 * D, "activities", {}, 6);
  addPost("u-rizal", "Heads up: someone was trying car door handles at the Block F parking around 2 am. Nothing taken, but please lock up and keep valuables out of sight. Guards have been told. 🚗", nowMs - 9 * H, "safety", { neighbourhoodId: "elmina-valley" }, 8);
  const aircon = addPost("u-r05", "Any recommendations for a reliable aircon servicing person around Elmina? Ours is leaking again 😓", nowMs - 1.6 * D, "recommendations", {}, 3);
  addPost("u-meiling", "Free to a good home: baby cot with mattress and a foldable stroller. Both clean and working. Pick up from Block E, Elmina Gardens.", nowMs - 3.5 * D, "giveaways", { neighbourhoodId: "elmina-gardens" }, 4);

  postComments.push(
    { id: nid("pc"), postId: gotong.id, authorId: "u-amirul", body: "Count me in! I'll bring some seedlings.", createdAt: ago(1.8 * D) },
    { id: nid("pc"), postId: gotong.id, authorId: "u-lakshmi", body: "We'll come with the kids 😊", createdAt: ago(1.5 * D) },
    { id: nid("pc"), postId: gotong.id, authorId: "u-r02", body: "What time does it end?", createdAt: ago(1.1 * D) },
    { id: nid("pc"), postId: lostCat.id, authorId: "u-jessica", body: "I think I saw an orange cat near the Block C bins this morning!", createdAt: ago(10 * H) },
    { id: nid("pc"), postId: swim.id, authorId: "u-kevin", body: "Coach Amir at the Shah Alam aquatic centre is great with kids.", createdAt: ago(5 * D) },
    { id: nid("pc"), postId: aircon.id, authorId: "u-daniel", body: "We use Cool Breeze Services, they come within the week and the price is fair.", createdAt: ago(1.2 * D) },
  );

  // ------------------------------------------------------------------ community events
  const events: EventRow[] = [];
  const eventRsvps: EventRsvpRow[] = [];
  const facilityById = (id: string) => facilities.find((f) => f.id === id)!;
  interface EventSpec {
    organizer: string;
    title: string;
    description: string;
    category: EventCategory;
    day: number;
    start: [number, number];
    end: [number, number];
    place: { label: string; location: { lat: number; lng: number } } | { facilityId: string };
    hood?: Hood;
    going: number;
    /** Residents who RSVP'd for sure (the demo accounts). */
    with?: string[];
    createdDaysAgo?: number;
  }
  const addEvent = (s: EventSpec): EventRow => {
    const facility = "facilityId" in s.place ? facilityById(s.place.facilityId) : null;
    const row: EventRow = {
      id: nid("e"),
      organizerId: s.organizer,
      title: s.title,
      description: s.description,
      category: s.category,
      startsAt: iso(onDay(s.day, ...s.start)),
      endsAt: iso(onDay(s.day, ...s.end)),
      locationLabel: facility ? `${facility.name}, ${facility.locationLabel}` : (s.place as { label: string }).label,
      location: facility ? { ...facility.location } : (s.place as { location: { lat: number; lng: number } }).location,
      facilityId: facility?.id ?? null,
      neighbourhoodId: s.hood ?? null,
      createdAt: ago((s.createdDaysAgo ?? between(1, 6)) * D),
    };
    events.push(row);
    const pool = (s.hood ? residentsIn(s.hood) : residents).filter((u) => u.id !== s.organizer && !s.with?.includes(u.id));
    const going = [...(s.with ?? []), ...sample(pool, Math.max(0, s.going - (s.with?.length ?? 0))).map((u) => u.id)];
    for (const userId of going) eventRsvps.push({ eventId: row.id, userId, createdAt: iso(new Date(row.createdAt).getTime() + between(1, 20) * H) });
    return row;
  };

  addEvent({
    organizer: "u-priya",
    title: "Gotong-royong at the community garden",
    description: "Help weed, plant and mulch the garden beds. Gloves, tools and cold drinks provided. Kids welcome!",
    category: "nature",
    day: daysToSaturday,
    start: [8, 0],
    end: [11, 0],
    place: { label: "Community garden, Elmina Gardens", location: { lat: 3.1921, lng: 101.5207 } },
    going: 18,
    with: ["u-aisyah", "u-amirul", "u-lakshmi"],
    createdDaysAgo: 2,
  });
  addEvent({
    organizer: "u-arjun",
    title: "Beginners' yoga (free)",
    description: "A gentle, all-levels session to start the day. Bring a mat if you have one; spare mats are available.",
    category: "sports",
    day: 2,
    start: [7, 0],
    end: [8, 0],
    place: { facilityId: "fac-gym" },
    going: 9,
    createdDaysAgo: 1.2,
  });
  addEvent({
    organizer: "u-daniel",
    title: "Sunday morning cycle",
    description: "An easy-paced 15 km loop around Central Park and Elmina Valley. Helmets required, all bikes welcome.",
    category: "sports",
    day: daysToSaturday + 1,
    start: [7, 0],
    end: [9, 0],
    place: { label: "Central Park lake, Elmina Valley", location: { lat: 3.1789, lng: 101.515 } },
    going: 7,
    createdDaysAgo: 3,
  });
  addEvent({
    organizer: "u-amirul",
    title: "Bird walk around the lake",
    description: "Spot kingfishers, herons and bulbuls around the Central Park lake. Binoculars to share, beginners welcome.",
    category: "nature",
    day: 5,
    start: [7, 30],
    end: [9, 30],
    place: { label: "Lake viewing deck, Elmina Valley Central Park", location: { lat: 3.1801, lng: 101.5162 } },
    going: 6,
  });
  addEvent({
    organizer: "u-siti",
    title: "Kids' storytelling & book swap",
    description: "Stories in English and Bahasa Melayu for ages 4–8, then swap a book you've finished for one you haven't.",
    category: "kids",
    day: 6,
    start: [16, 0],
    end: [17, 30],
    place: { label: "Elmina Green Clubhouse lobby", location: { lat: 3.2061, lng: 101.4994 } },
    going: 11,
  });
  addEvent({
    organizer: "u-farid",
    title: "Neighbourhood watch briefing",
    description: "Meet the Block B volunteers, hear about the new patrol rota and share any safety concerns.",
    category: "community",
    day: 4,
    start: [20, 30],
    end: [21, 30],
    place: { label: "Elmina Valley Community Centre", location: { lat: 3.1724, lng: 101.5055 } },
    hood: "elmina-valley",
    going: 8,
  });
  addEvent({
    organizer: "u-admin",
    title: "Township recycling drive",
    description: "Bring paper, cardboard, plastics, cans, old electronics and used cooking oil. Sorted on site with our recycling partner.",
    category: "community",
    day: daysToSaturday + 7,
    start: [9, 0],
    end: [12, 0],
    place: { label: "Elmina Valley Community Centre car park", location: { lat: 3.1727, lng: 101.5064 } },
    going: 23,
  });
  addEvent({
    organizer: "u-admin",
    title: "Fire safety talk with Bomba",
    description: "Home fire safety, how to use an extinguisher and what to do in an emergency. Free extinguisher checks for residents.",
    category: "learning",
    day: 10,
    start: [10, 0],
    end: [12, 0],
    place: { facilityId: "fac-hall" },
    going: 31,
    createdDaysAgo: 4,
  });
  addEvent({
    organizer: "u-lakshmi",
    title: "Charity bake sale for the animal shelter",
    description: "Cakes, cookies and kuih baked by neighbours. All proceeds go to the local animal shelter.",
    category: "food",
    day: 12,
    start: [14, 0],
    end: [18, 0],
    place: { facilityId: "fac-hall" },
    going: 27,
    with: ["u-aisyah"],
  });
  addEvent({
    organizer: "u-priya",
    title: "Elmina Gardens residents' AGM",
    description: "Annual general meeting of the Elmina Gardens Residents' Association. The agenda will be shared a week before.",
    category: "community",
    day: 9,
    start: [9, 0],
    end: [12, 0],
    place: { facilityId: "fac-hall" },
    hood: "elmina-gardens",
    going: 21,
  });
  addEvent({
    organizer: "u-aisyah",
    title: "Saturday park run (5 km)",
    description: "Two laps of the Central Park jogging track at your own pace. Walkers, prams and kids all welcome!",
    category: "sports",
    day: daysToSaturday + 7,
    start: [7, 0],
    end: [8, 0],
    place: { label: "Central Park jogging track", location: { lat: 3.1784, lng: 101.517 } },
    going: 12,
    createdDaysAgo: 1,
  });

  // ------------------------------------------------------------------ notifications & tickets
  const notifications: NotificationRow[] = [];
  const notify = (userId: string, n: Omit<NotificationRow, "id" | "userId" | "readAt">, read = false) =>
    notifications.push({ id: nid("n"), userId, ...n, readAt: read ? n.createdAt : null });

  notify("u-aisyah", { type: "food_request", title: "New request for your banana cake", body: "Daniel Lim would like to pick it up.", link: `/ecofood/${cake.id}`, createdAt: ago(55 * 60_000) });
  notify("u-aisyah", { type: "food_confirmed", title: "Lakshmi Devi confirmed your request", body: "Unopened Milo packets & biscuits are reserved for you. Pickup code 2914.", link: `/ecofood/${milo.id}`, createdAt: ago(4 * H) });
  notify("u-aisyah", { type: "alert", title: "Wildlife alert near you", body: "Monkeys raiding bins behind Block B, Elmina Valley.", link: `/towncare/${monkeys.id}`, createdAt: ago(6 * H) });
  notify("u-aisyah", { type: "booking_confirmed", title: "BBQ pit booking confirmed", body: "Central Park BBQ Pit is booked for your family BBQ.", link: "/book/mine", createdAt: ago(26 * H) }, true);
  notify("u-aisyah", { type: "report_status", title: "Your report is in progress", body: "Playground slide has a sharp broken edge: the Landscape team is on it.", link: `/towncare/${slide.id}`, createdAt: ago(4 * D) }, true);
  notify("u-daniel", { type: "booking_confirmed", title: "Hall request received", body: "Township Management will review your request for the multipurpose hall.", link: "/book/mine", createdAt: ago(9 * H) }, true);

  const tickets: TicketRow[] = [
    {
      id: nid("t"),
      reference: "NB-1041",
      userId: "u-farid",
      subject: "Request for speed bumps behind Block B",
      body: "Cars speed along the road behind Block B in the evenings when children are playing. Could the township add speed bumps?",
      source: "app",
      status: "open",
      createdAt: ago(2 * D),
    },
    {
      id: nid("t"),
      reference: "NB-1042",
      userId: "u-meiling",
      subject: "Can I bring my own caterer to the hall?",
      body: "Asked the assistant, which suggested a ticket. We're planning a birthday party and want to use our own caterer.",
      source: "assistant",
      status: "open",
      createdAt: ago(5 * H),
    },
  ];

  return {
    version: SEED_VERSION,
    seededAt: now.toISOString(),
    users,
    units,
    reports,
    reportHistory,
    reportComments,
    reportSupporters,
    food,
    claims,
    facilities,
    bookings,
    facilityUpdates,
    posts,
    postComments,
    postLikes,
    events,
    eventRsvps,
    notifications,
    tickets,
    files: {},
    ticketCounter: 1042,
  };
}
