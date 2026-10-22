/**
 * Vercel entry: the same Fastify app as server.ts, but Vercel's Node runtime hands it each
 * request instead of it listening on a port. Bundled into one file by scripts/build-vercel.ts.
 * Secrets (OPENAI_API_KEY) come from the Vercel project's environment variables.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "./app";
import { loadEnv } from "./env";

/** Built on the first request, then reused while Vercel keeps the instance warm. */
let ready: ReturnType<typeof start> | undefined;
async function start() {
  const app = await buildApp(loadEnv());
  await app.ready();
  return app;
}

/** Vercel routes /api/<path> here as /api?__path=<path>; put the original URL back for Fastify. */
export function restoreUrl(url: string): string {
  const parsed = new URL(url, "http://localhost");
  const path = parsed.searchParams.get("__path");
  if (path === null) return url;
  parsed.searchParams.delete("__path");
  return `/api/${path}${parsed.search}`;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  ready ??= start();
  const app = await ready;
  req.url = restoreUrl(req.url ?? "/");
  app.server.emit("request", req, res);
}
