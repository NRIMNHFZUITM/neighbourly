import {
  BOOKING_STATUS_LABELS,
  FOOD_STATUS_LABELS,
  HALAL_LABELS,
  REPORT_CATEGORY_META,
  REPORT_STATUS_LABELS,
  type BookingStatus,
  type FoodStatus,
  type HalalStatus,
  type ReportCategory,
  type ReportStatus,
} from "@neighbourly/shared";
import { CheckCircle2, CircleDot, Clock3, HelpCircle, Hourglass, Leaf, Lock, PackageCheck, XCircle } from "lucide-react";
import { Badge, type BadgeTone } from "./ui/badge";

export const REPORT_STATUS_STYLE: Record<ReportStatus, { tone: BadgeTone; icon: typeof CircleDot; pin: string }> = {
  open: { tone: "amber", icon: CircleDot, pin: "#d97706" },
  in_progress: { tone: "sky", icon: Clock3, pin: "#0284c7" },
  resolved: { tone: "green", icon: CheckCircle2, pin: "#16a34a" },
};

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const { tone, icon: Icon } = REPORT_STATUS_STYLE[status];
  return (
    <Badge tone={tone}>
      <Icon /> {REPORT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function CategoryBadge({ category }: { category: ReportCategory }) {
  const meta = REPORT_CATEGORY_META[category];
  return (
    <Badge tone="neutral">
      <span aria-hidden>{meta.emoji}</span> {meta.short}
    </Badge>
  );
}

const FOOD_STYLE: Record<FoodStatus, { tone: BadgeTone; icon: typeof CircleDot }> = {
  available: { tone: "green", icon: Leaf },
  reserved: { tone: "amber", icon: Lock },
  collected: { tone: "neutral", icon: PackageCheck },
  expired: { tone: "neutral", icon: XCircle },
};

export function FoodStatusBadge({ status }: { status: FoodStatus }) {
  const { tone, icon: Icon } = FOOD_STYLE[status];
  return (
    <Badge tone={tone}>
      <Icon /> {FOOD_STATUS_LABELS[status]}
    </Badge>
  );
}

const BOOKING_STYLE: Record<BookingStatus, { tone: BadgeTone; icon: typeof CircleDot }> = {
  confirmed: { tone: "green", icon: CheckCircle2 },
  pending: { tone: "amber", icon: Hourglass },
  rejected: { tone: "rose", icon: XCircle },
  cancelled: { tone: "neutral", icon: XCircle },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { tone, icon: Icon } = BOOKING_STYLE[status];
  return (
    <Badge tone={tone}>
      <Icon /> {BOOKING_STATUS_LABELS[status]}
    </Badge>
  );
}

export function HalalBadge({ halal }: { halal: HalalStatus }) {
  if (halal === "halal") {
    return (
      <Badge tone="green">
        <CheckCircle2 /> Halal
      </Badge>
    );
  }
  if (halal === "non_halal") {
    return (
      <Badge tone="rose">
        <XCircle /> Non-halal
      </Badge>
    );
  }
  return (
    <Badge tone="neutral">
      <HelpCircle /> {HALAL_LABELS.not_sure}
    </Badge>
  );
}
