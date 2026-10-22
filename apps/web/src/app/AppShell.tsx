import { neighbourhoodName, type Me } from "@neighbourly/shared";
import { useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, LogOut, MapPin, MapPinned, Repeat, RotateCcw, Settings, UserRound, UsersRound } from "lucide-react";
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from "react-router";
import { toast } from "sonner";
import { NameAvatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useIsDesktop } from "@/lib/use-media-query";
import { homePathFor, useCurrentUser, useDemoAccounts, useDemoLogin, useLogout } from "@/features/auth/api";
import { ChatWidget } from "@/features/chat/ChatWidget";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { ADMIN_TABS, RESIDENT_TABS, sidebarGroups, type NavItem } from "./nav";

export const displayName = (me: Me) => (me.role === "shop" && me.shop ? me.shop.shopName : me.name);

export function areaLabel(me: Me): string {
  if (me.role === "admin") return "Township Management";
  if (me.role === "shop") return me.shop?.address ?? "Local shop";
  const area = neighbourhoodName(me.neighbourhoodId);
  return area ? `Block ${me.block} · ${area}` : "City of Elmina";
}

function Sidebar({ me }: { me: Me }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-neutral-200 bg-white md:flex">
      <div className="px-5 pt-5 pb-4">
        <Link to={homePathFor(me)} aria-label="Neighbourly home">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Main">
        {sidebarGroups(me).map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-1.5 text-[11px] font-bold tracking-wider text-neutral-400 uppercase">{group.title}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition",
                        isActive ? "bg-brand-50 text-brand-800" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                      )
                    }
                  >
                    <item.icon className="size-[18px]" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-neutral-100 p-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold",
              isActive ? "bg-brand-50 text-brand-800" : "text-neutral-600 hover:bg-neutral-100",
            )
          }
        >
          <Settings className="size-[18px]" /> Privacy & settings
        </NavLink>
        <p className="mt-2 px-3 text-[11px] leading-snug text-neutral-400">
          Hackathon prototype with sample data. Not an official Sime Darby Property app.
        </p>
      </div>
    </aside>
  );
}

function AccountMenu({ me }: { me: Me }) {
  const logout = useLogout();
  const demo = useDemoAccounts();
  const demoLogin = useDemoLogin();
  const queryClient = useQueryClient();

  const resetDemo = async () => {
    await api("/api/demo/reset", { method: "POST" });
    queryClient.clear();
    toast.success("Demo data reset");
    demoLogin.mutate(me.id, { onError: () => logout() });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-500" aria-label="Account menu">
          <NameAvatar name={displayName(me)} seed={me.id} kind={me.role === "shop" ? "shop" : "person"} size="sm" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-3 py-2">
          <p className="font-semibold text-neutral-900">{displayName(me)}</p>
          <p className="text-xs text-neutral-500">{areaLabel(me)}</p>
        </div>
        <DropdownMenuSeparator />
        {me.role !== "admin" && (
          <DropdownMenuItem asChild>
            <Link to={`/community/u/${me.id}`}>
              <UserRound /> My public profile
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild className="md:hidden">
          <Link to="/community">
            <UsersRound /> Community
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="md:hidden">
          <Link to="/places">
            <MapPinned /> Places map
          </Link>
        </DropdownMenuItem>
        {me.role === "admin" && (
          <DropdownMenuItem asChild className="md:hidden">
            <Link to="/admin/tickets">
              <LifeBuoy /> Support tickets
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings /> Privacy & settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Switch demo account</DropdownMenuLabel>
        {demo.data
          ?.filter((a) => a.userId !== me.id)
          .map((a) => (
            <DropdownMenuItem key={a.userId} onSelect={() => demoLogin.mutate(a.userId)}>
              <Repeat /> <span className="flex-1">{a.name}</span>
              <span className="text-xs text-neutral-400">{a.role === "admin" ? "Admin" : a.role === "shop" ? "Shop" : "Resident"}</span>
            </DropdownMenuItem>
          ))}
        <DropdownMenuItem onSelect={() => void resetDemo()}>
          <RotateCcw /> Reset demo data
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout}>
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopBar({ me }: { me: Me }) {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200/70 bg-neutral-50/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:h-16 md:px-8">
        <Link to={homePathFor(me)} className="md:hidden" aria-label="Neighbourly home">
          <Logo subtitle={false} />
        </Link>
        <Badge tone="brand" className="hidden md:inline-flex">
          <MapPin /> City of Elmina · {areaLabel(me)}
        </Badge>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="mr-1 hidden rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 sm:inline">
            Prototype · sample data
          </span>
          <NotificationBell />
          <AccountMenu me={me} />
        </div>
      </div>
    </header>
  );
}

function BottomNav({ tabs }: { tabs: NavItem[] }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Main"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {tabs.map((tab) => (
          <li key={tab.to}>
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn("flex h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold", isActive ? "text-brand-700" : "text-neutral-500")
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn("grid h-7 w-12 place-items-center rounded-full transition", isActive && "bg-brand-100")}>
                    <tab.icon className="size-5" />
                  </span>
                  {tab.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AppShell() {
  const me = useCurrentUser();
  const isDesktop = useIsDesktop();
  const { pathname } = useLocation();
  const onAssistant = pathname.startsWith("/assistant");
  return (
    <div className="min-h-dvh">
      <Sidebar me={me} />
      <div className="md:pl-64">
        <TopBar me={me} />
        <main className={cn("mx-auto w-full max-w-6xl px-4 pt-4 md:px-8 md:pt-6", onAssistant ? "pb-6" : "pb-28 md:pb-28")}>
          <Outlet />
        </main>
      </div>
      <BottomNav tabs={me.role === "admin" ? ADMIN_TABS : RESIDENT_TABS} />
      {isDesktop && !onAssistant && <ChatWidget />}
      <ScrollRestoration />
    </div>
  );
}
