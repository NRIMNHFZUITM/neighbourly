/**
 * End-to-end run of the demo script in the project plan (section 9), clicking through the
 * real UI like a judge would. Exits non-zero if any step fails.
 *
 *   npm run dev        # in one terminal
 *   npm run e2e        # in another (BASE_URL defaults to http://localhost:5173)
 */
import { chromium, expect, type Page } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";

/** Draws a stand-in "pothole" photo in the browser and returns it as PNG bytes. */
async function makePhoto(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 640;
    c.height = 420;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#6b7280";
    ctx.fillRect(0, 0, 640, 420);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(0, 300, 640, 12);
    ctx.fillStyle = "#1f2937";
    ctx.beginPath();
    ctx.ellipse(320, 200, 150, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    const blob: Blob = await new Promise((resolve) => c.toBlob((b) => resolve(b!), "image/png"));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  });
  return Buffer.from(base64, "base64");
}

let step = 0;
async function check(name: string, fn: () => Promise<void>) {
  step += 1;
  const started = Date.now();
  try {
    await fn();
    console.log(`  ✓ ${step}. ${name} (${Date.now() - started} ms)`);
  } catch (err) {
    console.log(`  ✗ ${step}. ${name}`);
    throw err;
  }
}

const ACCOUNTS = {
  aisyah: { name: /Aisyah Rahman/, id: "u-aisyah" },
  daniel: { name: /Daniel Lim/, id: "u-daniel" },
  admin: { name: /Township Management/, id: "u-admin" },
} as const;

/** Switches account through the real account menu and waits until the new session is stored. */
async function switchTo(page: Page, who: keyof typeof ACCOUNTS) {
  const { name, id } = ACCOUNTS[who];
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name }).click();
  await page.waitForFunction((userId) => localStorage.getItem("neighbourly-session")?.includes(`demo.${userId}`), id);
  await page.waitForLoadState("networkidle");
}

async function kpi(page: Page, label: string): Promise<number> {
  const text = await page.locator(`[data-stat="${label}"] [data-stat-value]`).first().innerText();
  return Number.parseFloat(text.replace(/[^\d.]/g, ""));
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const pageErrors: string[] = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
const title = `Pothole outside the Block C guardhouse ${Date.now() % 10000}`;

try {
  console.log("Demo script");
  await check("Resident logs in with one click", async () => {
    await page.goto(`${BASE}/login`);
    await page.getByRole("button", { name: /Aisyah Rahman/ }).click();
    await page.waitForURL("**/home");
    await expect(page.getByRole("heading", { name: /Aisyah/ })).toBeVisible();
  });

  let foodBefore = 0;
  await check("Note the dashboard's food-saved figure (as admin)", async () => {
    await switchTo(page, "admin");
    await page.goto(`${BASE}/admin`);
    await expect(page.getByText("Food saved, last 30 days")).toBeVisible();
    foodBefore = await kpi(page, "Food saved, last 30 days");
    await switchTo(page, "aisyah");
  });

  await check("1. Resident reports a pothole with a photo and a location", async () => {
    await page.goto(`${BASE}/towncare/new`);
    const photo = await makePhoto(page);
    await page.locator('input[type="file"]').setInputFiles({ name: "pothole.png", mimeType: "image/png", buffer: photo });
    await expect(page.getByText("Location data removed")).toBeVisible();
    await page.getByRole("button", { name: /Roads & potholes/ }).click();
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("What's happening?").fill("A deep pothole has opened up right outside the guardhouse. Motorcycles are swerving around it.");
    await page.locator(".leaflet-container").first().click({ position: { x: 200, y: 120 } });
    await page.getByRole("button", { name: "Submit report" }).click();
    await page.waitForURL(/\/towncare\/r-/);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText("Anonymous to neighbours").first()).toBeVisible();
  });

  await check("2. It shows on the map and in My reports", async () => {
    await page.goto(`${BASE}/towncare`);
    await expect(page.getByRole("link", { name: "My reports" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText(title)).toBeVisible();
    await page.goto(`${BASE}/towncare/map`);
    await expect(page.locator(`[title="${title}"]`)).toHaveCount(1);
  });

  await check("3. Admin sees it, moves it to In progress, then Resolved", async () => {
    await switchTo(page, "admin");
    await page.goto(`${BASE}/admin/reports`);
    await page.getByRole("button", { name: title }).click();
    const panel = page.getByRole("dialog");
    await expect(panel.getByText("visible to Township Management only", { exact: false })).toBeVisible();
    await expect(panel.getByText("Aisyah Rahman").first()).toBeVisible();
    await panel.getByRole("radio", { name: "In progress" }).click();
    await panel.getByLabel("Note for the reporter (optional)").fill("Contractor booked for tomorrow morning.");
    await panel.getByRole("button", { name: /Mark in progress & notify/ }).click();
    await expect(page.getByText("Reporter notified").first()).toBeVisible();
    await panel.getByRole("radio", { name: "Resolved" }).click();
    await panel.getByRole("button", { name: /Mark resolved & notify/ }).click();
    await expect(panel.getByText("Resolved").first()).toBeVisible();
    await page.keyboard.press("Escape");
  });

  await check("4. Resident gets the status update", async () => {
    await switchTo(page, "aisyah");
    await page.goto(`${BASE}/notifications`);
    await expect(page.getByText("Your report is now resolved").first()).toBeVisible();
    await page.getByText("Your report is now resolved").first().click();
    await page.waitForURL(/\/towncare\/r-/);
    await expect(page.getByText("Contractor booked for tomorrow morning.")).toBeVisible();
  });

  let listingUrl = "";
  await check("5a. Another resident posts surplus food", async () => {
    await switchTo(page, "daniel");
    await page.goto(`${BASE}/ecofood/new`);
    await page.getByLabel("What are you sharing?").fill("Fresh papayas from the garden");
    await page.getByRole("button", { name: /Fruit & vegetables/ }).click();
    await page.getByLabel("Quantity").fill("3 papayas");
    await page.getByLabel("Weight (kg)").fill("2.5");
    await page.getByRole("button", { name: /^Halal/ }).click();
    await page.getByRole("button", { name: "Post listing" }).click();
    await page.waitForURL(/\/ecofood\/f-/);
    listingUrl = page.url();
    await expect(page.getByRole("heading", { name: "Fresh papayas from the garden" })).toBeVisible();
  });

  await check("5b. A neighbour requests it", async () => {
    await switchTo(page, "aisyah");
    await page.goto(listingUrl);
    await page.getByPlaceholder(/I can come at 7 pm/).fill("Can collect after Maghrib, around 7.30 pm.");
    await page.getByRole("button", { name: "Request this food" }).click();
    await expect(page.getByText("Request sent").first()).toBeVisible();
  });

  await check("5c. The giver confirms, sees the pickup code, and marks it collected", async () => {
    await switchTo(page, "daniel");
    await page.goto(listingUrl);
    // Aisyah hasn't opted to show her name on claims, so Daniel sees her block, not her name.
    await expect(page.getByText("Resident in Block C · Elmina Valley")).toBeVisible();
    await page.getByRole("button", { name: "Confirm" }).first().click();
    await expect(page.getByText(/Their pickup code is/)).toBeVisible();
    await page.getByRole("button", { name: "Mark as collected" }).click();
    await expect(page.getByText(/kept out of landfill/)).toBeVisible();
  });

  await check("6. Dashboard shows the food saved and the report resolved", async () => {
    await switchTo(page, "admin");
    await page.goto(`${BASE}/admin`);
    await expect(page.getByText("Food saved, last 30 days")).toBeVisible();
    await expect.poll(() => kpi(page, "Food saved, last 30 days"), { timeout: 10_000 }).toBeCloseTo(foodBefore + 2.5, 0);
    await page.goto(`${BASE}/admin/reports`);
    await expect(page.getByRole("row", { name: new RegExp(title) })).toContainText("Resolved");
  });

  await check("7. Assistant answers a question about booking the hall", async () => {
    await switchTo(page, "aisyah");
    await page.goto(`${BASE}/assistant`);
    await page.getByLabel("Message the assistant").fill("How do I book the hall for a birthday party?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(/multipurpose hall/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("link", { name: /Book a facility/ }).first()).toBeVisible();
  });

  await check("8. Home shows what needs attention and what's coming up", async () => {
    await page.goto(`${BASE}/home`);
    await expect(page.getByRole("heading", { name: "For you" })).toBeVisible();
    await expect(page.getByText(/Pick up: Unopened Milo packets/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Coming up" })).toBeVisible();
  });

  await check("9. Community feed filters by topic", async () => {
    await page.goto(`${BASE}/community`);
    await page.getByRole("radio", { name: /Lost & found/ }).click();
    await expect(page.getByText(/Found a set of keys/)).toBeVisible();
    await expect(page.getByText(/Fogging is scheduled/)).toHaveCount(0);
    await page.getByRole("radio", { name: /Official/ }).click();
    await expect(page.getByText(/Fogging is scheduled/)).toBeVisible();
  });

  const eventTitle = `Durian party at the BBQ pit ${Date.now() % 10000}`;
  await check("10. Residents RSVP to and create community events (counts only)", async () => {
    await page.goto(`${BASE}/community/events`);
    const cycle = page.locator("article", { hasText: "Sunday morning cycle" });
    const goingText = async () => Number.parseInt((await cycle.getByText(/\d+ going/).innerText()).replace(/\D/g, ""), 10);
    const before = await goingText();
    await cycle.getByRole("button", { name: "I'm going" }).click();
    await expect(cycle.getByRole("button", { name: "Going" })).toBeVisible();
    await expect.poll(goingText).toBe(before + 1);
    await page.getByRole("button", { name: "Create event" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("What's happening?").fill(eventTitle);
    await dialog.getByLabel("Venue").selectOption("fac-bbq");
    await dialog.getByRole("button", { name: "Create event" }).click();
    await expect(page.locator("article", { hasText: eventTitle })).toBeVisible();
    await expect(page.locator("article", { hasText: eventTitle }).getByRole("button", { name: "Cancel event" })).toBeVisible();
  });

  await check("11. Places map pins facilities and verified shops", async () => {
    await page.goto(`${BASE}/places`);
    await expect(page.locator('[title="Elmina Valley Multipurpose Hall"]')).toHaveCount(1);
    await expect(page.locator('[title="Roti Sinar Bakery"]')).toHaveCount(1);
    // Pending shops don't appear until Township Management approves them.
    await expect(page.locator('[title="Kedai Buah Pak Mat"]')).toHaveCount(0);
    await page.locator('[title="Roti Sinar Bakery"]').click();
    await expect(page.getByRole("link", { name: "View shop" }).first()).toBeVisible();
  });

  if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(" | ")}`);
  console.log("\nAll demo steps passed.");
} catch (err) {
  console.error(err);
  await page.screenshot({ path: "demo-flow-failure.png", fullPage: true }).catch(() => undefined);
  console.error("Saved demo-flow-failure.png");
  process.exitCode = 1;
} finally {
  await browser.close();
}
