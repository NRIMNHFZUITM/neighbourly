import type { Identity } from "@neighbourly/shared";
import { Building2, Store, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

const SIZES = {
  xs: "size-6 text-[10px] [&_svg]:size-3.5",
  sm: "size-8 text-xs [&_svg]:size-4",
  md: "size-10 text-sm [&_svg]:size-5",
  lg: "size-14 text-lg [&_svg]:size-7",
  xl: "size-20 text-2xl [&_svg]:size-9",
} as const;
type Size = keyof typeof SIZES;

const TINTS = [
  "bg-rose-100 text-rose-800",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-800",
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-teal-100 text-teal-800",
  "bg-orange-100 text-orange-800",
  "bg-indigo-100 text-indigo-800",
];

function tint(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return TINTS[Math.abs(h) % TINTS.length]!;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

const base = "inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-bold select-none";

export function NameAvatar({
  name,
  seed,
  src,
  kind = "person",
  size = "md",
  className,
}: {
  name: string;
  seed?: string;
  src?: string | null;
  kind?: "person" | "shop";
  size?: Size;
  className?: string;
}) {
  if (src) return <img src={src} alt="" className={cn(base, SIZES[size], "object-cover", className)} />;
  if (kind === "shop") {
    return (
      <span className={cn(base, SIZES[size], "bg-amber-100 text-amber-800", className)} aria-hidden>
        <Store />
      </span>
    );
  }
  return (
    <span className={cn(base, SIZES[size], tint(seed ?? name), className)} aria-hidden>
      {initials(name)}
    </span>
  );
}

/** Avatar for how someone appears to the viewer: anonymous residents get no face. */
export function IdentityAvatar({ identity, size = "md", className }: { identity: Identity; size?: Size; className?: string }) {
  if (identity.kind === "anonymous") {
    return (
      <span className={cn(base, SIZES[size], "bg-neutral-200 text-neutral-500", className)} aria-hidden>
        <UserRound />
      </span>
    );
  }
  if (identity.kind === "management") {
    return (
      <span className={cn(base, SIZES[size], "bg-brand-700 text-white", className)} aria-hidden>
        <Building2 />
      </span>
    );
  }
  return (
    <NameAvatar
      name={identity.displayName}
      seed={identity.userId ?? identity.displayName}
      src={identity.avatarUrl}
      kind={identity.kind === "shop" ? "shop" : "person"}
      size={size}
      className={className}
    />
  );
}
