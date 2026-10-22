import "@fontsource-variable/plus-jakarta-sans";
import "leaflet/dist/leaflet.css";
import "./styles/index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";

/**
 * Until the Supabase-backed API exists, a sample-data API runs inside the browser
 * (Mock Service Worker). Set VITE_USE_MOCKS=false to talk to a real API instead.
 */
async function startMocks() {
  if (import.meta.env.VITE_USE_MOCKS === "false") return;
  const { startMockApi } = await import("./mocks/browser");
  await startMockApi();
}

startMocks()
  .catch((err) => console.error("Sample-data API failed to start", err))
  .finally(() => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
