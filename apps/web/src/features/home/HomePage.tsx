import { REPORT_STATUS_LABELS, formatRelative, formatTime, formatWindow, neighbourhoodName } from "@neighbourly/shared";
import { CalendarCheck2, Check, ChevronRight, HandHeart, Leaf, Megaphone, MessagesSquare, ShieldAlert, ShoppingBag, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { areaLabel } from "@/app/AppShell";
import { useCurrentUser } from "../auth/api";
import { useMyBookings } from "../booking/api";
import { usePosts, useEvents } from "../community/api";
import { DateBadge, relativeDayPrefix } from "../community/EventsPage";
import { useFoodListings } from "../ecofood/api";
import { useReports } from "../towncare/api";
import { useAlerts } from "./api";
import { WeatherCard } from "./WeatherCard";
import { useNow } from "@/lib/use-now";

const DAY = 86_400_000;

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", hour: "numeric", hour12: false }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

// ---------------------------------------------------------------- notices

interface Notice {
  id: string;
  kind: "safety" | "announcement";
  title: string;
  body: string;
  at: string;
  to: string;
}

/**
 * The newest safety alert and Township Management's latest announcement: one of each at
 * most, since several alerts are often about the same incident.
 */
function Notices() {
  const alerts = useAlerts();
  const official = usePosts("neighbourhood", "official");
  const now = useNow();
  const safety = alerts.data ?? [];
  const newest = safety[0];
  const more = safety.length - 1;
  const notices: Notice[] = [
    ...(newest
      ? [
          {
            id: newest.id,
            kind: "safety" as const,
            title: `${newest.kind === "wildlife" ? `Wildlife alert: ${newest.title}` : "Safety notice"}${more > 0 ? ` (+${more} more)` : ""}`,
            body: newest.kind === "wildlife" ? `${newest.body}. Keep bins closed and keep your distance.` : newest.body,
            at: newest.createdAt,
            to: more > 0 ? "/towncare/map" : (newest.link ?? "/community"),
          },
        ]
      : []),
    ...(official.data ?? [])
      .filter((p) => p.kind === "announcement" && now - new Date(p.createdAt).getTime() < 3 * DAY)
      .slice(0, 1)
      .map((p) => ({ id: p.id, kind: "announcement" as const, title: "Township Management", body: p.body, at: p.createdAt, to: "/community" })),
  ];
  if (notices.length === 0) return null;
  return (
    <div className="space-y-2">
      {notices.map((n) => (
        <Link
          key={n.id}
          to={n.to}
          className={cn(
            "flex items-start gap-3 rounded-2xl border p-3.5 transition",
            n.kind === "safety" ? "border-amber-300 bg-amber-50 hover:bg-amber-100/70" : "border-neutral-200/80 bg-white shadow-card hover:border-neutral-300",
          )}
        >
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full [&_svg]:size-5",
              n.kind === "safety" ? "bg-amber-200 text-amber-900" : "bg-brand-50 text-brand-700",
            )}
          >
            {n.kind === "safety" ? <ShieldAlert /> : <Megaphone />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-neutral-900">
              {n.title} <span className="font-normal text-neutral-500">· {formatRelative(n.at)}</span>
            </span>
            <span className="line-clamp-2 text-sm text-neutral-600">{n.body}</span>
          </span>
          <ChevronRight className="mt-2 size-4 shrink-0 text-neutral-400" />
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- for you

interface Todo {
  key: string;
  icon: ReactNode;
  tone: string;
  title: string;
  detail: string;
  to: string;
}

function Row({ todo }: { todo: Todo }) {
  return (
    <li>
      <Link to={todo.to} className="flex items-center gap-3 px-4 py-3 transition hover:bg-neutral-50">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-full [&_svg]:size-[18px]", todo.tone)}>{todo.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-neutral-900">{todo.title}</span>
          <span className="block truncate text-xs text-neutral-500">{todo.detail}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-neutral-400" />
      </Link>
    </li>
  );
}

/** Things that need the resident's attention: pickups, requests, bookings and their reports. */
function ForYou() {
  const food = useFoodListings({ view: "mine" });
  const bookings = useMyBookings();
  const reports = useReports({ scope: "mine" });
  const now = useNow();

  if (food.isPending || bookings.isPending || reports.isPending) return <Skeleton className="h-44 w-full rounded-2xl" />;

  const todos: Todo[] = [];
  for (const l of food.data ?? []) {
    if (l.myClaim?.status === "confirmed" && new Date(l.pickupEnd).getTime() > now) {
      todos.push({
        key: `pickup-${l.id}`,
        icon: <ShoppingBag />,
        tone: "bg-green-100 text-green-800",
        title: `Pick up: ${l.title}`,
        detail: `Code ${l.myClaim.pickupCode ?? "–"} · ${formatWindow(l.pickupStart, l.pickupEnd)} · ${l.pickupPoint}`,
        to: `/ecofood/${l.id}`,
      });
    }
  }
  for (const l of food.data ?? []) {
    if (l.isMine && l.status === "available" && l.requests > 0) {
      todos.push({
        key: `requests-${l.id}`,
        icon: <HandHeart />,
        tone: "bg-accent-100 text-accent-800",
        title: `${l.requests} ${l.requests === 1 ? "neighbour wants" : "neighbours want"} your ${l.title.toLowerCase()}`,
        detail: "Choose who picks it up",
        to: `/ecofood/${l.id}`,
      });
    }
  }
  const next = bookings.data?.find((b) => new Date(b.end).getTime() > now && (b.status === "confirmed" || b.status === "pending"));
  if (next) {
    todos.push({
      key: `booking-${next.id}`,
      icon: <CalendarCheck2 />,
      tone: "bg-sky-100 text-sky-800",
      title: next.facilityName,
      detail: `${formatWindow(next.start, next.end)}${next.status === "pending" ? " · Waiting for approval" : ""}`,
      to: "/book/mine",
    });
  }
  for (const r of (reports.data ?? []).filter((x) => x.isMine && x.status !== "resolved").slice(0, 2)) {
    todos.push({
      key: `report-${r.id}`,
      icon: <Wrench />,
      tone: "bg-brand-50 text-brand-700",
      title: r.title,
      detail: `Your report · ${REPORT_STATUS_LABELS[r.status]} · updated ${formatRelative(r.updatedAt)}`,
      to: `/towncare/${r.id}`,
    });
  }

  return (
    <Card className="overflow-hidden">
      <h2 className="px-4 pt-4 pb-1 text-base font-bold text-neutral-900">For you</h2>
      {todos.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-neutral-500">You're all caught up. Nothing needs your attention today.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {todos.slice(0, 4).map((t) => (
            <Row key={t.key} todo={t} />
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- events

function ComingUp() {
  const events = useEvents();
  const list = (events.data ?? []).slice(0, 3);
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <h2 className="text-base font-bold text-neutral-900">Coming up</h2>
        <Link to="/community/events" className="text-sm font-semibold text-brand-700 hover:underline">
          All events
        </Link>
      </div>
      {events.isPending ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : list.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-neutral-500">No events planned yet. Organise one in Community.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {list.map((e) => (
            <li key={e.id}>
              <Link to="/community/events" className="flex items-center gap-3 px-4 py-3 transition hover:bg-neutral-50">
                <DateBadge iso={e.startsAt} className="w-11" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-neutral-900">{e.title}</span>
                  <span className="block truncate text-xs text-neutral-500">
                    {relativeDayPrefix(e.startsAt)}
                    {formatTime(e.startsAt)} · {e.going} going
                  </span>
                </span>
                {e.goingByMe && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-800">
                    <Check className="size-3.5" /> Going
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- around the township

function Tile({ to, icon, tone, label, value, detail }: { to: string; icon: ReactNode; tone: string; label: string; value: ReactNode; detail: ReactNode }) {
  return (
    <Link to={to} className="group flex items-start gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-card transition hover:border-neutral-300">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl [&_svg]:size-5", tone)}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-neutral-500">{label}</span>
        <span className="block text-lg leading-tight font-bold text-neutral-900">{value}</span>
        <span className="mt-0.5 block truncate text-xs text-neutral-500">{detail}</span>
      </span>
      <ChevronRight className="mt-1 size-4 shrink-0 text-neutral-400 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

function Around({ neighbourhoodId }: { neighbourhoodId: string | null }) {
  const food = useFoodListings({ view: "active" });
  const reports = useReports({ neighbourhood: neighbourhoodId ?? undefined });
  const posts = usePosts("neighbourhood");
  const now = useNow();
  const today = (posts.data ?? []).filter((p) => p.kind === "post" && now - new Date(p.createdAt).getTime() < DAY);
  const latest = today[0] ?? null;
  const available = (food.data ?? []).filter((l) => l.status === "available" && !l.isMine);
  const thisWeek = (reports.data ?? []).filter((r) => now - new Date(r.createdAt).getTime() < 7 * DAY);
  const open = (reports.data ?? []).filter((r) => r.status !== "resolved").length;
  const fixed = (reports.data ?? []).filter((r) => r.resolvedAt && now - new Date(r.resolvedAt).getTime() < 7 * DAY).length;
  const area = neighbourhoodName(neighbourhoodId);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Tile
        to="/ecofood"
        icon={<Leaf />}
        tone="bg-green-100 text-green-800"
        label="Food to share"
        value={food.data ? `${available.length} available` : "…"}
        detail={available[0] ? `Newest: ${available[0].title}` : "Nothing right now"}
      />
      <Tile
        to="/towncare/all"
        icon={<Wrench />}
        tone="bg-brand-50 text-brand-700"
        label={area ? `TownCare in ${area}` : "TownCare"}
        value={reports.data ? `${open} open` : "…"}
        detail={reports.data ? `${thisWeek.length} new and ${fixed} fixed this week` : " "}
      />
      <Tile
        to="/community"
        icon={<MessagesSquare />}
        tone="bg-accent-100 text-accent-800"
        label="Community"
        value={posts.data ? `${today.length} new ${today.length === 1 ? "post" : "posts"} today` : "…"}
        detail={latest ? `${latest.author.isYou ? "You" : latest.author.displayName}: ${latest.body}` : "Be the first to post today"}
      />
    </div>
  );
}

export function HomePage() {
  const me = useCurrentUser();
  const firstName = me.role === "shop" && me.shop ? me.shop.shopName : me.role === "admin" ? "Township Management" : me.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-[28px]">
          {greeting()}, {firstName} 👋
        </h1>
        {/* On larger screens the top bar already shows the area. */}
        <p className="mt-0.5 text-sm text-neutral-500 md:hidden">{areaLabel(me)}</p>
      </header>
      <WeatherCard />
      <Notices />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ForYou />
        <ComingUp />
      </div>
      <Around neighbourhoodId={me.neighbourhoodId} />
    </div>
  );
}
