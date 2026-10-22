/**
 * Builds the ~4-minute demo video: animated problem/solution scenes, then the app demo framed
 * in browser, laptop and phone mockups, with narration and captions.
 *
 *   1. powershell -File scripts/video/tts.ps1 -Out video/.work/audio     (narration)
 *   2. npx tsx scripts/video/record-app.ts                              (app clips; needs npm run dev)
 *   3. npx tsx scripts/video/build.ts                                   (this script)
 *
 * Needs FFMPEG pointing at a full ffmpeg build. Output: video/Neighbourly_Demo.mp4 (+ .srt).
 */
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright";
import { FPS, OUT, VIDEO_DIR, WORK, audioDurations, capture, ensureDir, ffmpeg, mediaDuration, narration } from "./lib";

type Bullet = [string, string];
type Scene =
  | { id: string; kind: "anim"; pad: number; lead?: number; noCaption?: boolean }
  | { id: string; kind: "browser"; clip: string; url: string; title: string; bullets: Bullet[] }
  | { id: string; kind: "showcase"; clips: [string, string]; title: string; swatches?: boolean }
  | { id: string; kind: "phones3"; clips: [string, string, string]; labels: Array<[string, string]> };

const TIMELINE: Scene[] = [
  { id: "intro", kind: "anim", pad: 1.2, lead: 0.8, noCaption: true },
  { id: "p1", kind: "anim", pad: 0.6 },
  { id: "p2", kind: "anim", pad: 0.6 },
  { id: "p3", kind: "anim", pad: 0.6 },
  { id: "p4", kind: "anim", pad: 0.6 },
  { id: "p5", kind: "anim", pad: 0.8 },
  { id: "s1", kind: "anim", pad: 0.8, lead: 0.6 },
  { id: "s2", kind: "anim", pad: 0.6 },
  { id: "s3", kind: "anim", pad: 0.6 },
  { id: "s4", kind: "anim", pad: 0.8 },
  { id: "d1", kind: "showcase", clips: ["desk_home", "phone_home"], title: "Designed for every screen", swatches: true },
  { id: "d2", kind: "showcase", clips: ["desk_nav", "phone_nav"], title: "One sidebar. Five tabs." },
  {
    id: "d3", kind: "browser", clip: "desk_home_tour", url: "/home", title: "A calm Home",
    bullets: [["☀️", "Live weather for City of Elmina"], ["⚠️", "The newest safety alert"], ["✅", "What needs your attention"], ["📅", "What's coming up next"]],
  },
  {
    id: "w1", kind: "browser", clip: "w1", url: "/towncare/new", title: "Report an issue",
    bullets: [["📷", "Photo, category and a map pin"], ["🛰️", "Hidden GPS data removed from photos"], ["🕶️", "Anonymous to neighbours by default"]],
  },
  {
    id: "w2", kind: "browser", clip: "w2", url: "/towncare", title: "Follow every fix",
    bullets: [["📋", "My reports, All reports and Map"], ["🔄", "Open → In progress → Resolved"], ["🙋", "“Me too” instead of duplicates"]],
  },
  {
    id: "w3", kind: "browser", clip: "w3", url: "/admin/reports", title: "Township Management acts",
    bullets: [["👷", "Assign the right team"], ["📝", "Update the status with a note"], ["🔔", "Reporter and supporters notified"]],
  },
  {
    id: "w4", kind: "browser", clip: "w4", url: "/ecofood", title: "EcoFood",
    bullets: [["🥐", "Neighbours and local shops share surplus"], ["🔢", "4-digit pickup code, no phone numbers"], ["⚖️", "Every kilogram counted as food saved"]],
  },
  {
    id: "w5", kind: "browser", clip: "w5", url: "/book", title: "Book a facility",
    bullets: [["🏛️", "Hall, gym studio, BBQ pit and meeting room"], ["⚡", "Instant or approval bookings"], ["🙈", "Taken slots never show who booked"]],
  },
  {
    id: "w6", kind: "browser", clip: "w6", url: "/community", title: "Community",
    bullets: [["🏷️", "Feed with topics and an Official filter"], ["🎉", "Events with private RSVP counts"], ["👋", "Neighbours who chose to be listed"]],
  },
  {
    id: "w7", kind: "browser", clip: "w7", url: "/places", title: "Places map",
    bullets: [["📍", "Every facility and verified shop"], ["🕒", "Opening hours and today's surplus"], ["🧭", "Directions in one tap"]],
  },
  {
    id: "w8", kind: "browser", clip: "w8", url: "/assistant", title: "Ask Neighbourly",
    bullets: [["💬", "Step-by-step answers in English and Malay"], ["🛡️", "Declines anything off topic"], ["🎫", "Hands over to a support ticket"]],
  },
  {
    id: "w9", kind: "browser", clip: "w9", url: "/admin", title: "Township dashboard",
    bullets: [["📊", "Open reports and time to fix"], ["🐒", "Wildlife sightings and food saved"], ["📋", "Every chart has a table view"]],
  },
  {
    id: "w10", kind: "phones3", clips: ["phone_report", "phone_food", "phone_chat"],
    labels: [["Report a problem", "TownCare"], ["Share food", "EcoFood"], ["Ask anything", "Assistant"]],
  },
  { id: "outro", kind: "anim", pad: 2.8, lead: 0.6, noCaption: true },
];

const LEAD = 0.2; // narration starts this long into a scene
/** Seconds an app scene stays on screen after its narration ends. */
const TAIL = Number(process.env.APP_TAIL ?? 0.6);
/** Narration playback speed (pitch preserved). Lets a lively read fit the ~4-minute target. */
const TEMPO = Number(process.env.NARRATION_TEMPO ?? 1.1);
/** Extra seconds of pause after each animated scene's narration. */
const PAD_EXTRA = Number(process.env.PAD_EXTRA ?? 0);
const SCENES = ensureDir(join(WORK, "scenes"));
const FRAMES = ensureDir(join(WORK, "frames"));
const CLIPS = join(WORK, "clips");
const audio = Object.fromEntries(Object.entries(audioDurations()).map(([id, d]) => [id, d / TEMPO]));
const texts = Object.fromEntries(narration().map((n) => [n.id, n.text]));
const only = new Set(process.argv.slice(2));

const clipLen = (id: string) => mediaDuration(join(CLIPS, `${id}.mp4`));
/** Recordings longer than their narration are sped up a little (never more than this). */
const MAX_SPEED = Number(process.env.MAX_CLIP_SPEED ?? 1.4);
const clipsOf = (s: Exclude<Scene, { kind: "anim" }>) => (s.kind === "browser" ? [s.clip] : s.clips);
const speedFor = (s: Exclude<Scene, { kind: "anim" }>, clip: string) =>
  Math.min(MAX_SPEED, Math.max(1, clipLen(clip) / (LEAD + audio[s.id]! + TAIL)));
function sceneDuration(s: Scene): number {
  const speech = (s.kind === "anim" ? s.lead ?? LEAD : LEAD) + audio[s.id]!;
  if (s.kind === "anim") return speech + s.pad + PAD_EXTRA;
  return Math.max(speech + TAIL, ...clipsOf(s).map((c) => clipLen(c) / speedFor(s, c)));
}

// ---------------------------------------------------------------- rendering

async function renderAnim(page: Page, s: Extract<Scene, { kind: "anim" }>, D: number, out: string) {
  await page.goto(pathToFileURL(join(VIDEO_DIR, "scenes.html")).href);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(({ id, A, D, text }) => (window as unknown as { setup: (o: object) => void }).setup({ id, A, D, text }), {
    id: s.id, A: audio[s.id]!, D, text: s.noCaption ? "" : texts[s.id],
  });
  await page.waitForTimeout(300);
  await capture(page, out, async () => {
    await page.evaluate(() => (window as unknown as { play: () => void }).play());
    await page.waitForTimeout(D * 1000);
  });
}

interface Rect { x: number; y: number; w: number; h: number }

async function renderFrame(page: Page, s: Exclude<Scene, { kind: "anim" }>) {
  await page.goto(pathToFileURL(join(VIDEO_DIR, "frame.html")).href);
  await page.evaluate(() => document.fonts.ready);
  const layout = s.kind;
  const opts = {
    layout,
    caption: texts[s.id],
    title: "title" in s ? s.title : "",
    bullets: s.kind === "browser" ? s.bullets : [],
    url: s.kind === "browser" ? s.url : "",
    labels: s.kind === "phones3" ? s.labels : [],
    swatches: s.kind === "showcase" ? Boolean(s.swatches) : false,
  };
  const render = (o: object) => page.evaluate((o) => (window as unknown as { render: (o: object) => { width: number; height: number } }).render(o), o);
  const files = { bg: join(FRAMES, `${s.id}-bg.png`), fg: join(FRAMES, `${s.id}-fg.png`), masks: [] as string[] };
  await page.setViewportSize({ width: 1920, height: 1080 });
  await render({ ...opts, mode: "bg" });
  await page.screenshot({ path: files.bg });
  await render({ ...opts, mode: "fg" });
  await page.screenshot({ path: files.fg, omitBackground: true });
  const screens = (await page.evaluate((l) => (window as unknown as { LAYOUTS: Record<string, { screens: Rect[] }> }).LAYOUTS[l]!.screens, layout)) as Rect[];
  for (let i = 0; i < screens.length; i++) {
    const size = await render({ ...opts, mode: "mask", index: i });
    await page.setViewportSize(size);
    const m = join(FRAMES, `${s.id}-mask${i}.png`);
    await page.screenshot({ path: m });
    files.masks.push(m);
    await page.setViewportSize({ width: 1920, height: 1080 });
  }
  return { ...files, screens };
}

/** Background, each recording scaled into its screen with rounded corners, then the foreground. */
function composite(s: Exclude<Scene, { kind: "anim" }>, frame: Awaited<ReturnType<typeof renderFrame>>, D: number, out: string) {
  const clips = clipsOf(s);
  const args: string[] = ["-loop", "1", "-framerate", String(FPS), "-t", D.toFixed(3), "-i", frame.bg];
  clips.forEach((c, i) => args.push("-i", join(CLIPS, `${c}.mp4`), "-loop", "1", "-i", frame.masks[i]!));
  args.push("-loop", "1", "-framerate", String(FPS), "-t", D.toFixed(3), "-i", frame.fg);
  const fgIndex = 1 + clips.length * 2;
  const parts: string[] = [];
  let last = "0:v";
  clips.forEach((_, i) => {
    const r = frame.screens[i]!;
    const v = 1 + i * 2;
    // Hold the last frame if the narration runs longer than the recording.
    parts.push(
      `[${v}:v]setpts=PTS/${speedFor(s, clips[i]!).toFixed(4)},tpad=stop_mode=clone:stop_duration=${D.toFixed(2)},scale=${r.w}:${r.h}:flags=lanczos,format=rgba[c${i}]`,
      `[${v + 1}:v]format=gray,scale=${r.w}:${r.h}[m${i}]`,
      `[c${i}][m${i}]alphamerge[cm${i}]`,
      `[${last}][cm${i}]overlay=${r.x}:${r.y}:shortest=0[o${i}]`,
    );
    last = `o${i}`;
  });
  parts.push(`[${last}][${fgIndex}:v]overlay=0:0,trim=duration=${D.toFixed(3)},fps=${FPS},format=yuv420p[out]`);
  ffmpeg([...args, "-filter_complex", parts.join(";"), "-map", "[out]", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-r", String(FPS), out]);
}

// ---------------------------------------------------------------- audio, subtitles, final cut

function srtTime(t: number) {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
}

async function main() {
  const plan = TIMELINE.map((s) => ({ s, D: sceneDuration(s) }));
  let t = 0;
  const starts: number[] = [];
  for (const p of plan) {
    starts.push(t);
    t += p.D;
  }
  console.log(`Timeline ${t.toFixed(1)} s (${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")})`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const { s, D } of plan) {
    const out = join(SCENES, `${s.id}.mp4`);
    if (only.size && !only.has(s.id) && existsSync(out)) continue;
    process.stdout.write(`  ${s.id} (${D.toFixed(1)} s) … `);
    if (s.kind === "anim") {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await renderAnim(page, s, D, out);
    } else {
      composite(s, await renderFrame(page, s), D, out);
    }
    console.log("done");
  }
  await browser.close();

  // Narration: each segment placed at its scene's start plus its lead-in.
  const inputs: string[] = [];
  const filters: string[] = [];
  plan.forEach(({ s }, i) => {
    const lead = s.kind === "anim" ? s.lead ?? LEAD : LEAD;
    const ms = Math.round((starts[i]! + lead) * 1000);
    inputs.push("-i", join(WORK, "audio", `${s.id}.wav`));
    filters.push(`[${i}:a]atempo=${TEMPO},aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[a${i}]`);
  });
  filters.push(`${plan.map((_, i) => `[a${i}]`).join("")}amix=inputs=${plan.length}:normalize=0,apad,atrim=0:${t.toFixed(3)},loudnorm=I=-16:TP=-1.5:LRA=11[aout]`);
  const narrationWav = join(WORK, "narration.wav");
  ffmpeg([...inputs, "-filter_complex", filters.join(";"), "-map", "[aout]", "-ar", "48000", narrationWav]);

  // Video: concatenate scenes, fade in from black, then mux the narration.
  const list = join(WORK, "scenes.txt");
  writeFileSync(list, plan.map(({ s }) => `file '${join(SCENES, `${s.id}.mp4`).replace(/\\/g, "/")}'`).join("\n"));
  ensureDir(OUT);
  const final = join(OUT, "Neighbourly_Demo.mp4");
  ffmpeg([
    "-f", "concat", "-safe", "0", "-i", list, "-i", narrationWav,
    "-vf", "fade=t=in:st=0:d=0.6,format=yuv420p",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-r", String(FPS),
    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final,
  ]);

  // Subtitles, timed to the narration.
  const srt = plan.map(({ s }, i) => {
    const lead = s.kind === "anim" ? s.lead ?? LEAD : LEAD;
    const a = starts[i]! + lead;
    return `${i + 1}\n${srtTime(a)} --> ${srtTime(a + audio[s.id]!)}\n${texts[s.id]}\n`;
  });
  writeFileSync(join(OUT, "Neighbourly_Demo.srt"), srt.join("\n"));
  console.log(`Wrote ${final} (${mediaDuration(final).toFixed(1)} s)`);
}

await main();
