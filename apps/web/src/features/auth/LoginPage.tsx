import { LoginInput, type DemoAccount } from "@neighbourly/shared";
import { ArrowRight, Building2, CheckCircle2, Store, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Logo, LogoMark } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { validate, type FieldErrors } from "@/lib/forms";
import { useDemoAccounts, useDemoLogin, useLogin } from "./api";

const ROLE_ICON = { resident: UserRound, shop: Store, admin: Building2 } as const;

function DemoAccounts() {
  const { data } = useDemoAccounts();
  const demoLogin = useDemoLogin();
  return (
    <div className="space-y-2">
      {(data ?? []).map((a: DemoAccount) => {
        const Icon = ROLE_ICON[a.role];
        const busy = demoLogin.isPending && demoLogin.variables === a.userId;
        return (
          <button
            key={a.userId}
            type="button"
            onClick={() => demoLogin.mutate(a.userId)}
            disabled={demoLogin.isPending}
            className="group flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/50 disabled:opacity-60"
          >
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-full [&_svg]:size-5",
                a.role === "admin" ? "bg-brand-700 text-white" : a.role === "shop" ? "bg-accent-100 text-accent-800" : "bg-sky-100 text-sky-800",
              )}
            >
              <Icon />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-neutral-900">{a.name}</span>
              <span className="block truncate text-xs text-neutral-500">{a.headline}</span>
            </span>
            <span className="text-xs font-semibold text-brand-700 opacity-0 transition group-hover:opacity-100">{busy ? "Opening…" : "Continue"}</span>
            <ArrowRight className="size-4 text-neutral-400 group-hover:text-brand-700" />
          </button>
        );
      })}
      {demoLogin.isError && <p className="text-sm text-rose-600">{errorMessage(demoLogin.error)}</p>}
    </div>
  );
}

function nextSaturday() {
  const tz = "Asia/Kuala_Lumpur";
  const today = new Date();
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(today);
  const offset = (6 - ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday) + 7) % 7 || 7;
  const sat = new Date(today.getTime() + offset * 86_400_000);
  return new Intl.DateTimeFormat("en-MY", { timeZone: tz, day: "numeric" }).format(sat);
}

/** A glimpse of the app floating over the township photo. */
function AppPreview() {
  return (
    <div className="w-full max-w-sm space-y-3 text-neutral-900" aria-hidden>
      <div className="ml-auto w-[88%] rounded-2xl bg-white/95 p-3.5 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <Badge tone="green">
            <CheckCircle2 /> Resolved
          </Badge>
          <span className="text-[11px] font-semibold text-neutral-400">TownCare</span>
        </div>
        <p className="mt-2 text-sm font-semibold">Street lamp in front of Block C fixed</p>
        <p className="text-xs text-neutral-500">Resident in Block C · fixed in 3 days</p>
      </div>
      <div className="flex w-[88%] items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-2xl backdrop-blur">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-100 text-xl">🥐</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">End-of-day bread & buns</p>
          <p className="truncate text-xs text-neutral-500">Roti Sinar Bakery · Free · 8:30 pm</p>
        </div>
        <span className="text-[11px] font-semibold text-neutral-400">EcoFood</span>
      </div>
      <div className="ml-auto flex w-[88%] items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-2xl backdrop-blur">
        <div className="w-10 shrink-0 overflow-hidden rounded-lg border border-neutral-200 text-center">
          <div className="bg-brand-700 text-[9px] leading-4 font-bold text-white">SAT</div>
          <div className="text-base leading-6 font-bold">{nextSaturday()}</div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">Gotong-royong at the garden</p>
          <p className="truncate text-xs text-neutral-500">8:00 am · 18 neighbours going</p>
        </div>
        <span className="text-[11px] font-semibold text-neutral-400">Events</span>
      </div>
    </div>
  );
}

export function LoginPage() {
  const login = useLogin();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validate(LoginInput, form);
    if (result.errors) return setErrors(result.errors);
    setErrors({});
    login.mutate(result.data);
  };

  return (
    <div className="grid min-h-dvh md:grid-cols-[minmax(0,1fr)_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-neutral-900 text-white md:flex md:flex-col">
        {/* Elmina Valley Central Park, City of Elmina (CC0, Wikimedia Commons) */}
        <img src="/images/login-elmina.jpg" alt="" className="absolute inset-0 size-full object-cover object-[50%_40%]" />
        <div className="absolute inset-0 bg-linear-to-t from-neutral-950/90 via-neutral-950/35 to-neutral-950/45" aria-hidden />
        <div className="relative flex flex-1 flex-col p-10">
          <Link to="/" className="self-start">
            <span className="flex items-center gap-2.5">
              <LogoMark className="rounded-2xl ring-2 ring-white/30" />
              <span className="text-lg font-bold drop-shadow">Neighbourly</span>
            </span>
          </Link>
          <div className="grid flex-1 place-items-center py-8">
            <AppPreview />
          </div>
          <div>
            <h1 className="text-4xl leading-tight font-extrabold tracking-tight drop-shadow">Good neighbours, verified.</h1>
            <p className="mt-3 max-w-md text-neutral-200">One private place for City of Elmina residents and Township Management.</p>
            <p className="mt-8 text-[11px] text-white/60">Photo: Elmina Valley Central Park by Wiki Farazi, CC0, via Wikimedia Commons</p>
          </div>
        </div>
      </aside>

      <main className="flex flex-col px-4 py-6 sm:px-8 md:justify-center md:px-14">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 inline-block md:hidden">
            <Logo />
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Welcome back</h2>
          <p className="mt-1 text-sm text-neutral-500">Pick a demo account to explore. Each one shows a different side of Neighbourly.</p>

          <div className="mt-6">
            <DemoAccounts />
          </div>

          <div className="my-6 flex items-center gap-3 text-xs font-semibold text-neutral-400">
            <span className="h-px flex-1 bg-neutral-200" /> OR LOG IN WITH EMAIL <span className="h-px flex-1 bg-neutral-200" />
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="Email" htmlFor="email" error={errors.email}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="aisyah@neighbourly.demo"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Password" htmlFor="password" error={errors.password} hint="Demo accounts use the password demo1234">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            {login.isError && <p className="text-sm font-medium text-rose-600">{errorMessage(login.error)}</p>}
            <Button type="submit" className="w-full" size="lg" loading={login.isPending}>
              Log in
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-neutral-500">
            New to Neighbourly?{" "}
            <Link to="/signup" className="font-semibold text-brand-700 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
