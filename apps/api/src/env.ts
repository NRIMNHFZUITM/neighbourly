/** Server configuration. Secrets come from the environment (or apps/api/.env), never from the repo. */

export type AiProvider = "openai" | "openrouter";

export interface Env {
  port: number;
  host: string;
  /** Browser origins allowed to call the API directly (the Vite dev proxy doesn't need this). */
  webOrigins: string[];
  /** Public URL of the web app, sent to OpenRouter for app attribution. */
  appUrl: string;
  /** Which model provider the key belongs to. OpenAI wins when both keys are set. */
  aiProvider: AiProvider;
  /** API key for the provider. Without one, the assistant answers from the township guide only. */
  aiKey: string | null;
  model: string;
  fallbackModel: string;
  /** Longest answer the model may write, in tokens. */
  maxOutputTokens: number;
  /** Chat requests allowed per client every 5 minutes. */
  chatRateLimit: number;
  /** Give up on a model (and try the next) if it hasn't produced text by then. */
  firstTokenTimeoutMs: number;
  /** Behind a proxy (Vercel), take the client IP from X-Forwarded-For so rate limits are per person. */
  trustProxy: boolean;
  logLevel: string;
}

const int = (value: string | undefined, fallback: number) => {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
};

/** Low-cost, fast models per provider. Both OpenAI models were on the account's model list in Oct 2026. */
const DEFAULT_MODELS: Record<AiProvider, { model: string; fallback: string }> = {
  openai: { model: "gpt-4.1-mini", fallback: "gpt-4o-mini" },
  openrouter: { model: "anthropic/claude-haiku-5.5", fallback: "google/gemini-3.5-flash-lite" },
};

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const openAiKey = source.OPENAI_API_KEY?.trim() || null;
  const openRouterKey = source.OPENROUTER_API_KEY?.trim() || null;
  const aiProvider: AiProvider = openAiKey || !openRouterKey ? "openai" : "openrouter";
  const defaults = DEFAULT_MODELS[aiProvider];
  return {
    port: int(source.PORT, 8787),
    host: source.HOST ?? "127.0.0.1",
    webOrigins: (source.WEB_ORIGINS ?? "http://localhost:5173,http://localhost:4173")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    appUrl: source.APP_URL ?? "http://localhost:5173",
    aiProvider,
    aiKey: openAiKey ?? openRouterKey,
    model: source.CHAT_MODEL ?? source.OPENROUTER_MODEL ?? defaults.model,
    fallbackModel: source.CHAT_FALLBACK_MODEL ?? source.OPENROUTER_FALLBACK_MODEL ?? defaults.fallback,
    maxOutputTokens: int(source.CHAT_MAX_OUTPUT_TOKENS, 600),
    chatRateLimit: int(source.CHAT_RATE_LIMIT, 20),
    firstTokenTimeoutMs: int(source.CHAT_FIRST_TOKEN_TIMEOUT_MS, 15_000),
    trustProxy: source.VERCEL === "1" || source.TRUST_PROXY === "true",
    logLevel: source.LOG_LEVEL ?? "info",
  };
}

/** Loads apps/api/.env when present. Real deployments set variables in the host's dashboard instead. */
export function loadDotEnv(): void {
  try {
    process.loadEnvFile(new URL("../.env", import.meta.url));
  } catch {
    // No .env file: rely on the process environment.
  }
}
