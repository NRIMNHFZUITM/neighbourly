/**
 * Keyword retrieval over the township knowledge base (BM25). The plan calls keyword search
 * "enough for a hackathon"; the same function powers the server and the offline fallback.
 */
import type { KbChunk, KnowledgeBase } from "./kb-types";

const STOPWORDS = new Set(
  (
    // English
    "a an and are as at be but by can could do does for from get got have how i if in into is it its me my of on " +
    "or our please should so than that the their them then there these they this to us was we what when " +
    "who why will with would you your yours hi hello thanks thank im ive dont want need know tell about any " +
    "very really just also " +
    "wont cant isnt doesnt didnt arent whats hows theres youre ill id " +
    // Bahasa Melayu
    "yang dan di ke dari untuk saya apa bagaimana macam mana boleh ada ini itu nak tak tidak dengan atau pada " +
    "adalah akan juga lagi kami kita awak anda sila tolong terima kasih"
  ).split(" "),
);

function stem(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

/** App phrases made of stopwords ("For you", "Me too", "Coming up") become one searchable term. */
const PHRASE_TERMS: Array<[RegExp, string]> = [
  [/\bfor you\b/g, "foryou"],
  [/\bme too\b/g, "metoo"],
  [/\bcoming up\b/g, "comingup"],
];

export function tokenize(text: string): string[] {
  let lower = text.toLowerCase();
  for (const [re, term] of PHRASE_TERMS) lower = lower.replace(re, term);
  return lower
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}

interface IndexedChunk {
  chunk: KbChunk;
  tf: Map<string, number>;
  length: number;
}

interface Index {
  docs: IndexedChunk[];
  df: Map<string, number>;
  avgLength: number;
}

const cache = new WeakMap<KnowledgeBase, Index>();

function buildIndex(kb: KnowledgeBase): Index {
  const docs = kb.chunks.map((chunk) => {
    // Field boosts by repetition: headings and section keywords matter most; file-level
    // keywords only nudge the right file up without favouring one of its sections.
    const heading = tokenize(chunk.heading);
    const keywords = tokenize(chunk.keywords.join(" "));
    const tokens = [
      ...heading,
      ...heading,
      ...heading,
      ...keywords,
      ...keywords,
      ...keywords,
      ...tokenize(chunk.docKeywords.join(" ")),
      ...tokenize(chunk.title),
      ...tokenize(chunk.text),
    ];
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { chunk, tf, length: tokens.length };
  });
  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const avgLength = docs.reduce((s, d) => s + d.length, 0) / Math.max(docs.length, 1);
  return { docs, df, avgLength };
}

export interface SearchHit {
  chunk: KbChunk;
  score: number;
  /** Distinct query terms found in this section, out of `terms`. */
  matched: number;
  terms: number;
  /** Share of the query's information (idf-weighted) this section matches; words the guide never uses weigh most. */
  coverage: number;
}

export function searchKnowledge(query: string, kb: KnowledgeBase, limit = 4): SearchHit[] {
  let index = cache.get(kb);
  if (!index) {
    index = buildIndex(kb);
    cache.set(kb, index);
  }
  const terms = [...new Set(tokenize(query))];
  if (terms.length === 0) return [];

  const k1 = 1.2;
  const b = 0.75;
  const n = index.docs.length;
  const idfOf = (term: string) => {
    const df = index.df.get(term) ?? 0;
    return Math.log(1 + (n - df + 0.5) / (df + 0.5));
  };
  const totalIdf = terms.reduce((sum, t) => sum + idfOf(t), 0);
  const hits: SearchHit[] = [];
  for (const doc of index.docs) {
    let score = 0;
    let matched = 0;
    let matchedIdf = 0;
    for (const term of terms) {
      const f = doc.tf.get(term);
      if (!f) continue;
      matched += 1;
      const idf = idfOf(term);
      matchedIdf += idf;
      score += (idf * (f * (k1 + 1))) / (f + k1 * (1 - b + (b * doc.length) / index.avgLength));
    }
    if (score > 0) hits.push({ chunk: doc.chunk, score, matched, terms: terms.length, coverage: matchedIdf / totalIdf });
  }
  return hits.sort((a, b2) => b2.score - a.score).slice(0, limit);
}

/** Below this score the guide probably doesn't cover the question, so we offer a handoff. */
export const CONFIDENT_SCORE = 3;
/** A strong match on one incidental word ("night") shouldn't count as an answer. */
export const MIN_TERM_COVERAGE = 0.34;
/** Common words ("new", "open", "Elmina") can't carry a question the guide doesn't cover. */
export const MIN_WEIGHTED_COVERAGE = 0.42;

export function isConfident(hits: readonly SearchHit[]): boolean {
  const top = hits[0];
  if (!top) return false;
  return top.score >= CONFIDENT_SCORE && top.matched / top.terms >= MIN_TERM_COVERAGE && top.coverage >= MIN_WEIGHTED_COVERAGE;
}
