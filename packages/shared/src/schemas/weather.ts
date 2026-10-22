import { z } from "zod";
import { isoDate } from "./common";

export const WeatherHourSchema = z.object({
  time: isoDate(),
  temperature: z.number(),
  /** Chance of rain in that hour, 0–100 */
  rainChance: z.number(),
  /** WMO weather code */
  code: z.number().int(),
});
export type WeatherHour = z.infer<typeof WeatherHourSchema>;

export const WeatherSchema = z.object({
  location: z.string(),
  updatedAt: isoDate(),
  current: z.object({
    temperature: z.number(),
    feelsLike: z.number(),
    humidity: z.number(),
    code: z.number().int(),
    isDay: z.boolean(),
  }),
  today: z.object({
    min: z.number(),
    max: z.number(),
    rainChance: z.number(),
    code: z.number().int(),
  }),
  /** The next few hours, starting with the current one. */
  hourly: z.array(WeatherHourSchema),
  source: z.string(),
});
export type Weather = z.infer<typeof WeatherSchema>;
