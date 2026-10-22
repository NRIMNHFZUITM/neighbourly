import type { Me } from "@neighbourly/shared";
import {
  CalendarDays,
  ClipboardList,
  House,
  LayoutDashboard,
  LifeBuoy,
  Leaf,
  MapPinned,
  MessageCircle,
  ShieldCheck,
  UsersRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Match only the exact path (not children). */
  end?: boolean;
}

/** Mobile bottom navigation: Home, TownCare, EcoFood, Book, Chat (plan section 5). */
export const RESIDENT_TABS: NavItem[] = [
  { to: "/home", label: "Home", icon: House },
  { to: "/towncare", label: "TownCare", icon: Wrench },
  { to: "/ecofood", label: "EcoFood", icon: Leaf },
  { to: "/book", label: "Book", icon: CalendarDays },
  { to: "/assistant", label: "Chat", icon: MessageCircle },
];

export const ADMIN_TABS: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/reports", label: "Reports", icon: ClipboardList },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { to: "/admin/verifications", label: "Verify", icon: ShieldCheck },
  { to: "/home", label: "Feed", icon: House },
];

export function sidebarGroups(me: Me): Array<{ title: string; items: NavItem[] }> {
  const groups: Array<{ title: string; items: NavItem[] }> = [
    {
      title: "Neighbourhood",
      items: [
        { to: "/home", label: "Home", icon: House },
        // Feed, events and the neighbour directory are tabs inside Community.
        { to: "/community", label: "Community", icon: UsersRound },
        { to: "/places", label: "Places", icon: MapPinned },
      ],
    },
    {
      title: "Services",
      items: [
        { to: "/towncare", label: "TownCare", icon: Wrench },
        { to: "/ecofood", label: "EcoFood", icon: Leaf },
        { to: "/book", label: "Facilities", icon: CalendarDays },
      ],
    },
    { title: "Help", items: [{ to: "/assistant", label: "Assistant", icon: MessageCircle }] },
  ];
  if (me.role === "admin") {
    groups.unshift({
      title: "Township Management",
      items: [
        { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
        { to: "/admin/reports", label: "Reports", icon: ClipboardList },
        { to: "/admin/bookings", label: "Bookings", icon: CalendarDays },
        { to: "/admin/verifications", label: "Verifications", icon: ShieldCheck },
        { to: "/admin/tickets", label: "Support tickets", icon: LifeBuoy },
      ],
    });
  }
  return groups;
}
