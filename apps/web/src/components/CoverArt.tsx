import {
  FACILITY_TYPE_META,
  FOOD_TYPE_META,
  REPORT_CATEGORY_META,
  type FacilityType,
  type FoodType,
  type ReportCategory,
} from "@neighbourly/shared";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const TONES = {
  amber: "from-amber-100 via-orange-50 to-amber-200",
  indigo: "from-indigo-100 via-violet-50 to-indigo-200",
  green: "from-emerald-100 via-lime-50 to-green-200",
  sky: "from-sky-100 via-cyan-50 to-sky-200",
  teal: "from-teal-100 via-emerald-50 to-teal-200",
  orange: "from-orange-100 via-amber-50 to-orange-200",
  lime: "from-lime-100 via-green-50 to-lime-200",
  rose: "from-rose-100 via-pink-50 to-rose-200",
  violet: "from-violet-100 via-fuchsia-50 to-violet-200",
  stone: "from-neutral-100 via-neutral-50 to-neutral-200",
} as const;
type Tone = keyof typeof TONES;

const CATEGORY_TONE: Record<ReportCategory, Tone> = {
  roads: "amber",
  streetlights: "indigo",
  parks: "green",
  cleanliness: "sky",
  wildlife: "teal",
  other: "stone",
};
const FOOD_TONE: Record<FoodType, Tone> = {
  cooked: "orange",
  bakery: "amber",
  produce: "lime",
  groceries: "sky",
  drinks: "violet",
  other: "stone",
};
const FACILITY_TONE: Record<FacilityType, Tone> = { hall: "indigo", gym: "rose", bbq: "orange", meeting_room: "sky" };

/** Illustrated placeholder used wherever there is no photo yet. */
export function CoverArt({ emoji, tone, className, size = 44 }: { emoji: string; tone: Tone; className?: string; size?: number }) {
  return (
    <div className={cn("relative grid place-items-center overflow-hidden bg-linear-to-br", TONES[tone], className)} aria-hidden>
      <div className="absolute -top-8 -right-6 size-28 rounded-full bg-white/40" />
      <div className="absolute -bottom-10 -left-6 size-32 rounded-full bg-white/30" />
      <span className="relative drop-shadow-sm" style={{ fontSize: size, lineHeight: 1 }}>
        {emoji}
      </span>
    </div>
  );
}

function Photo({ src, alt, fallback, className }: { src: string | null; alt: string; fallback: ReactNode; className?: string }) {
  if (src) return <img src={src} alt={alt} className={cn("object-cover", className)} loading="lazy" />;
  return <>{fallback}</>;
}

export function ReportPhoto({ src, category, alt, className, size }: { src: string | null; category: ReportCategory; alt: string; className?: string; size?: number }) {
  return (
    <Photo
      src={src}
      alt={alt}
      className={className}
      fallback={<CoverArt emoji={REPORT_CATEGORY_META[category].emoji} tone={CATEGORY_TONE[category]} className={className} size={size} />}
    />
  );
}

export function FoodPhoto({ src, foodType, alt, className, size }: { src: string | null; foodType: FoodType; alt: string; className?: string; size?: number }) {
  return (
    <Photo
      src={src}
      alt={alt}
      className={className}
      fallback={<CoverArt emoji={FOOD_TYPE_META[foodType].emoji} tone={FOOD_TONE[foodType]} className={className} size={size} />}
    />
  );
}

export function FacilityPhoto({ src, type, alt, className, size }: { src: string | null; type: FacilityType; alt: string; className?: string; size?: number }) {
  return (
    <Photo
      src={src}
      alt={alt}
      className={className}
      fallback={<CoverArt emoji={FACILITY_TYPE_META[type].emoji} tone={FACILITY_TONE[type]} className={className} size={size} />}
    />
  );
}
