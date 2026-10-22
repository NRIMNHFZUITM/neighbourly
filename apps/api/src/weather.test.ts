import { WeatherSchema } from "@neighbourly/shared";
import { describe, expect, it } from "vitest";
import { buildApp } from "./app";
import { loadEnv } from "./env";

const env = { ...loadEnv({}), logLevel: "silent" };
const hours = Array.from({ length: 48 }, (_, i) => {
  const day = i < 24 ? "21" : "22";
  return `2026-10-${day}T${String(i % 24).padStart(2, "0")}:00`;
});
const sample = {
  current: { time: "2026-10-21T13:00", temperature_2m: 31, apparent_temperature: 35, relative_humidity_2m: 70, weather_code: 3, is_day: 1 },
  hourly: {
    time: hours,
    temperature_2m: hours.map(() => 30),
    precipitation_probability: hours.map(() => 20),
    weather_code: hours.map(() => 3),
  },
  daily: { temperature_2m_max: [33, 32], temperature_2m_min: [24, 24], precipitation_probability_max: [40, 30], weather_code: [3, 3] },
};

describe("GET /api/weather", () => {
  it("returns parsed weather and caches the upstream call", async () => {
    let calls = 0;
    const app = await buildApp(env, {
      streamCompletion: null,
      fetchWeather: async () => {
        calls += 1;
        return sample;
      },
    });
    const first = await app.inject({ method: "GET", url: "/api/weather" });
    expect(first.statusCode).toBe(200);
    expect(WeatherSchema.parse(first.json()).current.temperature).toBe(31);
    await app.inject({ method: "GET", url: "/api/weather" });
    expect(calls).toBe(1);
    await app.close();
  });

  it("returns 502 when the weather service is down and nothing is cached", async () => {
    const app = await buildApp(env, {
      streamCompletion: null,
      fetchWeather: async () => {
        throw new Error("timeout");
      },
    });
    const res = await app.inject({ method: "GET", url: "/api/weather" });
    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ error: "weather_unavailable" });
    await app.close();
  });
});
