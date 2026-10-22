/**
 * Minimal streaming client for OpenAI-compatible chat completions (OpenAI or OpenRouter).
 * The API key stays on the server; the browser only ever talks to POST /api/chat.
 */
import { createSseParser, type ModelMessage, type SseMessage } from "@neighbourly/shared";
import type { AiProvider } from "../env";

const ENDPOINTS: Record<AiProvider, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
};

export interface CompletionRequest {
  model: string;
  messages: ModelMessage[];
  signal: AbortSignal;
}

export type CompletionChunk =
  | { type: "model"; model: string }
  | { type: "delta"; text: string }
  | { type: "usage"; promptTokens: number; completionTokens: number }
  | { type: "finish"; reason: string };

/** Injected into the chat route so tests can replace the provider with a fake. */
export type StreamCompletion = (req: CompletionRequest) => AsyncIterable<CompletionChunk>;

export class ModelError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Retrying soon won't help (no credits, bad key, no access): rest the model for a while. */
    readonly lasting: boolean,
  ) {
    super(message);
    this.name = "ModelError";
  }
}

interface StreamChunk {
  model?: string;
  error?: { message?: string; code?: number | string };
  choices?: Array<{ delta?: { content?: string | null }; finish_reason?: string | null }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
}

/** Reasoning models (gpt-5, o-series) take different parameters from classic chat models. */
const isReasoningModel = (model: string) => /^(openai\/)?(gpt-5|o\d)/.test(model);

export function requestBody(provider: AiProvider, model: string, messages: ModelMessage[], maxTokens: number) {
  const body: Record<string, unknown> = { model, messages, stream: true };
  if (isReasoningModel(model)) {
    body.max_completion_tokens = maxTokens * 2; // leave room for (low-effort) reasoning
    body.reasoning_effort = "low";
  } else {
    body.max_tokens = maxTokens;
    body.temperature = 0.2;
  }
  if (provider === "openai") body.stream_options = { include_usage: true };
  else body.usage = { include: true };
  return body;
}

export function createChatStream(config: {
  provider: AiProvider;
  apiKey: string;
  appUrl: string;
  appName: string;
  maxTokens: number;
}): StreamCompletion {
  return async function* streamCompletion({ model, messages, signal }) {
    const headers: Record<string, string> = { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" };
    if (config.provider === "openrouter") {
      headers["http-referer"] = config.appUrl;
      headers["x-title"] = config.appName;
    }
    const res = await fetch(ENDPOINTS[config.provider], {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody(config.provider, model, messages, config.maxTokens)),
      signal,
    });
    if (!res.ok || !res.body) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      const lasting = [401, 402, 403, 404].includes(res.status) || /insufficient_quota|no credits|billing/i.test(detail);
      throw new ModelError(`${config.provider} returned ${res.status}: ${detail}`, res.status, lasting);
    }

    const decoder = new TextDecoder();
    const queue: SseMessage[] = [];
    const parser = createSseParser((m) => queue.push(m));
    let announced = false;

    for await (const bytes of res.body) {
      parser.push(decoder.decode(bytes, { stream: true }));
      while (queue.length) {
        const msg = queue.shift()!;
        if (msg.data === "[DONE]") return;
        let chunk: StreamChunk;
        try {
          chunk = JSON.parse(msg.data) as StreamChunk;
        } catch {
          continue;
        }
        if (chunk.error) throw new ModelError(chunk.error.message ?? "Stream error", Number(chunk.error.code) || 502, false);
        if (!announced && chunk.model) {
          announced = true;
          yield { type: "model", model: chunk.model };
        }
        const choice = chunk.choices?.[0];
        const text = choice?.delta?.content;
        if (text) yield { type: "delta", text };
        if (choice?.finish_reason) yield { type: "finish", reason: choice.finish_reason };
        if (chunk.usage) {
          yield { type: "usage", promptTokens: chunk.usage.prompt_tokens ?? 0, completionTokens: chunk.usage.completion_tokens ?? 0 };
        }
      }
    }
  };
}
