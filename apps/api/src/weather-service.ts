/**
 * One cached copy of the Open-Meteo forecast for the whole township, shared by GET /api/weather
 * and the assistant. Refreshed every 10 minutes; a stale copy is used if a refresh fails.
 */
import { OPEN_METEO_URL, parseOpenMeteo, type Weather } from "@neighbourly/shared";

export interface WeatherService {
  /** Throws only when Open-Meteo is unreachable and nothing has been cached yet. */
  get(): Promise<Weather>;
}

export interface WeatherServiceOptions {
  /** Override the upstream call (tests). Resolves to Open-Meteo's raw JSON. */
  fetchWeather?: () => Promise<unknown>;
  ttlMs?: number;
  onError?: (err: Error) => void;
}

async function fetchOpenMeteo(): Promise<unknown> {
  const res = await fetch(OPEN_METEO_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Open-Meteo returned ${res.status}`);
  return res.json();
}

export function createWeatherService(opts: WeatherServiceOptions = {}): WeatherService {
  const fetchWeather = opts.fetchWeather ?? fetchOpenMeteo;
  const ttl = opts.ttlMs ?? 10 * 60_000;
  let cache: { at: number; raw: unknown } | null = null;
  let inflight: Promise<void> | null = null;

  const refresh = async () => {
    try {
      cache = { at: Date.now(), raw: await fetchWeather() };
    } catch (err) {
      opts.onError?.(err as Error);
      if (!cache) throw err;
    }
  };

  return {
    async get() {
      if (!cache || Date.now() - cache.at > ttl) {
        // Concurrent callers share one upstream request.
        inflight ??= refresh().finally(() => (inflight = null));
        await inflight;
      }
      // Parsed per call so the hourly strip always starts at the current hour.
      return parseOpenMeteo(cache!.raw, new Date());
    },
  };
}
