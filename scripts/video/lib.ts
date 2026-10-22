/**
 * Shared helpers for the demo video: high-quality page capture (Chrome screencast frames →
 * H.264), ffmpeg, WAV durations and paths.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "playwright";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const VIDEO_DIR = join(ROOT, "scripts/video");
/** Intermediate files (frames, clips, audio). Override with VIDEO_WORK. */
export const WORK = process.env.VIDEO_WORK ?? join(ROOT, "video/.work");
export const OUT = join(ROOT, "video");
export const FPS = 30;

export function ffmpegPath(): string {
  const p = process.env.FFMPEG;
  if (!p || !existsSync(p)) throw new Error("Set FFMPEG to a full ffmpeg build (for example from the ffmpeg-static npm package)");
  return p;
}

export function ffmpeg(args: string[]): void {
  execFileSync(ffmpegPath(), ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
}

/** Duration of a media file in seconds, read from ffmpeg's banner. */
export function mediaDuration(file: string): number {
  let out = "";
  try {
    execFileSync(ffmpegPath(), ["-hide_banner", "-i", file], { stdio: "pipe" });
  } catch (err) {
    out = String((err as { stderr?: Buffer }).stderr ?? "");
  }
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(out);
  if (!m) throw new Error(`No duration for ${file}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

export function ensureDir(dir: string): string {
  mkdirSync(dir, { recursive: true });
  return dir;
}

export interface Narration {
  id: string;
  /** What the captions show. */
  text: string;
  /** What the voice reads, when a name needs a phonetic respelling (e.g. "Saim Dahbee" for Sime Darby). */
  spoken?: string;
}

export const narration = (): Narration[] => JSON.parse(readFileSync(join(VIDEO_DIR, "narration.json"), "utf8")) as Narration[];

/** Seconds of speech per segment, from the generated WAVs. */
export function audioDurations(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const n of narration()) out[n.id] = mediaDuration(join(WORK, "audio", `${n.id}.wav`));
  return out;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Records a page with Chrome's screencast (JPEG frames as they're painted) and encodes them
 * to constant-frame-rate H.264. Much sharper than Playwright's built-in recorder.
 */
export async function capture(page: Page, out: string, run: () => Promise<void>, opts: { minSeconds?: number; quality?: number } = {}) {
  const framesDir = ensureDir(`${out}.frames`);
  rmSync(framesDir, { recursive: true, force: true });
  ensureDir(framesDir);
  const cdp = await page.context().newCDPSession(page);
  const frames: Array<{ file: string; t: number }> = [];
  let writing = Promise.resolve();
  cdp.on("Page.screencastFrame", (f: { data: string; sessionId: number; metadata: { timestamp?: number } }) => {
    const file = join(framesDir, `f${String(frames.length).padStart(6, "0")}.jpg`);
    frames.push({ file, t: f.metadata.timestamp ?? Date.now() / 1000 });
    writing = writing.then(() => writeFileSync(file, Buffer.from(f.data, "base64")));
    void cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => undefined);
  });
  const viewport = page.viewportSize()!;
  const dpr = await page.evaluate(() => window.devicePixelRatio);
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: opts.quality ?? 92,
    maxWidth: Math.round(viewport.width * dpr),
    maxHeight: Math.round(viewport.height * dpr),
    everyNthFrame: 1,
  });
  // Nudge a repaint so the first frame arrives straight away.
  await page.evaluate(() => {
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;width:1px;height:1px;left:0;top:0;opacity:0.01;pointer-events:none";
    document.body.appendChild(el);
    requestAnimationFrame(() => el.remove());
  });
  const started = Date.now();
  await run();
  const minMs = (opts.minSeconds ?? 0) * 1000;
  if (Date.now() - started < minMs) await sleep(minMs - (Date.now() - started));
  const endT = Date.now() / 1000;
  await cdp.send("Page.stopScreencast");
  await writing;
  await cdp.detach().catch(() => undefined);
  if (frames.length === 0) throw new Error(`No frames captured for ${out}`);

  // Concat list with each frame shown until the next one was painted.
  const t0 = frames[0]!.t;
  const lines: string[] = [];
  frames.forEach((f, i) => {
    const next = frames[i + 1]?.t ?? Math.max(endT, f.t + 1 / FPS);
    lines.push(`file '${f.file.replace(/\\/g, "/")}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
  });
  lines.push(`file '${frames.at(-1)!.file.replace(/\\/g, "/")}'`);
  const list = `${out}.txt`;
  writeFileSync(list, lines.join("\n"));
  ffmpeg([
    "-f", "concat", "-safe", "0", "-i", list,
    "-fps_mode", "cfr", "-r", String(FPS),
    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos,format=yuv420p",
    "-c:v", "libx264", "-preset", "medium", "-crf", "16", out,
  ]);
  rmSync(framesDir, { recursive: true, force: true });
  rmSync(list, { force: true });
  return { seconds: Math.max(endT - t0, 0.1), frames: frames.length };
}
