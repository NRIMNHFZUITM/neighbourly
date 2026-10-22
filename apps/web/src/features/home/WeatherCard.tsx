import { formatTime, mytMinutesOfDay, weatherKind, weatherLabel, weatherTip, type WeatherKind } from "@neighbourly/shared";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSun,
  Droplets,
  Moon,
  Sun,
  Umbrella,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { useWeather } from "./api";

const ICONS: Record<WeatherKind, { day: LucideIcon; night: LucideIcon }> = {
  clear: { day: Sun, night: Moon },
  partly: { day: CloudSun, night: CloudMoon },
  cloudy: { day: Cloud, night: Cloud },
  fog: { day: CloudFog, night: CloudFog },
  drizzle: { day: CloudDrizzle, night: CloudDrizzle },
  rain: { day: CloudRain, night: CloudRain },
  storm: { day: CloudLightning, night: CloudLightning },
};

/** Icon colour by condition: warm for sun, cool for rain, neutral for cloud. */
const TINT: Record<WeatherKind, string> = {
  clear: "text-accent-500",
  partly: "text-accent-500",
  cloudy: "text-neutral-500",
  fog: "text-neutral-500",
  drizzle: "text-sky-600",
  rain: "text-sky-600",
  storm: "text-violet-600",
};

function WeatherIcon({ code, isDay, className }: { code: number; isDay: boolean; className?: string }) {
  const kind = weatherKind(code);
  const Icon = ICONS[kind][isDay ? "day" : "night"];
  return <Icon className={cn(TINT[kind], className)} aria-hidden />;
}

const isDaytime = (iso: string) => {
  const m = mytMinutesOfDay(iso);
  return m >= 7 * 60 && m < 19 * 60;
};
const hourLabel = (iso: string) => formatTime(iso).replace(":00", "");

export function WeatherCard() {
  const { data: w, isPending, isError } = useWeather();

  if (isPending) return <Skeleton className="h-[164px] w-full rounded-2xl" />;
  // Weather is a nice-to-have: if it's unavailable, the rest of Home still works.
  if (isError || !w) return null;

  const tip = weatherTip(w);
  return (
    <section aria-label="Weather in City of Elmina" className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-card">
      <div className="flex items-center gap-3">
        <WeatherIcon code={w.current.code} isDay={w.current.isDay} className="size-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-2">
            <span className="text-3xl leading-none font-bold text-neutral-900">{w.current.temperature}°</span>
            <span className="truncate font-semibold text-neutral-700">{weatherLabel(w.current.code)}</span>
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Feels like {w.current.feelsLike}° · Humidity {w.current.humidity}%
          </p>
        </div>
        <div className="shrink-0 text-right text-xs text-neutral-500">
          <p className="font-semibold text-neutral-700">
            H {w.today.max}° · L {w.today.min}°
          </p>
          <p className="mt-1 inline-flex items-center gap-1">
            <Umbrella className="size-3.5" aria-hidden /> {w.today.rainChance}% rain today
          </p>
        </div>
      </div>

      <ol className="mt-3 grid grid-cols-6 gap-1 border-t border-neutral-100 pt-3" aria-label="Next few hours">
        {w.hourly.slice(0, 6).map((h, i) => (
          <li key={h.time} className="flex flex-col items-center gap-1 text-center">
            <span className="text-[11px] font-medium text-neutral-500">{i === 0 ? "Now" : hourLabel(h.time)}</span>
            <WeatherIcon code={h.code} isDay={isDaytime(h.time)} className="size-5" />
            <span className="text-sm font-semibold text-neutral-900">{h.temperature}°</span>
            <span className={cn("inline-flex items-center gap-0.5 text-[11px]", h.rainChance >= 60 ? "font-semibold text-sky-700" : "text-neutral-400")}>
              <Droplets className="size-3" aria-hidden />
              <span className="sr-only">Chance of rain</span>
              {h.rainChance}%
            </span>
          </li>
        ))}
      </ol>

      {tip && <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900">{tip}</p>}
      <p className="mt-2 text-[11px] text-neutral-400">
        {w.location} · Updated {formatTime(w.updatedAt)} ·{" "}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="hover:underline">
          Weather data by Open-Meteo
        </a>
      </p>
    </section>
  );
}
