import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "bg-neutral-100 text-neutral-700 ring-neutral-200",
        brand: "bg-brand-50 text-brand-800 ring-brand-200",
        green: "bg-green-50 text-green-800 ring-green-200",
        amber: "bg-amber-50 text-amber-800 ring-amber-200",
        sky: "bg-sky-50 text-sky-800 ring-sky-200",
        rose: "bg-rose-50 text-rose-800 ring-rose-200",
        violet: "bg-violet-50 text-violet-800 ring-violet-200",
        dark: "bg-neutral-900 text-white ring-neutral-900",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export function Badge({ className, tone, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
