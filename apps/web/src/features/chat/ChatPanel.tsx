import { CreateTicketInput, SupportTicketSchema, type CreateTicketInputType } from "@neighbourly/shared";
import { useMutation } from "@tanstack/react-query";
import { ArrowUpRight, LifeBuoy, RotateCcw, SendHorizontal, Sparkles, Square, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Markdown from "react-markdown";
import { Link, useLocation } from "react-router";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { validate, type FieldErrors } from "@/lib/forms";
import { useChatStore, type ChatUiMessage } from "./store";
import { SUGGESTED_QUESTIONS, sendChatMessage, stopChat } from "./useChat";

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1" aria-label="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </span>
  );
}

function MessageBubble({
  m,
  onTicket,
  onAsk,
  isLatest,
}: {
  m: ChatUiMessage;
  onTicket: (subject: string) => void;
  onAsk: (question: string) => void;
  /** Follow-up suggestions only show under the newest answer. */
  isLatest: boolean;
}) {
  const offTopic = m.intent === "off_topic";
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-700 px-3.5 py-2.5 text-sm whitespace-pre-wrap text-white">{m.content}</div>
      </div>
    );
  }
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
        <Sparkles className="size-4" />
      </span>
      <div className="min-w-0 max-w-[88%] space-y-2">
        <div
          className={cn(
            "rounded-2xl rounded-tl-md border px-3.5 py-2.5 text-sm leading-relaxed",
            m.status === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-neutral-200 bg-white text-neutral-800",
          )}
        >
          {m.content ? (
            <div className="nb-md">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) =>
                    href?.startsWith("/") ? (
                      <Link to={href}>{children}</Link>
                    ) : (
                      <a href={href} target="_blank" rel="noreferrer">
                        {children}
                      </a>
                    ),
                }}
              >
                {m.content}
              </Markdown>
            </div>
          ) : (
            <TypingDots />
          )}
        </div>
        {m.status === "done" && !offTopic && m.sources && m.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {m.sources.map((s) => (
              <Link
                key={s.path}
                to={s.path}
                className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 hover:bg-brand-100"
              >
                {s.pathLabel} <ArrowUpRight className="size-3" />
              </Link>
            ))}
          </div>
        )}
        {m.status === "done" && m.action?.type === "ticket" && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
            <LifeBuoy className="size-4 shrink-0" />
            <span className="flex-1">Need a person? Township Management can follow up.</span>
            <Button size="sm" variant="outline" onClick={() => onTicket(m.action?.type === "ticket" ? m.action.subject : "")}>
              Create a support ticket
            </Button>
          </div>
        )}
        {isLatest && m.status === "done" && m.suggestions && m.suggestions.length > 0 && (
          <div className="space-y-1.5 pt-0.5">
            <p className="text-[11px] font-semibold text-neutral-400">{offTopic || m.intent === "greeting" || m.intent === "capabilities" ? "Try asking" : "Related questions"}</p>
            <div className="flex flex-wrap gap-1.5">
              {m.suggestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onAsk(q)}
                  className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-left text-xs text-neutral-700 transition hover:border-brand-300 hover:bg-brand-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {m.status === "done" && m.mode !== "llm" && m.content && (m.intent === undefined || m.intent === "answer") && (
          <p className="text-[11px] text-neutral-400">
            {m.mode === "guide" ? "Instant answer from the township guide." : "Answered from the township guide (AI model unavailable)."}
          </p>
        )}
      </div>
    </div>
  );
}

/** Rendered with a key per draft, so each ticket starts from the question that prompted it. */
function TicketDialog({ draft, onClose }: { draft: { subject: string; body: string }; onClose: () => void }) {
  const [form, setForm] = useState(draft);
  const [errors, setErrors] = useState<FieldErrors>({});
  const append = useChatStore((s) => s.append);

  const create = useMutation({
    mutationFn: (input: CreateTicketInputType) => api("/api/support-tickets", { body: input, schema: SupportTicketSchema }),
    onSuccess: (ticket) => {
      toast.success(`Ticket ${ticket.reference} created`);
      append({
        id: Math.random().toString(36).slice(2),
        role: "assistant",
        status: "done",
        content: `Done! I've created ticket **${ticket.reference}** for Township Management. You'll get a notification when they reply.`,
      });
      onClose();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validate(CreateTicketInput, { ...form, source: "assistant" });
    if (result.errors) return setErrors(result.errors);
    create.mutate(result.data);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Create a support ticket" description="Township Management will see your name and unit so they can follow up. Other residents won't.">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Subject" htmlFor="ticket-subject" error={errors.subject}>
            <Input id="ticket-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} maxLength={100} />
          </Field>
          <Field label="Details" htmlFor="ticket-body" error={errors.body}>
            <Textarea id="ticket-body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={1000} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Send ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ChatPanel({ onClose }: { onClose?: () => void }) {
  const messages = useChatStore((s) => s.messages);
  const streaming = useChatStore((s) => s.streaming);
  const reset = useChatStore((s) => s.reset);
  const [input, setInput] = useState("");
  const [ticket, setTicket] = useState<{ subject: string; body: string } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant" && m.mode);
  const lastUserText = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const submit = (text: string) => {
    if (!text.trim() || streaming) return;
    void sendChatMessage(text, pathname);
    setInput("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
        <span className="grid size-9 place-items-center rounded-full bg-brand-700 text-white">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-neutral-900">Neighbourly Assistant</p>
          <p className="truncate text-xs text-neutral-500">Answers from the City of Elmina guide</p>
        </div>
        {lastAssistant && (
          <Badge tone={lastAssistant.mode === "offline" ? "neutral" : "brand"}>{lastAssistant.mode === "offline" ? "Guide only" : "AI"}</Badge>
        )}
        {messages.length > 0 && (
          <Button variant="ghost" size="icon-sm" onClick={reset} aria-label="Start a new conversation" disabled={streaming}>
            <RotateCcw />
          </Button>
        )}
        {onClose && (
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close assistant">
            <X />
          </Button>
        )}
      </header>

      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-end gap-4 pb-2">
            <div>
              <p className="text-lg font-bold text-neutral-900">Hi! How can I help? 👋</p>
              <p className="mt-1 text-sm text-neutral-500">
                Ask me how to do anything in Neighbourly and I'll walk you through it step by step: reporting issues, sharing food, booking
                facilities, events, notifications or privacy. I can also help with township rules, opening hours and safety. Ask in English or
                Bahasa Melayu.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => submit(q)}
                  className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-left text-sm text-neutral-700 transition hover:border-brand-300 hover:bg-brand-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              m={m}
              isLatest={i === messages.length - 1 && !streaming}
              onAsk={submit}
              onTicket={(subject) => setTicket({ subject, body: lastUserText })}
            />
          ))
        )}
      </div>

      <form
        className="border-t border-neutral-100 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <div className="flex items-end gap-2">
          <Textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            placeholder="Ask how to use any feature…"
            maxLength={1000}
            aria-label="Message the assistant"
            className="max-h-32 min-h-11 resize-none py-2.5"
          />
          {streaming ? (
            <Button variant="outline" size="icon" onClick={stopChat} aria-label="Stop answering" className="shrink-0">
              <Square />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send" className="shrink-0">
              <SendHorizontal />
            </Button>
          )}
        </div>
        <p className="mt-1.5 px-1 text-[11px] leading-snug text-neutral-400">
          Don't share personal details. AI answers can be wrong, so check the linked page. This prototype uses sample township information.
        </p>
      </form>
      {ticket && <TicketDialog key={`${ticket.subject}|${ticket.body}`} draft={ticket} onClose={() => setTicket(null)} />}
    </div>
  );
}
