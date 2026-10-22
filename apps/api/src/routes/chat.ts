/**
 * POST /api/chat: township assistant, streamed as Server-Sent Events.
 *
 * Guardrails (the assistant only helps with Neighbourly and City of Elmina):
 *   1. Input: attempts to change the rules ("ignore your instructions…"), unrelated tasks
 *      (essays, code, maths…) and messages with no township words are declined before any
 *      model call.
 *   2. Prompt: the model is told to decline anything else unrelated and mark it [[OFF_TOPIC]].
 *   3. Output: answers to borderline questions are held back until complete and replaced with a
 *      polite decline if the model drifted off topic.
 *
 * Token savers (simple questions don't use the model):
 *   - Greetings, thanks, "what can you do" and ticket requests get instant replies.
 *   - Short questions that clearly match one guide section are answered straight from the guide.
 *   - Repeated first questions are served from a short-lived answer cache.
 *   - Model prompts carry only the top guide sections and trimmed history, and the full app
 *     overview only when search found nothing good.
 *   - A model that is out of credits or rejects the key is rested instead of retried every time.
 */
import {
  CHAT_LIMITS,
  ChatRequestSchema,
  HANDOFF_MARKER,
  KNOWLEDGE_BASE,
  OFF_TOPIC_MARKER,
  SITE_PAGES,
  STARTER_QUESTIONS,
  buildModelMessages,
  classifyQuestion,
  composeOfflineAnswer,
  createMarkerFilter,
  domainScore,
  encodeSse,
  isConfident,
  isSimpleQuestion,
  isWeatherQuestion,
  offTopicMessage,
  redactPII,
  relatedQuestions,
  retrievalQuery,
  searchKnowledge,
  sourcesFromHits,
  type ChatAction,
  type ChatIntent,
  type ChatMode,
  type ChatSource,
  type ChatStreamEvent,
  type Weather,
} from "@neighbourly/shared";
import type { FastifyInstance, FastifyReply } from "fastify";
import type { Env } from "../env";
import { ModelError, type StreamCompletion } from "../chat/llm";

/** Running totals since the server started, shown on /api/health. */
export interface AssistantStats {
  questions: number;
  modelCalls: number;
  /** Answered without the model, by reason. */
  instant: number;
  fromGuide: number;
  fromCache: number;
  declined: number;
  promptTokens: number;
  completionTokens: number;
}

export const createAssistantStats = (): AssistantStats => ({
  questions: 0,
  modelCalls: 0,
  instant: 0,
  fromGuide: 0,
  fromCache: 0,
  declined: 0,
  promptTokens: 0,
  completionTokens: 0,
});

export interface ChatRouteOptions {
  env: Env;
  streamCompletion: StreamCompletion | null;
  /** Live weather for weather questions (optional). */
  getWeather?: () => Promise<Weather>;
  stats?: AssistantStats;
}

/** Intents answered instantly, without a model. */
const CANNED: ReadonlySet<ChatIntent> = new Set(["greeting", "thanks", "capabilities", "ticket"]);

const CACHE_SIZE = 200;
const CACHE_TTL_MS = 6 * 60 * 60_000;
/** How long to rest a model after "no credits", "bad key" (long) or "rate limited" (short). */
const REST_LASTING_MS = 10 * 60_000;
const REST_BRIEF_MS = 30_000;

interface CachedAnswer {
  at: number;
  model: string;
  text: string;
  sources: ChatSource[];
  suggestions: string[];
  intent: ChatIntent;
  action: ChatAction | null;
}

const cacheKey = (q: string) =>
  q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

/** Resolves to null instead of waiting longer than `ms` or failing. */
async function within<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => (timer = setTimeout(() => resolve(null), ms)));
  try {
    return await Promise.race([promise.catch(() => null), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function openEventStream(reply: FastifyReply) {
  reply.hijack();
  const raw = reply.raw;
  const inherited = Object.fromEntries(
    Object.entries(reply.getHeaders()).filter((entry): entry is [string, string | number | string[]] => entry[1] !== undefined),
  );
  raw.writeHead(200, {
    ...inherited,
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    "x-accel-buffering": "no",
  });
  let closed = false;
  const closeHandlers: Array<() => void> = [];
  raw.on("close", () => {
    closed = true;
    closeHandlers.forEach((fn) => fn());
  });
  return {
    send(event: ChatStreamEvent) {
      if (!closed) raw.write(encodeSse(event.event, event.data));
    },
    end() {
      if (!closed) raw.end();
    },
    onClose(fn: () => void) {
      closeHandlers.push(fn);
    },
    get closed() {
      return closed;
    },
  };
}

/** Splits text into word-sized pieces so guide answers stream like model answers. */
function* pieces(text: string): Generator<string> {
  const parts = text.match(/\S+\s*/g) ?? [text];
  for (let i = 0; i < parts.length; i += 4) yield parts.slice(i, i + 4).join("");
}

export async function chatRoutes(app: FastifyInstance, { env, streamCompletion, getWeather, stats = createAssistantStats() }: ChatRouteOptions) {
  const cache = new Map<string, CachedAnswer>();
  const restingUntil = new Map<string, number>();
  const models = [...new Set([env.model, env.fallbackModel])];
  const availableModels = () => (env.aiKey && streamCompletion ? models.filter((m) => (restingUntil.get(m) ?? 0) <= Date.now()) : []);

  app.post(
    "/api/chat",
    { config: { rateLimit: { max: env.chatRateLimit, timeWindow: "5 minutes" } } },
    async (request, reply) => {
      const parsed = ChatRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "invalid_request", message: parsed.error.issues[0]?.message ?? "Invalid request" });
      }

      const started = Date.now();
      stats.questions += 1;
      let redactions = 0;
      const history = parsed.data.messages.slice(-CHAT_LIMITS.maxHistory).map((m) => {
        const r = redactPII(m.content);
        redactions += r.count;
        return { role: m.role, content: r.text };
      });
      const question = history[history.length - 1]!.content;
      const firstTurn = history.filter((m) => m.role === "user").length === 1;
      const query = retrievalQuery(history);
      const hits = searchKnowledge(query, KNOWLEDGE_BASE, 4);
      const kind = classifyQuestion(question, query, hits);
      const confident = isConfident(hits);
      const weatherQuestion = isWeatherQuestion(query);
      const weather =
        getWeather && (kind.intent === "answer" || kind.intent === "uncovered") && weatherQuestion ? await within(getWeather(), 1500) : null;
      const pageLabel = SITE_PAGES.find((p) => p.path === parsed.data.page)?.label ?? null;

      const stream = openEventStream(reply);
      let mode: ChatMode = "offline";
      let modelUsed: string | null = null;
      let intent: ChatIntent = kind.intent;
      let action: ChatAction | null = null;
      let suggestions: string[] = [];
      let sources: ChatSource[] = [];
      let skipped: "instant" | "guide" | "cache" | "declined" | null = null;
      let usage = { prompt: 0, completion: 0 };

      const ready = availableModels();
      const key = cacheKey(question);
      const cached = firstTurn && !weatherQuestion ? cache.get(key) : undefined;

      if (CANNED.has(kind.intent)) skipped = "instant";
      else if (kind.intent === "off_topic" && kind.certain) skipped = "declined";
      else if (kind.intent === "answer" && isSimpleQuestion(question, query, hits)) skipped = "guide";
      else if (cached && Date.now() - cached.at < CACHE_TTL_MS && ready.length > 0) skipped = "cache";

      if (skipped === "cache" && cached) {
        mode = "llm";
        modelUsed = cached.model;
        ({ sources, suggestions, intent, action } = cached);
        stream.send({ event: "meta", data: { mode, model: modelUsed, sources, cached: true } });
        for (const text of pieces(cached.text)) stream.send({ event: "delta", data: { text } });
      } else if (!skipped && ready.length > 0 && streamCompletion) {
        // Borderline questions are held until complete, so an off-topic answer never reaches the resident.
        const hold = kind.intent === "off_topic";
        const messages = buildModelMessages(history, confident ? hits.slice(0, 2) : hits.slice(0, 3), {
          weather,
          pageLabel,
          includeOverview: !confident,
        });
        for (const model of ready) {
          if (stream.closed) break;
          const attempt = new AbortController();
          stream.onClose(() => attempt.abort());
          const timer = setTimeout(() => attempt.abort(), env.firstTokenTimeoutMs);
          const handoff = createMarkerFilter(HANDOFF_MARKER);
          const offTopic = createMarkerFilter(OFF_TOPIC_MARKER);
          let streamed = false;
          let announcedModel = model;
          let full = "";
          const emit = (text: string) => {
            if (!text) return;
            full += text;
            if (!hold) stream.send({ event: "delta", data: { text } });
          };
          try {
            stats.modelCalls += 1;
            for await (const chunk of streamCompletion({ model, messages, signal: attempt.signal })) {
              if (chunk.type === "model") announcedModel = chunk.model;
              if (chunk.type === "usage") usage = { prompt: chunk.promptTokens, completion: chunk.completionTokens };
              if (chunk.type !== "delta") continue;
              if (!streamed) {
                streamed = true;
                clearTimeout(timer);
                sources = confident ? sourcesFromHits(hits) : [];
                if (!hold) stream.send({ event: "meta", data: { mode: "llm", model: announcedModel, sources } });
              }
              emit(offTopic.push(handoff.push(chunk.text)));
            }
            if (streamed) {
              emit(offTopic.push(handoff.flush()) + offTopic.flush());
              mode = "llm";
              modelUsed = announcedModel;
              const drifted = hold && (offTopic.found || domainScore(full) < 1);
              if (offTopic.found || drifted) {
                intent = "off_topic";
                suggestions = STARTER_QUESTIONS[kind.language];
                sources = [];
              } else if (handoff.found) {
                intent = "uncovered";
                action = { type: "ticket", subject: question.slice(0, 90) };
                suggestions = relatedQuestions(hits, 3, false);
              } else {
                intent = "answer";
                suggestions = confident ? relatedQuestions(hits) : [];
              }
              if (hold) {
                const text = intent === "off_topic" ? offTopicMessage(kind.language) : full;
                stream.send({ event: "meta", data: { mode: "llm", model: modelUsed, sources } });
                for (const t of pieces(text)) stream.send({ event: "delta", data: { text: t } });
              }
              if (firstTurn && !weatherQuestion && (intent === "answer" || intent === "uncovered") && full.trim()) {
                if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value!);
                cache.set(key, { at: Date.now(), model: modelUsed, text: full, sources, suggestions, intent, action });
              }
              break;
            }
          } catch (err) {
            const lasting = err instanceof ModelError && err.lasting;
            const status = err instanceof ModelError ? err.status : 0;
            if (lasting || status === 429) restingUntil.set(model, Date.now() + (lasting ? REST_LASTING_MS : REST_BRIEF_MS));
            request.log.warn({ model, status, resting: lasting || status === 429, err: (err as Error).message.slice(0, 200) }, "chat model failed");
            if (streamed) {
              // Text already reached the resident, so finish this answer rather than restart it.
              stream.send({ event: "delta", data: { text: "\n\n_(The answer was cut off. Please ask again.)_" } });
              mode = "llm";
              modelUsed = announcedModel;
              intent = "answer";
              break;
            }
          } finally {
            clearTimeout(timer);
          }
        }
      }

      if (mode === "offline") {
        const answer = composeOfflineAnswer(question, hits, kind, { weather });
        // "guide" means the model was available but not needed; "offline" means it wasn't available.
        if (skipped && skipped !== "cache" && availableModels().length > 0) mode = "guide";
        sources = answer.sources;
        stream.send({ event: "meta", data: { mode, model: null, sources } });
        for (const text of pieces(answer.text)) stream.send({ event: "delta", data: { text } });
        intent = answer.intent;
        action = answer.action;
        suggestions = answer.suggestions;
      }

      if (action) stream.send({ event: "action", data: action });
      if (suggestions.length) stream.send({ event: "suggestions", data: { questions: suggestions } });
      stream.send({ event: "done", data: { finishReason: "stop", intent } });
      stream.end();

      if (skipped === "instant") stats.instant += 1;
      else if (skipped === "declined") stats.declined += 1;
      else if (skipped === "guide") stats.fromGuide += 1;
      else if (skipped === "cache") stats.fromCache += 1;
      stats.promptTokens += usage.prompt;
      stats.completionTokens += usage.completion;

      // Log what helps improve the guide, without personal data: the redacted question, no user identity.
      request.log.info(
        {
          chat: {
            mode,
            model: modelUsed,
            intent,
            skipped,
            guard: kind.reason ?? null,
            tokens: usage.prompt + usage.completion,
            ms: Date.now() - started,
            sources: sources.map((s) => s.path),
            handoff: action?.type === "ticket",
            redactions,
            question: question.slice(0, 200),
          },
        },
        "chat answered",
      );
    },
  );
}
