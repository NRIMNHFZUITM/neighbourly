# Neighbourly: Project Plan

A private, verified community app for smarter townships. Built as a responsive web app using React and TypeScript, with an OpenRouter-powered assistant chatbot.

Built for the Sime Darby Property hackathon, under the "Township of Tomorrow" theme: *people, businesses and nature thrive together through innovation, technology and sustainable living.*

---

## 1. Goals

- Give residents one place to report township issues, share surplus food, book shared facilities, and connect with neighbours.
- Give township management a dashboard that turns resident activity into operational data.
- Keep personal data private by default, with clear rules on what other users can see.
- Answer common resident questions through a chatbot without exposing any API keys.

## 2. Modules

| Module | Purpose | Theme fit |
|---|---|---|
| **Community** | Feed, neighbour directory, public profiles | People (feeling connected) |
| **TownCare** | Issue reporting, safety alerts, status tracking | People (safety), Planet (maintenance) |
| **EcoFood** | Surplus food sharing and waste tracking | Planet (waste, circular economy) |
| **Facility Booking** | Book shared spaces such as halls, gyms, and BBQ areas | People (community life) |
| **Assistant** | OpenRouter-powered chatbot for township help | People (digital living) |
| **Township Dashboard** | Admin analytics and report management | Planet and People (data-driven management) |

## 3. Features and Pages

### 3.1 Public and Onboarding

- **Landing page:** what Neighbourly is, the modules, and a sign-up call to action.
- **Sign up and log in:** email login with a verified-resident step (unit code or admin approval).
- **Onboarding:** choose neighbourhood, interests (food, safety, kids, wildlife), and notification preferences.

### 3.2 Home

- **Feed:** nearby posts, reports, food listings, and facility updates in one stream, filtered by neighbourhood.
- **Quick actions:** Report an issue, Share food, Book a facility, Ask the assistant.

### 3.3 Community

- **Community feed:** posts, comments, and reactions.
- **Neighbour directory:** browse other verified residents' public profiles (name, avatar, block, interests, and contributions such as "shares surplus food").
- **Public profile:** the user's public activity (posts, food shared, reports raised), with privacy controls.

### 3.4 TownCare

- **Report list:** all reports in the area, filterable by category (roads, streetlights, parks, cleanliness, wildlife) and status (open, in progress, resolved).
- **Create report:** photo upload, category, description, and a location pin on a map.
- **Report detail:** status timeline, comments, "me too" supporter votes, and the reporter shown as "Resident in Block C".
- **Map view:** all reports as pins, color-coded by status.
- **My reports:** reports the user raised and their progress.

### 3.5 EcoFood

- **Listings:** surplus food posted by neighbours, with pickup window, location, and expiry.
- **Create listing:** food type, quantity, photo, pickup window, and dietary notes.
- **Claim flow:** request and confirm pickup. Statuses: available, reserved, collected.
- **Impact dashboard:** personal and community totals for food saved and kilograms diverted from waste.

### 3.6 Facility Booking

- **Facilities list:** multipurpose hall, gym, BBQ area, meeting room, with photos, capacity, and rules.
- **Availability calendar:** shows which slots are taken, but not who booked them.
- **Booking form:** date, time, duration, and purpose. Submitted for approval or confirmed instantly, depending on the facility.
- **My bookings:** upcoming and past bookings, with cancel and reschedule.
- **Admin queue:** approve or reject bookings, and block dates for maintenance.

### 3.7 Assistant (Chatbot)

- **Floating chat widget** on every page, plus a full-page chat view.
- **Answers:** how to report an issue, how to book a facility, township rules, opening hours, and safe food sharing.
- **Handoff:** if the assistant can't answer, it offers to create a support ticket or links to the right page.

### 3.8 Township Dashboard (Admin)

- **Overview:** active residents, open reports, resolved issues, food saved, and bookings this month.
- **Report management:** assign, update status, and reply.
- **Analytics:** reports by category over time, resolution time, and wildlife alerts.
- **Content and users:** moderate posts, manage facilities, and approve verifications.

### 3.9 Account

- Profile and settings, notifications, and privacy controls.

## 4. Visibility and Privacy Rules

Define these before building, since the app shows one user's activity to others.

| Data | Visible to verified residents | Visible to owner and admins only |
|---|---|---|
| Public profile, posts, food listings | Yes | Private fields hidden |
| Report titles and status | Yes | Reporter identity hidden by default |
| Facility calendar | Blocked slots only, no names | Booking purpose and booker |
| Contact details, exact address | No | Yes |
| Private messages | No | Participants only |

**Anonymised by default:** reporter names on reports and the people who claimed food appear as "Resident in Block X" unless the user opts in.

## 5. Responsive Design

- **Mobile (under 768px):** bottom navigation with Home, TownCare, EcoFood, Book, and Chat. Forms open as full-screen modals.
- **Tablet and desktop:** left sidebar, multi-column layouts, and a side panel for chat and map details.
- **Shared design system:** cards, status badges, filters, map, calendar, and chat bubbles, so every module looks consistent.

## 6. System Architecture

```
[React + TS SPA]  ──HTTPS/JSON──▶  [API server (Node + TypeScript)]
  (Vite, Router,                    ├── Auth (JWT or Supabase Auth)
   TanStack Query,                  ├── Modules: Community, TownCare,
   Zustand, Leaflet,                │   EcoFood, Booking, Admin
   Recharts)                        ├── Chat service ──▶ OpenRouter API
                                    ├── File service ──▶ Object storage (photos)
                                    └── Notifications (email / push)
                                            │
                                    [PostgreSQL]  (optionally + pgvector for chat search)
```

### 6.1 Frontend

- **Stack:** React, TypeScript, Vite, React Router, TanStack Query (server state), Zustand (UI state), Tailwind CSS or MUI, Leaflet (maps), Recharts (dashboards).
- **Structure:** feature folders (`/features/towncare`, `/features/ecofood`, `/features/booking`, `/features/chat`, `/features/community`), with shared UI in `/components`.

### 6.2 Backend

- **Stack:** Node.js with TypeScript, using Express, Fastify, or NestJS. Supabase is an alternative that provides auth, Postgres, storage, and realtime with less code.
- **Validation:** Zod schemas shared between frontend and backend, so types stay in sync.

### 6.3 Database (PostgreSQL)

- **Core tables:** `users`, `profiles`, `posts`, `comments`, `reports`, `report_status_history`, `food_listings`, `food_claims`, `facilities`, `bookings`, `notifications`, `chat_messages`.
- **Geo:** store latitude and longitude on reports and listings. PostGIS is optional but useful for "nearby" queries.

### 6.4 Assistant (OpenRouter)

- **Never call OpenRouter from the browser.** The API key would be exposed.
- **Flow:** the frontend calls `POST /api/chat`. The backend retrieves relevant township knowledge, builds a prompt with that context and recent conversation history, calls OpenRouter, and streams the reply back using Server-Sent Events.
- **Knowledge base (RAG):** township FAQs, facility rules, and how-to guides, stored as chunks. For a hackathon, keyword search is enough. Add embeddings with pgvector later if needed.
- **Safety:** rate-limit per user, cap message length, keep the system prompt scoped to township help, and log conversations without personal data.
- **Model:** a fast, low-cost model on OpenRouter, with a fallback model if the first one fails.
- **Configuration:** the OpenRouter key lives in a server environment variable, never in the repository.

### 6.5 Storage and Infrastructure

- **Photos:** uploaded to object storage (S3, Cloudflare R2, or Supabase Storage) through signed URLs, not through the API server.
- **Hosting:** frontend on Vercel or Netlify, backend on Render, Railway, or Fly.io, database on Neon or Supabase.

## 7. Pipelines

### 7.1 Development and Deployment

1. Developer opens a pull request.
2. GitHub Actions runs lint, typecheck (`tsc --noEmit`), unit tests, and build.
3. Merging to main deploys the frontend preview and the backend to staging.
4. A manual approval promotes staging to production.

### 7.2 Data Pipeline

- **Seed data:** a script creates demo residents, reports, listings, facilities, and bookings, so the demo always looks active.
- **Public data import:** a scheduled job pulls datasets from data.gov.my (for example, waste or wildlife data) into the database, so the dashboard can use real figures.
- **Chat knowledge pipeline:** a script reads Markdown FAQ files, splits them into chunks, indexes them, and reruns whenever the content changes.

### 7.3 Request Flow Example: TownCare Report

1. Resident uploads a photo. The frontend requests a signed upload URL from the backend.
2. The photo uploads directly to storage.
3. The frontend submits the report with the photo URL and coordinates.
4. The backend validates the request, saves the report, and writes the first status entry.
5. An admin updates the status, which triggers a notification to the reporter.
6. Dashboard counts refresh through a query refresh or a realtime event.

## 8. Hackathon Scope

Limited time calls for a vertical slice rather than every module.

**Must have**
- Auth with mock verification
- Home feed
- TownCare: create, list, map, status
- EcoFood: create, claim
- Facility booking: calendar and booking form
- Chat widget connected to OpenRouter

**Should have**
- Neighbour directory with privacy rules
- Admin dashboard with charts
- Notifications

**Nice to have**
- Realtime updates
- Push notifications
- pgvector search
- Dataset imports from data.gov.my

## 9. Demo Script (Suggested)

1. Resident reports a pothole with a photo and location.
2. Resident sees the report on the map and in "My reports".
3. Admin sees it on the dashboard, updates it to "in progress", then "resolved".
4. Resident gets the status update.
5. Another resident posts surplus food, and a neighbour claims it.
6. Dashboard shows the food saved and the report resolved.
7. Chat assistant answers a question about booking the hall.

## 10. Open Questions

- Total time available for the build?
- Team size and roles?
- Supabase or a custom Node backend?
- Are there hackathon rules or judging criteria to match against?
- Is a clickable prototype with sample data enough, or is real login and storage required for the demo?
