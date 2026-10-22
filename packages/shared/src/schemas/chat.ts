import { z } from "zod";
import type { ChatIntent } from "../chat/topic";

export const CHAT_LIMITS = {
  /** Longest message a resident can send. */
  maxMessageChars: 1000,
  /** How many recent turns are sent to the model. */
  maxHistory: 10,
} as const;

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
  messages: z
    .array(ChatMessageSchema)
    .min(1)
    .max(30)
    .refine((m) => m[m.length - 1]?.role === "user", "The last message must be from the user")
    .refine(
      (m) => (m[m.length - 1]?.content.length ?? 0) <= CHAT_LIMITS.maxMessageChars,
      `Messages are limited to ${CHAT_LIMITS.maxMessageChars} characters`,
    ),
  page: z.string().max(100).optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export interface ChatSource {
  title: string;
  path: string;
  pathLabel: string;
}

export type ChatMode = "llm" | "guide" | "offline";

export type ChatAction = { type: "ticket"; subject: string } | { type: "link"; path: string; label: string };

/** Events streamed from POST /api/chat as Server-Sent Events. */
export type ChatStreamEvent =
  /** llm: written by the model. guide: answered from the guide to save tokens. offline: no model available. */
  | { event: "meta"; data: { mode: ChatMode; model: string | null; sources: ChatSource[]; cached?: boolean } }
  | { event: "delta"; data: { text: string } }
  | { event: "action"; data: ChatAction }
  /** Follow-up questions the resident can tap. */
  | { event: "suggestions"; data: { questions: string[] } }
  | { event: "done"; data: { finishReason: string; intent: ChatIntent } }
  | { event: "error"; data: { message: string } };
