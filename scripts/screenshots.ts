/**
 * Walks the demo in a real browser and saves screenshots of every main screen, at desktop
 * and phone sizes, to /screenshots. Also reports browser errors, so it doubles as a smoke test.
 *
 *   npm run dev            # in one terminal
 *   npm run screenshots    # in another (BASE_URL defaults to http://localhost:5173)
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const OUT = process.env.SCREENSHOT_DIR ?? "screenshots";
const ONLY = process.env.ONLY; // e.g. ONLY=mobile

const errors: string[] = [];

function watch(page: Page, label: string) {
  page.on("pageerror", (err) => errors.push(`[${label}] pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/tile\.openstreetmap|favicon|ERR_INTERNET_DISCONNECTED/i.test(text)) return;
    errors.push(`[${label}] console: ${text}`);
  });
}

async function settle(page: Page, ms = 500) {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(ms);
}

async function shot(page: Page, dir: string, name: string, fullPage = true) {
  await settle(page);
  await page.screenshot({ path: join(OUT, dir, `${name}.png`), fullPage });
  console.log(`  ✓ ${dir}/${name}`);
}

async function visit(page: Page, path: string) {
  await page.goto(`${BASE}${path}`);
  await settle(page, 300);
}

async function setSession(page: Page, userId: string) {
  await page.evaluate((token) => {
    localStorage.setItem("neighbourly-session", JSON.stringify({ state: { token }, version: 0 }));
  }, `demo.${userId}`);
  await page.goto(`${BASE}/home`);
  await settle(page);
}

async function run(context: BrowserContext, dir: string) {
  mkdirSync(join(OUT, dir), { recursive: true });
  const page = await context.newPage();
  watch(page, dir);

  console.log(`\n${dir}: resident journey (Aisyah)`);
  await visit(page, "/");
  await shot(page, dir, "01-landing");
  await visit(page, "/login");
  await shot(page, dir, "02-login", false);
  await page.getByRole("button", { name: /Aisyah Rahman/ }).click();
  await page.waitForURL("**/home");
  // Weather comes from the API server (Open-Meteo), so give it a moment to arrive.
  await page.getByRole("region", { name: "Weather in City of Elmina" }).waitFor({ timeout: 10000 }).catch(() => undefined);
  await shot(page, dir, "03-home");

  await visit(page, "/towncare");
  await shot(page, dir, "04-towncare-mine");
  await visit(page, "/towncare/all");
  await shot(page, dir, "05-towncare-all");
  const reportHref = await page.locator('a[href^="/towncare/r-"]').first().getAttribute("href");

  await visit(page, "/towncare/map");
  await page.locator(".leaflet-tile-loaded").first().waitFor({ timeout: 8000 }).catch(() => undefined);
  await page.locator(".nb-pin").first().click({ force: true }).catch(() => undefined);
  await shot(page, dir, "06-towncare-map", false);

  await visit(page, "/towncare/new");
  await shot(page, dir, "07-new-report", false);

  if (reportHref) {
    await visit(page, reportHref);
    await shot(page, dir, "08-report-detail");
  }

  await visit(page, "/ecofood");
  await shot(page, dir, "09-ecofood");
  const cake = page.getByRole("link", { name: /banana cake/i }).first();
  if (await cake.count()) {
    await cake.click();
    await settle(page);
    await shot(page, dir, "10-listing-owner-view");
  }
  await visit(page, "/ecofood/impact");
  await shot(page, dir, "11-ecofood-impact");

  await visit(page, "/book");
  await shot(page, dir, "12-facilities");
  await visit(page, "/book/fac-bbq");
  await page.locator('button[aria-label*="Free"]').first().click().catch(() => undefined);
  await shot(page, dir, "13-facility-booking");
  await visit(page, "/book/mine");
  await shot(page, dir, "14-my-bookings");

  await visit(page, "/assistant");
  await page.getByRole("button", { name: "How do I book the multipurpose hall?" }).click();
  await page.waitForFunction(() => !document.querySelector('[aria-label="Assistant is typing"]'), undefined, { timeout: 20000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  await shot(page, dir, "15-assistant", false);

  await visit(page, "/community");
  await shot(page, dir, "16-community");
  await visit(page, "/community/events");
  await shot(page, dir, "17-community-events");
  await visit(page, "/community/neighbours");
  await shot(page, dir, "18-neighbours");
  await visit(page, "/places");
  await page.locator(".leaflet-tile-loaded").first().waitFor({ timeout: 8000 }).catch(() => undefined);
  await page.locator('[title="Roti Sinar Bakery"]').first().click({ force: true }).catch(() => undefined);
  await shot(page, dir, "19-places", false);
  await visit(page, "/settings");
  await shot(page, dir, "20-settings");
  await visit(page, "/notifications");
  await shot(page, dir, "21-notifications");

  console.log(`${dir}: Township Management journey`);
  await setSession(page, "u-admin");
  await visit(page, "/admin");
  await page.locator(".recharts-surface").first().waitFor({ timeout: 8000 }).catch(() => undefined);
  await shot(page, dir, "22-admin-dashboard");
  await visit(page, "/admin/reports");
  await shot(page, dir, "23-admin-reports");
  await page.locator("tbody tr").first().click();
  await page.waitForTimeout(500);
  await shot(page, dir, "24-admin-report-panel", false);
  await page.keyboard.press("Escape");
  await visit(page, "/admin/bookings");
  await shot(page, dir, "25-admin-bookings");
  await visit(page, "/admin/verifications");
  await shot(page, dir, "26-admin-verifications");
  await visit(page, "/admin/tickets");
  await shot(page, dir, "27-admin-tickets");
  await page.close();
}

const browser = await chromium.launch();
try {
  if (ONLY !== "mobile") {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await run(desktop, "desktop");
    await desktop.close();
  }
  if (ONLY !== "desktop") {
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await run(mobile, "mobile");
    await mobile.close();
  }
} finally {
  await browser.close();
}

if (errors.length) {
  console.log(`\n${errors.length} browser error(s):`);
  for (const e of [...new Set(errors)]) console.log(" -", e);
  process.exitCode = 1;
} else {
  console.log("\nNo browser errors.");
}
