import type { Identity } from "@neighbourly/shared";
import { BadgeCheck, EyeOff, Store } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/cn";
import { IdentityAvatar } from "./Avatar";

/**
 * Avatar + name + optional meta. Makes the privacy state visible: residents see an anonymous
 * label, owners see "You" with a reminder that neighbours can't see their name.
 */
export function IdentityLine({
  identity,
  meta,
  size = "sm",
  link = true,
  className,
}: {
  identity: Identity;
  meta?: ReactNode;
  size?: "xs" | "sm" | "md";
  link?: boolean;
  className?: string;
}) {
  const name = identity.isYou ? "You" : identity.displayName;
  const linkable = link && identity.userId && (identity.kind === "person" || identity.kind === "shop") && !identity.isYou;
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <IdentityAvatar identity={identity} size={size} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
          {linkable ? (
            <Link to={`/community/u/${identity.userId}`} className="truncate font-semibold text-neutral-900 hover:underline">
              {name}
            </Link>
          ) : (
            <span className="truncate font-semibold text-neutral-900">{name}</span>
          )}
          {identity.kind === "management" && (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-700">
              <BadgeCheck className="size-3.5" /> Official
            </span>
          )}
          {identity.kind === "shop" && (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-700">
              <Store className="size-3.5" /> Local shop
            </span>
          )}
          {identity.hiddenFromOthers && identity.kind === "person" && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-1.5 py-px text-[11px] font-semibold text-neutral-600"
              title={identity.isYou ? "Neighbours see you as a block resident, not by name" : "Anonymous to residents; visible to admins"}
            >
              <EyeOff className="size-3" /> {identity.isYou ? "Anonymous to neighbours" : "Anonymous to residents"}
            </span>
          )}
        </div>
        {meta ? <div className="truncate text-xs text-neutral-500">{meta}</div> : null}
      </div>
    </div>
  );
}
