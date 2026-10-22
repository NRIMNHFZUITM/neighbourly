# Neighbourly: full project specification for rebuilding

This document describes the Neighbourly prototype in enough detail for a person, or an AI coding assistant, to rebuild it from scratch: what it is for, who uses it, every screen and feature, the data model, the privacy rules, the API, the assistant, the design system and the sample data.

If you are an AI assistant, read the whole document before writing code. Section 15 gives a suggested build order. Wherever this document names a button, tab or label, use that exact text.

---

## Contents

1. What Neighbourly is
2. Context: the hackathon
3. Users and roles
4. Navigation and layout
5. Features, screen by screen
6. Privacy rules
7. Data model
8. API
9. The assistant
10. Weather
11. Design system
12. Sample data (City of Elmina)
13. Tech stack and architecture
14. Testing
15. Suggested build order
16. Known limitations and next steps
17. Licences and credits

---

## 1. What Neighbourly is

Neighbourly is a **private, verified community app for one township**: City of Elmina in Shah Alam, Selangor, Malaysia, a Sime Darby Property development. Residents and local shops use it to:

- **Report township issues** such as potholes, broken streetlights, rubbish, wildlife and more, and follow each fix from Open to Resolved (**TownCare**).
- **Share surplus food** with neighbours, and let local shops share end-of-day leftovers. Every collected kilogram is counted as "food saved" (**EcoFood**).
- **Book shared facilities**: the multipurpose hall, gym studio, BBQ pit and meeting room (**Facilities**).
- **Connect with neighbours** through a feed with topics, community events with RSVPs, and a neighbour directory (**Community**).
- **Find places** on a map that shows every facility and verified shop (**Places**).
- **Get answers** from an assistant that explains how to use the app and the township rules (**Assistant**).

**Township Management**, the admins, get a **dashboard** that turns all this activity into operational data: open reports, resolution times, wildlife sightings, food saved and facility use. They also get tools to manage reports, approve bookings, verify residents and answer support tickets.

The core idea is **privacy by design**. Neighbours see each other as "Resident in Block C · Elmina Valley" unless they choose to show their name. Calendars show only that a slot is taken. Contact details are visible only to Township Management.

---

## 2. Context: the hackathon

- The project was built for the **Sime Darby Property University Hackathon 2026** (organised with Kolaxus), in the **People** track.
- Key dates:
  - Proposal due 23 Oct 2026.
  - Judging 24–28 Oct, with the Top 10 announced on 28 Oct.
  - Final submission 11 Nov.
  - Pitch day 14 Nov.
  - Awards 3 Dec.
- Judging weights:
  - Strategic fit: 15%.
  - Impact and sustainability: 25%.
  - Innovation: 20%.
  - Feasibility: 20%.
  - Commercial value: 10%.
  - Team and pitch: 10%.
- Rules that affect the build:
  - **No Sime Darby Property logo** without consent (clause 8). The app uses its own name and logo, in Sime Darby Property's colours.
  - **AI use must be disclosed** (clause 13).
  - **Third-party assets must be licensed** (clause 14). Every photo and dataset is credited.
  - Submitted IP belongs to Sime Darby Property (clause 11).
- The current stage is a **clickable prototype**. Every screen works on realistic sample data stored in the browser. A real backend (Supabase plus a Node API) comes later.

---

## 3. Users and roles

| Role | Who | What they can do |
|---|---|---|
| **Resident** | A verified resident or tenant | Everything in Home, Community, Places, TownCare, EcoFood, Facilities and the Assistant |
| **Local shop** | A verified food or drink business, such as a bakery, café or kopitiam | The same as a resident, plus a shop profile, listing surplus food with a price ("Free" or a discount), and a pin on the Places map |
| **Township Management** (admin) | Staff of the township office | Everything, plus the admin section: dashboard, reports, bookings, verifications, support tickets and safety alerts. Sees private contact details |

**Verification states:** `unverified`, `pending`, `verified` and `rejected`. Only verified users (and admins) can use the app. Unverified users only see the verification page.

### Demo accounts

There are one-click buttons on the login page. Every demo account uses the password `demo1234`.

| Name | Email | Role |
|---|---|---|
| Aisyah Rahman | aisyah@neighbourly.demo | Resident, Block C, Elmina Valley (main demo persona) |
| Daniel Lim | daniel@neighbourly.demo | Resident, Block A, Elmina Valley (shares food) |
| Roti Sinar Bakery | rotisinar@neighbourly.demo | Local shop at Elmina Lakeside Mall |
| Township Management (Nadia Osman) | nadia@neighbourly.demo | Admin |

---

## 4. Navigation and layout

### Desktop and tablet (≥ 768 px)

- **Left sidebar** (256 px wide):
  - The logo at the top.
  - Three groups:
    - **Neighbourhood**: Home, Community, Places.
    - **Services**: TownCare, EcoFood, Facilities.
    - **Help**: Assistant.
  - At the bottom: "Privacy & settings" and a footnote, "Hackathon prototype with sample data. Not an official Sime Darby Property app."
  - Admins get an extra group at the top, **Township Management**: Dashboard, Reports, Bookings, Verifications and Support tickets.
- **Top bar**:
  - A badge, "City of Elmina · Block C · Elmina Valley".
  - A yellow "Prototype · sample data" pill.
  - A notification bell with an unread count.
  - An avatar that opens the account menu.
- A floating red **Ask Neighbourly** button in the bottom-right corner opens the assistant as a side panel on any page.

### Phone

- A **bottom navigation bar** with five tabs: Home, TownCare, EcoFood, Book and Chat. For admins the tabs are Dashboard, Reports, Bookings, Verify and Feed.
- The **avatar menu** contains:
  - My public profile.
  - Community and Places map (phone only).
  - Privacy & settings.
  - **Switch demo account**: lists the other demo accounts.
  - Reset demo data.
  - Log out.
- Forms open full screen with a close (X) button. Dialogs open as bottom sheets.

### Routes

| Path | Page |
|---|---|
| `/` | Landing page (public) |
| `/login`, `/signup` | Log in and create an account (public only) |
| `/verify`, `/onboarding` | Verification and the three-step setup (signed in) |
| `/home` | Home |
| `/community`, `/community/events`, `/community/neighbours` | Community tabs: Feed, Events, Neighbours |
| `/community/u/:id` | Public profile |
| `/places` | Places map |
| `/towncare` (My reports), `/towncare/all`, `/towncare/map` | TownCare tabs |
| `/towncare/new`, `/towncare/:id` | New report form and report detail |
| `/ecofood`, `/ecofood/mine`, `/ecofood/impact` | EcoFood tabs: Available, My food, Impact |
| `/ecofood/new`, `/ecofood/:id` | Share food form and listing detail |
| `/book`, `/book/:facilityId`, `/book/mine` | Facilities list, a facility's booking page, and My bookings |
| `/assistant` | Full-page assistant (used on phones) |
| `/notifications`, `/settings` | Notifications and Privacy & settings |
| `/admin`, `/admin/reports`, `/admin/bookings`, `/admin/verifications`, `/admin/tickets` | Admin pages |

Old links are redirected: `/towncare/mine` goes to `/towncare`.

**Route guards:**
- `PublicOnly` sends signed-in users to their home.
- `RequireSession` requires a signed-in user.
- `RequireVerified` requires a verified user and sends people to `/verify` or `/onboarding` if they haven't finished.
- `RequireAdmin` restricts the admin pages.

If the account fails to load for any reason other than a 401, show a "Can't reach Neighbourly" screen with **Try again** and **Log out** buttons. Never redirect back and forth between `/login` and `/home`, because that refetches the account in a loop.

Pages that use maps or charts, and all admin pages, are lazy-loaded.

---

## 5. Features, screen by screen

### 5.1 Landing page (`/`)

- **Hero section:**
  - The headline, with **Log in** and **Try the demo** buttons.
  - A preview of the app: a TownCare report card ("In progress"), an EcoFood listing ("End-of-day bread & buns · Roti Sinar Bakery") and an assistant message.
- **Live stats:** verified residents, issues resolved, average days to fix, and kilograms of food saved.
- **Module cards** for Community, TownCare, EcoFood, Facility booking, Assistant and the Township dashboard, tagged People and/or Planet.
- **Privacy cards:** anonymous reporting, private calendars, private contact details, and photo locations removed.

### 5.2 Login (`/login`)

- **Left half (desktop only):**
  - A real photo of Elmina Valley Central Park covers the panel (CC0, Wikimedia Commons), with a dark gradient over it.
  - The logo at the top.
  - Three floating "app preview" cards in the middle:
    - "Resolved · Street lamp in front of Block C fixed".
    - "🥐 End-of-day bread & buns · Roti Sinar Bakery · Free · 8:30 pm".
    - An event card with a calendar badge (SAT plus next Saturday's date): "Gotong-royong at the garden · 8:00 am · 18 neighbours going".
  - The headline "Good neighbours, verified." at the bottom, with a photo credit.
- **Right half:**
  - "Welcome back".
  - The demo account buttons, each with an icon, name, headline and an arrow.
  - "OR LOG IN WITH EMAIL" with Email and Password fields (hint: "Demo accounts use the password demo1234") and a **Log in** button.
  - The link "New to Neighbourly? Create an account".

### 5.3 Sign-up, verification and onboarding

**Sign-up (`/signup`):**
- "I'm joining as": **A resident** or **A local shop**.
- Fields: Full name (for shops, "Your name (shop owner)"), Email, and Password (at least 8 characters).
- Button: **Create account**.

**Verification (`/verify`):** the title is "Verify where you live" (or "Verify your shop").
- **Residents** see two tabs:
  1. **I have a unit code**: type a one-time code, such as `ELM-VC14-4821`, then tap **Verify my unit**. This verifies the account instantly.
  2. **Request approval**: choose a neighbourhood, block (A–F) and unit number, with an optional note ("Anything that helps us verify you"), then tap **Request approval**. The account becomes pending until an admin approves it.
  - The page shows demo codes for unclaimed units: `ELM-VC14-4821`, `ELM-GA03-7702` and `ELM-DE10-3315`.
- **Shops** fill in:
  - Shop name, Type of business, Halal status, Opening hours and Shop address.
  - Nearest neighbourhood and SSM registration no.
  - **Shop location**: a draggable map pin. Leaflet is lazy-loaded here.
  - Button: **Submit shop application**.
- **Pending screen:** "Waiting for Township Management", with a demo tip and a **Switch to Township Management** button.

**Onboarding (`/onboarding`)** has three steps, with **Back**, **Next** and **Finish** buttons:
1. **Interests:** Food sharing, Safety, Kids & families, Wildlife & nature, Fitness, Gardening, Pets and Volunteering.
2. **Notifications:** Report updates, EcoFood, Bookings, Community, and Safety & wildlife alerts.
3. **Privacy:** Show me in the neighbour directory, Show my name on new reports, and Show my name when I request food. A preview shows what neighbours will see.

### 5.4 Home (`/home`): deliberately minimal

There are no quick-action buttons and no full feed, because those repeat the navigation. From top to bottom:

1. **Greeting:** "Good morning/afternoon/evening, Aisyah 👋". On phones only, the line below shows the area ("Block C · Elmina Valley"); desktop already shows it in the top bar.
2. **Weather card** (see section 10):
   - A weather icon, the temperature, the condition, "Feels like X° · Humidity Y%", "H 32° · L 24°" and "☂ 98% rain today".
   - The next six hours, each with its time ("Now", "1 am"…), an icon, the temperature and the chance of rain. Hours with 60% or more are highlighted.
   - A tip line when it matters, such as "Rain likely from 3:00 pm. Keep an umbrella handy." or a thunderstorm warning.
   - The footer "City of Elmina · Updated 12:45 am · Weather data by Open-Meteo".
   - While loading, it shows a skeleton. If weather can't be loaded, the card is hidden.
3. **Notices** (at most two):
   - The **newest safety or wildlife alert**, in amber. If there are more, the title says "(+N more)" and the notice links to the TownCare map.
   - The **latest Township Management announcement** from the last three days, in white.
   - Each body is clamped to two lines.
4. A two-column grid on large screens:
   - **For you** (at most four rows, each with an icon, title, detail and a chevron):
     - Food to pick up: "Pick up: Unopened Milo packets & biscuits", with "Code 2914 · Today, 10:00 am – 2:00 pm · Block D guardhouse".
     - Requests for your listing: "2 neighbours want your homemade banana cake", with "Choose who picks it up".
     - Your next booking (confirmed or pending): the facility, the time window, and "· Waiting for approval" if pending.
     - Up to two of your unresolved reports: "Your report · In progress · updated 4 days ago".
     - If there's nothing to show: "You're all caught up. Nothing needs your attention today."
   - **Coming up:** the next three events, each with a red calendar date badge, the title, "7:00 am · 9 going" (prefixed with "Today, " or "Tomorrow, " when that applies), and a green "✓ Going" pill if you RSVP'd. An **All events** link sits at the top right.
5. **Three summary tiles:**
   - **Food to share:** "8 available", with "Newest: Vegetable curry & rice".
   - **TownCare in Elmina Valley:** "5 open", with "6 new and 1 fixed this week".
   - **Community:** "1 new post today", with "Rizal Azman: Heads up…".

### 5.5 Community (`/community`)

The page has a shared header ("Community" and "Updates, events and neighbours from verified residents of City of Elmina."), a tab row (**Feed | Events | Neighbours**), and an action button on the right of the tab row when a tab has one.

**Feed tab**
- **Topic chips:**
  - **All topics**.
  - **📢 Official**: posts of kind announcement or alert.
  - **💬 General**, **🔎 Lost & found**, **⭐ Recommendations**, **🎁 Giveaways**, **🛡️ Safety** and **🏸 Activities**.
- A post count, and a select for **My neighbourhood** or **Whole township**.
- **Composer:**
  - An avatar and the placeholder "Share something with Elmina Valley…".
  - When focused, it shows a topic select, a visibility select ("Elmina Valley only" or "All of City of Elmina") and a **Post** button.
- **Post card:**
  - An identity line (avatar, name, "Official" label for management, "Local shop" label for shops) and "5 h ago · Elmina Valley". For township-wide posts the line reads "Everyone in City of Elmina".
  - Kind badges: "Safety alert" (amber border) or "Announcement".
  - The body text, and a small topic chip unless the topic is General.
  - A like (heart) button with a count, and a comments toggle with inline comments and a "Write a comment…" box.
  - Posts hidden by moderators are dimmed for admins and labelled "Hidden by moderators".
- **Empty states:** "No posts in Lost & found yet" or "No announcements yet".
- Posts show the author's name, because posts are public within the verified community.

**Events tab**
- **Create event** button on the right of the tab row.
- **Category chips:** All events, 🤝 Community, 🏃 Sports & fitness, 🧸 Kids & family, 🌿 Nature & green, 🍲 Food & festive and 🎓 Talks & workshops.
- The note: "🔒 Only the number of people going is shown. Nobody can see who RSVP'd."
- **Event cards**, in date order with no day headings:
  - A calendar badge (red weekday strip and day number).
  - The category label, a "Happening now" badge (green) and an "Elmina Valley only" badge for neighbourhood-only events.
  - The title.
  - 🕐 the time range ("Today, " or "Tomorrow, " prefix only when it applies).
  - 📍 the location, which links to the facility if it's at one.
  - The description, clamped to three lines.
  - The organiser's identity line with "N going".
  - An **I'm going** button (outline) that becomes **✓ Going** (filled). The organiser sees **Cancel event** instead, which opens a confirmation dialog and notifies everyone going.
- **Create event dialog:**
  - What's happening? (4–80 characters), Category, Date (today to 90 days ahead).
  - Starts and Ends, in 30-minute steps from 6:00 am to midnight. The end time moves forward automatically if the start passes it.
  - Venue: "Somewhere else" or a facility. Picking a facility fills in the location and shows the hint "Remember to book the facility for this time".
  - Where exactly? (3–80 characters), Details (optional, up to 600 characters), Who can see it (all of City of Elmina or my neighbourhood).
  - Buttons: **Cancel** and **Create event**. The organiser automatically counts as going.

**Neighbours tab**
- The hint "Verified residents and local shops who chose to be listed."
- A search box (name or shop name), a neighbourhood select and an interest select.
- The note: "Phone numbers, emails and unit numbers are never shown."
- **Profile cards:** avatar, name, a "You" badge on your own card, "Block X · Neighbourhood" (or the shop category and address), bio, badges and interests.
- **Public profile (`/community/u/:id`):**
  - The header, bio and interests.
  - **Badges:** Local business, Shares surplus food, Township helper (has reports signed with their name), Community voice (two or more posts) and New neighbour (joined less than 30 days ago).
  - **Stats:** Posts, Food shared, and Reports with their name.
  - Their recent posts and listings, and only the reports they chose to sign.

### 5.6 Places (`/places`)

- Header: "Places · Every bookable facility and verified local shop in City of Elmina."
- **Filter chips:** All places, 🏛️ Facilities (4) and 🛍️ Local shops (3).
- **Map** (Leaflet with OpenStreetMap tiles):
  - Facility pins are **red** (`#d71920`) and show the facility emoji (🏛️ hall, 🏋️ gym, 🔥 BBQ, 💼 meeting room).
  - Shop pins are **dark yellow** (`#b86e00`) and show 🛍️.
  - A legend sits in the bottom-left corner.
  - The map fits all pins when it first loads.
- **List** (on the right on desktop, below the map on phones), grouped into FACILITIES and LOCAL SHOPS. Each row has a coloured emoji circle, the name and a subtitle. Tapping a row selects it and flies the map to it. On phones, it also scrolls the map into view.
- **Detail card:**
  - On desktop it sits above the list. On phones it overlays the bottom of the map in a compact version.
  - **Facility:** photo, type, name, location, hours, capacity, and an "Instant booking" or "Needs approval" badge. Buttons: **Check availability** and **Directions ↗** (opens `https://www.google.com/maps/dir/?api=1&destination=lat,lng`).
  - **Shop:** category, Halal badge, address, opening hours, and "Sharing N listings on EcoFood now" when it has active listings. Buttons: **View shop** (its profile) and **Directions**.
- Only **verified** shops with a location appear. The SSM number is never included.

### 5.7 TownCare

The header reads "TownCare · Report issues around City of Elmina and follow every step of the fix.", with a **Report an issue** button. The tabs are **My reports** (default, `/towncare`), **All reports** and **Map**.

**Report categories**

| Category | Short label | Team | Emoji |
|---|---|---|---|
| Roads & potholes | Roads | Roads & Drainage | 🚧 |
| Streetlights | Lights | Electrical | 💡 |
| Parks & playgrounds | Parks | Landscape | 🌳 |
| Cleanliness & drains | Cleanliness | Cleaning | 🧹 |
| Wildlife sighting | Wildlife | Wildlife & Safety | 🐒 |
| Others | Others | Facilities | 📝 |

The Others category covers things like "a broken gate, damaged signage or a noise problem".

**Lists**
- Category chips and status chips (Any status, Open, In progress, Resolved).
- Cards in a two-column grid. Each card has cover art or a photo, a status badge, a category badge, the title, the location, the reporter identity, the date, a "me too" count and a comment count.
- My reports includes reports you raised and reports you said "me too" to.

**Map tab**
- Pins are coloured by status: open amber `#d97706`, in progress blue `#0284c7`, resolved green `#16a34a`. Each pin shows the category emoji.
- Clicking a pin shows the report card and a **View details** button.

**New report (`/towncare/new`)**
1. Photo (optional). The photo is re-encoded in the browser to strip EXIF and GPS data, and the UI says "Location data removed".
2. "What kind of issue?": a 2×3 grid of category tiles, each with a description.
3. Title and "What's happening?".
4. "Where is it?": a map with a draggable pin and a **Use my location** button, plus an optional location description. The pin must be inside the township bounds.
5. A "Show my name on this report" toggle, with a preview of what neighbours will see.
6. **Submit report**. A wildlife report immediately notifies every resident of that neighbourhood ("Wildlife alert near you").

**Report detail (`/towncare/:id`)**
- The **Progress** timeline: Open, In progress, Resolved, each with its time, the team and the note from management.
- A **Me too, I've seen this** toggle ("You said me too"), with "N neighbours said 'me too'".
- **Comments:** "Add an update or ask a question…" and a **Post** button. Official replies are highlighted.
- For emergencies, the app tells people to call 999 (Bomba 994).

**Statuses:** `open`, `in_progress` and `resolved`. Each status change notifies the reporter and everyone who said "me too".

### 5.8 EcoFood

The header has a **Share food** button. The tabs are **Available**, **My food** and **Impact**. Small stat tiles show the kilograms saved this month, neighbours helped and shops taking part.

**Filters**
- Food type: Cooked food 🍛, Bread & pastries 🥐, Fruit & vegetables 🥭, Groceries & dry goods 🥫, Drinks 🧃 and Other 🍱.
- Shared by: Everyone, Neighbours or Local shops.
- Halal: Any or Halal only.

**Listing card:** photo or cover art, title, pickup window ("Today, 6:00 pm – 8:00 pm") and pickup point, halal badge, allergen tags, giver identity, a "Local shop" badge, the price note, and "N requested".

**Share food form**
- Fields:
  - Photo.
  - What are you sharing? (3–80 characters).
  - Type of food.
  - Quantity (for example "6 packs").
  - Weight (kg), from 0.1 to 50, with the hint "a packed meal is about 0.4 kg".
  - **Halal status** (required): Halal, Non-halal or Halal status unknown.
  - Dietary notes & allergens: Vegetarian, Vegan, Contains nuts, Contains dairy, Contains egg, Contains seafood and Contains gluten.
  - Pickup: Day (today, tomorrow or the day after), From and Until, and Best before.
  - Pickup point: text plus a map pin. This must be a public place, never a home address.
  - Price (shops only), defaulting to "Free".
  - Notes.
- Button: **Post listing**.

**Claim flow**
1. A requester adds an optional note ("I can come at 7 pm") and taps **Request this food**. The button changes to "Request sent" with a **Cancel request** option.
2. The giver sees the requests, each showing the requester by block unless they chose to show their name. The giver taps **Confirm** or **Decline**.
3. On confirm, the listing becomes **Reserved** and both people see the same **4-digit pickup code**. The requester can tap **I can't make it, cancel**, which makes the listing Available again and notifies the giver.
4. At pickup, the giver checks the code and taps **Mark as collected**. The listing becomes **Collected** and its weight counts towards food saved.
5. The giver can tap **Remove listing** at any time before collection. Anyone waiting is notified.
6. Listings that pass their pickup end time while still Available become **Expired** automatically.

**Food statuses:** `available`, `reserved`, `collected` and `expired`. **Claim statuses:** `requested`, `confirmed`, `declined`, `cancelled` and `collected`.

**Impact page**
- "City of Elmina has kept X kg of food out of landfill", plus this month's figure.
- **Your impact:** food you gave, food you rescued, listings you shared and pickups you made.
- A weekly stacked bar chart of neighbours versus local shops, with a table view.

### 5.9 Facilities and booking

**Facilities list (`/book`)**
- "Book a facility", with "You'll see which slots are free, but never who booked them."
- A **My bookings** button.
- A "Your next booking" banner.
- Facility cards: a real photo, the type, the name, an "Instant booking" (green) or "Needs approval" (amber) badge, capacity, hours, location, and "Check availability →".

**The four facilities**

| Facility | Capacity | Hours | Max length | Book ahead | Approval |
|---|---|---|---|---|---|
| Elmina Valley Multipurpose Hall (Elmina Valley Community Centre) | 150 | 8:00 am–11:00 pm | 6 h | 30 days | **Needs approval** |
| Gym & Fitness Studio (Elmina Green Clubhouse) | 15 | 6:00 am–10:00 pm | 2 h | 14 days | Instant |
| Central Park BBQ Pit (Elmina Valley Central Park) | 30 | 10:00 am–11:00 pm | 4 h | 14 days | Instant |
| Elmina Gardens Meeting Room (Elmina Gardens Clubhouse) | 12 | 9:00 am–10:00 pm | 3 h | 14 days | Instant |

Slots are 60 minutes long. Each facility has rules (for example "Events must end and the hall must be cleared by 11:00 pm" and "Amplified music until 10:00 pm") and amenities.

**Facility page (`/book/:id`)**
- **Choose a time:**
  - A horizontal strip of dates, each showing the weekday, the day and "13 free".
  - A legend: Free, Booked (no names shown), Maintenance (striped) and Yours.
  - A grid of time slots.
  - **How long?**: a select limited by the maximum length and by the next taken slot.
- Then: What's it for? (purpose, private) and Guests, with **Book now** (or **Request booking** for the hall).
- **Side column:**
  - The photo, with the caption "Representative photo: 'Jementah Multipurpose Hall' by Chongkian, CC BY-SA 4.0, via Wikimedia Commons (cropped)".
  - Description, capacity, hours and location.
  - Amenities and Rules.

**Booking rules**

These are checked by one shared function on both the client and the server:
- `bad_duration`: the length must be a whole number of slots.
- `misaligned`: the start must be on a slot boundary.
- `outside_hours`: the time must be within opening hours.
- `too_long`: the length can't exceed the maximum.
- `in_past`: the time can't have passed.
- `too_far`: the date can't be beyond the "book ahead" limit.
- `conflict`: the time can't overlap a confirmed or pending booking, or a maintenance block.

**My bookings (`/book/mine`)**
- Tabs: **Upcoming (n)** and **Past (n)**.
- Each card shows the facility, the time window, a status badge, the purpose and guests, and any note from management.
- **Reschedule** opens a dialog to pick a new slot and tap **Move booking**.
- **Cancel** asks "Cancel this booking?" with **Keep it** and **Cancel booking**.

**Booking statuses:** `pending` (shown as "Awaiting approval"), `confirmed`, `rejected` and `cancelled`. A booking's `kind` is either `resident` or `maintenance`.

All times use **Malaysia time (UTC+8)**, whatever the device's timezone.

### 5.10 Notifications

- **Bell dropdown:**
  - Shows the latest notifications. Unread ones have a tinted background and a dot.
  - **Mark all as read** and **See all notifications**.
  - Clicking a notification opens its link and marks it read.
  - New notifications also pop up as toasts.
- **`/notifications` page:** the full list, with a **Mark all as read** button.
- The list refreshes every 10 seconds.
- **Types:** `report_status`, `report_comment`, `food_request`, `food_confirmed`, `food_declined`, `booking_confirmed`, `booking_rejected`, `verification`, `alert` and `ticket`.
- Each type respects the user's notification preferences: reports, food, bookings, community and alerts.

### 5.11 Privacy & settings (`/settings`)

- **What neighbours see:** three switches. Each saves instantly and shows a "Privacy updated" toast.
  - **Show me in the neighbour directory**.
  - **Show my name on new reports**.
  - **Show my name when I request food**.
- **Notifications:** five switches:
  - Report updates.
  - EcoFood requests and confirmations.
  - Booking approvals and changes.
  - Comments on my posts.
  - Safety and wildlife alerts.
- **Profile:** Name, About you (shown on the public profile) and Phone (private, admins only), with a **Save profile** button.
- **Account:** email and status.
- **Demo tools:** Reset demo data.
- **Log out**.

### 5.12 Assistant ("Ask Neighbourly")

- **Desktop:** a side panel opened by the floating button. **Phone:** the Chat tab at `/assistant`.
- **Header:**
  - "Neighbourly Assistant" and "Answers from the City of Elmina guide".
  - A mode badge: **AI** or **Guide only**.
  - A new-conversation button (circular arrow).
- **Empty state:**
  - "Hi! How can I help? 👋" and an intro paragraph.
  - Six suggestion chips:
    - "How do I report a broken streetlight?"
    - "How do I share surplus food?"
    - "How do I book the multipurpose hall?"
    - "How do I create a community event?"
    - "Who can see my name on a report?"
    - "Macam mana nak tempah dewan?"
- **Messages:**
  - User messages appear in red bubbles. Assistant answers are rendered as Markdown, and links inside answers navigate within the app.
  - Under an answer:
    - **Source chips** link to the relevant page (for example "Book a facility ↗").
    - A **Create a support ticket** box appears when the assistant can't help.
    - The newest answer also shows **"Related questions" / "Try asking" chips**, which send that question.
    - In guide-only mode, answers add the note "Answered from the township guide (AI model unavailable)".
- The answer streams in word by word, and a **Stop** button can interrupt it.
- **Support ticket dialog:** Subject and Details, with **Send ticket**. The reply is "Done! I've created ticket **NB-1043**…".
- The conversation is stored in `sessionStorage` only, so it stays in the current tab.
- Full behaviour is described in section 9.

### 5.13 Township Management (admin)

**Dashboard (`/admin`)**
- **Eight KPI tiles:**
  - Open reports (with the number in progress).
  - Resolved in the last 30 days.
  - Average time to resolve.
  - Food saved in the last 30 days (kg, with a sparkline).
  - Active residents.
  - Bookings in the last 30 days (with the number awaiting approval).
  - Wildlife sightings in the last 7 days (with a sparkline).
  - Open support tickets.
- **Charts:** each chart has **Chart** and **Table** toggles.
  - New reports per week by category: a stacked bar chart over 8 weeks with 6 colours.
  - Average time to resolve by category: horizontal bars.
  - Wildlife sightings per week: an area chart.
  - Food saved per week: stacked bars for neighbours and local shops.
  - Facility use: hours booked in the last 30 days, as horizontal bars.
- **Needs attention:** counts of verification requests, booking requests and open tickets, plus the newest open reports and a **Manage reports** button.
- **Post safety alert** dialog:
  - Fields: Title, Message, and "Who should see it?" (everyone or one neighbourhood).
  - Button: **Post alert**.
  - The alert becomes a feed post of kind `alert` and sends notifications.

**Reports (`/admin/reports`)**
- A status filter, a category select, and a table with Report, Reporter, Status, "Me too" count and Age.
- Clicking a row opens a panel (a side sheet on desktop, a bottom sheet on phones) showing:
  - The reporter's private contact details, with "visible to Township Management only".
  - The photo, the location and the history.
  - **Update status:** status radio buttons, an Assigned team select, and "Note for the reporter (optional)".
  - A button that reads "Mark in progress & notify" or "Mark resolved & notify".
  - **Public reply**, with a **Post reply** button. The reply appears as an official comment.

**Bookings (`/admin/bookings`)**
- Pending requests, each showing the booker's details (unit and block), the purpose and a note field, with **Approve** and **Reject** buttons. The resident is notified either way.
- An upcoming bookings list.
- A **Maintenance** form:
  - Fields: Facility, Date, Start, Duration and Reason.
  - Button: **Block for maintenance**.
  - Any conflicting resident bookings are cancelled automatically and those residents are notified.

**Verifications (`/admin/verifications`)**
- Lists pending residents (unit and note) and shops (owner, SSM number, address, halal status and type).
- **Approve** and **Reject** buttons. Approved shops appear on the Places map.

**Support tickets (`/admin/tickets`)**
- Each ticket shows its reference (NB-1041…), subject, body, requester contact and a "From assistant" label where relevant.
- A **Mark resolved** button.

---

## 6. Privacy rules

These are implemented in a single module (`privacy.ts`) of "presenter" functions. Each presenter **copies an explicit allow-list of fields** from a stored row into what a given viewer may see. Never spread whole objects. Write one unit test per rule.

1. **Anonymous by default.** Reporters, report commenters and food requesters appear as "Resident in Block C · Elmina Valley", with no link to a profile, unless they opted in, either per report (`showName`) or as their default. Admins always see the real person.
2. **Owners see themselves as "You"**, with a hint: "Anonymous to neighbours".
3. **Township Management** appears as "Township Management" with an "Official" label. **Shops** appear by shop name with a "Local shop" label.
4. **Calendars carry no names.** Availability returns only `free`, `taken`, `maintenance` or `mine` per slot. A booking's purpose and booker are visible only to the booker and admins. Anyone else asking for booking details gets an error.
5. **Contact details** (phone, email and unit number) are visible only to the owner and admins.
6. **The directory** lists only verified users who opted in. Admins never appear.
7. **Profiles** show only reports the user signed with their name.
8. **Food claims:** only the giver (and admins) see who requested. The pickup code is visible only to the giver and the confirmed claimer.
9. **Event RSVPs are counts only.** Nobody sees who is going, not even the organiser. The organiser's name is shown.
10. **The Places map** shows only verified shops with a location, and never the SSM number.
11. **Photos** are re-encoded in the browser to strip EXIF and GPS data before upload.
12. **The assistant** redacts emails, Malaysian phone numbers (for example 012-345 6789, +6012…, 03-5555 1234) and IC numbers (900101-14-5678) before anything is logged or sent to a model.

---

## 7. Data model

The prototype stores these as in-browser tables. They mirror the planned Postgres tables.

| Table | Key fields |
|---|---|
| **users** | `id, email, passwordHash, role (resident/shop/admin), verification, name, avatarUrl, neighbourhoodId, block, unitNo, phone, bio, interests[], privacy {showInDirectory, showNameOnReports, showNameOnClaims}, notificationPrefs {reports, food, bookings, community, alerts}, onboarded, shop {shopName, category, halal, openingHours, address, ssmNo, location} or null, verificationNote, verificationRequestedAt, createdAt, lastActiveAt` |
| **units** | `code, neighbourhoodId, block, unitNo, claimedBy` (one-time verification codes) |
| **reports** | `id, reporterId, title, description, category, status, photoPath, location {lat,lng}, locationLabel, neighbourhoodId, showName, assignedTeam, createdAt, updatedAt, resolvedAt` |
| **reportHistory** | `id, reportId, status, note, changedBy, at` |
| **reportComments** | `id, reportId, authorId, body, official, createdAt` |
| **reportSupporters** | `reportId, userId, createdAt` ("me too") |
| **food** (listings) | `id, ownerId, title, description, foodType, quantity, estWeightKg, halal, dietaryTags[], photoPath, pickupPoint, location, neighbourhoodId, pickupStart, pickupEnd, expiresAt, status, priceNote, collectedAt, createdAt` |
| **claims** | `id, listingId, claimerId, status, note, showName, pickupCode, createdAt, updatedAt` |
| **facilities** | `id, name, type (hall/gym/bbq/meeting_room), description, photoPath, photoCredit, capacity, neighbourhoodId, locationLabel, location, rules[], amenities[], openMinutes, closeMinutes, slotMinutes, maxDurationMinutes, advanceDays, requiresApproval, active` |
| **bookings** | `id, facilityId, userId (null for maintenance), kind, start, end, purpose, attendees, status, decisionNote, createdAt, updatedAt` |
| **facilityUpdates** | `id, facilityId, title, body, createdAt` |
| **posts** | `id, authorId, kind (post/announcement/alert), topic (general/lost_found/recommendations/giveaways/safety/activities), body, neighbourhoodId (null = township-wide), hidden, createdAt` |
| **postComments**, **postLikes** | comment: `id, postId, authorId, body, createdAt`; like: `postId, userId` |
| **events** | `id, organizerId, title, description, category (community/sports/kids/nature/food/learning), startsAt, endsAt, locationLabel, location, facilityId, neighbourhoodId, createdAt` |
| **eventRsvps** | `eventId, userId, createdAt` |
| **notifications** | `id, userId, type, title, body, link, createdAt, readAt` |
| **tickets** | `id, reference (NB-####), userId, subject, body, source (app/assistant), status (open/closed), createdAt` |
| **files** | uploaded photos (storage path → data URL in the prototype) |

**Neighbourhoods:**
- Elmina Valley: centre 3.1704, 101.5033.
- Elmina Green: centre 3.2075, 101.4975.
- Elmina Gardens: centre 3.1902, 101.5195.

**Township:** centre 3.1885, 101.5085, bounds south 3.158, west 101.485, north 3.218, east 101.535, default zoom 14.

**Blocks:** A–F.

Every request and response is validated with shared **Zod** schemas, which the frontend, backend and mock layer all use.

---

## 8. API

All endpoints are JSON under `/api` and authenticated with `Authorization: Bearer <token>`.
- Errors look like `{ error: "code", message: "Human text" }`.
- A 401 clears the session on the client.
- Client errors (status < 500) are never retried.

**Auth and account**
- `GET /api/auth/demo-accounts`, `POST /api/auth/demo-login`, `POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/logout`.
- `POST /api/auth/verify-unit`, `POST /api/auth/request-approval`, `POST /api/auth/shop-application`.
- `GET /api/me` and `PATCH /api/me` (profile, privacy, notification preferences, interests, onboarded).
- `GET /api/public/stats`: landing page stats, no auth needed.

**TownCare**
- `GET /api/reports?category&status&scope=mine&neighbourhood`, `POST /api/reports`, `GET /api/reports/:id` (with history and comments).
- `POST /api/reports/:id/support` (toggle "me too") and `POST /api/reports/:id/comments`.

**EcoFood**
- `GET /api/food?view=active|mine&type&halal&source=shops|residents`, `POST /api/food`, `GET /api/food/:id`, `GET /api/food/impact`.
- `POST /api/food/:id/claims`, `POST /api/food/:id/claims/:claimId/confirm|decline|cancel`.
- `POST /api/food/:id/collected` and `POST /api/food/:id/cancel`.

**Facilities**
- `GET /api/facilities`, `GET /api/facilities/:id`, `GET /api/facilities/:id/availability?from&days`.
- `POST /api/bookings`, `GET /api/bookings/mine`, `POST /api/bookings/:id/cancel`, `POST /api/bookings/:id/reschedule`.

**Community**
- `GET /api/posts?scope=neighbourhood|township&topic=<topic>|official`, `POST /api/posts`, `GET /api/posts/:id`.
- `POST /api/posts/:id/comments` and `POST /api/posts/:id/like` (toggle).
- `GET /api/events?category&scope`, `POST /api/events`, `POST /api/events/:id/rsvp` (toggle), `DELETE /api/events/:id` (organiser or admin; notifies everyone going).
- `GET /api/neighbours?neighbourhood&interest&q` and `GET /api/users/:id` (profile with activity).
- `GET /api/places`: returns `{ facilities[], shops[] }`.

**Home and other**
- `GET /api/feed` (legacy combined feed) and `GET /api/alerts` (wildlife reports from the last 3 days plus admin alerts from the last 2 days).
- `GET /api/notifications`, `POST /api/notifications/read-all`, `POST /api/notifications/:id/read`.
- `POST /api/uploads`: returns a signed upload URL (`PUT /mock-storage/*` in the prototype).
- `POST /api/support-tickets` and `GET /api/support-tickets/mine`.
- `POST /api/demo/reset`.

**Admin**
- `GET /api/admin/overview`.
- `GET /api/admin/reports`, `PATCH /api/admin/reports/:id` (status, assigned team, note), `POST /api/admin/reports/:id/reply`.
- `GET /api/admin/bookings`, `POST /api/admin/bookings/:id/approve|reject`, `POST /api/admin/maintenance`.
- `GET /api/admin/verifications` and `POST /api/admin/verifications/:userId/approve|reject`.
- `GET /api/admin/tickets` and `POST /api/admin/tickets/:id/close`.
- `POST /api/admin/alerts` and `POST /api/admin/posts/:id/hide|unhide`.

**Served by the real Node server even in the prototype**
- `GET /api/health`: reports the assistant mode, the models and the knowledge-base version.
- `POST /api/chat`: Server-Sent Events, rate-limited (see section 9).
- `GET /api/weather`: an Open-Meteo proxy cached for 10 minutes (see section 10).

---

## 9. The assistant

### Knowledge base

- The knowledge base lives in `/knowledge/*.md`: **23 files and 124 sections**. Each file has front matter (`title`, `path` (an app page), `pathLabel` and `keywords` in English and Malay).
- Each `## ` heading is one question with a full, step-by-step answer that uses the exact button names. An optional `<!-- keywords: ... -->` line under the heading adds section keywords.
- A build script (`npm run kb:build`) turns the files into a generated TypeScript module that both the server and the browser use.
- **Files:**
  - about-neighbourly, getting-started, home-page, notifications.
  - reporting-issues, towncare-tracking.
  - ecofood-guide, safe-food-sharing, local-shops.
  - facility-booking, facility-rules, opening-hours.
  - community-feed, community-guidelines, community-events, neighbours-and-profiles, places-map.
  - privacy-and-account, assistant-and-support, township-management.
  - township-rules (including a break-in and theft section), waste-and-recycling, wildlife-safety.
- Township information (rules, hours and so on) is **sample content**. The 999 and 994 emergency numbers are real Malaysian numbers.

### Retrieval

The assistant uses BM25 keyword search.
- **Tokenizer:**
  - Lowercases text and strips accents.
  - Joins app phrases into one term: "for you" → `foryou`, "me too" → `metoo`, "coming up" → `comingup`.
  - Removes English and Malay stopwords ("which" and "where" are deliberately kept as signals).
  - Light stemming: `-ies`→`-y`, `-ing`, plural `-s`.
- **Field boosts:** the heading and section keywords are repeated three times. File keywords and the title count once.
- **A hit is "confident"** only when all three hold:
  - Score ≥ 3.
  - At least 34% of the query terms are matched.
  - At least 42% of the query's **idf-weighted** information is matched. Words the guide never uses weigh the most, so common words like "new", "open" or "Elmina" can't carry a question the guide doesn't cover.
- **Short follow-ups** (under 6 words, such as "and the BBQ pit?") are searched together with the previous question.

### Classifier

This is the step that decides what to do with each message.
1. **Clearly unrelated tasks**, matched by pattern, are **off_topic (certain)**: write a poem, essay or story; tell a joke; maths ("25 * 4", "solve"); code (python, javascript…); translate X into Y; recipes or "how to cook"; homework.
2. **Greeting** ("hi", "selamat pagi"), **thanks** ("thanks", "terima kasih", "ok"), **capabilities** ("what can you do", "help") and **ticket** ("talk to a person", "create a support ticket").
3. A **domain score** checks whether the words relate to Neighbourly or City of Elmina. It uses a curated list of strong terms (1 point each, English and Malay: app features, township, facilities, wildlife, emergencies…), weak terms (0.5 points each, for example "open", "share", "photo", "water") and app phrases. A score of 1 or more counts as on topic.
4. The outcome:
   - On topic with a confident hit → **answer**.
   - On topic without a confident hit → **uncovered** (offer a support ticket).
   - Anything else → **off_topic**.
5. **Language detection** (English or Bahasa Melayu) counts Malay and English function words, so canned replies come back in the user's language.

### Replies

| Intent | Reply |
|---|---|
| answer | The section heading in bold, the full section text (up to about 2,400 characters), source page chips, and up to 3 "Related questions" (other hits scoring at least 35% of the top one). Weather questions start with a live weather summary. |
| uncovered | "I couldn't find that in the Neighbourly guide. Tap **Create a support ticket** below…", plus the nearby questions as chips. |
| off_topic | "Sorry, I can't answer that because it isn't about Neighbourly. I can only help with using the app and with life in City of Elmina, such as reporting issues, sharing food, booking facilities, community events, and township rules and safety. Try one of the questions below." (A Malay version is used for Malay questions.) Four starter questions are shown. **No support ticket**, so Township Management isn't spammed. |
| greeting / capabilities | An introduction, or a list of everything the assistant can help with, plus starter questions. |
| thanks | "You're welcome! Is there anything else I can help you with in Neighbourly?" |
| ticket | Instructions, with the **Create a support ticket** action. |

### AI mode (with an OpenRouter key)

- **Models:**
  - Primary: `anthropic/claude-haiku-5.5`.
  - Fallback: `google/gemini-3.5-flash-lite`, from a different provider.
  - If the primary fails before producing any text, the fallback is tried. If both fail, the guide-only answer is used.
- Greetings, thanks, capabilities, ticket requests and certain off-topic tasks never reach the model.
- **The system prompt contains:**
  - The assistant's scope.
  - An **App overview**: a dense description of every screen and button, so the model can answer how-to questions even when search finds nothing.
  - The off-topic rule: decline in one or two sentences, suggest topics, and end with `[[OFF_TOPIC]]`.
  - The handoff rule: if a question is about the app but not covered, say so and end with `[[HANDOFF]]`.
  - The answer style: one summary sentence, then numbered steps with **bold** button names, then notes, in under 250 words.
  - Safety guidance (call 999 or 994), privacy rules (never ask for IC numbers or passwords), and "reply in the user's language".
  - The guide excerpts, inside `<township_guide>`.
  - Live weather, inside `<live_weather>`, for weather questions.
  - The page the user currently has open.
- The server strips both markers from the streamed text, even when they are split across chunks, and turns them into the right intent and action.

### Streaming protocol

`POST /api/chat` with `{ messages: [{role, content}…], page? }`.
- **Limits:** messages up to 1,000 characters, the last 10 turns sent to the model, and a per-client rate limit within a 5-minute window.
- **The server sends these Server-Sent Events, in order:**
  1. `meta`: `{ mode: "llm"|"offline", model, sources[] }`.
  2. `delta`: `{ text }`, repeated as the answer streams.
  3. `action` (optional): `{ type: "ticket", subject }`.
  4. `suggestions` (optional): `{ questions[] }`.
  5. `done`: `{ finishReason, intent }`.
- **Logging:** only the redacted question, the intent, the source pages, whether a ticket was offered and the timing. No user identity is logged.
- **Offline fallback:** if the API is unreachable (for example on a static deployment or flaky Wi-Fi), the browser runs the **same** search, classifier and composer locally.

---

## 10. Weather

- **Source:** the Open-Meteo forecast API (free, no key, data CC BY 4.0) for the township centre:
  - Current: `temperature_2m`, `apparent_temperature`, `relative_humidity_2m`, `weather_code`, `is_day`.
  - Hourly: temperature, precipitation probability and weather code.
  - Daily: max, min, precipitation probability max and code.
  - `timezone=Asia/Kuala_Lumpur`, `forecast_days=2`.
- A shared parser turns this into `{ location, updatedAt, current, today, hourly[next 8 hours from the current hour], source }`.
- **WMO code groups:**
  - 0 → Clear.
  - 1–2 → Partly cloudy.
  - 3 → Cloudy.
  - 45/48 → Hazy.
  - 51–57 → Drizzle.
  - 95+ → Thunderstorms.
  - Everything else → Rain.
- **Tips:**
  - A thunderstorm (rain chance ≥ 40%) in the next 6 hours → "Thunderstorms likely from 3:00 pm. Bring the laundry in and stay away from open fields."
  - Otherwise, a rain chance ≥ 60% → "Rain likely from 3:00 pm. Keep an umbrella handy." When it's the current hour, the time is replaced with "within the hour".
  - Otherwise, feels-like ≥ 36°C → a heat tip.
- **The server** keeps one shared weather service, cached for 10 minutes. It serves a stale copy if a refresh fails, returns 502 if nothing is cached yet, and is used by both `/api/weather` and the assistant.
- **The browser** calls `/api/weather` and falls back to Open-Meteo directly if the API isn't available. It refreshes every 15 minutes.
- The free tier is **non-commercial**. A production launch needs a paid plan or another provider.

---

## 11. Design system

**Brand colours** (Sime Darby Property's palette; colours only, no SDP logo):

| Token | Value | Use |
|---|---|---|
| brand-50 → brand-950 | `#fff5f5 #ffe8e8 #fdd0d0 #faa9aa #f47677 #ec4547 #e53032 #d71920 #b3141a #8f1418 #4f0a0c` | brand-700 `#d71920` is used for primary buttons and links (white text has 5.2:1 contrast). brand-50/100 is used for tinted backgrounds. |
| accent-50 → accent-900 | `#fff9eb #fef0c7 #fde08a #fbcb4d #f6a909 #dd8f02 #b86e00 #925404 #78450a #663a0d` | SDP yellow `#f6a909`: the logo leaf, accent buttons and shop accents |
| ink | `#121212` | Body text (charcoal) |
| Greys | Tailwind **neutral** | Backgrounds `neutral-50`, borders `neutral-200`, secondary text `neutral-500` |

- **Status colours:**
  - Green: resolved, halal, instant booking, "Going".
  - Amber: open, needs approval, safety alerts.
  - Sky: in progress, bookings.
  - Rose: errors and destructive actions.
- **Font:** Plus Jakarta Sans (variable).
- **Shape:**
  - Cards are rounded-2xl with a thin border and a soft shadow.
  - Buttons are rounded-xl. Chips and badges are rounded-full.
  - Single-select filters are pill-shaped chips; the active chip is dark.
  - Route tabs use a segmented control.
- **Logo:** a red rounded square (`#d71920`) with a white house shape and a yellow (`#f6a909`) leaf with a white vein. The favicon is the same, and the browser `theme-color` is `#d71920`.
- **Charts:**
  - The categorical palette is applied in a fixed order and never cycled: `#2a78d6 #eb6834 #1baf7a #eda100 #e87ba4 #008300 #6250d6 #e34948`. It was checked with a colour-blindness validator for adjacent pairs.
  - Every chart has a legend and a table view.
  - Stacked segments have 2 px gaps, and only the top segment is rounded.
  - Gridlines and axes are kept faint.
- **Map pins:** teardrop shapes (a rotated rounded square with a white border) with an emoji inside. The active pin is scaled to 1.2×.
- **Responsive:**
  - No horizontal scrolling at any width.
  - Filter chips scroll sideways on phones.
  - Forms open full screen on phones.
  - The page bottom has extra padding so content clears the bottom navigation.
- **Minimalism rule** (the owner's explicit preference): show each fact once and each action once. Prefer one-line summaries that link to a module over embedding the module's content. Cap lists, for example the next 3 events or 1 alert.

---

## 12. Sample data (City of Elmina)

The neighbourhood, park, mall and street names are real places from OpenStreetMap. The people and content are fictional. Timestamps are generated relative to "now", and stored data is moved forward by whole days on each load, so the demo always looks current. Bump the seed version to reseed every browser.

- **About 50 users:**
  - 14 named residents across the three neighbourhoods, each with a bio, interests and privacy choices.
  - 30 generated residents.
  - 2 pending residents waiting for approval.
  - 3 verified shops, each with a location:
    - Roti Sinar Bakery (halal, Elmina Lakeside Mall, 3.1813, 101.5101).
    - Green Bowl Café (vegetarian, Elmina Gardens, 3.1912, 101.5176).
    - Ah Seng Kopitiam (non-halal, Elmina Green, 3.2052, 101.4996).
  - 1 pending shop: Kedai Buah Pak Mat.
  - 1 admin: Nadia Osman.
- **Reports:**
  - About 18 curated reports, such as a deep pothole at the Persiaran Elmina junction (9 "me too"s), monkeys raiding bins behind Block B, a snake near the Elmina Green playground, and a guardhouse barrier gate that keeps getting stuck (Others).
  - 34 generated historical reports over 8 weeks, which feed the dashboard charts.
- **EcoFood:**
  - About 12 live listings, such as rambutans, end-of-day bread, nasi lemak from a kenduri, char siu buns (non-halal) and Aisyah's banana cake (with 2 requests).
  - 62 collected listings from the past, for the impact charts.
  - Aisyah has a confirmed claim with pickup code **2914**.
- **Bookings:** curated ones (Aisyah's Saturday family BBQ, Daniel's pending hall request for a birthday, Priya's AGM, Lakshmi's bake sale, a maintenance block), plus about 30 days of generated history and 2 weeks of future bookings.
- **Posts:** 14, across all the topics. Examples: a wildlife alert, a fogging announcement, the gotong-royong, a lost cat called Mochi, keys found near the clubhouse, a request for a swimming coach, a children's books giveaway, and a heads-up about someone trying car doors.
- **Events:** 11 upcoming, such as a gotong-royong at the community garden, beginners' yoga, a Sunday cycle, a bird walk, kids' storytelling, a neighbourhood watch briefing (Elmina Valley only), a recycling drive (official), a fire safety talk with Bomba (official), a charity bake sale, the Elmina Gardens residents' AGM, and Aisyah's own Saturday park run. All come with sampled RSVPs.
- **Also:** notifications for Aisyah, and two support tickets (NB-1041 and NB-1042).

---

## 13. Tech stack and architecture

```
neighbourly/               npm workspaces monorepo, Node 24 LTS, TypeScript
├─ apps/web                React 19 + Vite, React Router (data router, lazy routes),
│                          TanStack Query (server state), Zustand (session, chat),
│                          Tailwind CSS 4 + Radix UI primitives, lucide-react icons,
│                          Leaflet + react-leaflet (OpenStreetMap), Recharts, sonner (toasts),
│                          react-markdown + remark-gfm (assistant answers)
│  └─ src/mocks            Mock Service Worker: in-browser API using the shared contracts,
│                          stored in IndexedDB (idb-keyval)
├─ apps/api                Fastify 5: /api/health, /api/chat (SSE → OpenRouter), /api/weather;
│                          @fastify/cors, @fastify/rate-limit; dev server via tsx
├─ packages/shared         Zod schemas and types, DB row types, privacy presenters,
│                          booking rules, Malaysia-time helpers, weather parser,
│                          assistant search, classifier, prompts, PII redaction, SSE helpers
├─ knowledge/              Assistant knowledge base (Markdown)
└─ scripts/                build-kb.ts, demo-flow.ts (end-to-end), screenshots.ts
```

- **Prototype mode:**
  - The web app calls `/api/*` as if a backend existed. Mock Service Worker answers in the browser, using the same Zod contracts and privacy presenters the real server will use.
  - Only `/api/chat` and `/api/weather` pass through to the Fastify server, via the Vite dev proxy to port 8787.
- **Planned production:** Supabase (Postgres, Auth, Storage) behind the Fastify API, implementing the same endpoints. Setting `VITE_USE_MOCKS=false` switches the mocks off.
- **Secrets:** the OpenRouter key lives only in `apps/api/.env` (`OPENROUTER_API_KEY`), which is git-ignored. The browser never sees it.
- **Commands:**

  | Command | What it does |
  |---|---|
  | `npm run dev` | Build the knowledge base, then start the API on :8787 and the web app on :5173 |
  | `npm test` | Unit tests |
  | `npm run lint`, `npm run typecheck`, `npm run build` | Lint, typecheck and production build |
  | `npm run e2e` | The 15-step demo script in a real browser |
  | `npm run screenshots` | 27 screens × desktop and phone |

---

## 14. Testing

- **Unit tests** (Vitest, about 130):
  - Every privacy rule.
  - Booking rules and availability.
  - Malaysia-time helpers.
  - Weather parsing and tips.
  - PII redaction.
  - SSE parsing and marker stripping.
  - Assistant behaviour:
    - Around 50 real questions in English and Malay map to the right section.
    - **Every guide heading retrieves its own section**.
    - 14 off-topic questions are declined.
    - Uncovered township questions offer a ticket.
    - Greetings, thanks and ticket requests are recognised.
    - Malay replies.
    - Live weather in answers.
  - API routes for chat, including model fallback, both markers, "small talk never reaches the model" and weather. Weather caching is tested too.
- **End-to-end demo script** (Playwright, 15 steps through the real UI):
  1. A resident logs in with one click.
  2. Note the dashboard's food-saved figure.
  3. Report a pothole with a photo and a map pin.
  4. It appears in My reports and on the map.
  5. The admin moves it to In progress, then Resolved, with notes.
  6. The resident gets the notification.
  7. Daniel posts papayas.
  8. Aisyah requests them.
  9. Daniel confirms, sees the pickup code and marks them collected.
  10. Food saved on the dashboard goes up by 2.5 kg.
  11. The assistant answers about booking the hall.
  12. Home shows "For you" and "Coming up".
  13. Feed topic filters work, including Official.
  14. An RSVP increases the count, and creating an event works.
  15. The Places map shows facility and verified-shop pins, but not the pending shop.
- **The screenshot script** doubles as a smoke test and fails if there are any browser errors.

---

## 15. Suggested build order

1. **Set up the monorepo:** a shared package with constants, Zod schemas, row types and Malaysia-time helpers.
2. **Write the privacy presenters and their tests** before any UI.
3. **Write the booking rules and availability builder**, with tests.
4. **Build the sample data generator and the mock API** (MSW and IndexedDB), endpoint by endpoint.
5. **Build the web shell:** design tokens, UI primitives (Button, Badge, Card, Field, Dialog/Sheet, FilterChips, SegmentedNav, EmptyState), the sidebar, bottom navigation, top bar, route guards and the login with demo accounts.
6. **Build the features in this order:** TownCare → EcoFood → Facilities → Community (Feed, Events, Neighbours) → Places → Notifications and settings → Home → Admin (dashboard charts last).
7. **Build the assistant:** the knowledge-base files and build script, search, classifier, offline composer, chat panel; then the Fastify chat route with SSE, OpenRouter and fallback; then the weather service.
8. **Run the end-to-end demo script and the screenshots**, then fix layout issues at 390 px and 1440 px widths.

---

## 16. Known limitations and next steps

- Data lives in each browser, so two devices don't share it until the real backend exists.
- There are no email or phone push notifications, no password reset, no private messaging, and no way to edit or delete posts and reports yet.
- In guide-only mode, the assistant is keyword-based. Two questions that reduce to the same keywords get the same answer, but related-question chips help. AI mode understands paraphrases and replies in Chinese and Tamil.
- Facility photos are representative stock photos, not the actual Elmina facilities.
- Map tiles need an internet connection. Heavy use needs a commercial tile provider.
- The Open-Meteo free tier is non-commercial.
- react-leaflet uses the Hippocratic License 2.1, which is not OSI-approved. It can be swapped for plain Leaflet if Sime Darby Property's legal review requires it.
- **Next steps:** the Supabase backend and Auth, real photo storage, push notifications, and real township content from City of Elmina's management.

---

## 17. Licences and credits

- **Photos** (Wikimedia Commons):

  | Photo | Author | Licence | Changes |
  |---|---|---|---|
  | "Elmina (Malaysia) 1.jpg" (login page) | Wiki Farazi | CC0 | – |
  | "Jementah Multipurpose Hall.jpg" | Chongkian | CC BY-SA 4.0 | Cropped |
  | "Interior of new modern gym with equipment.jpg" | Shixart1985 | CC BY 2.0 | Cropped |
  | "Barbecue pits in Changi Point park 2015.jpg" | Apetrov09703 | CC BY-SA 4.0 | Cropped |
  | "Large meeting room (Unsplash).jpg" | Breather | CC0 | – |

- **Data:**
  - Map data © OpenStreetMap contributors (ODbL). Attribution is shown on every map.
  - Weather data by Open-Meteo (CC BY 4.0). Attribution is shown on the weather card.
- **Libraries:** mostly MIT, plus Apache-2.0 (class-variance-authority, idb-keyval), ISC (lucide), BSD-2 (Leaflet), Hippocratic 2.1 (react-leaflet) and OFL (Plus Jakarta Sans).
- **AI disclosure:** the prototype was built with substantial help from an AI coding assistant (Claude Code). The in-app assistant uses third-party language models through OpenRouter.
- **Disclaimer:** this is not an official Sime Darby Property app. All people and content in the sample data are fictional.
