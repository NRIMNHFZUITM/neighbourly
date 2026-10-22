import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  EyeOff,
  ImageOff,
  KeyRound,
  Leaf,
  Lock,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmt1 } from "@/components/charts/theme";
import { usePublicStats } from "./api";

const MODULES: Array<{ icon: ReactNode; title: string; body: string; tags: string[] }> = [
  {
    icon: <UsersRound />,
    title: "Community",
    body: "A feed, events and a neighbour directory for verified residents only. Meet the people next door, not strangers.",
    tags: ["People"],
  },
  {
    icon: <Wrench />,
    title: "TownCare",
    body: "Report potholes, broken lights or wildlife with a photo and a map pin, then track the fix from Open to Resolved.",
    tags: ["People", "Planet"],
  },
  {
    icon: <Leaf />,
    title: "EcoFood",
    body: "Share surplus food with neighbours and local shops' end-of-day leftovers. Every collected kilogram is counted.",
    tags: ["Planet"],
  },
  {
    icon: <CalendarDays />,
    title: "Facility booking",
    body: "Book the hall, gym studio, BBQ pit or meeting room. See free slots instantly without seeing who booked.",
    tags: ["People"],
  },
  {
    icon: <MessageCircle />,
    title: "Assistant",
    body: "Ask about rules, opening hours or how to book, in English, Malay, Chinese or Tamil. Hands off to a person when needed.",
    tags: ["People"],
  },
  {
    icon: <BarChart3 />,
    title: "Township dashboard",
    body: "Township Management sees issues by category, resolution times, wildlife alerts and food saved, so they can plan maintenance.",
    tags: ["People", "Planet"],
  },
];

const PRIVACY: Array<{ icon: ReactNode; title: string; body: string }> = [
  { icon: <EyeOff />, title: "Anonymous reporting", body: "Neighbours see “Resident in Block C”, never your name, unless you choose to show it." },
  { icon: <Lock />, title: "Private calendars", body: "Everyone can see which slots are taken, but only you and management can see who booked them and why." },
  { icon: <KeyRound />, title: "Contact details stay private", body: "Phone numbers, unit numbers and addresses are never shown to other residents." },
  { icon: <ImageOff />, title: "Photo locations removed", body: "Hidden GPS data is stripped from photos in your browser before they're uploaded." },
];

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-linear-to-br from-brand-200/60 via-amber-100/60 to-sky-100/60 blur-2xl" />
      <div className="space-y-3 rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-2xl backdrop-blur">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <Badge tone="sky">
              <Clock3 /> In progress
            </Badge>
            <span className="text-xs text-neutral-400">2 days ago</span>
          </div>
          <p className="mt-2 font-semibold text-neutral-900">Deep pothole at the Persiaran Elmina junction</p>
          <p className="mt-1 text-xs text-neutral-500">Resident in Block B · Elmina Valley · 9 neighbours said “me too”</p>
          <ol className="mt-3 space-y-1.5 text-xs">
            <li className="flex items-center gap-2 text-neutral-500">
              <CheckCircle2 className="size-3.5 text-green-600" /> Reported
            </li>
            <li className="flex items-center gap-2 font-semibold text-neutral-800">
              <Clock3 className="size-3.5 text-sky-600" /> Roads & Drainage team assigned
            </li>
          </ol>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 shadow-card">
          <div className="grid size-12 place-items-center rounded-xl bg-amber-100 text-2xl">🥐</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">End-of-day bread & buns</p>
            <p className="text-xs text-neutral-500">Roti Sinar Bakery · Today 8:30 pm</p>
          </div>
          <Badge tone="green">Halal</Badge>
        </div>
        <div className="rounded-2xl rounded-tl-md border border-neutral-200 bg-white p-3 text-sm shadow-card">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-brand-700">
            <Sparkles className="size-3.5" /> Assistant
          </p>
          The multipurpose hall needs approval. Pick a free slot in <span className="font-semibold">Book a facility</span> and you'll be notified
          once it's confirmed.
        </div>
      </div>
    </div>
  );
}

function Stats() {
  const { data } = usePublicStats();
  const items = [
    { label: "Verified residents", value: data?.residents },
    { label: "Issues resolved", value: data?.issuesResolved },
    { label: "Average days to fix", value: data ? fmt1.format(data.avgFixDays) : undefined },
    { label: "kg of food saved", value: data?.kgFoodSaved },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 md:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="bg-white px-5 py-4">
          <dt className="text-xs font-medium text-neutral-500">{s.label}</dt>
          <dd className="mt-1 text-2xl font-semibold text-neutral-900">{s.value ?? "–"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,var(--color-brand-50),transparent_60%)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
        <Logo />
        <nav className="flex items-center gap-2">
          <a href="#privacy" className="hidden px-3 text-sm font-semibold text-neutral-600 hover:text-neutral-900 sm:block">
            Privacy
          </a>
          <Button asChild variant="ghost">
            <Link to="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link to="/login">Try the demo</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 md:px-8">
        <section className="grid items-center gap-10 py-10 md:grid-cols-2 md:py-16">
          <div>
            <Badge tone="brand" className="mb-4">
              <ShieldCheck /> For verified residents of City of Elmina
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl md:text-[56px] md:leading-[1.05]">
              Your township, <span className="text-brand-700">connected.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-neutral-600">
              Report issues, share surplus food, book shared spaces and get answers in one private app built for the people of City of Elmina, and for
              the team that looks after it.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/login">
                  Try the demo <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/signup">Create an account</Link>
              </Button>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-500">
              {["Verified residents only", "Anonymous by default", "Free for residents"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-brand-600" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <HeroPreview />
        </section>

        <section className="pb-14">
          <Stats />
          <p className="mt-2 text-xs text-neutral-400">Live numbers from the prototype's sample data.</p>
        </section>

        <section className="pb-16">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">Everything a neighbourhood needs</h2>
          <p className="mt-2 max-w-2xl text-neutral-600">Six modules that turn everyday resident activity into a safer, greener and better-run township.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <div key={m.title} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
                <div className="mb-3 grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700 [&_svg]:size-5">{m.icon}</div>
                <h3 className="font-bold text-neutral-900">{m.title}</h3>
                <p className="mt-1.5 text-sm text-neutral-600">{m.body}</p>
                <div className="mt-3 flex gap-1.5">
                  {m.tags.map((t) => (
                    <Badge key={t} tone={t === "Planet" ? "green" : "sky"}>
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="privacy" className="mb-16 rounded-3xl bg-brand-900 px-6 py-10 text-white md:px-10">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Private by default</h2>
          <p className="mt-2 max-w-2xl text-brand-100">
            Neighbourly shows people's activity to each other, so the privacy rules come first. Every screen follows them.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRIVACY.map((p) => (
              <div key={p.title} className="rounded-2xl bg-white/10 p-5">
                <div className="mb-3 text-brand-200 [&_svg]:size-6">{p.icon}</div>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="mt-1.5 text-sm text-brand-100">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">See it in action</h2>
          <p className="mx-auto mt-2 max-w-xl text-neutral-600">
            Log in as a resident, a local shop or Township Management. One click, no sign-up needed.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/login">
              Open the demo <ArrowRight />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-neutral-200 py-6 text-center text-xs text-neutral-400">
        Neighbourly · A student prototype for the Sime Darby Property University Hackathon 2026. Uses sample data; not an official app. Map data ©
        OpenStreetMap contributors.
      </footer>
    </div>
  );
}
