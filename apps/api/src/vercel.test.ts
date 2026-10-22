import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";
import { restoreUrl } from "./vercel";

describe("Vercel entry", () => {
  it("puts back the original /api URL from the route rewrite", () => {
    expect(restoreUrl("/api?__path=chat")).toBe("/api/chat");
    expect(restoreUrl("/api?__path=weather&units=metric")).toBe("/api/weather?units=metric");
    expect(restoreUrl("/api/health")).toBe("/api/health");
  });

  it("trusts the proxy's client IP only on Vercel or when asked", () => {
    expect(loadEnv({}).trustProxy).toBe(false);
    expect(loadEnv({ VERCEL: "1" }).trustProxy).toBe(true);
    expect(loadEnv({ TRUST_PROXY: "true" }).trustProxy).toBe(true);
  });
});
