import type { ChatAction, ChatIntent, ChatMode, ChatSource } from "@neighbourly/shared";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

export interface ChatUiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "streaming" | "done" | "error";
  mode?: ChatMode;
  model?: string | null;
  sources?: ChatSource[];
  action?: ChatAction | null;
  /** Follow-up questions the resident can tap. */
  suggestions?: string[];
  intent?: ChatIntent;
}

interface ChatState {
  messages: ChatUiMessage[];
  streaming: boolean;
  append: (m: ChatUiMessage) => void;
  update: (id: string, patch: Partial<ChatUiMessage>) => void;
  appendText: (id: string, text: string) => void;
  setStreaming: (v: boolean) => void;
  reset: () => void;
}

const safeSession: StateStorage = {
  getItem: (k) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      sessionStorage.setItem(k, v);
    } catch {
      // ignore
    }
  },
  removeItem: (k) => {
    try {
      sessionStorage.removeItem(k);
    } catch {
      // ignore
    }
  },
};

/** The conversation lives in this tab only (sessionStorage), never in shared storage. */
export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      streaming: false,
      append: (m) => set((s) => ({ messages: [...s.messages, m] })),
      update: (id, patch) => set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      appendText: (id, text) =>
        set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, content: m.content + text } : m)) })),
      setStreaming: (streaming) => set({ streaming }),
      reset: () => set({ messages: [], streaming: false }),
    }),
    {
      name: "neighbourly-chat",
      storage: createJSONStorage(() => safeSession),
      partialize: (s) => ({ messages: s.messages.filter((m) => m.status !== "streaming") }),
    },
  ),
);
