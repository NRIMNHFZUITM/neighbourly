import { formatRelative, type Notification, type NotificationType } from "@neighbourly/shared";
import {
  Bell,
  CalendarCheck2,
  CalendarX2,
  CheckCircle2,
  LifeBuoy,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  Utensils,
  Wrench,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";
import { useMarkAllRead, useMarkRead, useNotifications } from "./api";

export const NOTIFICATION_ICON: Record<NotificationType, typeof Bell> = {
  report_status: Wrench,
  report_comment: MessageSquare,
  food_request: Utensils,
  food_confirmed: CheckCircle2,
  food_declined: Utensils,
  booking_confirmed: CalendarCheck2,
  booking_rejected: CalendarX2,
  verification: ShieldCheck,
  alert: ShieldAlert,
  ticket: LifeBuoy,
};

export const notificationRowClass = (n: Notification) =>
  cn("flex w-full gap-3 rounded-xl p-2.5 text-left transition hover:bg-neutral-100", !n.read && "bg-brand-50/60");

/** Row content only; the caller supplies the interactive wrapper (menu item or button). */
export function NotificationContent({ n }: { n: Notification }) {
  const Icon = NOTIFICATION_ICON[n.type];
  return (
    <>
      <span
        className={cn(
          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full [&_svg]:size-4",
          n.type === "alert" ? "bg-amber-100 text-amber-700" : "bg-brand-100 text-brand-700",
        )}
      >
        <Icon />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-neutral-900">{n.title}</span>
        <span className="line-clamp-2 block text-sm text-neutral-600">{n.body}</span>
        <span className="mt-0.5 block text-xs text-neutral-400">{formatRelative(n.createdAt)}</span>
      </span>
      {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
    </>
  );
}

export function useOpenNotification() {
  const navigate = useNavigate();
  const markRead = useMarkRead();
  return (n: Notification) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };
}

export function NotificationBell() {
  const { data } = useNotifications();
  const markAll = useMarkAllRead();
  const open = useOpenNotification();
  const seen = useRef<Set<string> | null>(null);

  // Toast new notifications that arrive while the app is open (e.g. a status update).
  useEffect(() => {
    if (!data) return;
    const ids = new Set(data.items.map((n) => n.id));
    if (seen.current) {
      for (const n of data.items) {
        if (!seen.current.has(n.id) && !n.read) toast(n.title, { description: n.body });
      }
    }
    seen.current = ids;
  }, [data]);

  const unread = data?.unread ?? 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
          <Bell className="size-5!" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-neutral-50">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(92vw,380px)] p-2">
        <div className="flex items-center justify-between px-2 pt-1 pb-2">
          <span className="text-sm font-bold text-neutral-900">Notifications</span>
          {unread > 0 && (
            <button type="button" onClick={() => markAll.mutate()} className="text-xs font-semibold text-brand-700 hover:underline">
              Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-[60vh] space-y-0.5 overflow-y-auto">
          {data?.items.length ? (
            data.items.slice(0, 6).map((n) => (
              <DropdownMenuItem key={n.id} onSelect={() => open(n)} className={cn(notificationRowClass(n), "items-start")}>
                <NotificationContent n={n} />
              </DropdownMenuItem>
            ))
          ) : (
            <p className="px-2 py-6 text-center text-sm text-neutral-500">You're all caught up.</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center font-semibold text-brand-700">
          <Link to="/notifications">See all notifications</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
