/**
 * Still previews of the animated scenes (at 35% and 95% of each), for checking layout quickly.
 *   npx tsx scripts/video/preview-scenes.ts [sceneId…]
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { VIDEO_DIR, WORK, audioDurations, ensureDir, narration } from "./lib";

const ANIMATED = ["intro", "p1", "p2", "p3", "p4", "p5", "s1", "s2", "s3", "s4", "outro"];
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ANIMATED;
const out = ensureDir(join(WORK, "preview"));
const audio = audioDurations();
const texts = Object.fromEntries(narration().map((n) => [n.id, n.text]));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(join(VIDEO_DIR, "scenes.html")).href);
await page.evaluate(() => document.fonts.ready);
for (const id of ids) {
  const A = audio[id]!;
  const D = A + 1.4;
  for (const f of [0.35, 0.95]) {
    await page.evaluate(({ id, A, D, text }) => (window as unknown as { setup: (o: object) => void }).setup({ id, A, D, text }), {
      id, A, D, text: id === "intro" || id === "outro" ? "" : texts[id],
    });
    await page.evaluate((t) => (window as unknown as { seek: (t: number) => void }).seek(t), D * f);
    await page.screenshot({ path: join(out, `${id}-${Math.round(f * 100)}.png`) });
  }
  console.log(`  ${id}`);
}
await browser.close();
