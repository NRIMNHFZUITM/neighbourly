import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-9 shrink-0", className)} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#d71920" />
      <path d="M14 33 32 18l18 15v15a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3Z" fill="#ffffff" />
      <path d="M32 47c-6.5 0-10-4.6-10-9.6 0-6.4 6.3-9.9 15.8-10.4-.4 9.6-1.6 20-5.8 20Z" fill="#f6a909" />
      <path d="M26 44c2.5-4.5 6-8 10-10.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Logo({ className, subtitle = true }: { className?: string; subtitle?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="leading-tight">
        <span className="block text-[17px] font-bold tracking-tight text-ink">Neighbourly</span>
        {subtitle && <span className="block text-xs font-medium text-neutral-500">City of Elmina</span>}
      </span>
    </span>
  );
}
