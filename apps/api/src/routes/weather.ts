/**
 * GET /api/weather: current conditions and the next few hours for City of Elmina.
 * Proxies Open-Meteo, so residents' browsers don't call a third party and the whole township
 * shares one cached request (see weather-service.ts).
 */
import type { FastifyInstance } from "fastify";
import type { WeatherService } from "../weather-service";

export interface WeatherRouteOptions {
  weather: WeatherService;
}

export async function weatherRoutes(app: FastifyInstance, { weather }: WeatherRouteOptions) {
  app.get("/api/weather", async (_request, reply) => {
    try {
      const data = await weather.get();
      reply.header("cache-control", "public, max-age=300");
      return data;
    } catch {
      return reply.code(502).send({ error: "weather_unavailable", message: "Weather is unavailable right now." });
    }
  });
}
