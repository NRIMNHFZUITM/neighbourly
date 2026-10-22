# Project briefing: Neighbourly (current progress)

## What it is
Neighbourly is a **private, verified community web app** for one township: **City of Elmina** in Shah Alam, Selangor, Malaysia. It's being built for the **Sime Darby Property University Hackathon 2026**, People track, under the theme "Township of Tomorrow": *people, businesses and nature thrive together*.

Residents use it to:
- report township problems
- share surplus food
- book shared facilities
- talk to neighbours
- ask an AI assistant for help

Township Management gets an admin dashboard that turns all of that activity into operational data.

**Stage:** a working **clickable prototype**. Every screen works end to end on realistic sample data, and the AI assistant is real. Place names (neighbourhoods, parks, mall, streets) are real, taken from OpenStreetMap. People, shops, reports and rules are sample content.

## Users and roles
| Role | Who | What they can do |
|---|---|---|
| **Resident** | Verified household member | Report issues, share and request food, book facilities, post, use the directory |
| **Local shop** | Verified business, e.g. a bakery | Post end-of-day surplus food. Has a public shop profile with halal status, hours and address |
| **Admin** | Township Management | Dashboard, manage reports, approve bookings and verifications, post safety alerts, handle support tickets, hide posts |

There are four one-click demo accounts:
- Aisyah Rahman (resident, Block C, Elmina Valley)
- Daniel Lim (resident, Block A)
- Roti Sinar Bakery (shop)
- Township Management (admin Nadia Osman)

You can switch accounts from the avatar menu, and **Reset demo data** restores everything.

The township has **3 neighbourhoods** (Elmina Valley, Elmina Green, Elmina Gardens) with blocks A to F.

---

## Features built so far

### 1. Sign-up, verification and onboarding
- **Sign up** with email and password, as a resident or a shop.
- **Residents verify** in one of two ways:
  - **Unit code**, like the code in a welcome letter (e.g. `ELM-VC14-4821`). This verifies instantly and fills in their neighbourhood, block and unit. Each code can only be claimed once.
  - **Request admin approval** by entering neighbourhood, block, unit and an optional note. Status becomes "pending" until an admin approves or rejects.
- **Shops apply** with shop name, business type, halal status, opening hours, public address and **SSM registration number**. Only admins see the SSM number.
- **Onboarding** has three steps:
  1. Interests: food, safety, kids, wildlife, fitness, gardening, pets, volunteering.
  2. Notification preferences: reports, food, bookings, alerts, community.
  3. Privacy choices: appear in the directory or not, show my name on reports or not, show my name on food requests or not.
- Unverified users can't reach the main app. Route guards enforce session, verified status and admin role.

### 2. Home feed
- One stream that mixes community posts, food listings, facility updates (like maintenance closures) and a **"TownCare this week"** card that groups the week's reports by day.
- It can show your neighbourhood or the whole township.
- A **safety alert banner** at the top shows:
  - wildlife sightings from the last 3 days that aren't resolved yet
  - admin announcements from the last 2 days
- **Quick actions:** Report an issue, Share food, Book a facility, Ask the assistant.

### 3. Community
- **Posts** with comments and likes. There are three post kinds: post, announcement and alert. Admins can hide posts.
- **Neighbour directory**: only verified residents and shops who opted in. You can filter by neighbourhood and interest, and search by name.
- **Public profiles** show bio, interests, block, posts, food shared and signed reports. Badges are earned automatically:
  - "Local business"
  - "Shares surplus food"
  - "Township helper" (raised a report with their name on it)
  - "Community voice" (2 or more posts)
  - "New neighbour" (joined under 30 days ago)
- Admin accounts have no public profile.

### 4. TownCare (issue reporting)
- **Categories**, each linked to a maintenance team:
  - Roads & potholes → Roads & Drainage
  - Streetlights → Electrical
  - Parks & playgrounds → Landscape
  - Cleanliness & drains → Cleaning
  - Wildlife sightings (monkeys, snakes, monitor lizards, wild boar) → Wildlife & Safety
- **Creating a report:**
  - optional photo, category, title, description
  - a **map pin**, which must be inside the City of Elmina boundary
  - an optional location description
- The app works out the neighbourhood from the pin.
- **Statuses:** Open → In progress → Resolved. Each change is recorded in a **status timeline**, with an optional note from the admin.
- **"Me too"** button: other residents can support and follow a report. Supporters are notified when its status changes.
- Comments. Admin comments are marked as official replies.
- **Views:**
  - list with category and status filters
  - **map** with pins coloured by status
  - report detail page
  - **My reports** (reports you raised or follow)
- **Wildlife reports immediately alert** every resident in the same neighbourhood.

### 5. EcoFood (surplus food sharing)
- **Creating a listing:**
  - title, food type (cooked, bakery, produce, groceries, drinks, other)
  - quantity and estimated weight in kg
  - photo
  - **halal status** (halal / non-halal / unknown) and **dietary or allergen tags** (vegetarian, vegan, contains nuts, dairy, egg, seafood, gluten)
  - pickup window and best-before
  - a **public pickup point** (never a home address)
  - shops can add a price note, such as "Free" or a discount
- **Claim flow:**
  1. A neighbour **requests** the food, with an optional note.
  2. The giver **confirms** one request. The listing becomes "Reserved", both people see a **4-digit pickup code**, and any other requests are automatically declined and notified.
  3. The giver marks it **Collected**. The receiver is told how many kg they kept out of landfill.
- Either side can cancel, and the giver can remove the listing.
- Listings **expire automatically** if their pickup window passes with no one reserving them.
- **Filters:** food type, halal only, shops vs residents.
- **Impact dashboard:**
  - **Personal:** items shared, kg given, items received, kg received.
  - **Community:** total kg saved, kg this month, neighbours helped, shops taking part, kg from shops vs residents, and an 8-week chart.

### 6. Facility booking
There are four facilities, each with its own rules:

| Facility | Capacity | Hours | Max booking | Book ahead | Approval? |
|---|---|---|---|---|---|
| Elmina Valley Multipurpose Hall | 150 | 8am–11pm | 6 h | 30 days | **Yes** |
| Gym & Fitness Studio | 15 | 6am–10pm | 2 h | 14 days | No (instant) |
| Central Park BBQ Pit | 30 | 10am–11pm | 4 h | 14 days | No |
| Elmina Gardens Meeting Room | 12 | 9am–10pm | 3 h | 14 days | No |

- The **availability calendar** uses 1-hour slots and shows only *free / taken / mine / maintenance / past*. **It never shows who booked a slot or why.**
- **Booking validation** rejects:
  - bad durations or slots that don't line up
  - times outside opening hours
  - bookings over the maximum length
  - times in the past
  - dates too far ahead
  - overlaps with other bookings (pending requests also hold their slot)
- **My bookings:** upcoming and past bookings, with **cancel** and **reschedule**. Rescheduling an approval-required facility sends it back to pending.
- **Admin:**
  - approve or reject pending requests, with a note
  - add **maintenance blocks**, which cancel clashing resident bookings, notify those residents and post a facility update to the feed

### 7. AI assistant ("Ask Neighbourly")
- Available as a **floating chat widget** on every page, a side panel on desktop, and a full page.
- The browser only ever calls `POST /api/chat` on our own server. The **OpenRouter API key stays on the server**.
- **How it works:**
  1. **Redact personal data.** Emails, Malaysian phone numbers and **MyKad IC numbers** are replaced with placeholders.
  2. **Retrieve.** BM25 keyword search over a **Markdown knowledge base of 12 topics** with English and Malay keywords. Topics include reporting issues, facility booking and rules, opening hours, EcoFood and safe food sharing, wildlife safety, waste and recycling, township rules, community guidelines, privacy and account.
  3. **Generate.** It builds a scoped system prompt plus the matching guide excerpts and **streams the answer back with Server-Sent Events**.
- **Models:** primary `anthropic/claude-haiku-5.5`, with a **fallback** to `google/gemini-3.5-flash-lite` (a different provider) if the primary fails before it starts answering.
- **Guide-only mode:** if there's no API key, or both models fail, it answers straight from the guide. This also works in the browser alone.
- **Behaviour rules in the prompt:**
  - only use facts from the guide, and never invent phone numbers, fees or policies
  - reply in the user's language (English, Malay, Chinese or Tamil)
  - keep answers short
  - link to app pages by name
  - for emergencies, tell people to call 999 or 994 (Bomba)
- **Handoff:** if the guide doesn't cover a question, it offers to **create a support ticket** for Township Management. Tickets get references like `NB-1234`.
- **Safety:**
  - rate limit of 20 requests per 5 minutes per client
  - messages capped at 1,000 characters, with limited history
  - logs contain only the redacted question, with no user identity

### 8. Township dashboard (admin)
- **KPI tiles:**
  - open and in-progress reports
  - resolved in the last 30 days
  - average resolution time
  - food saved in the last 30 days
  - active vs verified residents
  - bookings in the last 30 days and pending approvals
  - wildlife sightings in the last 7 days (with a trend line)
  - open support tickets
- **Charts** (Recharts), each with a **table view** for accessibility:
  - new reports per week by category
  - average time to resolve by category
  - food saved per week (residents vs shops)
  - wildlife sightings per week
  - facility use (bookings and hours)
- **Report management:**
  - filter by status and category
  - see the reporter's **real name and private contact details** (admin only; residents see an anonymised label)
  - assign a team, change status with a note, reply officially
- Booking approvals and maintenance blocks.
- Verification queue (approve or reject residents and shops).
- Support ticket inbox (close tickets).
- **Post safety alerts** to one neighbourhood or the whole township. These appear in the feed and are sent as notifications.

### 9. Notifications
- In-app **bell** with an unread count, plus a notifications page. It **refreshes every 10 seconds**.
- Notifications are triggered by:
  - report status changes and comments
  - food requests, confirmations and declines
  - booking confirmations and rejections
  - verification results
  - alerts
  - tickets
- They respect each user's notification preferences.

### 10. Settings and privacy
- Privacy toggles: directory visibility, name on reports, name on food requests.
- Profile: name, bio, phone. **Phone is private** and only admins see it.
- Notification toggles.
- Demo tools, such as resetting the sample data.

---

## Privacy by design (a key selling point)
- **One code module decides what each viewer sees.** These "privacy presenters" copy an explicit list of allowed fields, so a new private field can't leak by accident. Every rule has a unit test.
- **Anonymous by default:** reporters, report commenters and food requesters appear as **"Resident in Block C · Elmina Valley"** with no link to their profile, unless they opt in. Admins still see who it is so they can follow up.
- **Calendars without names:** availability only carries slot states.
- **Contact details** (phone, email, unit number) are visible only to the owner and admins.
- **Photo GPS removal:** photos are resized and re-encoded as JPEG in the browser, which strips EXIF data including GPS location. They're uploaded through a signed URL, with a 5 MB limit after resizing.
- **The assistant redacts personal data** before anything is logged or sent to the model.

## Design and responsiveness
- **Phones:** bottom navigation (Home, TownCare, EcoFood, Book, Chat) and full-screen forms.
- **Tablets and desktops:** left sidebar grouped as Neighbourhood / Services / Help (plus Township Management for admins), multi-column layouts, and a side panel for the assistant.
- A shared design system: cards, status badges, filters, maps, calendar and chat bubbles.

## Tech stack and architecture
- **Monorepo** using npm workspaces, on Node 24.
- **`apps/web`:** React 19 + TypeScript (Vite), React Router, TanStack Query, Zustand, Tailwind CSS 4 + Radix UI, Leaflet with OpenStreetMap tiles, Recharts. Map, chart and admin pages load on demand.
- **`apps/api`:** Fastify (Node + TypeScript). Currently only `/api/health` and `/api/chat` (SSE → OpenRouter).
- **`packages/shared`:** Zod schemas (shared contracts), privacy presenters, booking rules, time helpers (Malaysia time zone), and the assistant's search, redaction and prompt code. Both apps use it.
- **Sample-data backend:** **Mock Service Worker** answers every other `/api/*` call inside the browser. It uses the same Zod contracts and privacy presenters the real server will use, and saves data in IndexedDB.
- **`knowledge/`:** the assistant's Markdown knowledge base, compiled by `npm run kb:build`.
- **Quality checks:**
  - unit tests (Vitest) for privacy rules, booking rules, retrieval, redaction and the chat route
  - ESLint and TypeScript checks
  - **Playwright end-to-end script** that runs the full 5-minute demo automatically
  - a screenshot script for desktop and mobile
  - GitHub Actions CI that runs lint, typecheck, tests, build and the end-to-end demo

## The 5-minute demo flow
1. Aisyah reports a pothole with a photo and a map pin. Neighbours see her as an anonymous "Resident in Block C".
2. She sees it on the map and in My reports.
3. The admin sees it on the dashboard, opens it (with her private contact details), and sets it to In progress, then Resolved, with a note.
4. Aisyah gets a notification, and the report timeline shows each step.
5. Daniel shares food → Aisyah requests it → Daniel confirms (both see a pickup code) → marks it collected.
6. The dashboard's food-saved and resolved-report numbers go up.
7. The assistant answers "How do I book the multipurpose hall?", also in Malay ("macam mana nak tempah dewan?"), and links to *Book a facility*.

## Known limitations and what's next
- Data lives in each browser, so two devices don't share data yet.
- Notifications refresh every 10 seconds. There's no email or push yet.
- Map tiles need internet.
- Seed items use illustrated placeholders instead of real photos.
- **Next step:** replace the mock layer with **Supabase** (Postgres, Auth, Storage) behind the Fastify API, implementing the same endpoints. The database table shapes are already mirrored in `packages/shared/src/rows.ts`, and setting `VITE_USE_MOCKS=false` switches the app off the mock layer.
- **Later ideas:** realtime updates, push notifications, vector search for the assistant, and importing real datasets from data.gov.my.

## Hackathon compliance
- AI tools used in the build are disclosed.
- Neighbourly uses its own branding, with no Sime Darby Property logos.
- Third-party notices are included.
- It's clearly labelled as a prototype, not an official Sime Darby Property app.
