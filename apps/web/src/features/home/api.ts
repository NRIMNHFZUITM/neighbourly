import { AlertListSchema, OPEN_METEO_URL, WeatherSchema, parseOpenMeteo, type Weather } from "@neighbourly/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useAlerts = () =>
  useQuery({ queryKey: ["alerts"], queryFn: () => api("/api/alerts", { schema: AlertListSchema }), refetchInterval: 30_000 });

async function fetchWeather(): Promise<Weather> {
  try {
    // Our API proxies Open-Meteo, so the whole township shares one cached request.
    return await api("/api/weather", { schema: WeatherSchema });
  } catch {
    // No API server (static demo): ask Open-Meteo directly. Free, no key needed.
    const res = await fetch(OPEN_METEO_URL);
    if (!res.ok) throw new Error("Weather is unavailable right now.");
    return parseOpenMeteo(await res.json(), new Date());
  }
}

export const useWeather = () =>
  useQuery({ queryKey: ["weather"], queryFn: fetchWeather, staleTime: 10 * 60_000, refetchInterval: 15 * 60_000, retry: 1 });
