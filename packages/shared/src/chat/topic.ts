/**
 * Decides what kind of message the resident sent, before (or instead of) answering it:
 * small talk, a request for a person, a question the guide answers, a question about the
 * app or township that the guide doesn't cover (offer a support ticket), or something
 * unrelated to Neighbourly (decline politely, without bothering Township Management).
 */
import { isConfident, tokenize, type SearchHit } from "./search";

export type ChatIntent = "greeting" | "thanks" | "capabilities" | "ticket" | "answer" | "uncovered" | "off_topic";
export type ChatLanguage = "en" | "ms";

/**
 * Words that tie a question to Neighbourly or life in City of Elmina. Strong terms count 1,
 * weak terms (common words that are only sometimes about the township) count 0.5, and a
 * question needs 1 to be on topic. A unit test checks every guide heading passes.
 */
const STRONG_TERMS = `
neighbourly neighborly app aplikasi assistant pembantu chatbot account akaun profile profil login logout signin
password katalaluan verify verified verification sahkan pengesahan disahkan unit blok signup register daftar onboarding
setting settings tetapan privacy privasi anonymous tanpa notification notifications pemberitahuan notifikasi bell loceng
alert alerts amaran weather cuaca rain hujan temperature suhu forecast ramalan storm ribut thunderstorm umbrella payung
humidity kelembapan community komuniti feed comment comments komen topic topik event events acara aktiviti rsvp hadir
gotong royong neighbour neighbours neighbor neighbors jiran directory direktori badge badges lencana places map peta
directions shop shops kedai cafe kafe bakery bakeri restaurant restoran ssm business perniagaan merchant peniaga towncare
report reports aduan lapor laporan issue complaint pothole potholes lubang streetlight streetlights lampu playground
cleanliness kebersihan rubbish sampah garbage trash bin bins tong drain drains longkang clogged tersumbat dumping
wildlife hidupan monkey monkeys monyet kera macaque snake snakes ular python cobra lizard biawak boar animal animals
haiwan ecofood food makanan surplus lebihan leftover leftovers claim pickup halal allergen allergens alahan expiry
expired cooked dimasak impact landfill waste membazir recycle recycling recyclable kitar facility facilities kemudahan
book booking bookings tempah tempahan sewa hall dewan serbaguna gym studio bbq barbecue barbeku mesyuarat slot slots
availability reschedule approval approve kelulusan lulus maintenance penyelenggaraan rule rules peraturan quiet noise
noisy bising renovation renovate ubahsuai contractor kontraktor pet pets dog dogs anjing cat cats kucing leash parking
letak visitor visitors pelawat burning pembakaran guard guardhouse pengawal security keselamatan safety safe selamat
emergency kecemasan bomba police polis ambulance ambulans fire kebakaran accident kemalangan thief theft pencuri curi
burglar crime jenayah 999 994 office pejabat management pengurusan admin pentadbir township perbandaran elmina valley
gardens resident residents penduduk tenant penyewa ticket tickets tiket support sokongan dashboard fee fees yuran payment
bayaran bill bil cukai assessment interruption gangguan electricity elektrik lost hilang found giveaway giveaways
recommendation recommendations cadangan opening operasi mall lakeside jogging lake tasik pdpa delete padam badminton
yoga cycling cycle basikal jog fogging denggi dengue mosquito nyamuk log signout post posts hide sembunyi laluan
homepage broke break stolen steal rob robbed robbery rompak rompakan pecah dicuri mencuri attack attacked hurt injured
injury danger dangerous intruder suspicious mencurigakan ceroboh kongsi foryou metoo comingup
`;
const WEAK_TERMS = `
open buka close tutup closed hours waktu time masa post posts like share request minta collect ambil give beri
photo gambar picture location lokasi data language bahasa code kod status progress resolved light road roads jalan park
taman green room bilik meeting water air car kereta house rumah home name nama phone telefon cancel batal change tukar
filter tapis list senarai price harga free percuma kg broken rosak problem masalah help bantuan tolong page halaman edit
ubah lupa forgot
`;

const toSet = (s: string) => new Set(tokenize(s));
const STRONG = toSet(STRONG_TERMS);
const WEAK = toSet(WEAK_TERMS);

/** App phrases whose words are too common on their own. */
const PHRASES =
  /\b(for you|me too|coming up|log ?(in|out)|sign ?(in|out|up)|home ?page|pickup code|my (reports|food|bookings|profile)|all reports|privacy (&|and) settings|kata laluan)\b/i;

/** How strongly the words in a question relate to Neighbourly and City of Elmina. */
export function domainScore(text: string): number {
  let score = PHRASES.test(text) ? 1 : 0;
  for (const t of new Set(tokenize(text))) {
    if (STRONG.has(t)) score += 1;
    else if (WEAK.has(t)) score += 0.5;
  }
  return score;
}

/** Tasks that are never about the app, whatever words they mention. */
const OFF_TASK = [
  /\b(write|compose|create|generate|draft)\s+(me\s+)?(a|an|some|the)?\s*(poem|poetry|story|essay|song|lyrics|joke|rap|haiku|speech|cover letter|resume|cv|novel|article|blog post)\b/,
  /\b(tell|give)\s+me\s+(a\s+)?(joke|story|poem|riddle|fun fact)\b/,
  /\b(solve|simplify|integrate|differentiate)\b|\bequation\b|\d+\s*[-+*/×÷^]\s*\d+/,
  /\b(python|javascript|typescript|java|c\+\+|sql|html|css|php)\b/,
  /\btranslate\b.*\b(to|into)\s+(malay|english|chinese|mandarin|tamil|bahasa|french|japanese|korean|arabic)\b/,
  /\brecipe for\b|\b(give|share|send)\s+me\s+(a\s+)?recipe\b|\bhow\s+(do\s+i|to|can\s+i)\s+(cook|bake)\b/,
  /\b(homework|assignment|tuition question)\b/,
];

const GREETING = /^(hi+|hello|hey|hai|helo|halo|yo|salam|assalamualaikum|morning|good\s+(morning|afternoon|evening|night)|selamat\s+(pagi|tengah hari|petang|malam))(\s+(there|neighbourly|assistant|bot))?[\s!.,?]*$/;
const THANKS = /^(thanks?|thank\s+you|thx|tq|ty|terima\s+kasih|okay\s+thanks?|ok\s+thanks?|great,?\s+thanks?|cheers|noted|ok|okay|alright|baik)(\s+(so much|a lot|very much|banyak))?[\s!.,]*$/;
const CAPABILITIES =
  /\b(what can you (do|help( me)?( with)?)|who are you|what are you|how can you help|what do you know|what (questions )?can i ask|apa (yang )?(awak|anda|kamu) boleh (buat|bantu|tolong)|siapa (awak|anda|kamu))\b|^(help|tolong|bantuan|menu|start)[\s!?.]*$/;
const TICKET =
  /\b(support ticket|(create|open|raise|make|submit)\s+(a\s+)?ticket|talk to (a\s+)?(human|person|staff|someone|admin)|speak (to|with) (a\s+)?(human|person|staff|someone|admin)|real person|live agent|buat tiket|tiket sokongan|cakap dengan (orang|pegawai|staf|pengurusan))\b/;

const MALAY_WORDS = new Set(
  (
    "apa macam mana boleh nak bagaimana siapa bila kenapa mengapa tolong awak anda kamu saya tak tidak ke ini itu yang " +
    "untuk dengan ada adakah berapa kat dekat cara buat terima kasih selamat hai salam di dari pada sila kami kita ialah " +
    "jika kalau sudah dah belum akan mahu hendak perlu"
  ).split(" "),
);
const ENGLISH_WORDS = new Set(
  "the is are how what where when can do does i my you your a an to of in for on with this that it be have please".split(" "),
);

/** English or Bahasa Melayu, from the words used. Guide answers are in English either way. */
export function detectLanguage(text: string): ChatLanguage {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  let ms = 0;
  let en = 0;
  for (const w of words) {
    if (MALAY_WORDS.has(w)) ms += 1;
    else if (ENGLISH_WORDS.has(w)) en += 1;
  }
  return ms > en ? "ms" : "en";
}

/**
 * Attempts to change the assistant's rules or role. Guardrail: these never reach the model,
 * whatever else the message says.
 */
const INJECTION = [
  /\b(ignore|disregard|forget|override|bypass)\b.{0,40}\b(instruction|instructions|rules|prompt|guidelines|restrictions|above|previous)\b/,
  /\b(system|developer|hidden|initial)\s+(prompt|message|instructions)\b/,
  /\b(you are now|from now on you|act as|pretend (to be|you are)|roleplay as|role-play as|developer mode|jailbreak|do anything now|dan mode)\b/,
  /\b(reveal|show|print|repeat|leak)\b.{0,30}\b(prompt|instructions|rules|system message)\b/,
  /\babaikan\b.{0,30}\b(arahan|peraturan)\b/,
];

/** Why a message was declined, for logs and tests. */
export type OffTopicReason = "task" | "injection" | "no_township_words" | "model";

export interface Classification {
  intent: ChatIntent;
  language: ChatLanguage;
  /** Non-Latin script (Chinese, Tamil…) that the guide-only search can't read. */
  unreadableScript: boolean;
  /**
   * Certain enough to decline without asking the model: an unrelated task, an attempt to change
   * the rules, or no township words at all. Borderline questions go to the model, which decides.
   */
  certain: boolean;
  reason?: OffTopicReason;
}

/**
 * @param latest the resident's latest message
 * @param query  the retrieval query (the latest message, plus the previous one for short follow-ups)
 * @param hits   knowledge-base search results for `query`
 */
export function classifyQuestion(latest: string, query: string, hits: readonly SearchHit[]): Classification {
  const raw = latest.toLowerCase().normalize("NFKC").replace(/[’]/g, "'").trim();
  const language = detectLanguage(raw);
  const unreadableScript = /[஀-௿぀-ヿ㐀-鿿가-힯؀-ۿ]/.test(raw) && tokenize(raw).length === 0;
  const base = { language, unreadableScript, certain: false };

  if (INJECTION.some((re) => re.test(raw))) return { ...base, intent: "off_topic", certain: true, reason: "injection" };
  if (OFF_TASK.some((re) => re.test(raw))) return { ...base, intent: "off_topic", certain: true, reason: "task" };
  if (GREETING.test(raw)) return { ...base, intent: "greeting" };
  if (THANKS.test(raw)) return { ...base, intent: "thanks" };
  if (TICKET.test(raw)) return { ...base, intent: "ticket" };
  if (CAPABILITIES.test(raw)) return { ...base, intent: "capabilities" };
  if (tokenize(query).length === 0) return { ...base, intent: unreadableScript ? "uncovered" : "capabilities" };

  const score = domainScore(query);
  if (score >= 1 && isConfident(hits)) return { ...base, intent: "answer" };
  if (score >= 1) return { ...base, intent: "uncovered" };
  // Not a single township word: decline without spending model tokens.
  return { ...base, intent: "off_topic", certain: score === 0, reason: "no_township_words" };
}

const COMPLEX =
  /\b(why|explain|compare|difference|differences|better|best|should i|recommend|suggest|advice|advise|help me (decide|choose|plan|write)|pros and cons|what if|kenapa|mengapa|bandingkan|cadangkan)\b/;
const MULTI_PART = /\?.*\?|\b(and|also|then|plus|dan juga)\b.{0,40}\b(how|what|when|where|which|who|can|is|are|bagaimana|apa|bila)\b/;

/**
 * Token saver: a short, single question that matches one guide section clearly and almost
 * completely is answered straight from the guide, without the model. Follow-ups, multi-part
 * questions and requests for advice or explanations still go to the model.
 */
export function isSimpleQuestion(latest: string, query: string, hits: readonly SearchHit[]): boolean {
  const [top, second] = hits;
  if (!top || query.trim() !== latest.trim()) return false;
  const raw = latest.toLowerCase();
  if (raw.split(/\s+/).length > 14 || COMPLEX.test(raw) || MULTI_PART.test(raw)) return false;
  if (top.score < 5) return false;
  // Every word of the question is in the best section…
  if (top.matched === top.terms && top.coverage >= 0.99) return true;
  // …or nearly all of it, with no close runner-up.
  const clearWinner = !second || top.score >= second.score * 1.25;
  return top.matched / top.terms >= 0.6 && top.coverage >= 0.7 && clearWinner;
}
