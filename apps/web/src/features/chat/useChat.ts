import {
  CHAT_LIMITS,
  KNOWLEDGE_BASE,
  classifyQuestion,
  composeOfflineAnswer,
  createSseParser,
  retrievalQuery,
  searchKnowledge,
  type ChatAction,
  type ChatIntent,
  type ChatMessage,
  type ChatMode,
  type ChatSource,
} from "@neighbourly/shared";
import { useChatStore } from "./store";

let controller: AbortController | null = null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const newId = () => Math.random().toString(36).slice(2, 10);

/**
 * When the API isn't reachable (static deploy, server down, flaky Wi-Fi at the pitch) the
 * assistant still answers, from the same knowledge base, entirely in the browser.
 */
async function answerOffline(id: string, history: ChatMessage[]) {
  const { update, appendText } = useChatStore.getState();
  const question = history[history.length - 1]!.content;
  const query = retrievalQuery(history);
  const hits = searchKnowledge(query, KNOWLEDGE_BASE, 4);
  const answer = composeOfflineAnswer(question, hits, classifyQuestion(question, query, hits));
  update(id, { mode: "offline", model: null, sources: answer.sources, action: answer.action, suggestions: answer.suggestions, intent: answer.intent });
  const words = answer.text.match(/\S+\s*/g) ?? [answer.text];
  for (let i = 0; i < words.length; i += 3) {
    appendText(id, words.slice(i, i + 3).join(""));
    await sleep(16);
  }
}

export async function sendChatMessage(text: string, page?: string): Promise<void> {
  const store = useChatStore.getState();
  const content = text.trim().slice(0, CHAT_LIMITS.maxMessageChars);
  if (!content || store.streaming) return;

  const userMsg = { id: newId(), role: "user" as const, content, status: "done" as const };
  const assistantId = newId();
  const history: ChatMessage[] = [...store.messages, userMsg]
    .filter((m) => m.status === "done" && m.content)
    .slice(-CHAT_LIMITS.maxHistory)
    .map((m) => ({ role: m.role, content: m.content }));

  store.append(userMsg);
  store.append({ id: assistantId, role: "assistant", content: "", status: "streaming" });
  store.setStreaming(true);
  controller = new AbortController();
  const { update, appendText } = useChatStore.getState();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "text/event-stream" },
      body: JSON.stringify({ messages: history, page }),
      signal: controller.signal,
    });
    if (res.status === 429) {
      update(assistantId, { content: "You're sending messages quickly. Please wait a minute and try again.", status: "error" });
      return;
    }
    if (res.status === 400) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      update(assistantId, { content: body?.message ?? "I couldn't read that message.", status: "error" });
      return;
    }
    if (!res.ok || !res.body || !(res.headers.get("content-type") ?? "").includes("text/event-stream")) {
      await answerOffline(assistantId, history);
      update(assistantId, { status: "done" });
      return;
    }

    const parser = createSseParser(({ event, data }) => {
      const payload = JSON.parse(data) as Record<string, unknown>;
      if (event === "meta") {
        update(assistantId, {
          mode: payload.mode as ChatMode,
          model: (payload.model as string | null) ?? null,
          sources: payload.sources as ChatSource[],
        });
      } else if (event === "delta") {
        appendText(assistantId, String(payload.text ?? ""));
      } else if (event === "action") {
        update(assistantId, { action: payload as unknown as ChatAction });
      } else if (event === "suggestions") {
        update(assistantId, { suggestions: (payload.questions as string[] | undefined) ?? [] });
      } else if (event === "done") {
        update(assistantId, { intent: payload.intent as ChatIntent | undefined });
      } else if (event === "error") {
        update(assistantId, { status: "error", content: String(payload.message ?? "Something went wrong.") });
      }
    });
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.push(value);
    }
    parser.flush();
    const final = useChatStore.getState().messages.find((m) => m.id === assistantId);
    if (final && final.status !== "error") update(assistantId, { status: "done" });
  } catch {
    if (controller?.signal.aborted) {
      const current = useChatStore.getState().messages.find((m) => m.id === assistantId);
      update(assistantId, { status: "done", content: current?.content || "_Stopped._" });
    } else {
      await answerOffline(assistantId, history);
      update(assistantId, { status: "done" });
    }
  } finally {
    useChatStore.getState().setStreaming(false);
    controller = null;
  }
}

export function stopChat() {
  controller?.abort();
}

export const SUGGESTED_QUESTIONS = [
  "How do I report a broken streetlight?",
  "How do I share surplus food?",
  "How do I book the multipurpose hall?",
  "How do I create a community event?",
  "Who can see my name on a report?",
  "Macam mana nak tempah dewan?",
];
