/**
 * Weather for the township from Open-Meteo (free, no API key; data CC BY 4.0).
 * The API server proxies and caches it; the browser can fall back to calling it directly.
 */
import { TOWNSHIP } from "./constants";
import type { Weather, WeatherHour } from "./schemas/weather";
import { formatTime } from "./time";

export const OPEN_METEO_URL =
  "https://api.open-meteo.com/v1/forecast" +
  `?latitude=${TOWNSHIP.center.lat}&longitude=${TOWNSHIP.center.lng}` +
  "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day" +
  "&hourly=temperature_2m,precipitation_probability,weather_code" +
  "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code" +
  "&timezone=Asia%2FKuala_Lumpur&forecast_days=2";

interface OpenMeteoResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    is_day: number;
  };
  hourly: { time: string[]; temperature_2m: number[]; precipitation_probability: Array<number | null>; weather_code: number[] };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: Array<number | null>;
    weather_code: number[];
  };
}

/** Open-Meteo returns local wall-clock times ("2026-10-21T14:00"); pin them to Malaysia time. */
const toIso = (t: string) => `${t.length === 16 ? `${t}:00` : t}+08:00`;

export function parseOpenMeteo(json: unknown, now: Date = new Date(), hours = 8): Weather {
  const j = json as OpenMeteoResponse;
  if (!j?.current || !j.hourly?.time || !j.daily) throw new Error("Unexpected weather response");
  const all = j.hourly.time.map((t, i) => ({
    time: toIso(t),
    temperature: Math.round(j.hourly.temperature_2m[i] ?? 0),
    rainChance: j.hourly.precipitation_probability[i] ?? 0,
    code: j.hourly.weather_code[i] ?? 0,
  }));
  const current = all.findIndex((h) => new Date(h.time).getTime() + 3_600_000 > now.getTime());
  const start = Math.max(0, current);
  return {
    location: TOWNSHIP.name,
    updatedAt: toIso(j.current.time),
    current: {
      temperature: Math.round(j.current.temperature_2m),
      feelsLike: Math.round(j.current.apparent_temperature),
      humidity: Math.round(j.current.relative_humidity_2m),
      code: j.current.weather_code,
      isDay: j.current.is_day === 1,
    },
    today: {
      min: Math.round(j.daily.temperature_2m_min[0] ?? 0),
      max: Math.round(j.daily.temperature_2m_max[0] ?? 0),
      rainChance: j.daily.precipitation_probability_max[0] ?? 0,
      code: j.daily.weather_code[0] ?? 0,
    },
    hourly: all.slice(start, start + hours),
    source: "Open-Meteo",
  };
}

export type WeatherKind = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "storm";

/** WMO weather interpretation codes, grouped. */
export function weatherKind(code: number): WeatherKind {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 95) return "storm";
  return "rain";
}

const LABELS: Record<WeatherKind, string> = {
  clear: "Clear",
  partly: "Partly cloudy",
  cloudy: "Cloudy",
  fog: "Hazy",
  drizzle: "Drizzle",
  rain: "Rain",
  storm: "Thunderstorms",
};

export const weatherLabel = (code: number) => LABELS[weatherKind(code)];

/** One practical line for residents, when the next few hours call for it. */
export function weatherTip(w: Weather): string | null {
  const soon = w.hourly.slice(0, 6);
  const when = (h: WeatherHour) => (h === soon[0] ? "within the hour" : `from ${formatTime(h.time)}`);
  const storm = soon.find((h) => weatherKind(h.code) === "storm" && h.rainChance >= 40);
  if (storm) return `Thunderstorms likely ${when(storm)}. Bring the laundry in and stay away from open fields.`;
  const rain = soon.find((h) => h.rainChance >= 60);
  if (rain) return `Rain likely ${when(rain)}. Keep an umbrella handy.`;
  if (w.current.feelsLike >= 36) return "Very hot right now. Drink plenty of water and avoid outdoor workouts at midday.";
  return null;
}

/** A short, plain-language summary of the current weather, for the assistant. */
export function weatherSummary(w: Weather): string {
  const now = `Right now in ${w.location} it's **${w.current.temperature}°C and ${weatherLabel(w.current.code).toLowerCase()}** (feels like ${w.current.feelsLike}°C, humidity ${w.current.humidity}%).`;
  const today = `Today: high ${w.today.max}°C, low ${w.today.min}°C, with a ${w.today.rainChance}% chance of rain.`;
  const tip = weatherTip(w);
  return [now, today, tip].filter(Boolean).join(" ");
}
