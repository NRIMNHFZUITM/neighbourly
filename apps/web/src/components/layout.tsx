import { AlertTriangle, ArrowLeft, X } from "lucide-react";
import type { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/misc";

export function PageHeader({
  title,
  description,
  actions,
  back,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
  className?: string;
}) {
  return (
    <header className={cn("mb-5", className)}>
      {back && (
        <Link to={back.to} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-neutral-500 hover:text-neutral-900">
          <ArrowLeft className="size-4" /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-[28px]">{title}</h1>
          {description ? <p className="mt-1 text-sm text-neutral-500 sm:text-base">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-10 text-center", className)}>
      <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 [&_svg]:size-6">{icon}</div>
      <p className="font-semibold text-neutral-900">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-center">
      <AlertTriangle className="mb-2 size-6 text-rose-600" />
      <p className="font-semibold text-rose-900">Couldn't load this</p>
      <p className="mt-1 text-sm text-rose-700">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}

/** Route-based tabs. */
export function SegmentedNav({ items, className }: { items: Array<{ to: string; label: string; end?: boolean }>; className?: string }) {
  return (
    <nav className={cn("inline-flex rounded-xl bg-neutral-200/60 p-1", className)}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end ?? true}
          className={({ isActive }) =>
            cn(
              "rounded-lg px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition",
              isActive ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800",
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

/** Single-select filter chips; scrolls sideways on phones. */
export function FilterChips<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: ReactNode }>;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
              active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Form layout: a full-screen modal on phones (plan section 5) and a centred card on
 * larger screens.
 */
export function FormPage({
  title,
  description,
  closeTo,
  children,
  footer,
}: {
  title: string;
  description?: string;
  closeTo: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const navigate = useNavigate();
  const close = () => (window.history.length > 1 ? navigate(-1) : navigate(closeTo));
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white md:static md:z-auto md:mx-auto md:max-w-2xl md:bg-transparent">
      <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 md:mb-5 md:border-0 md:px-0 md:py-0">
        <button type="button" onClick={close} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 md:hidden" aria-label="Close">
          <X className="size-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-neutral-900 md:text-[28px] md:tracking-tight">{title}</h1>
          {description && <p className="hidden text-sm text-neutral-500 md:mt-1 md:block md:text-base">{description}</p>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5 md:overflow-visible md:rounded-2xl md:border md:border-neutral-200/80 md:bg-white md:p-6 md:shadow-card">
        {description && <p className="mb-5 text-sm text-neutral-500 md:hidden">{description}</p>}
        {children}
      </div>
      <div className="border-t border-neutral-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:mt-4 md:border-0 md:bg-transparent md:p-0">
        {footer}
      </div>
    </div>
  );
}

export function Section({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-neutral-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
