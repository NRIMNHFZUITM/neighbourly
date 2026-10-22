/**
 * Assembles Vercel's Build Output (v3) in .vercel/output after the web build:
 *   static/              the web app (apps/web/dist)
 *   functions/api.func/  the API (apps/api) bundled into one Node function, serving /api/*
 *   config.json          routes: /api/* to the function, files, then the single-page app
 *
 *   npm run build:vercel
 */
import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB_DIST = join(ROOT, "apps/web/dist");
const OUT = join(ROOT, ".vercel/output");
const FN = join(OUT, "functions/api.func");

if (!existsSync(join(WEB_DIST, "index.html"))) throw new Error("Build the web app first (npm run build -w @neighbourly/web)");
rmSync(OUT, { recursive: true, force: true });
mkdirSync(FN, { recursive: true });
cpSync(WEB_DIST, join(OUT, "static"), { recursive: true });

await build({
  entryPoints: [join(ROOT, "apps/api/src/vercel.ts")],
  outfile: join(FN, "index.mjs"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  legalComments: "none",
  logLevel: "warning",
  // Fastify and its plugins are CommonJS: give them require and __dirname inside the ES module.
  banner: {
    js: [
      "import { createRequire as __createRequire } from 'node:module';",
      "import { fileURLToPath as __fileURLToPath } from 'node:url';",
      "import { dirname as __pathDirname } from 'node:path';",
      "const require = __createRequire(import.meta.url);",
      "const __filename = __fileURLToPath(import.meta.url);",
      "const __dirname = __pathDirname(__filename);",
    ].join("\n"),
  },
});

const json = (file: string, data: unknown) => writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);

json(join(FN, ".vc-config.json"), {
  runtime: "nodejs22.x",
  handler: "index.mjs",
  launcherType: "Nodejs",
  shouldAddHelpers: false,
  supportsResponseStreaming: true,
  maxDuration: 60,
});

json(join(OUT, "config.json"), {
  version: 3,
  routes: [
    { src: "^/mockServiceWorker\\.js$", headers: { "cache-control": "no-cache" }, continue: true },
    { src: "^/api/(.*)$", dest: "/api?__path=$1" },
    { handle: "filesystem" },
    { src: "^/(.*)$", dest: "/index.html" },
  ],
});

console.log(`[vercel] ${OUT}: static web app + /api function`);
