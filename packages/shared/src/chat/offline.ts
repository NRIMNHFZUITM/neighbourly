/**
 * Answers straight from the knowledge base, with no language model. Used when no OpenRouter
 * key is configured, when every model fails, and in the browser when the API is unreachable.
 */
import type { ChatAction, ChatSource } from "../schemas/chat";
import type { Weather } from "../schemas/weather";
import { weatherSummary } from "../weather";
import type { SearchHit } from "./search";
import type { ChatIntent, ChatLanguage, Classification } from "./topic";

export function sourcesFromHits(hits: readonly SearchHit[], max = 3): ChatSource[] {
  const seen = new Set<string>();
  const out: ChatSource[] = [];
  for (const { chunk } of hits) {
    if (seen.has(chunk.path)) continue;
    seen.add(chunk.path);
    out.push({ title: chunk.heading, path: chunk.path, pathLabel: chunk.pathLabel });
    if (out.length >= max) break;
  }
  return out;
}

/** Other guide questions worth offering as follow-ups, best first. */
export function relatedQuestions(hits: readonly SearchHit[], max = 3, skipFirst = true): string[] {
  const top = hits[0];
  if (!top) return [];
  return hits
    .slice(skipFirst ? 1 : 0)
    .filter((h) => h.score >= top.score * 0.35)
    .map((h) => h.chunk.heading)
    .filter((q, i, all) => all.indexOf(q) === i)
    .slice(0, max);
}

function trimAtParagraph(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf("\n\n", max);
  return `${text.slice(0, cut > max / 2 ? cut : max).trimEnd()}…`;
}

/** Example questions that the guide answers well, in the resident's language. */
export const STARTER_QUESTIONS: Record<ChatLanguage, string[]> = {
  en: [
    "How do I report a broken streetlight?",
    "How do I share surplus food?",
    "How do I book the multipurpose hall?",
    "How do I create a community event?",
  ],
  ms: [
    "Macam mana nak buat aduan lampu jalan rosak?",
    "Macam mana nak kongsi lebihan makanan?",
    "Macam mana nak tempah dewan serbaguna?",
    "Macam mana nak buat acara komuniti?",
  ],
};

const MESSAGES = {
  en: {
    greeting:
      "Hi! I'm the Neighbourly Assistant. Ask me how to do anything in the app and I'll walk you through it step by step. I can also answer questions about township rules, opening hours and safety in City of Elmina.",
    thanks: "You're welcome! Is there anything else I can help you with in Neighbourly?",
    capabilities:
      "I can explain how to use every part of Neighbourly, step by step, and answer questions about living in City of Elmina:\n\n" +
      "- **TownCare**: report a problem and follow the fix\n" +
      "- **EcoFood**: share or collect surplus food\n" +
      "- **Facilities**: book the hall, gym studio, BBQ pit or meeting room\n" +
      "- **Community**: posts, events and the neighbour directory\n" +
      "- **Places**: find facilities and local shops on the map\n" +
      "- **Your account**: verification, notifications and privacy\n" +
      "- **Township info**: rules, opening hours, waste and recycling, and wildlife safety\n\n" +
      "What would you like to know?",
    offTopic:
      "Sorry, I can't answer that because it isn't about Neighbourly. I can only help with using the app and with life in City of Elmina, such as reporting issues, sharing food, booking facilities, community events, and township rules and safety.\n\nTry one of the questions below.",
    uncovered:
      "I couldn't find that in the Neighbourly guide. Tap **Create a support ticket** below and Township Management will follow up, or try asking in a different way.",
    ticket:
      "Sure. Tap **Create a support ticket** below, check the subject, describe what happened, where and when, and tap **Send ticket**. Township Management will see your name and unit so they can follow up, and you'll get a notification when it's resolved.",
    script:
      "In guide-only mode I can read questions in English and Bahasa Melayu. Please ask again in one of those languages, for example: \"How do I book the multipurpose hall?\"",
    guideInEnglish: "",
  },
  ms: {
    greeting:
      "Hai! Saya Pembantu Neighbourly. Tanya saya cara menggunakan apa-apa ciri dalam aplikasi ini dan saya akan terangkan langkah demi langkah. Saya juga boleh menjawab soalan tentang peraturan, waktu operasi dan keselamatan di City of Elmina.",
    thanks: "Sama-sama! Ada apa-apa lagi yang saya boleh bantu tentang Neighbourly?",
    capabilities:
      "Saya boleh terangkan cara menggunakan setiap bahagian Neighbourly, langkah demi langkah, dan menjawab soalan tentang kehidupan di City of Elmina:\n\n" +
      "- **TownCare**: buat aduan dan ikuti status pembaikan\n" +
      "- **EcoFood**: kongsi atau ambil lebihan makanan\n" +
      "- **Facilities**: tempah dewan, studio gim, tapak BBQ atau bilik mesyuarat\n" +
      "- **Community**: siaran, acara dan direktori jiran\n" +
      "- **Places**: cari kemudahan dan kedai tempatan di peta\n" +
      "- **Akaun anda**: pengesahan, pemberitahuan dan privasi\n" +
      "- **Maklumat perbandaran**: peraturan, waktu operasi, sampah dan kitar semula, serta keselamatan hidupan liar\n\n" +
      "Apa yang anda ingin tahu?",
    offTopic:
      "Maaf, saya tidak dapat menjawab soalan itu kerana ia bukan tentang Neighbourly. Saya hanya boleh membantu tentang penggunaan aplikasi ini dan kehidupan di City of Elmina, seperti membuat aduan, berkongsi makanan, menempah kemudahan, acara komuniti, serta peraturan dan keselamatan perbandaran.\n\nCuba salah satu soalan di bawah.",
    uncovered:
      "Saya tidak menemui jawapan itu dalam panduan Neighbourly. Tekan **Create a support ticket** di bawah supaya Pengurusan Perbandaran boleh membantu, atau cuba tanya dengan cara lain.",
    ticket:
      "Boleh. Tekan **Create a support ticket** di bawah, semak subjek, terangkan apa yang berlaku, di mana dan bila, kemudian tekan **Send ticket**. Pengurusan Perbandaran akan melihat nama dan unit anda supaya mereka boleh membantu, dan anda akan menerima pemberitahuan apabila ia selesai.",
    script:
      "Dalam mod panduan, saya boleh membaca soalan dalam Bahasa Inggeris dan Bahasa Melayu. Sila tanya sekali lagi dalam salah satu bahasa itu.",
    guideInEnglish: "\n\n_Panduan ini dalam Bahasa Inggeris._",
  },
} as const;

export function offTopicMessage(language: ChatLanguage): string {
  return MESSAGES[language].offTopic;
}

export interface OfflineAnswer {
  text: string;
  sources: ChatSource[];
  action: ChatAction | null;
  /** Follow-up questions shown as tappable chips. */
  suggestions: string[];
  intent: ChatIntent;
}

export interface OfflineExtras {
  /** Live weather for City of Elmina, for weather questions. */
  weather?: Weather | null;
}

const WEATHER_SECTION = "home-page#where-can-i-check-the-weather";

export function composeOfflineAnswer(
  question: string,
  hits: readonly SearchHit[],
  c: Classification,
  extras: OfflineExtras = {},
): OfflineAnswer {
  const m = MESSAGES[c.language];
  const starters = STARTER_QUESTIONS[c.language];
  const subject = question.slice(0, 90);

  if (c.unreadableScript) return { text: m.script, sources: [], action: null, suggestions: STARTER_QUESTIONS.en, intent: "capabilities" };

  switch (c.intent) {
    case "greeting":
    case "capabilities":
      return { text: m[c.intent], sources: [], action: null, suggestions: starters, intent: c.intent };
    case "thanks":
      return { text: m.thanks, sources: [], action: null, suggestions: [], intent: "thanks" };
    case "off_topic":
      return { text: m.offTopic, sources: [], action: null, suggestions: starters, intent: "off_topic" };
    case "ticket":
      return {
        text: m.ticket,
        sources: [{ title: "Support tickets", path: "/assistant", pathLabel: "Assistant" }],
        action: { type: "ticket", subject },
        suggestions: [],
        intent: "ticket",
      };
    case "uncovered": {
      const nearby = relatedQuestions(hits, 3, false);
      return { text: m.uncovered, sources: [], action: { type: "ticket", subject }, suggestions: nearby, intent: "uncovered" };
    }
    case "answer": {
      const [top] = hits as [SearchHit, ...SearchHit[]];
      let text = `**${top.chunk.heading}**\n\n${trimAtParagraph(top.chunk.text, 2400)}`;
      if (top.chunk.id === WEATHER_SECTION && extras.weather) text = `${weatherSummary(extras.weather)}\n\n${text}`;
      return {
        text: text + m.guideInEnglish,
        sources: sourcesFromHits(hits),
        action: null,
        suggestions: relatedQuestions(hits),
        intent: "answer",
      };
    }
  }
}
