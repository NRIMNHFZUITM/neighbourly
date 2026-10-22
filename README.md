# Neighbourly · City of Elmina

A private, verified community app for a smarter township. Residents report township issues, share surplus food, book shared facilities and get answers from an assistant. Township Management gets a dashboard that turns that activity into operational data.

Built for the **Sime Darby Property University Hackathon 2026** (People track). This is the **clickable prototype stage**: every screen works on realistic sample data for City of Elmina, and the assistant is real. The full plan is in [Neighbourly_Project_Plan.md](Neighbourly_Project_Plan.md).

> Prototype notice: people, shops, reports, bookings, opening hours and rules are sample content. Neighbourhood, park, mall and street names are real places from OpenStreetMap. This is not an official Sime Darby Property app.

## Quick start

Requirements: **Node.js 24 LTS** (see `.nvmrc`).

```bash
npm install
npm run dev          # API on :8787 and web app on http://localhost:5173
```

Open http://localhost:5173 and click **Try the demo**. The login page has one-click demo accounts:

| Account | Role | Good for |
|---|---|---|
| Aisyah Rahman | Resident, Block C, Elmina Valley | Reporting issues, requesting food, bookings |
| Daniel Lim | Resident, Block A, Elmina Valley | Sharing food |
| Roti Sinar Bakery | Local shop | End-of-day surplus food |
| Township Management | Admin (Nadia Osman) | Dashboard, report management, approvals |

Email login also works with `aisyah@neighbourly.demo`, `daniel@neighbourly.demo` or `nadia@neighbourly.demo`, password `demo1234`. Switch accounts from the avatar menu (top right). **Reset demo data** in the same menu restores the sample data.

### Turning on the AI assistant

Without a key, the assistant answers straight from the township guide ("Guide only"). To use a language model:

1. Get an OpenAI key (https://platform.openai.com/api-keys, with billing credits) or an OpenRouter key (https://openrouter.ai/keys).
2. Copy `apps/api/.env.example` to `apps/api/.env` and set `OPENAI_API_KEY=...` (or `OPENROUTER_API_KEY=...`).
3. Restart `npm run dev`. `GET /api/health` shows the provider and models, and the assistant's badge changes to "AI".

The key stays on the server. The browser only ever calls `POST /api/chat`, and `.env` is git-ignored.

## Demo script (about 5 minutes)

This follows section 9 of the plan. `npm run e2e` runs exactly these steps automatically.

1. **Aisyah reports a pothole.** TownCare → *Report an issue*. Add a photo (location data is stripped in the browser), choose *Roads & potholes*, drop a pin and submit. Neighbours see "Resident in Block C · Elmina Valley", not her name.
2. **She sees it in My reports and on the map.** TownCare opens on *My reports*; *All reports* and *Map* are the next tabs.
3. **Township Management acts on it.** Avatar menu → switch to *Township Management*. The dashboard shows open reports. Go to *Reports*, open the pothole, and you'll see her private contact details (admins only). Set *In progress* with a note, then *Resolved*.
4. **Aisyah gets the update.** Switch back to Aisyah. The bell shows the notification, and the report's timeline shows each step and the note.
5. **Food sharing.** Switch to *Daniel* → EcoFood → *Share food* and post something. Switch to *Aisyah*, open it and *Request*. Switch to *Daniel*, *Confirm* (both see a 4-digit pickup code), then *Mark as collected*.
6. **The dashboard shows the impact.** As *Township Management*, food saved and resolved reports have both gone up.
7. **The assistant answers.** Ask "How do I book the multipurpose hall?", or in Malay, "macam mana nak tempah dewan?". The answer links to *Book a facility*. Questions it can't answer get a "create a support ticket" handoff.

## What's in the prototype

| Module | Working now |
|---|---|
| Sign-up & verification | Sign up, verify with a unit code (demo codes on the screen) or request admin approval; shop applications with SSM number; onboarding (interests, notifications, privacy) |
| Home | Minimal by design: live weather for City of Elmina (Open-Meteo), the newest safety alert and announcement, "For you" (pickups, food requests, your next booking, your open reports), the next three events, and one-line summaries of EcoFood, TownCare and Community |
| Community | Tabs for Feed, Events and Neighbours. Feed: posts with topics (Lost & found, Recommendations, Giveaways, Safety, Activities) and a topic filter, including "Official" for Township Management. Events: upcoming events by category, "I'm going" RSVPs shown as counts only, create and cancel events. Neighbours: directory with filters and public profiles |
| Places | One map of every bookable facility and verified local shop, with filters, details, "Check availability", "View shop" and directions |
| TownCare | Tabs for My reports, All reports and Map. Report with photo + map pin (Roads, Lights, Parks, Cleanliness, Wildlife or Others), filters, status-coloured map pins, detail with timeline, "me too", comments |
| EcoFood | Listings with halal status and allergens, local-shop surplus, request → confirm → pickup code → collected, impact dashboard |
| Facility booking | Hall, gym studio, BBQ pit, meeting room (with representative photos); availability that shows taken slots without names; instant vs approval bookings; cancel and reschedule |
| Assistant | Streaming answers from the township guide (12 topics, English and Malay keywords), OpenRouter with automatic fallback, guide-only mode, support-ticket handoff |
| Township dashboard | KPIs, reports by category, resolution time, wildlife trend, food saved, facility use (each chart has a table view); report management; booking approvals and maintenance blocks; verifications; support tickets; safety alerts |
| Notifications | In-app bell and page, refreshed every 10 s |

Responsive throughout. Phones get bottom navigation (Home, TownCare, EcoFood, Book, Chat), with Community and Places in the avatar menu, and full-screen forms. Tablets and desktops get a sidebar (Neighbourhood: Home, Community, Places; Services: TownCare, EcoFood, Facilities; Help: Assistant), multi-column layouts and a side panel for the assistant.

The theme uses Sime Darby Property's colours: heritage red (`#d71920`) for primary actions, warm yellow (`#f6a909`) as the accent, charcoal text on neutral greys. Tokens live in `apps/web/src/styles/index.css`.

## Architecture

```
apps/web         React 19 + TypeScript (Vite), React Router, TanStack Query, Zustand,
                 Tailwind CSS 4 + Radix UI, Leaflet (OpenStreetMap), Recharts
  src/mocks      In-browser sample-data API (Mock Service Worker), saved in IndexedDB
apps/api         Fastify (Node + TypeScript): /api/health, /api/chat (SSE → OpenRouter) and
                 /api/weather (Open-Meteo, cached 10 minutes)
packages/shared  Zod contracts, privacy presenters, booking rules, time helpers,
                 assistant retrieval / redaction / prompt (used by both apps)
knowledge/       Assistant knowledge base in Markdown (built by npm run kb:build)
scripts/         Knowledge-base build, end-to-end demo run, screenshot capture
```

**Now (prototype):** the web app calls `/api/*`. Mock Service Worker answers in the browser using the same Zod contracts and the same privacy presenters the real server will use. Only `/api/chat` and `/api/weather` go to the Fastify server. Without the server, Home asks Open-Meteo directly and the assistant answers from the guide.

**Next:** Supabase (Postgres, Auth, Storage) behind the Fastify API, implementing the same endpoints. `packages/shared/src/rows.ts` already mirrors the planned tables. Set `VITE_USE_MOCKS=false` to stop using the sample-data API. The mock layer stays useful as an offline demo mode.

## Privacy by design

- **One place decides what people see.** `packages/shared/src/privacy.ts` turns stored records into what each viewer may see. Each presenter copies an explicit list of allowed fields, and there's a unit test for every rule in section 4 of the plan (`privacy.test.ts`).
- **Anonymous by default.** Reporters, report commenters and food requesters appear as "Resident in Block X" with no link to their profile, unless they opt in. Admins see who it is so they can follow up.
- **Calendars without names.** Availability carries only free/taken states, never who booked or why.
- **RSVPs are counts.** Events show how many people are going, never who.
- **Shops on the map show business details only.** The Places map never includes a shop's SSM number, and shops appear only once Township Management has verified them.
- **Contact details stay private.** Phone, email and unit number are shown only to the owner and Township Management.
- **Photos lose their GPS data.** They're re-encoded in the browser before upload (`apps/web/src/lib/image.ts`) and uploaded through a signed URL.
- **The assistant redacts personal data.** Emails, Malaysian phone numbers and IC numbers are removed before anything is logged or sent to the model. It is rate-limited per client and messages are capped at 1,000 characters.

## Assistant

- `knowledge/*.md`: one question per `## ` heading, with section keywords in English and Malay. Run `npm run kb:build` after editing (dev and build run it too). A unit test checks every heading finds its own section.
- Retrieval is BM25 keyword search (`packages/shared/src/chat/search.ts`), and `topic.ts` classifies each message: small talk, ticket request, answerable, uncovered (offer a support ticket) or off topic.
- **Guardrails, so it only helps with Neighbourly and City of Elmina:**
  1. Before any model call: prompt-injection attempts ("ignore your instructions", "show your system prompt", "you are now…"), unrelated tasks (essays, code, maths, translations, recipes) and messages with no township words are declined politely, with suggested questions and no support ticket.
  2. In the prompt: the rules can't be changed by the resident, the prompt is never revealed, and anything unrelated is declined and marked `[[OFF_TOPIC]]`.
  3. After the model: answers to borderline questions are held until complete and replaced with the decline if they drifted off topic.
- **Token savers** (on `/api/health` under `usage`):
  - Greetings, thanks, "what can you do" and ticket requests are answered instantly.
  - Short questions that clearly match one guide section are answered straight from the guide (badge "AI", note "Instant answer from the township guide"). In tests, about three in four everyday how-to questions are answered this way; advice, comparisons, "why" and multi-part questions go to the model.
  - Repeated first questions come from a 6-hour answer cache.
  - Model prompts carry only the top 2–3 guide sections and the last 6 turns (with old answers shortened), and add the ~1,000-token app overview only when search found nothing good. Answers are capped at 600 tokens.
  - A model that returns "no credits", a bad key or rate limiting is rested (10 minutes, or 30 seconds for rate limits) instead of being retried on every message.
- Default models: OpenAI `gpt-4.1-mini` (primary) and `gpt-4o-mini` (fallback), or for OpenRouter `anthropic/claude-haiku-5.5` and `google/gemini-3.5-flash-lite`. Change them with `CHAT_MODEL` / `CHAT_FALLBACK_MODEL`.
- Failure handling: if the primary model fails before answering, the fallback is tried. If both fail, or the API is unreachable, the answer comes straight from the guide, even in the browser alone.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Build the knowledge base, start the API and the web app |
| `npm test` | Unit tests (privacy rules, booking rules, retrieval, redaction, weather parsing, chat and weather routes) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript across all packages |
| `npm run build` | Production build |
| `npm run e2e` | Runs the demo script in a real browser (needs `npm run dev` running) |
| `npm run screenshots` | Saves desktop and phone screenshots of every main screen to `screenshots/` |

### Demo video

`video/Neighbourly_Demo.mp4` (about 3 minutes, 1080p, with narration) and `video/Neighbourly_Demo.srt` (subtitles) are built from code in `scripts/video/`: animated problem and solution scenes (`scenes.html`), real app recordings driven by Playwright (`record-app.ts`), device frames (`frame.html`) and the final cut (`build.ts`). Captions use each line's `text`; the voice reads `spoken` where a name needs a respelling ("Saim Dahbee" for Sime Darby, "Alee" for Ali). In the recordings the sample resident is shown as Ali Rahman; the app's own demo account is unchanged. To rebuild after changing the app or the script in `narration.json`:

```bash
# needs a full ffmpeg build, e.g. from the ffmpeg-static npm package
export FFMPEG=/path/to/ffmpeg
npx tsx scripts/video/tts-fish.ts --free --voice 2680da81de8348a68e1f4dbaa79272f1   # narration (Fish Audio "Gregory", FISH_AUDIO_API_KEY in apps/api/.env)
npm run dev                                                     # in another terminal
npx tsx scripts/video/record-app.ts                             # app clips
npx tsx scripts/video/build.ts                                  # scenes, audio, final MP4 and SRT
```

## Hackathon notes

- **AI disclosure (T&C clause 13).** This prototype was built with substantial help from Claude Code (Anthropic), an AI coding assistant. The in-app assistant uses third-party language models (OpenAI, or OpenRouter as an alternative). The demo video's narration is an AI-generated voice from Fish Audio.
- **Branding (clause 8).** Neighbourly uses its own name and logo, in Sime Darby Property's colours. No Sime Darby Property logos or programme materials are used.
- **Third-party materials (clause 14).** See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), including the licence and author of every photo.
- **Intellectual property (clause 11).** Submissions and developed IP vest in Sime Darby Property under the hackathon terms.

## Known limitations

- Sample data lives in each browser (IndexedDB). Two devices don't share data until the real backend exists.
- Notifications refresh every 10 seconds. There are no email or push notifications yet.
- Map tiles come from OpenStreetMap and need an internet connection.
- Facility photos are representative, not the actual Elmina facilities. Seeded reports and food listings use illustrated placeholders.
- The Open-Meteo free API is for non-commercial use. A production launch needs an Open-Meteo plan or another weather provider.
