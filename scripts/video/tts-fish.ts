/**
 * Narration with Fish Audio (s2.1-pro). Reads FISH_AUDIO_API_KEY from apps/api/.env.
 *
 *   npx tsx scripts/video/tts-fish.ts --search "energetic"          # list Fish-licensed English voices
 *   npx tsx scripts/video/tts-fish.ts --samples <id>,<id>,…         # short sample per voice
 *   npx tsx scripts/video/tts-fish.ts --voice <id>                  # every segment → video/.work/audio
 *   npx tsx scripts/video/tts-fish.ts --voice <id> --only p2        # one segment
 *
 * Add --free to use the free developer model (s2.1-pro-free).
 */
import { cpSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, WORK, ensureDir, narration } from "./lib";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const MODEL = args.includes("--free") ? "s2.1-pro-free" : "s2.1-pro";
const API = "https://api.fish.audio";

try {
  process.loadEnvFile(join(ROOT, "apps/api/.env"));
} catch {
  // rely on the environment
}
const key = process.env.FISH_AUDIO_API_KEY;
if (!key) throw new Error("FISH_AUDIO_API_KEY is not set (apps/api/.env)");
const auth = { authorization: `Bearer ${key}` };

/**
 * Emotion cues (S2 bracket syntax) at the start of each sentence: urgency for the problem,
 * excitement for the solution and the demo, pride for the opening and closing.
 */
function cue(id: string): string {
  if (/^p\d/.test(id)) return "[emphatic, building urgency]";
  if (id === "intro" || id === "outro") return "[confident, proud, excited]";
  if (/^s\d/.test(id)) return "[very excited]";
  return "[excited]";
}
const withCues = (id: string, text: string) =>
  text
    .split(/(?<=[.!?:])\s+(?=[A-Z])/)
    .map((sentence) => `${cue(id)} ${sentence}`)
    .join(" ");

async function speak(text: string, voice: string, out: string) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${API}/v1/tts`, {
        method: "POST",
        headers: { ...auth, "content-type": "application/json", model: MODEL },
        body: JSON.stringify({
          text,
          reference_id: voice,
          format: "wav",
          sample_rate: 44100,
          latency: "normal",
          normalize: true,
          temperature: 0.8,
          top_p: 0.8,
          prosody: { speed: 1.05, normalize_loudness: true },
        }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) throw new Error(`Fish Audio ${res.status}: ${(await res.text()).slice(0, 300)}`);
      writeFileSync(out, Buffer.from(await res.arrayBuffer()));
      return;
    } catch (err) {
      // Network hiccups and "busy" are worth retrying; bad keys and payment errors are not.
      if (attempt >= 3 || /Fish Audio (400|401|402|403|404)/.test(String(err))) throw err;
      console.log(`  retrying (${(err as Error).message.slice(0, 80)})`);
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
}

interface FishModel {
  _id: string;
  title: string;
  description?: string;
  languages?: string[];
  tags: string[];
  like_count: number;
  task_count: number;
}

const segments = narration();
if (args.includes("--search")) {
  // Only voices licensed by Fish Audio, so we never use a clone of a real person's voice.
  const q = new URLSearchParams({ page_size: "20", language: "en", sort_by: "score", licensed: "true" });
  const title = flag("search");
  if (title && !title.startsWith("--")) q.set("title", title);
  for (const t of (flag("tag") ?? "").split(",").filter(Boolean)) q.append("tag", t);
  const res = await fetch(`${API}/model?${q}`, { headers: auth });
  if (!res.ok) throw new Error(`Fish Audio ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const { items } = (await res.json()) as { items: FishModel[] };
  for (const m of items) console.log(`${m._id}  ${m.title}  [${m.tags.join(", ")}]  ${m.task_count} uses`);
} else if (flag("say")) {
  // Quick test of a single phrase, e.g. a pronunciation: --say "…" --voice <id> --out file.wav
  const out = flag("out") ?? join(ensureDir(join(WORK, "voice-samples")), "say.wav");
  await speak(withCues("d1", flag("say")!), flag("voice") ?? "2680da81de8348a68e1f4dbaa79272f1", out);
  console.log(`  ${out}`);
} else if (flag("samples")) {
  const dir = ensureDir(join(WORK, "voice-samples"));
  const text = `${withCues("intro", segments.find((s) => s.id === "intro")!.text)} ${withCues("s1", segments.find((s) => s.id === "s1")!.text)}`;
  for (const id of flag("samples")!.split(",")) {
    const file = join(dir, `fish-${id}.wav`);
    if (existsSync(file)) continue;
    await speak(text, id, file);
    console.log(`  ${file}`);
  }
} else {
  const voice = flag("voice");
  if (!voice) throw new Error("Pass --voice <model id> (find one with --search)");
  const only = flag("only");
  const dir = ensureDir(join(WORK, "audio"));
  const backup = join(WORK, "audio-openai");
  if (!only && !existsSync(backup)) cpSync(dir, backup, { recursive: true });
  for (const s of segments) {
    if (only && s.id !== only) continue;
    await speak(withCues(s.id, s.spoken ?? s.text), voice, join(dir, `${s.id}.wav`));
    console.log(`  ${s.id}`);
  }
}
