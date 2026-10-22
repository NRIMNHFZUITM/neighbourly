# Third-party notices

Neighbourly uses the following third-party software, data and fonts. Licences were checked against each package's `package.json` in October 2026. Development-only tools are listed separately.

## Runtime dependencies

| Component | Licence | Use |
|---|---|---|
| React, React DOM | MIT | UI framework |
| React Router | MIT | Routing |
| TanStack Query | MIT | Server-state caching |
| Zustand | MIT | Client state |
| Zod | MIT | Shared data contracts and validation |
| Tailwind CSS | MIT | Styling |
| Radix UI (`radix-ui`) | MIT | Accessible UI primitives (dialogs, menus, switches, tabs) |
| lucide-react | ISC | Icons |
| class-variance-authority | Apache-2.0 | Component variants |
| clsx, tailwind-merge | MIT | Class name utilities |
| Leaflet | BSD-2-Clause | Maps |
| react-leaflet | **Hippocratic License 2.1** | React bindings for Leaflet (see note below) |
| Recharts | MIT | Dashboard charts |
| sonner | MIT | Toast notifications |
| react-markdown, remark-gfm | MIT | Rendering assistant answers |
| idb-keyval | Apache-2.0 | Saving demo data in the browser |
| Mock Service Worker (`msw`) | MIT | In-browser sample-data API |
| Fastify, @fastify/cors, @fastify/rate-limit | MIT | API server |
| Plus Jakarta Sans (`@fontsource-variable/plus-jakarta-sans`) | SIL Open Font License 1.1 | Typeface |

**Note on react-leaflet.** The Hippocratic License 2.1 is an "ethical source" licence: it permits use, including commercial use, provided the software isn't used to violate human rights. It is not an OSI-approved open-source licence. If Sime Darby Property's legal review prefers OSI-approved licences only, the map components (`apps/web/src/components/map`) can be rewritten on plain Leaflet (BSD-2-Clause) without changing the rest of the app.

## Data and services

| Source | Licence / terms | Use |
|---|---|---|
| OpenStreetMap data and map tiles | Data © OpenStreetMap contributors, ODbL 1.0; tiles under the OSM Tile Usage Policy | Map backgrounds, and coordinates of City of Elmina places looked up through Nominatim. Attribution is shown on every map. Heavy production use needs a commercial tile provider. |
| Open-Meteo weather API | Data CC BY 4.0, free non-commercial API (no key) | Current weather and the next few hours on Home. Proxied and cached by the API server for 10 minutes; "Weather data by Open-Meteo" is shown on the card. Commercial use needs an Open-Meteo API plan. |
| OpenRouter | OpenRouter terms of service, plus each model provider's terms | Language models for the assistant (optional) |

## Photos

Photos come from Wikimedia Commons. Facility photos are **representative**: they show similar spaces, not the actual City of Elmina facilities, and each facility page says so in its caption. Where a photo was cropped or resized, that's noted; no other changes were made.

| File (`apps/web/public/`) | Photo | Author | Licence | Changes |
|---|---|---|---|---|
| `images/login-elmina.jpg` | [Elmina (Malaysia) 1.jpg](https://commons.wikimedia.org/wiki/File:Elmina_(Malaysia)_1.jpg): Elmina Valley Central Park | Wiki Farazi | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Resized |
| `images/facilities/hall.jpg` | [Jementah Multipurpose Hall.jpg](https://commons.wikimedia.org/wiki/File:Jementah_Multipurpose_Hall.jpg) | Chongkian | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Cropped and resized |
| `images/facilities/gym.jpg` | [Interior of new modern gym with equipment.jpg](https://commons.wikimedia.org/wiki/File:Interior_of_new_modern_gym_with_equipment.jpg) | Shixart1985 | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | Cropped and resized |
| `images/facilities/bbq.jpg` | [Barbecue pits in Changi Point park 2015.jpg](https://commons.wikimedia.org/wiki/File:Barbecue_pits_in_Changi_Point_park_2015.jpg) | Apetrov09703 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Cropped and resized |
| `images/facilities/meeting-room.jpg` | [Large meeting room (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Large_meeting_room_(Unsplash).jpg) | Breather | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Resized |

The cropped CC BY-SA photos are shared under the same licence (CC BY-SA 4.0).

The demo video (`scripts/video/`) also uses [A pothole in Dilova Street in Kyiv.jpg](https://commons.wikimedia.org/wiki/File:A_pothole_in_Dilova_Street_in_Kyiv.jpg) by Роман Рябенко ([CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), resized) as the photo attached to the sample pothole report. The video's narration is an AI-generated voice from Fish Audio (model s2.1-pro, the Fish Audio–licensed voice "Gregory"), disclosed in the video's closing credits, and the food-waste figure (about 17,000 tonnes a day) is SWCorp's widely reported estimate.

## Brand colours

The colour theme follows Sime Darby Property's published palette (heritage red with a warm yellow accent, on charcoal and neutral greys). Only the colours are used. No Sime Darby Property logo, wordmark or programme material appears anywhere in the app.

## Development tools

Vite (MIT), Vitest (MIT), TypeScript (Apache-2.0), ESLint and typescript-eslint (MIT), Playwright (Apache-2.0), tsx (MIT), concurrently (MIT).

## Content

All sample people, shops, reports, listings, bookings, events and knowledge-base content are fictional and were written for this prototype. Emoji artwork is rendered by the viewer's operating system font.
