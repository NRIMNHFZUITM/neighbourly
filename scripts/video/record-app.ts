/**
 * Records the app demo clips (desktop and phone) by driving the real app, with a visible
 * cursor and tap ripples. Needs `npm run dev` running. Clip lengths follow the narration.
 *
 *   FFMPEG=… npx tsx scripts/video/record-app.ts [clipId…]
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type BrowserContext, type Locator, type Page } from "playwright";
import { VIDEO_DIR, WORK, audioDurations, capture, ensureDir, sleep } from "./lib";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const CLIPS = ensureDir(join(WORK, "clips"));
const only = new Set(process.argv.slice(2));
const audio = audioDurations();
/** A clip is at least as long as its narration plus a short pause. */
const target = (id: string, extra = 1.2) => (audio[id] ?? 6) + extra;

// ---------------------------------------------------------------- page helpers

const OVERLAY = (touch: boolean) => `(() => {
  const TOUCH = ${touch};
  function ripple(x, y) {
    const r = document.createElement('div');
    r.style.cssText = 'position:fixed;left:' + (x - 24) + 'px;top:' + (y - 24) + 'px;width:48px;height:48px;border-radius:50%;' +
      'background:rgba(215,25,32,.22);border:2px solid rgba(215,25,32,.75);z-index:2147483646;pointer-events:none;' +
      'transform:scale(.35);opacity:1;transition:transform .5s ease-out,opacity .5s ease-out';
    document.documentElement.appendChild(r);
    requestAnimationFrame(() => { r.style.transform = 'scale(1.5)'; r.style.opacity = '0'; });
    setTimeout(() => r.remove(), 650);
  }
  function install() {
    if (document.getElementById('__cursor')) return;
    if (!TOUCH) {
      const c = document.createElement('div');
      c.id = '__cursor';
      c.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M5 3l14 8.2-6.2 1.6L10 19z" fill="#121212" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
      c.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transform:translate(' + (window.__cx ?? 640) + 'px,' + (window.__cy ?? 420) + 'px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))';
      document.documentElement.appendChild(c);
      addEventListener('mousemove', (e) => { window.__cx = e.clientX - 5; window.__cy = e.clientY - 3; c.style.transform = 'translate(' + window.__cx + 'px,' + window.__cy + 'px)'; }, true);
      addEventListener('mousedown', (e) => ripple(e.clientX, e.clientY), true);
    } else {
      addEventListener('pointerdown', (e) => ripple(e.clientX, e.clientY), true);
    }
    // No scrollbars in the recording.
    const st = document.createElement('style');
    st.textContent = '::-webkit-scrollbar{display:none} html{scrollbar-width:none}';
    document.documentElement.appendChild(st);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();`;

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const pos = new WeakMap<Page, { x: number; y: number }>();

async function moveTo(page: Page, x: number, y: number, ms = 650) {
  const from = pos.get(page) ?? { x: 640, y: 420 };
  const steps = Math.max(6, Math.round(ms / 16));
  for (let i = 1; i <= steps; i++) {
    const k = ease(i / steps);
    await page.mouse.move(from.x + (x - from.x) * k, from.y + (y - from.y) * k);
    await sleep(ms / steps);
  }
  pos.set(page, { x, y });
}

async function center(l: Locator) {
  await l.scrollIntoViewIfNeeded();
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Moves the visible cursor to an element and clicks it (desktop). */
async function click(page: Page, l: Locator, ms = 650) {
  const c = await center(l);
  await moveTo(page, c.x, c.y, ms);
  await sleep(120);
  await page.mouse.down();
  await sleep(70);
  await page.mouse.up();
  await sleep(250);
}

async function hover(page: Page, l: Locator, ms = 600) {
  const c = await center(l);
  await moveTo(page, c.x, c.y, ms);
}

async function type(page: Page, l: Locator, text: string, delay = 38) {
  await click(page, l, 450);
  await page.keyboard.type(text, { delay });
}

/** Smooth window scroll, like a person using a trackpad. */
async function scrollBy(page: Page, dy: number, ms = 1200) {
  // A string, so the bundler can't add helpers that don't exist in the page.
  // Full-screen forms on phones scroll inside their own panel, so find what actually scrolls.
  await page.evaluate(`new Promise((done) => {
    const root = document.scrollingElement;
    let el = root;
    if (root.scrollHeight <= root.clientHeight + 4) {
      let best = null;
      for (const n of document.querySelectorAll('*')) {
        const cs = getComputedStyle(n);
        if (!/(auto|scroll)/.test(cs.overflowY) || n.scrollHeight <= n.clientHeight + 4) continue;
        if (!best || n.clientHeight > best.clientHeight) best = n;
      }
      if (best) el = best;
    }
    const start = el.scrollTop, t0 = performance.now();
    function step(now) {
      const t = Math.min(1, (now - t0) / ${ms});
      const k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      el.scrollTop = start + ${dy} * k;
      if (t < 1) requestAnimationFrame(step); else done();
    }
    requestAnimationFrame(step);
  })`);
}

async function settle(page: Page, ms = 400) {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await sleep(ms);
}

async function login(page: Page, userId: string) {
  await page.evaluate((token) => {
    localStorage.setItem("neighbourly-session", JSON.stringify({ state: { token }, version: 0 }));
    sessionStorage.clear();
  }, `demo.${userId}`);
}

/**
 * The video's resident is Ali Rahman. Rename the sample resident in this browser's saved
 * sample data only (idb-keyval store); the app's own demo account is unchanged.
 */
async function renamePersona(page: Page) {
  await page.evaluate(`new Promise((done, fail) => {
    const open = indexedDB.open('keyval-store');
    open.onerror = () => fail(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction('keyval', 'readwrite');
      const store = tx.objectStore('keyval');
      const req = store.get('neighbourly-demo-db');
      req.onsuccess = () => {
        const data = req.result;
        const user = data && data.users.find((u) => u.id === 'u-aisyah');
        if (!user) return fail(new Error('Sample data not saved yet'));
        Object.assign(user, {
          name: 'Ali Rahman',
          email: 'ali@neighbourly.demo',
          bio: 'Dad of two. Loves cycling and the Saturday morning park runs at Central Park.',
        });
        store.put(data, 'neighbourly-demo-db');
      };
      tx.oncomplete = () => done();
      tx.onerror = () => fail(tx.error);
    };
  })`);
}

/** Off camera: become `userId` and open `path`, ready to record. */
async function prepare(page: Page, userId: string, path: string, waitFor?: string) {
  await login(page, userId);
  await page.goto(`${BASE}${path}`);
  await settle(page, 600);
  if (waitFor) await page.locator(waitFor).first().waitFor({ timeout: 15000 }).catch(() => undefined);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
}

const manifest: Record<string, number> = {};
async function clip(page: Page, id: string, minSeconds: number, run: () => Promise<void>) {
  if (only.size && !only.has(id)) return;
  process.stdout.write(`  ${id} … `);
  const r = await capture(page, join(CLIPS, `${id}.mp4`), run, { minSeconds });
  manifest[id] = r.seconds;
  console.log(`${r.seconds.toFixed(1)} s, ${r.frames} frames`);
}

// ---------------------------------------------------------------- desktop

async function desktop(ctx: BrowserContext) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await settle(page);
  await renamePersona(page);
  const sidebar = (name: string) => page.locator("aside nav a", { hasText: name }).first();

  await prepare(page, "u-aisyah", "/home", '[aria-label="Weather in City of Elmina"]');
  await clip(page, "desk_home", target("d1"), async () => {
    await moveTo(page, 900, 300, 1500);
    await hover(page, page.getByText("For you").first(), 1500);
    await scrollBy(page, 220, 1800);
    await sleep(1200);
    await scrollBy(page, -220, 1500);
  });

  await prepare(page, "u-aisyah", "/home", '[aria-label="Weather in City of Elmina"]');
  await clip(page, "desk_nav", target("d2"), async () => {
    await click(page, sidebar("Community"), 700);
    await sleep(1200);
    await click(page, sidebar("Places"), 600);
    await sleep(1500);
    await click(page, sidebar("Facilities"), 600);
    await sleep(1300);
    await click(page, sidebar("Home"), 700);
    await sleep(600);
  });

  await prepare(page, "u-aisyah", "/home", '[aria-label="Weather in City of Elmina"]');
  await clip(page, "desk_home_tour", target("d3"), async () => {
    await hover(page, page.locator('[aria-label="Weather in City of Elmina"]'), 900);
    await sleep(900);
    await scrollBy(page, 330, 2000);
    await hover(page, page.getByText("Pick up:").first(), 900);
    await sleep(700);
    await scrollBy(page, 400, 1800);
    await hover(page, page.getByText("Food to share").first(), 800);
  });

  // TownCare: Ali reports a pothole
  await prepare(page, "u-aisyah", "/towncare/new", ".leaflet-tile-loaded");
  await clip(page, "w1", target("w1", 1.5), async () => {
    await hover(page, page.getByText("Take or choose a photo").first(), 700);
    await page.locator('input[type="file"]').setInputFiles(join(VIDEO_DIR, "assets/pothole.jpg"));
    await page.getByText("Location data removed").first().waitFor({ timeout: 8000 }).catch(() => undefined);
    await sleep(700);
    await click(page, page.getByRole("button", { name: /Roads & potholes/ }), 700);
    await type(page, page.getByLabel("Title"), "Deep pothole outside the Block C guardhouse", 22);
    await page.getByLabel("What's happening?").fill("Motorcycles are swerving around it, especially at night. It's getting bigger after the rain.");
    await sleep(300);
    const map = page.locator(".leaflet-container").first();
    await map.scrollIntoViewIfNeeded();
    await sleep(300);
    const b = (await map.boundingBox())!;
    await moveTo(page, b.x + b.width * 0.55, b.y + b.height * 0.42, 700);
    await page.mouse.down();
    await page.mouse.up();
    await sleep(700);
    await click(page, page.getByRole("button", { name: "Submit report" }), 700);
    await page.waitForURL(/\/towncare\/r-/, { timeout: 10000 });
    await page.getByRole("heading", { name: /Deep pothole outside the Block C guardhouse/ }).waitFor({ timeout: 10000 });
    await sleep(900);
  });

  await clip(page, "w2", target("w2"), async () => {
    await hover(page, page.getByText("Anonymous to neighbours").first(), 700);
    await sleep(700);
    await click(page, page.getByRole("link", { name: "TownCare" }).first(), 700);
    await settle(page, 700);
    await click(page, page.getByRole("link", { name: "Map" }), 700);
    await page.locator(".leaflet-tile-loaded").first().waitFor({ timeout: 8000 }).catch(() => undefined);
    await sleep(1200);
  });

  // Township Management resolves it
  await prepare(page, "u-admin", "/admin/reports", "tbody tr");
  await clip(page, "w3", target("w3"), async () => {
    await click(page, page.getByRole("button", { name: /Deep pothole outside the Block C guardhouse/ }), 800);
    const panel = page.getByRole("dialog");
    await panel.waitFor();
    await sleep(900);
    await click(page, panel.getByRole("radio", { name: "In progress" }), 700);
    await click(page, panel.getByRole("button", { name: /Mark in progress & notify/ }), 600);
    await sleep(1300);
    await click(page, panel.getByRole("radio", { name: "Resolved" }), 600);
    await click(page, panel.getByRole("button", { name: /Mark resolved & notify/ }), 600);
    await sleep(1200);
  });
  await page.keyboard.press("Escape");

  // EcoFood: Daniel confirms a request
  await prepare(page, "u-daniel", "/ecofood", "article, a[href^='/ecofood/f-']");
  await clip(page, "w4", target("w4"), async () => {
    await moveTo(page, 820, 420, 900);
    await scrollBy(page, 260, 1300);
    await sleep(400);
    await click(page, page.getByRole("link", { name: /Rambutans from my tree/ }).first(), 800);
    await settle(page, 600);
    await hover(page, page.getByRole("button", { name: "Confirm" }).first(), 900);
    await sleep(500);
    await click(page, page.getByRole("button", { name: "Confirm" }).first(), 300);
    await page.getByText(/pickup code/i).first().waitFor({ timeout: 6000 }).catch(() => undefined);
    await sleep(600);
    await hover(page, page.getByText(/pickup code/i).first(), 800);
  });

  // Facilities: Ali books the BBQ pit
  await prepare(page, "u-aisyah", "/book", "img");
  await clip(page, "w5", target("w5"), async () => {
    await hover(page, page.getByText("Central Park BBQ Pit").first(), 700);
    await click(page, page.locator('a[href="/book/fac-bbq"]').first(), 400);
    await settle(page, 400);
    await click(page, page.getByRole("radiogroup", { name: "Date" }).locator("button").nth(1), 700);
    await sleep(400);
    await click(page, page.locator('button[aria-label*="Free"]').nth(3), 600);
    await type(page, page.getByPlaceholder("e.g. Family BBQ"), "Family BBQ with Block C", 28);
    await click(page, page.getByRole("button", { name: "Book now" }), 600);
    await page.waitForURL(/\/book\/mine/, { timeout: 8000 }).catch(() => undefined);
    await settle(page, 300);
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(900);
  });

  // Community: topics, events, neighbours
  await prepare(page, "u-aisyah", "/community", "article");
  await clip(page, "w6", target("w6"), async () => {
    await click(page, page.getByRole("radio", { name: /Lost & found/ }), 700);
    await sleep(900);
    await click(page, page.getByRole("link", { name: "Events" }), 600);
    await settle(page, 500);
    await click(page, page.getByRole("button", { name: "I'm going" }).first(), 700);
    await sleep(900);
    await click(page, page.getByRole("link", { name: "Neighbours" }), 600);
    await settle(page, 600);
  });

  // Places map
  await prepare(page, "u-aisyah", "/places", ".leaflet-tile-loaded");
  await sleep(1200);
  await clip(page, "w7", target("w7"), async () => {
    await click(page, page.locator('[title="Roti Sinar Bakery"]').first(), 900);
    await sleep(1600);
    await hover(page, page.getByRole("link", { name: /Directions/ }).first(), 800);
    await sleep(700);
    await click(page, page.getByRole("button", { name: /Elmina Valley Multipurpose Hall/ }).first(), 700);
    await sleep(900);
  });

  // Assistant
  await prepare(page, "u-aisyah", "/assistant", "text=Hi! How can I help?");
  await clip(page, "w8", target("w8", 4), async () => {
    await click(page, page.getByRole("button", { name: "How do I book the multipurpose hall?" }), 800);
    await page.getByText("Related questions").first().waitFor({ timeout: 12000 }).catch(() => undefined);
    await sleep(1400);
    await type(page, page.getByLabel("Message the assistant"), "Who won the football match last night?", 30);
    await page.keyboard.press("Enter");
    await page.getByText("Try asking").first().waitFor({ timeout: 12000 }).catch(() => undefined);
    await sleep(1600);
  });

  // Township dashboard
  await prepare(page, "u-admin", "/admin", ".recharts-surface");
  await clip(page, "w9", target("w9"), async () => {
    await hover(page, page.getByText("Open reports").first(), 900);
    await sleep(500);
    await scrollBy(page, 360, 1800);
    await click(page, page.getByRole("button", { name: "Table" }).first(), 700);
    await sleep(1300);
    await click(page, page.getByRole("button", { name: "Chart" }).first(), 600);
    await scrollBy(page, 420, 1800);
    await sleep(600);
  });
  await page.close();
}

// ---------------------------------------------------------------- phone

async function phone(ctx: BrowserContext) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await settle(page);
  await renamePersona(page);
  const tab = (name: string) => page.locator("nav[aria-label='Main'] a", { hasText: name }).last();

  await prepare(page, "u-aisyah", "/home", '[aria-label="Weather in City of Elmina"]');
  await clip(page, "phone_home", target("d1"), async () => {
    await sleep(900);
    await scrollBy(page, 520, 3200);
    await sleep(900);
    await scrollBy(page, 420, 2400);
  });

  await prepare(page, "u-aisyah", "/home", '[aria-label="Weather in City of Elmina"]');
  await clip(page, "phone_nav", target("d2"), async () => {
    await sleep(700);
    for (const name of ["TownCare", "EcoFood", "Book", "Chat"]) {
      await tab(name).tap();
      await settle(page, 1300);
    }
  });

  await prepare(page, "u-aisyah", "/towncare/new");
  await clip(page, "phone_report", target("w10"), async () => {
    await sleep(600);
    await scrollBy(page, 330, 1500);
    await page.getByRole("button", { name: /Wildlife sighting/ }).tap();
    await sleep(1300);
    await scrollBy(page, 380, 1600);
    await sleep(900);
  });

  await prepare(page, "u-aisyah", "/ecofood", "a[href^='/ecofood/f-']");
  await clip(page, "phone_food", target("w10"), async () => {
    await sleep(500);
    await scrollBy(page, 450, 1800);
    await page.getByRole("link", { name: /Vegetable curry/ }).first().tap();
    await settle(page, 700);
    await scrollBy(page, 300, 1500);
  });

  await prepare(page, "u-aisyah", "/assistant", "text=Hi! How can I help?");
  await clip(page, "phone_chat", target("w10"), async () => {
    await sleep(500);
    await page.getByRole("button", { name: "How do I share surplus food?" }).tap();
    await page.getByText("Related questions").first().waitFor({ timeout: 12000 }).catch(() => undefined);
    await sleep(800);
  });
  await page.close();
}

const browser = await chromium.launch();
try {
  console.log("Desktop clips");
  const desk = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
  await desk.addInitScript(OVERLAY(false));
  await desktop(desk);
  await desk.close();

  console.log("Phone clips");
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await mob.addInitScript(OVERLAY(true));
  await phone(mob);
  await mob.close();
} finally {
  await browser.close();
}
const file = join(CLIPS, "clips.json");
let existing: Record<string, number> = {};
try {
  existing = JSON.parse((await import("node:fs")).readFileSync(file, "utf8")) as Record<string, number>;
} catch {
  // first run
}
writeFileSync(file, JSON.stringify({ ...existing, ...manifest }, null, 2));
console.log("Done");
