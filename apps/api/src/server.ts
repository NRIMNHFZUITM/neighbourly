import { buildApp } from "./app";
import { loadDotEnv, loadEnv } from "./env";

loadDotEnv();
const env = loadEnv();
const app = await buildApp(env);

try {
  await app.listen({ port: env.port, host: env.host });
  app.log.info(
    env.aiKey
      ? `Assistant using ${env.aiProvider} ${env.model} (fallback ${env.fallbackModel})`
      : "No OPENAI_API_KEY or OPENROUTER_API_KEY set: the assistant answers from the township guide only",
  );
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
