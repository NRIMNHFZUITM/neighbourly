import { setupWorker } from "msw/browser";
import { loadDb } from "./db";
import { adminHandlers } from "./handlers/admin";
import { authHandlers } from "./handlers/auth";
import { bookingHandlers } from "./handlers/booking";
import { communityHandlers } from "./handlers/community";
import { ecofoodHandlers } from "./handlers/ecofood";
import { feedHandlers } from "./handlers/feed";
import { miscHandlers } from "./handlers/misc";
import { placesHandlers } from "./handlers/places";
import { towncareHandlers } from "./handlers/towncare";

/**
 * Starts the sample-data API inside the browser (Mock Service Worker). Every /api request
 * except the assistant (/api/chat) and the weather (/api/weather), both served by apps/api,
 * is answered here, with the same contracts and privacy presenters the real API will use.
 */
export async function startMockApi(): Promise<void> {
  await loadDb();
  const worker = setupWorker(
    ...authHandlers,
    ...feedHandlers,
    ...towncareHandlers,
    ...ecofoodHandlers,
    ...bookingHandlers,
    ...communityHandlers,
    ...placesHandlers,
    ...miscHandlers,
    ...adminHandlers,
  );
  await worker.start({
    serviceWorker: { url: "/mockServiceWorker.js" },
    onUnhandledFrame: "bypass",
    quiet: true,
  });
}
