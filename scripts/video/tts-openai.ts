/**
 * Narration with an OpenAI voice (gpt-4o-mini-tts). Reads OPENAI_API_KEY from apps/api/.env.
 *
 *   npx tsx scripts/video/tts-openai.ts --samples                 # 10-second sample per voice
 *   npx tsx scripts/video/tts-openai.ts --voice ash --style energetic   # every segment → video/.work/audio
 *   npx tsx scripts/video/tts-openai.ts --voice coral --only p2   # one segment
 */
import { cpSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, WORK, ensureDir, narration } from "./lib";

const MODEL = "gpt-4o-mini-tts";
const SAMPLE_VOICES = ["coral", "sage", "ash", "ballad"];
const PRONUNCIATION = "Pronounce 'Elmina' as el-MEE-nah, and say 'TownCare' and 'EcoFood' as single product names.";

/** How the voice should sound. `--style energetic` (default) sells the app; `--style calm` presents it. */
const STYLES: Record<string, (segmentId: string) => string> = {
  energetic: (id) => {
    const base =
      "You are an enthusiastic, charismatic product presenter pitching a community app called Neighbourly to judges at a " +
      "university hackathon in Malaysia, and you genuinely love this product. Speak clear international English with high " +
      "energy, a big smile in your voice and punchy emphasis on the key words. Keep a lively, brisk pace, but stay clear and never rushed. ";
    if (/^p\d/.test(id)) {
      return base + "This line describes a frustrating problem: deliver it with urgency and conviction, building tension so the audience feels the pain. " + PRONUNCIATION;
    }
    if (id === "intro" || id === "outro") {
      return base + "This is a headline moment: confident, proud and exciting, like the opening or closing of a product launch. " + PRONUNCIATION;
    }
    return base + "This line shows off the solution: sound excited and impressed, like you can't wait to show the audience how good it is. " + PRONUNCIATION;
  },
  calm: () =>
    "You are presenting a community app called Neighbourly to judges at a university hackathon in Malaysia. " +
    "Speak in clear, natural international English with a warm, confident, friendly tone and a slight smile, " +
    "at a steady, moderate pace. " + PRONUNCIATION,
};

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

try {
  process.loadEnvFile(join(ROOT, "apps/api/.env"));
} catch {
  // rely on the environment
}
const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error("OPENAI_API_KEY is not set (apps/api/.env)");

/** 24 kHz, 16-bit mono PCM from the API, wrapped in a WAV header (exact length, unlike streamed WAV). */
function wav(pcm: Buffer): Buffer {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(24000, 24);
  h.writeUInt32LE(48000, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

async function speak(text: string, voice: string, out: string, instructions: string) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ model: MODEL, voice, input: text, instructions, response_format: "pcm" }),
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) throw new Error(`OpenAI TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
      writeFileSync(out, wav(Buffer.from(await res.arrayBuffer())));
      return;
    } catch (err) {
      // Network hiccups and rate limits are worth a retry; bad keys and no credits are not.
      if (attempt >= 3 || /OpenAI TTS (400|401|403|404)|insufficient_quota/.test(String(err))) throw err;
      console.log(`  retrying (${(err as Error).message.slice(0, 80)})`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

const segments = narration();
const style = STYLES[flag("style") ?? "energetic"];
if (!style) throw new Error(`Unknown style. Use one of: ${Object.keys(STYLES).join(", ")}`);
if (args.includes("--samples")) {
  const dir = ensureDir(join(WORK, "voice-samples"));
  const text = `${segments.find((s) => s.id === "intro")!.text} ${segments.find((s) => s.id === "s1")!.text}`;
  const voices = flag("voice") ? [flag("voice")!] : SAMPLE_VOICES;
  const tag = flag("style") ? `-${flag("style")}` : "";
  for (const v of voices) {
    const file = join(dir, `${v}${tag}.wav`);
    if (existsSync(file)) continue;
    await speak(text, v, file, style("s1"));
    console.log(`  ${v}: ${file}`);
  }
} else {
  const voice = flag("voice") ?? "coral";
  const only = flag("only");
  const dir = ensureDir(join(WORK, "audio"));
  // Keep the previous narration once, so it's easy to go back.
  const backup = join(WORK, "audio-previous");
  if (!only && !existsSync(backup)) cpSync(dir, backup, { recursive: true });
  for (const s of segments) {
    if (only && s.id !== only) continue;
    await speak(s.spoken ?? s.text, voice, join(dir, `${s.id}.wav`), style(s.id));
    console.log(`  ${s.id}`);
  }
}
