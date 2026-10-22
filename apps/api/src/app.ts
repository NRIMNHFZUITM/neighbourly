import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { KNOWLEDGE_BASE } from "@neighbourly/shared";
import Fastify from "fastify";
import { createChatStream, type StreamCompletion } from "./chat/llm";
import type { Env } from "./env";
import { chatRoutes, createAssistantStats } from "./routes/chat";
import { weatherRoutes } from "./routes/weather";
import { createWeatherService } from "./weather-service";

export interface AppDeps {
  /** Override the OpenRouter client (tests). */
  streamCompletion?: StreamCompletion | null;
  /** Override the Open-Meteo call (tests). */
  fetchWeather?: () => Promise<unknown>;
}

export async function buildApp(env: Env, deps: AppDeps = {}) {
  const app = Fastify({
    logger: env.logLevel === "silent" ? false : { level: env.logLevel },
    bodyLimit: 64 * 1024,
  });

  await app.register(cors, { origin: env.webOrigins });
  await app.register(rateLimit, { global: false });

  const streamCompletion =
    deps.streamCompletion !== undefined
      ? deps.streamCompletion
      : env.aiKey
        ? createChatStream({ provider: env.aiProvider, apiKey: env.aiKey, appUrl: env.appUrl, appName: "Neighbourly", maxTokens: env.maxOutputTokens })
        : null;
  const stats = createAssistantStats();

  app.get("/api/health", async () => ({
    ok: true,
    assistant: env.aiKey ? "llm" : "guide-only",
    provider: env.aiKey ? env.aiProvider : null,
    model: env.aiKey ? env.model : null,
    fallbackModel: env.aiKey ? env.fallbackModel : null,
    // How many questions were answered without spending model tokens, and the tokens used.
    usage: stats,
    knowledgeBase: { version: KNOWLEDGE_BASE.version, sections: KNOWLEDGE_BASE.chunks.length },
  }));

  const weather = createWeatherService({
    fetchWeather: deps.fetchWeather,
    onError: (err) => app.log.warn({ err: err.message }, "weather fetch failed"),
  });

  await app.register(chatRoutes, { env, streamCompletion, getWeather: () => weather.get(), stats });
  await app.register(weatherRoutes, { weather });

  return app;
}
