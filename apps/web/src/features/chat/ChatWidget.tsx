import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { ChatPanel } from "./ChatPanel";

/** Desktop: floating button that opens the assistant in a side panel (plan section 5). */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="fixed right-6 bottom-6 z-30 flex items-center gap-2 rounded-full bg-brand-700 py-3 pr-5 pl-4 text-sm font-semibold text-white shadow-float transition hover:-translate-y-0.5 hover:bg-brand-800"
        >
          <MessageCircle className="size-5" /> Ask Neighbourly
        </button>
      </DialogTrigger>
      <SheetContent title="Neighbourly Assistant">
        <ChatPanel onClose={() => setOpen(false)} />
      </SheetContent>
    </Dialog>
  );
}

/** Mobile "Chat" tab and the full-page assistant on desktop. */
export function AssistantPage() {
  return (
    <div className="fixed inset-x-0 top-14 bottom-[calc(60px+env(safe-area-inset-bottom))] md:static md:h-[calc(100dvh-4rem-3rem)]">
      <div className="h-full overflow-hidden md:rounded-2xl md:border md:border-neutral-200/80 md:shadow-card">
        <ChatPanel />
      </div>
    </div>
  );
}
