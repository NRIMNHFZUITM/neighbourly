import { describe, expect, it } from "vitest";
import { parseOpenMeteo, weatherKind, weatherLabel, weatherTip } from "./weather";

const sample = {
  current: { time: "2026-10-21T13:00", temperature_2m: 31.4, apparent_temperature: 36.2, relative_humidity_2m: 71, weather_code: 2, is_day: 1 },
  hourly: {
    time: Array.from({ length: 24 }, (_, h) => `2026-10-21T${String(h).padStart(2, "0")}:00`),
    temperature_2m: Array.from({ length: 24 }, (_, h) => 24 + (h > 8 && h < 18 ? 8 : 0)),
    precipitation_probability: Array.from({ length: 24 }, (_, h) => (h >= 15 ? 80 : 10)),
    weather_code: Array.from({ length: 24 }, (_, h) => (h >= 15 ? 95 : 2)),
  },
  daily: { temperature_2m_max: [33.2, 32], temperature_2m_min: [24.1, 24], precipitation_probability_max: [85, 60], weather_code: [95, 61] },
};

describe("weather", () => {
  const now = new Date("2026-10-21T05:20:00.000Z"); // 1:20 pm in Malaysia
  const w = parseOpenMeteo(sample, now, 6);

  it("parses current conditions and starts the hourly strip at the current hour", () => {
    expect(w.current).toEqual({ temperature: 31, feelsLike: 36, humidity: 71, code: 2, isDay: true });
    expect(w.today).toMatchObject({ min: 24, max: 33, rainChance: 85 });
    expect(w.hourly).toHaveLength(6);
    expect(w.hourly[0]!.time).toBe("2026-10-21T13:00:00+08:00");
  });

  it("labels WMO codes", () => {
    expect(weatherLabel(0)).toBe("Clear");
    expect(weatherKind(63)).toBe("rain");
    expect(weatherLabel(96)).toBe("Thunderstorms");
  });

  it("warns about thunderstorms in the next few hours", () => {
    expect(weatherTip(w)).toMatch(/^Thunderstorms likely from 3:00 pm/);
  });

  it("says 'within the hour' when it's already raining", () => {
    const wet = { ...sample, hourly: { ...sample.hourly, precipitation_probability: sample.hourly.time.map(() => 90), weather_code: sample.hourly.time.map(() => 63) } };
    expect(weatherTip(parseOpenMeteo(wet, now, 6))).toBe("Rain likely within the hour. Keep an umbrella handy.");
  });

  it("rejects unexpected responses", () => {
    expect(() => parseOpenMeteo({ error: true })).toThrow();
  });
});
