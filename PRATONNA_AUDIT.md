# PRATONNA — Codebase Audit

**Repository:** `ai-conductor-platform` (branch `main`, 9 commits, last commit 2026-07-31)
**Audit date:** 2026-10-29 (AI provider updated to OpenAI only)
**Scope:** Read-only analysis. No code was changed.

---

## 0. Executive summary (read this first)

> **The repository is a front-end-only, clickable prototype. There is no backend, no database, no authentication, no API, and no AI integration of any kind.**

Key facts:

- The repo contains **four independent React + Vite single-page apps**: `client/`, `manager/`, `technician/`, `director/`. They do not share code, state, or data. An action in one app is invisible in the others.
- **All data is hard-coded** in a `src/data/mockData.js` file in each app and kept in React `useState`. A page refresh resets everything to the demo data.
- **Every "AI" feature is simulated:**
  - The "AI report" is a string template ([technician/src/context/TechDataContext.jsx:73](technician/src/context/TechDataContext.jsx#L73)).
  - The quote (devis) amount comes from a formula based on how long the technician's notes are and how many photos they took ([technician/src/data/mockData.js:179-184](technician/src/data/mockData.js#L179-L184)).
  - The "AI building match" (`aiMatch: '… 92% confidence'`) is a hard-coded string in the mock data.
- **"Login" is fake.** In the manager, technician and director apps, submitting the form sets `authed = true` with no credential check. The **client dashboard has no auth guard at all**, so `/dashboard` is open to anyone.
- The **only external network calls** are reverse geocoding through the public OpenStreetMap Nominatim API, plus OpenStreetMap map embeds (iframes).
- **Zero environment variables, zero `.env` files, zero deploy config, zero tests.**
- **What the product is:** the prototype implements a **building-repair / maintenance workflow** for French property management (syndic, copropriété): incident → technician assignment → site visit → devis → approval → e-signature → intervention → invoice → payment reminders.
  - It is **not** a general CRM. There are no contacts, companies, pipeline, email, voice, documents, accounting, or templates.
  - If a separate "Pratonna AI CRM" codebase exists (for example the one behind pratonna.com), **it is not in this repository**.

**Bottom line for planning:** every item on the client's required feature list (Section 6, a–l) is **missing** or exists only as a **UI-only mock**. The existing code is valuable as **UX/flow specification and visual design**, not as a technical foundation. A backend, database, auth and AI layer must be built from scratch before any of the required features can exist.

---

## 1. TECH STACK

### 1.1 Frontend

| Aspect | Finding |
|---|---|
| Framework | **React 19.2** (`react`, `react-dom ^19.2.8`), built with **Vite 8.2** (`@vitejs/plugin-react ^6.0.4`). Plain **JavaScript (JSX)**, no TypeScript (only `@types/*` dev deps for editor hints). |
| Routing | **react-router-dom ^7.18.2** (`BrowserRouter` + `Routes`) |
| UI library | **None.** All components are hand-written JSX. |
| Styling | **Hand-written global CSS.** Each app has its own `src/index.css` (625–796 lines). The client app also has `src/components/dashboard/dashboard.css` (647 lines). About 3,400 lines of CSS in total, mostly duplicated across the 4 apps. No Tailwind, no CSS modules. Google Fonts are loaded in `index.html`: **Fraunces** (headings) and **Outfit** (body). |
| State management | **React Context + `useState` only**, one "data context" per app: `ClientDataContext`, `ManagerDataContext`, `TechDataContext`, `DirectorDataContext`. Nothing is persisted (no `localStorage`, no server). |
| i18n | **Custom, homemade.** `src/context/LanguageContext.jsx` plus a `src/i18n/translations.js` dictionary in each app with `en` and `fr` keys. **French is fully handled** (complete FR dictionaries for all 4 apps). The default language is **English** (`useState('en')`). The choice is not persisted and the browser locale is not detected. `<html lang="en">` is hard-coded in every `index.html`. Dates use `toLocaleString('fr-FR' | 'en-GB')`. |
| Linting | `oxlint ^1.75.0` (`.oxlintrc.json` per app). No Prettier. |
| Browser APIs used | `navigator.mediaDevices.getUserMedia` (live camera capture), `navigator.geolocation`, `FileReader` (images converted to base64 data URLs held in memory) |

### 1.2 Backend

| Aspect | Finding |
|---|---|
| Backend framework | **None.** |
| API style | **None.** No REST, GraphQL, tRPC, server actions or serverless functions. |
| Database | **None.** |
| ORM / schema | **None.** |
| Auth provider | **None.** Login is a boolean flag in React state (see §4.1). |
| File storage | **None.** Photos and receipts are base64 strings in memory and are lost on refresh. |
| Background jobs / cron | **None.** Payment "reminders" are buttons that append an entry to an array. |

### 1.3 Hosting / deploy

- **No deploy configuration**: no `vercel.json`, `netlify.toml`, `Dockerfile`, CI workflow, or `.github/` folder.
- Each app is a static Vite build (`npm run build` → `dist/`). The four apps would need four separate deployments or sub-paths. Vite's default dev port is 5173, so running them together means each takes the next free port.
- **SPA routing caveat:** deploying to static hosting needs a rewrite rule (all paths → `index.html`) because the apps use `BrowserRouter`.

### 1.4 Third-party services

| Service | Status | Where |
|---|---|---|
| OpenAI | ❌ Not present | — |
| OpenAI | ❌ Not present | — |
| Email (Gmail / Outlook / SMTP / Resend…) | ❌ Not present | — |
| WhatsApp (Meta Cloud API / Twilio) | ❌ Not present. The `channel: 'whatsapp'` value on incidents is mock data only. | — |
| Storage (S3 / Supabase / Cloudinary) | ❌ Not present | — |
| Payments (Stripe…) | ❌ Not present | — |
| E-signature (Yousign / DocuSign) | ❌ Not present. Signing is simulated by a "simulate client sign" button. | — |
| Calendar (Google / Outlook) | ❌ Not present. The "Calendar" page is a sorted list. | — |
| **OpenStreetMap Nominatim** (reverse geocoding) | ✅ Live public API, called directly from the browser, no key, no User-Agent, no rate limiting | [client/src/pages/Signup.jsx:31](client/src/pages/Signup.jsx#L31), [technician/src/pages/Signup.jsx:56](technician/src/pages/Signup.jsx#L56), [technician/src/pages/Profile.jsx:43](technician/src/pages/Profile.jsx#L43) |
| **OpenStreetMap embed** (maps) | ✅ `<iframe>` embeds | [manager/src/pages/IncidentDetail.jsx:145](manager/src/pages/IncidentDetail.jsx#L145), [manager/src/pages/Technicians.jsx:21](manager/src/pages/Technicians.jsx#L21), [technician/src/pages/Directory.jsx:43](technician/src/pages/Directory.jsx#L43) |
| Unsplash | ✅ Hot-linked stock photos used as avatars and incident photos in the mock data | all `mockData.js` |
| Google Fonts | ✅ | all `index.html` |

### 1.5 Environment variables

- **None found.** A search for `import.meta.env` and `process.env` across all sources and Vite configs returns zero matches.
- **No `.env`, `.env.example` or `.env.local` files exist.** `.gitignore` already ignores `*.local`.
- **Missing from `.env.example`:** not applicable, because no variables are referenced.
- **No secrets are hard-coded.** Nothing secret exists in the code yet.

---

## 2. FILE STRUCTURE

### 2.1 Directory tree

`node_modules`, `.git` and `dist` are excluded.

```
ai-conductor-platform/
├── README.md
├── client/
│   ├── .gitignore
│   ├── .oxlintrc.json
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── README.md
│   ├── vite.config.js
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── assets/
│       │   ├── hero.png
│       │   ├── react.svg
│       │   └── vite.svg
│       ├── components/
│       │   ├── Navbar.jsx
│       │   └── dashboard/
│       │       ├── DashboardLayout.jsx
│       │       └── dashboard.css
│       ├── context/
│       │   ├── ClientDataContext.jsx
│       │   └── LanguageContext.jsx
│       ├── data/
│       │   └── mockData.js
│       ├── i18n/
│       │   └── translations.js
│       └── pages/
│           ├── Landing.jsx
│           ├── Login.jsx
│           ├── Signup.jsx
│           └── dashboard/
│               ├── Overview.jsx
│               ├── ReportProblem.jsx
│               ├── TrackCases.jsx
│               ├── TrackDetail.jsx
│               ├── Quotations.jsx
│               ├── Invoices.jsx
│               ├── Support.jsx
│               └── Profile.jsx
├── manager/
│   ├── (.gitignore, .oxlintrc.json, index.html, package*.json, README.md, vite.config.js, public/, assets/: same as client)
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── components/DashboardLayout.jsx
│       ├── context/
│       │   ├── LanguageContext.jsx
│       │   └── ManagerDataContext.jsx
│       ├── data/mockData.js
│       ├── i18n/translations.js
│       └── pages/
│           ├── Login.jsx
│           ├── Overview.jsx
│           ├── Incidents.jsx
│           ├── IncidentDetail.jsx
│           ├── Technicians.jsx
│           ├── Approvals.jsx
│           ├── Calendar.jsx
│           ├── Invoices.jsx
│           └── Chats.jsx
├── technician/
│   ├── (same scaffold files)
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── components/DashboardLayout.jsx
│       ├── context/
│       │   ├── LanguageContext.jsx
│       │   └── TechDataContext.jsx
│       ├── data/mockData.js
│       ├── i18n/translations.js
│       └── pages/
│           ├── Login.jsx
│           ├── Signup.jsx
│           ├── Overview.jsx
│           ├── Tasks.jsx
│           ├── TaskDetail.jsx
│           ├── Notifications.jsx
│           ├── Directory.jsx
│           └── Profile.jsx
└── director/
    ├── (same scaffold files)
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── components/DashboardLayout.jsx
        ├── context/
        │   ├── LanguageContext.jsx
        │   └── DirectorDataContext.jsx
        ├── data/mockData.js
        ├── i18n/translations.js
        └── pages/
            ├── Login.jsx
            ├── Overview.jsx
            ├── Approvals.jsx
            ├── Cases.jsx
            ├── Interventions.jsx
            ├── Finance.jsx
            └── Settings.jsx
```

The repo has 118 files and about 5,900 lines of JS/JSX (plus about 3,400 lines of CSS).

### 2.2 Purpose of each file and folder

**Root**

- `README.md`: a two-line description ("central AI-powered collaboration hub, the 12th man of a football team, with CRM, tasks, WhatsApp, Gmail and Calendar integrations for real estate/construction"). None of those integrations exist.
- `client/`, `manager/`, `technician/`, `director/`: four standalone Vite apps, one per user role.

**Scaffold files (identical in every app)**

- `package.json`: dependencies are react, react-dom and react-router-dom only. Scripts are `dev`, `build`, `lint` and `preview`.
- `vite.config.js`: the default Vite + React plugin config, with no custom port, proxy or env.
- `index.html`: the HTML shell, with title, Google Fonts and `lang="en"`.
- `.oxlintrc.json`: lint rules.
- `README.md`: the unmodified Vite template README.
- `public/favicon.svg`, `public/icons.svg`: static icons.
- `src/assets/react.svg`, `src/assets/vite.svg`: unused Vite template assets.
- `src/assets/hero.png`: the hero image (used by the client landing page).
- `src/main.jsx`: the React root (`StrictMode`).
- `src/App.jsx`: route table plus context providers.
- `src/index.css`: all global styles for that app.
- `src/context/LanguageContext.jsx`: the EN/FR language state, `t` dictionary and `toggleLang`. Duplicated 4×.
- `src/i18n/translations.js`: the EN + FR string dictionary.
- `src/data/mockData.js`: all demo data plus status helpers. **This is the de-facto "database".**
- `src/components/DashboardLayout.jsx`: sidebar, topbar, language toggle, logout, and the auth redirect (except in client).

**client/** (end customer: resident, owner or syndic)

- `components/Navbar.jsx`: landing page navbar with language toggle.
- `components/dashboard/DashboardLayout.jsx` + `dashboard.css`: client dashboard shell. **No auth guard.**
- `context/ClientDataContext.jsx`: in-memory cases, messages, quotations, invoices, feedback and the hard-coded user "Camille Moreau". Actions: `addCase`, `sendMessage`, `respondQuotation`, `uploadReceipt`, `submitFeedback`.
- `pages/Landing.jsx`: marketing landing page with a hero (static image, **no video**), "How it works" in 3 steps, "Why us", a CTA and a footer.
- `pages/Login.jsx`: login form. Submitting navigates to `/dashboard` with no check.
- `pages/Signup.jsx`: sign-up form with "use live location" (geolocation + Nominatim). Nothing is stored.
- `pages/dashboard/Overview.jsx`: KPIs (open cases, assigned, quotes to review, unpaid), recent cases, "needs attention".
- `pages/dashboard/ReportProblem.jsx`: live camera capture or gallery upload, title, address, city and urgency. Creates an in-memory case.
- `pages/dashboard/TrackCases.jsx`: case list.
- `pages/dashboard/TrackDetail.jsx`: case detail, assigned technician card and client↔technician chat (local only).
- `pages/dashboard/Quotations.jsx`: devis list with line items and accept/decline buttons.
- `pages/dashboard/Invoices.jsx`: invoices and payment-receipt screenshot upload (base64 in memory).
- `pages/dashboard/Support.jsx`: feedback form (topic, rating, message) and history.
- `pages/dashboard/Profile.jsx`: read-only display of the hard-coded user.

**manager/** (gestionnaire, the case manager)

- `context/ManagerDataContext.jsx`: incidents, group chats, invoices and the technician pool. Actions: `login`, `logout`, `setUrgency`, `hireTechnicians`, `sendGroupMessage`, `approveDevis`, `rejectDevis`, `simulateClientSign`, `planIntervention`, `markInProgress`, `completeAndInvoice`, `sendReminder`.
- `data/mockData.js`: `APPROVAL_THRESHOLD_EUR = 1000`, `managerUser` (Léa Bernard), 4 technicians with GPS coordinates, 5 incidents covering the full status lifecycle, group chats, invoices and `routeForAmount()`.
- `pages/Login.jsx`: the password is prefilled as `'password'`. Any submit logs in.
- `pages/Overview.jsx`: KPIs and lists.
- `pages/Incidents.jsx`: incident list showing the channel (WhatsApp, email or phone).
- `pages/IncidentDetail.jsx` (372 lines): **the core workflow screen**. It shows the AI match banner, lets the manager set urgency, shows an OSM map with technician cards to multi-select and "hire", the group chat, devis approve/reject, a "simulate client sign" button, intervention scheduling, mark in progress, and complete & invoice.
- `pages/Technicians.jsx`: technician pool with a map.
- `pages/Approvals.jsx`: devis under the threshold awaiting the manager.
- `pages/Calendar.jsx`: a **sorted list** of planned interventions (not a calendar grid, and not synced to any calendar).
- `pages/Invoices.jsx`: invoices with "send day-7 / day-15 reminder" buttons (manual, and nothing is actually sent).
- `pages/Chats.jsx`: list of task group chats.

**technician/** (field technician)

- `context/TechDataContext.jsx`: profile, tasks, group messages and notifications. Actions: `login`, `logout`, `registerProfile`, `updateProfile`, `sendGroupMessage`, `submitSiteReport` (**the fake AI report and devis**), `simulateClientSignedAssignment`, `startWork`, `completeWork`, `markAllNotificationsRead`.
- `data/mockData.js`: the default profile (Marc Dupont), peer technicians, tasks, notifications, and `estimateDevisFromNotes()` (a fake pricing formula).
- `pages/Login.jsx`, `pages/Signup.jsx`: sign-up with a profile photo, specialty, experience and geolocation.
- `pages/Overview.jsx`: KPIs.
- `pages/Tasks.jsx`: task list.
- `pages/TaskDetail.jsx` (362 lines): site visit with live camera photos and constat notes, then "generate AI report" (simulated), group chat, and start/complete work.
- `pages/Notifications.jsx`: in-app notification list.
- `pages/Directory.jsx`: "how managers see you", a visibility card with a map.
- `pages/Profile.jsx`: edit profile, photo and location.

**director/** (dirigeant, the company owner)

- `context/DirectorDataContext.jsx`: cases, invoices and settings. Actions: `login`, `logout`, `approveDevis`, `rejectDevis`, `sendReminder`, `saveSettings`.
- `data/mockData.js`: `directorUser` (Antoine Lefèvre), settings (threshold €1,000, reminders on days 7 and 15, company name, AI pricing note), cases and invoices.
- `pages/Overview.jsx`: KPIs (ongoing, interventions, unpaid, reminders due, pending devis, € exposure).
- `pages/Approvals.jsx`: devis at or above the threshold, with photos, AI report, line items and approve/reject.
- `pages/Cases.jsx`: all cases.
- `pages/Interventions.jsx`: planned and in-progress interventions.
- `pages/Finance.jsx`: unpaid invoices and reminder buttons.
- `pages/Settings.jsx`: edit the threshold, reminder days, company name and AI pricing note. This changes **director-app state only**; it has no effect on the manager or technician apps.

---

## 3. DATABASE

**There is no database, no ORM, no schema file and no migrations.**

The tables below describe the **implicit data model** inferred from `mockData.js` and the context actions. They are the best available specification for the future schema.

### 3.1 Implicit entities

| Entity | Fields (as used in mock data) | Relations | Source |
|---|---|---|---|
| **User / Client** | name, email, phone, address, city, country | has many Cases | `client/src/context/ClientDataContext.jsx` |
| **Manager** | id, name, email, role (`Gestionnaire`) | handles Incidents | `manager/src/data/mockData.js` |
| **Director** | id, name, email, role (`Dirigeant`) | approves high-value Devis | `director/src/data/mockData.js` |
| **Technician** | id, name, email, age, experienceYears, specialty, phone, bio, photo, rating, jobs/jobsCompleted, lat, lng, city, country, available / hireStatus, visibleToManager | many-to-many with Incidents (`hiredTechIds`) | `manager/…/mockData.js`, `technician/…/mockData.js` |
| **Incident / Case** | id (`INC-xxxx`), title, channel (`whatsapp`/`email`/`phone`), complainant, building, unit, city, lat, lng, status, urgency (`low`/`medium`/`high`), aiMatch, createdAt, hiredTechIds[], groupId, photos[], constat, aiReport, devis, scheduledAt | belongs to Client and Building; has one Devis, one Group chat, many Technicians, one Invoice | `manager/…/mockData.js` |
| **Task** (technician view of an Incident) | id (`TASK-xxx`), caseId, stage, hiredTechIds, groupId, urgency, notes, photos, aiReport, devis, scheduledAt, completedAt, assignedAfterClientSign | belongs to Incident | `technician/…/mockData.js` |
| **AI Report** | summary, generatedAt | embedded in Incident/Task | — |
| **Devis (Quotation)** | id (`DEV-xxx`), caseId, title, amount, currency, status, approvalRoute (`manager`/`director`), approvedByManager, fromDirector, issuedAt, lines[{label, amount}] | belongs to Incident; has one Invoice | `client/…/mockData.js` |
| **Invoice (Facture)** | id (`FAC-xxx`), incidentId/caseId, quotationId, title, amount, currency, status (`unpaid`/`awaiting_receipt`/`under_review`/`paid`), issuedAt, dueAt, receiptUrl, reminders[{day, sentAt}] | belongs to Incident and Devis | `manager/…/mockData.js`, `client/…/mockData.js` |
| **Message** (client↔technician) | id, from (`client`/`technician`), text, at | belongs to Case | `client/…/mockData.js` |
| **Group chat message** | id, fromId, fromName, text, at | belongs to Group (`GRP-xxx`), which belongs to Incident | `manager/…/mockData.js` |
| **Notification** | id, type (`hire`/`report`/`assignment`/`invoice`), title, body, at, read, taskId | belongs to a Technician | `technician/…/mockData.js` |
| **Feedback** | id, topic, rating, message, at | belongs to Client | `client/…/ClientDataContext.jsx` |
| **Settings** | approvalThresholdEur, reminderDay1, reminderDay2, companyName, aiPricingNote | per company | `director/…/mockData.js` |

**Not modelled at all:** Company/tenant (multi-tenancy), Building/Lot as its own entity (it is only a string), Contact, Lead/Opportunity, Email, Document, Signature, Payment, Transaction, Template, AI conversation, Audit log.

### 3.2 Incident status lifecycle

The lifecycle is defined in a comment at [manager/src/data/mockData.js](manager/src/data/mockData.js):

```
new → awaiting_assignment → site_visit
    → devis_pending_manager (< €1,000) | devis_pending_director (≥ €1,000)
    → sent_to_client → client_signed → intervention_planned → in_progress → invoiced → closed
```

- The technician app uses a parallel set of stages: `site_visit → report_sent → awaiting_approval → awaiting_client_sign → intervention_assigned → in_progress → completed`.
- The director app adds `approved_sent`.
- The client app uses `technician_assigned`, `quotation` and others.
- **The status vocabularies differ between apps.** They must be unified into one state machine in the rebuild.

### 3.3 Migrations and schema location

There are none.

---

## 4. IMPLEMENTED FEATURES

Status legend:
- **Complete**: works end-to-end with real persistence.
- **Partial**: some real functionality.
- **UI-only mock**: the screen and interactions exist, but data is fake and in-memory.
- **Missing**: not present.
- **Broken**: present but does not work as intended.

There are **no API endpoints anywhere**, so the "API" column for every feature is "none".

| # | Feature | Main files | Routes / pages | Status | Notes |
|---|---|---|---|---|---|
| 4.1 | **Auth & roles** | `*/src/pages/Login.jsx`, `*/src/components/DashboardLayout.jsx`, `*/src/context/*DataContext.jsx` (`login()`), `client/src/pages/Signup.jsx`, `technician/src/pages/Signup.jsx` | `/login`, `/signup` (client, technician) | **UI-only mock / insecure** | `login()` just sets `authed=true`, with no credential check. The manager password field is prefilled with `'password'`. The **client dashboard has no guard**. Roles exist only because there are 4 separate apps. There is no session, token, password hashing or reset flow. |
| 4.2 | **Dashboard** | `*/src/pages/Overview.jsx` (manager, technician, director), `client/src/pages/dashboard/Overview.jsx` | `/dashboard` | **UI-only mock** | KPI tiles are computed with `useMemo` from mock data. Not real-time, no alerts, no priorities. |
| 4.3 | **Dossiers / case management** | `manager/src/pages/Incidents.jsx`, `IncidentDetail.jsx`, `director/src/pages/Cases.jsx`, `client/src/pages/dashboard/ReportProblem.jsx`, `TrackCases.jsx`, `TrackDetail.jsx`, `technician/src/pages/Tasks.jsx`, `TaskDetail.jsx` | manager `/dashboard/incidents[/:id]`, client `/dashboard/report`, `/dashboard/track[/:id]`, technician `/dashboard/tasks[/:id]`, director `/dashboard/cases` | **UI-only mock** (the most developed part) | The full workflow can be clicked through **within one app**. A case created in the client app never reaches the manager app. Photos are base64 in memory. |
| 4.4 | **Technician assignment (map)** | `manager/src/pages/IncidentDetail.jsx`, `Technicians.jsx` | `/dashboard/technicians` | **UI-only mock** | The OSM iframe is centred on the incident. Technician cards are hand-picked. No distance ranking or AI matching. |
| 4.5 | **CRM & contacts** | — | — | **Missing** | No contact or company entities, no pipeline, no search. The only "contacts" are the hard-coded complainant name and technician profiles. |
| 4.6 | **Tasks / reminders** | `technician/src/pages/Tasks.jsx`, `manager/src/pages/Invoices.jsx`, `director/src/pages/Finance.jsx`, `director/src/pages/Settings.jsx` | — | **UI-only mock** | "Tasks" are incident stages, not a general task manager. Payment reminders (day 7 and 15) are manual buttons that append to an array. Nothing is sent and nothing is scheduled. |
| 4.7 | **AI assistant / chatbot** | `technician/src/context/TechDataContext.jsx` (`submitSiteReport`), `technician/src/data/mockData.js` (`estimateDevisFromNotes`) | — | **Missing (simulated)** | **No model and no API call.** The "AI report" is a template string. The devis amount is `max(220, round((180 + photos×40 + min(600, notes.length×2))/10)×10)`. There is no system prompt anywhere and no chatbot UI. |
| 4.8 | **Voice commands** | — | — | **Missing** | No Web Speech API, no audio capture, no TTS. |
| 4.9 | **Documents** | `client/src/pages/dashboard/Quotations.jsx`, `Invoices.jsx` | `/dashboard/quotations`, `/dashboard/invoices` | **UI-only mock** | Devis and invoices are on-screen cards only. No PDF generation, no download, no numbering compliance, no legal mentions (SIRET, TVA), no e-signature (`simulateClientSign` is a button). |
| 4.10 | **Email** | — | — | **Missing** | `channel: 'email'` is just a label in the mock data. |
| 4.11 | **WhatsApp / multichannel intake** | `manager/src/data/mockData.js` (`channel`) | — | **Missing** | The label is displayed only. |
| 4.12 | **Accounting / finance** | `director/src/pages/Finance.jsx`, `manager/src/pages/Invoices.jsx` | `/dashboard/finance`, `/dashboard/invoices` | **UI-only mock** | Unpaid count and "exposure" sum. No ledger, no reports, no export, no integrations. |
| 4.13 | **Approval workflow (threshold routing)** | `manager/src/data/mockData.js` (`routeForAmount`), `technician/src/data/mockData.js`, `manager/src/pages/Approvals.jsx`, `director/src/pages/Approvals.jsx` | `/dashboard/approvals` | **UI-only mock (logic correct)** | The rule is correct: under €1,000 goes to the manager, €1,000 or more goes to the director. It is **hard-coded in each app**, and the director's Settings change does not propagate. |
| 4.14 | **Chat (client↔technician, team groups)** | `client/src/pages/dashboard/TrackDetail.jsx`, `manager/src/pages/Chats.jsx`, `IncidentDetail.jsx`, `technician/src/pages/TaskDetail.jsx` | `/dashboard/chats` | **UI-only mock** | Messages are appended to local state only. Nothing is real-time and no one else receives them. |
| 4.15 | **Calendar** | `manager/src/pages/Calendar.jsx`, `director/src/pages/Interventions.jsx` | `/dashboard/calendar`, `/dashboard/interventions` | **UI-only mock** | A sorted list, not a calendar grid. No Google or Outlook sync. |
| 4.16 | **Notifications** | `technician/src/pages/Notifications.jsx`, `TechDataContext.jsx` | `/dashboard/notifications` | **UI-only mock** | In-app list only, in the technician app only. No push, email or SMS. |
| 4.17 | **Settings** | `director/src/pages/Settings.jsx` | `/dashboard/settings` | **UI-only mock** | Saved to local state and lost on refresh. Not shared with the other apps. |
| 4.18 | **Profile** | `client/src/pages/dashboard/Profile.jsx`, `technician/src/pages/Profile.jsx` | `/dashboard/profile` | **Partial** | Technician profile editing works in memory, including **real geolocation and reverse geocoding**. The client profile is read-only and hard-coded. |
| 4.19 | **Camera capture** | `client/src/pages/dashboard/ReportProblem.jsx`, `technician/src/pages/TaskDetail.jsx` | — | **Partial (real)** | Real `getUserMedia` capture with canvas and base64. There is a gallery fallback. Nothing is uploaded. |
| 4.20 | **Feedback / support** | `client/src/pages/dashboard/Support.jsx` | `/dashboard/support` | **UI-only mock** | Stored in local state only. |
| 4.21 | **Landing page** | `client/src/pages/Landing.jsx`, `client/src/components/Navbar.jsx`, `client/src/i18n/translations.js` | client `/` | **Partial (static marketing)** | Hero (static `hero.png`, **no video**), 3 steps, "Why us", CTA, footer, EN/FR. **No pricing, no demo video, no demo booking, no SEO meta, no legal pages** (mentions légales, CGU, privacy policy). The manager, technician and director apps have no landing page and redirect `/` to `/login`. |
| 4.22 | **i18n (FR/EN)** | `*/src/i18n/translations.js`, `*/src/context/LanguageContext.jsx` | toggle button in the navbar and dashboard | **Complete (for a prototype)** | Full FR translations. Default is EN; it should default to FR for the target market and remember the choice. |

---

## 5. ALL API ROUTES

**There are no API routes.**

- No server, serverless functions, Next.js `app/api`, Express, or any HTTP endpoint is defined in this repository.
- The only outbound HTTP call is `GET https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=…&lon=…&addressdetails=1`, made from the browser in 3 files (see §1.4). It needs no auth.

### 5.1 Front-end routes (for reference)

| App | Path | Page file | Guarded? |
|---|---|---|---|
| client | `/` | `pages/Landing.jsx` | public |
| client | `/login` | `pages/Login.jsx` | public |
| client | `/signup` | `pages/Signup.jsx` | public |
| client | `/dashboard` | `pages/dashboard/Overview.jsx` | ❌ **no guard** |
| client | `/dashboard/report` | `pages/dashboard/ReportProblem.jsx` | ❌ |
| client | `/dashboard/track` | `pages/dashboard/TrackCases.jsx` | ❌ |
| client | `/dashboard/track/:id` | `pages/dashboard/TrackDetail.jsx` | ❌ |
| client | `/dashboard/quotations` | `pages/dashboard/Quotations.jsx` | ❌ |
| client | `/dashboard/invoices` | `pages/dashboard/Invoices.jsx` | ❌ |
| client | `/dashboard/support` | `pages/dashboard/Support.jsx` | ❌ |
| client | `/dashboard/profile` | `pages/dashboard/Profile.jsx` | ❌ |
| manager | `/` → `/login` | `pages/Login.jsx` | public |
| manager | `/dashboard` | `pages/Overview.jsx` | fake flag |
| manager | `/dashboard/incidents` | `pages/Incidents.jsx` | fake flag |
| manager | `/dashboard/incidents/:id` | `pages/IncidentDetail.jsx` | fake flag |
| manager | `/dashboard/technicians` | `pages/Technicians.jsx` | fake flag |
| manager | `/dashboard/approvals` | `pages/Approvals.jsx` | fake flag |
| manager | `/dashboard/calendar` | `pages/Calendar.jsx` | fake flag |
| manager | `/dashboard/invoices` | `pages/Invoices.jsx` | fake flag |
| manager | `/dashboard/chats` | `pages/Chats.jsx` | fake flag |
| technician | `/login`, `/signup` | `pages/Login.jsx`, `pages/Signup.jsx` | public |
| technician | `/dashboard` | `pages/Overview.jsx` | fake flag |
| technician | `/dashboard/tasks` | `pages/Tasks.jsx` | fake flag |
| technician | `/dashboard/tasks/:id` | `pages/TaskDetail.jsx` | fake flag |
| technician | `/dashboard/notifications` | `pages/Notifications.jsx` | fake flag |
| technician | `/dashboard/directory` | `pages/Directory.jsx` | fake flag |
| technician | `/dashboard/profile` | `pages/Profile.jsx` | fake flag |
| director | `/login` | `pages/Login.jsx` | public |
| director | `/dashboard` | `pages/Overview.jsx` | fake flag |
| director | `/dashboard/approvals` | `pages/Approvals.jsx` | fake flag |
| director | `/dashboard/cases` | `pages/Cases.jsx` | fake flag |
| director | `/dashboard/interventions` | `pages/Interventions.jsx` | fake flag |
| director | `/dashboard/finance` | `pages/Finance.jsx` | fake flag |
| director | `/dashboard/settings` | `pages/Settings.jsx` | fake flag |

### 5.2 Context actions that must become real API endpoints

These in-memory functions are, in practice, the API contract the backend must implement:

| Current function | File | Future endpoint (proposed) |
|---|---|---|
| `addCase` | client `ClientDataContext` | `POST /api/incidents` (with photo upload) |
| `sendMessage` | client `ClientDataContext` | `POST /api/incidents/:id/messages` |
| `respondQuotation` | client `ClientDataContext` | `POST /api/devis/:id/accept` · `/reject` (+ e-signature) |
| `uploadReceipt` | client `ClientDataContext` | `POST /api/invoices/:id/receipt` |
| `submitFeedback` | client `ClientDataContext` | `POST /api/feedback` |
| `setUrgency` | manager `ManagerDataContext` | `PATCH /api/incidents/:id` |
| `hireTechnicians` | manager `ManagerDataContext` | `POST /api/incidents/:id/assignments` |
| `sendGroupMessage` | manager / technician | `POST /api/groups/:id/messages` (realtime) |
| `approveDevis` / `rejectDevis` | manager, director | `POST /api/devis/:id/approve` · `/reject` (role-checked by threshold) |
| `simulateClientSign` | manager | replace with an e-signature webhook: `POST /api/webhooks/esign` |
| `planIntervention` | manager | `POST /api/incidents/:id/schedule` (+ calendar sync) |
| `markInProgress` / `startWork` | manager / technician | `POST /api/incidents/:id/start` |
| `completeAndInvoice` / `completeWork` | manager / technician | `POST /api/incidents/:id/complete` → creates an Invoice |
| `sendReminder` | manager, director | scheduled job + `POST /api/invoices/:id/remind` |
| `submitSiteReport` | technician | `POST /api/incidents/:id/site-report` → **AI** report and devis draft |
| `registerProfile` / `updateProfile` | technician | `POST /api/auth/signup`, `PATCH /api/me` |
| `markAllNotificationsRead` | technician | `POST /api/notifications/read-all` |
| `saveSettings` | director | `PATCH /api/company/settings` |

---

## 6. GAP ANALYSIS vs REQUIRED FEATURE LIST

**Precondition for every item:**
- Nothing below can be built on the current code without first adding a **backend, database, authentication, file storage and a single unified app** (see §8, Phase 0).
- "Files to create" refer to the **target architecture proposed in §8** (Next.js App Router monorepo, `app/`, `lib/`, `prisma/`). Adapt the paths if another stack is chosen.

### a. AI voice assistant: speech recognition, voice commands, text-to-speech

**Status: ❌ MISSING.** There is no audio code of any kind.

Files to create:
- `components/voice/VoiceButton.tsx` (push-to-talk, MediaRecorder)
- `app/api/voice/transcribe/route.ts` (OpenAI speech-to-text)
- `app/api/voice/command/route.ts` (sends the transcript to the OpenAI text agent with function calling, see g.)
- `app/api/voice/speak/route.ts` (OpenAI TTS stream)
- `lib/ai/voice.ts`

Env:
- `OPENAI_API_KEY`, `OPENAI_REALTIME_MODEL` (OpenAI Realtime API over WebRTC for live voice)
- an STT key

Depends on the AI brain (g) and on authentication.

### b. Email management: Gmail/Outlook, AI-written emails, suggested replies, automatic follow-ups

**Status: ❌ MISSING.** "email" is only a channel label in the mock data.

Files to create:
- `app/api/integrations/google/oauth/route.ts`, `…/callback/route.ts`
- `app/api/integrations/microsoft/oauth/route.ts`, `…/callback/route.ts`
- `lib/integrations/gmail.ts`, `lib/integrations/outlook.ts` (Microsoft Graph)
- `app/api/email/sync/route.ts`, plus webhooks (Gmail Pub/Sub push, Graph subscriptions)
- `app/api/email/draft/route.ts` (AI draft and suggested replies)
- `app/(app)/inbox/page.tsx`
- `jobs/email-followups.ts` (scheduled)

Prisma models: `EmailAccount`, `EmailThread`, `EmailMessage`, `FollowUpRule`.

Notes:
- Google OAuth for Gmail scopes needs a **Google security verification** (allow several weeks).
- Microsoft needs an Entra app registration.

### c. Document management: AI contracts, devis, factures, PDFs, e-signature

**Status: 🟡 UI-only mock** for devis and invoice display. ❌ Missing PDFs, contracts and e-signature.

Existing files to refactor:
- `client/src/pages/dashboard/Quotations.jsx`, `Invoices.jsx`
- `manager/src/pages/Invoices.jsx`
- `director/src/pages/Approvals.jsx`

Files to create:
- `lib/documents/pdf.ts` (React-PDF or Puppeteer)
- `lib/documents/templates/devis.tsx`, `facture.tsx`, `contrat.tsx` (with French legal mentions: SIRET, TVA, sequential numbering, payment terms, late-payment penalties)
- `app/api/documents/generate/route.ts` (AI fills the content, then a PDF is produced)
- `lib/integrations/yousign.ts` (or DocuSign)
- `app/api/webhooks/esign/route.ts`
- `app/(app)/documents/page.tsx`

Prisma models: `Document`, `DocumentVersion`, `SignatureRequest`.

Notes:
- **E-invoicing (Factur-X) becomes mandatory in France from September 2026 (reception) / 2026–2027 (issuance)**, so plan for Factur-X output.

### d. Smart automation: AI tasks, reminders, meeting summaries, proactive recommendations

**Status: 🟡 Very partial UI mock.** Manual reminder buttons exist (`sendReminder`) and so do the day-7/15 settings. Nothing else.

Files to create:
- `lib/automation/engine.ts` (event triggers, conditions, actions)
- `jobs/` (cron: Vercel Cron, Inngest or Trigger.dev)
- `app/api/tasks/route.ts`
- `app/(app)/tasks/page.tsx`
- `lib/ai/summarize-meeting.ts` (audio upload, OpenAI STT, OpenAI summary)
- `lib/ai/recommendations.ts` (a daily job that scans overdue invoices, stale cases and unanswered emails)

Prisma models: `Task`, `Reminder`, `AutomationRule`, `Meeting`, `Recommendation`.

Reuse the reminder logic in `director/src/context/DirectorDataContext.jsx` (`remindersDue`).

### e. Accounting: tracking, reporting, integrations; service-order workflow (check funds → accountant approval → e-signature → send)

**Status: 🟡 UI-only mock** for unpaid counts and exposure. ❌ The service-order workflow is **missing**.

- The existing **threshold approval** (manager below €1,000, director at or above €1,000, in `routeForAmount`) is the closest pattern and should be generalised into an **approval-chain engine**.
- There is **no "accountant" role**.

Files to create:
- `lib/workflows/service-order.ts` (state machine: `draft → funds_check → accountant_review → esign → sent`)
- `app/api/service-orders/route.ts`
- `app/(app)/finance/*`
- `lib/integrations/pennylane.ts` / `qonto.ts` / `sage.ts` (common in French SMEs) for the funds check and accounting sync
- `app/(app)/reports/page.tsx` (P&L, receivables, cash-flow charts)

Prisma models: `ServiceOrder`, `Approval`, `Transaction`, `Payment`, `AccountingSync`.

Role: add `ACCOUNTANT`.

### f. Multimedia: AI image generation, image editing, video creation

**Status: ❌ MISSING.** Only camera capture exists (reusable).

Files to create:
- `app/api/media/image/generate/route.ts` and `…/edit/route.ts` (an image model such as OpenAI gpt-image, Stability or Flux)
- `app/api/media/video/route.ts` (Runway or HeyGen API, async with a webhook)
- `app/(app)/studio/page.tsx`
- `lib/storage.ts`

Prisma model: `MediaAsset`.

Note: images use OpenAI image generation; video needs a separate provider.

### g. Integrations hub: OpenAI as central brain connecting business apps

**Status: ❌ MISSING.** No LLM is called anywhere.

Files to create:
- `lib/ai/openai.ts` (OpenAI client; text model from `OPENAI_TEXT_MODEL`, default `gpt-4.1`)
- `lib/ai/system-prompt.ts` (**a French system prompt, versioned in code**)
- `lib/ai/tools/*.ts` (one tool per action: `create_incident`, `assign_technician`, `draft_email`, `generate_devis`, `schedule_intervention`, `send_whatsapp`, …)
- `lib/ai/approval-gate.ts` (**every write action requires explicit user approval**, as the client specified)
- `app/api/ai/chat/route.ts` (streaming)
- `components/assistant/AssistantPanel.tsx`
- `lib/integrations/registry.ts` (OAuth tokens, encrypted)
- WhatsApp: `lib/integrations/whatsapp.ts` (Meta Cloud API) and `app/api/webhooks/whatsapp/route.ts`
- Calendar: `lib/integrations/google-calendar.ts`, `outlook-calendar.ts`
- MCP connectors can be considered for extensibility.

Prisma models: `Integration`, `OAuthToken` (encrypted), `AiConversation`, `AiMessage`, `AiAction` (pending / approved / rejected / executed, for audit).

Env:
- `OPENAI_API_KEY`
- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`
- `GOOGLE_CLIENT_ID/SECRET`, `MS_CLIENT_ID/SECRET`
- `ENCRYPTION_KEY`

The existing "AI match" banner ([manager/src/pages/IncidentDetail.jsx](manager/src/pages/IncidentDetail.jsx)) and `submitSiteReport` are the **first two places to wire real OpenAI calls**: incident triage and building matching, then report and devis drafting.

### h. Per-worker personalised AI avatar/agent

**Status: ❌ MISSING.**

Files to create:
- Prisma `AgentProfile` (userId, persona, tone, voice for OpenAI TTS / Realtime, avatar image, allowed tools, memory)
- `lib/ai/agent-context.ts` (builds a per-user system prompt and tool set from the role and profile)
- `app/(app)/settings/agent/page.tsx`
- `lib/ai/memory.ts` (per-user memory, optionally with pgvector)

Optional: a talking avatar driven by the OpenAI voice. Depends on g and a.

### i. Business templates (BTP, immobilier, barber, entrepreneur, …)

**Status: ❌ MISSING.** The prototype is hard-wired to building repair (statuses, labels, devis lines).

Files to create:
- `templates/btp.json`, `immobilier.json`, `barber.json`, `entrepreneur.json` (pipeline stages, custom fields, document templates, automation rules, AI prompt fragments, demo data)
- `lib/templates/apply.ts`
- an onboarding wizard at `app/(app)/onboarding/page.tsx`

Prisma models: `Company.templateKey`, `CustomField`, `PipelineStage`.

The current incident lifecycle (§3.2) becomes the **"BTP / maintenance" template**.

### j. Landing page: hero video, demo video, pricing, sign-up/demo flow

**Status: 🟡 Partial.** [client/src/pages/Landing.jsx](client/src/pages/Landing.jsx) has a static hero image, steps, "Why us" and a CTA, in EN/FR. ❌ No video, no pricing, no demo booking, no SEO, no legal pages.

Files to create or change:
- `app/(marketing)/page.tsx` (port of `Landing.jsx`)
- `components/marketing/HeroVideo.tsx` (`<video autoplay muted loop playsinline>` with a poster; the 60-second promo, hosted on a CDN or Mux)
- `components/marketing/DemoVideo.tsx`
- `app/(marketing)/pricing/page.tsx` + Stripe Checkout and Billing (`app/api/billing/*`, `STRIPE_*` env)
- `app/(marketing)/demo/page.tsx` (Cal.com or Calendly embed, or a form that stores leads)
- `app/(marketing)/mentions-legales`, `/cgu`, `/confidentialite`
- `metadata` / OpenGraph / `sitemap.ts`
- Set **French as the default** language.

### k. Dynamic dashboard with priorities and real-time alerts

**Status: 🟡 UI-only mock.** KPI tiles exist in each `Overview.jsx`. Nothing is real-time and nothing is prioritised.

Files to create:
- a realtime layer (Supabase Realtime, Pusher or Ably): `lib/realtime.ts`
- `app/api/dashboard/route.ts` (aggregations)
- `lib/ai/prioritize.ts` (scores cases by urgency, SLA and amount)
- `components/dashboard/AlertFeed.tsx`
- Web Push / email / SMS: `lib/notifications/*`

Prisma models: `Notification`, `Alert`.

Reuse the KPI definitions from the four `*DataContext.jsx` files.

### l. Security & RGPD compliance, backups

**Status: ❌ MISSING.** No auth, no data protection, no legal pages, no audit trail. No secrets yet, which is a plus.

Required:
- **Auth:** a real provider (Supabase Auth, Clerk or Auth.js) with hashed passwords or magic links, MFA for directors and accountants, and role-based access control (RBAC) enforced **server-side**.
- **Multi-tenancy:** `companyId` on every row, plus Postgres Row-Level Security.
- **RGPD (GDPR):**
  - **EU data residency** (Supabase EU region, Vercel `cdg1` Paris region)
  - privacy policy
  - cookie banner
  - consent logs
  - data export and deletion endpoints (`app/api/gdpr/export`, `/delete`)
  - a processing register
  - **DPAs** with every sub-processor (OpenAI, Google, Microsoft, Meta, Yousign, Stripe)
  - retention policy for photos and voice recordings
  - technician geolocation consent
- **Security:**
  - OAuth tokens encrypted at rest
  - input validation (Zod)
  - rate limiting
  - CSP headers
  - file-upload scanning and size limits
  - signed URLs for private files
  - `AuditLog` model (who did what, including every AI action)
- **Backups:** managed Postgres with daily backups plus PITR, storage bucket versioning, and a restore drill.
- **Monitoring:** Sentry, uptime checks.

---

## 7. ARCHITECTURE & SCALABILITY ISSUES

### 7.1 Blocking issues

1. **No backend, database or API.** Nothing persists, nothing is shared between users, and no feature can be "real".
2. **Four disconnected apps.** Every role runs its own copy of the data, so the core promise (client → AI → manager → technician → director) cannot work across roles even in a demo. They should be merged into **one app with role-based routing**.
3. **Fake authentication.**
   - `login()` sets a boolean with no credential check.
   - The client dashboard has no guard.
   - The manager login has `'password'` prefilled ([manager/src/pages/Login.jsx:14](manager/src/pages/Login.jsx#L14)).
   - Roles and permissions are not enforced anywhere.
4. **AI is simulated.** The template string and length-based pricing formula ([technician/src/data/mockData.js:179-184](technician/src/data/mockData.js#L179-L184)) would mislead anyone evaluating the product as "AI-powered".
5. **No multi-tenancy concept.** There is no `Company`/organisation entity, which is required for SaaS.

### 7.2 Code smells, duplication and coupling

6. **Massive duplication.**
   - `LanguageContext.jsx` ×4.
   - `index.css` ×4 (about 3,400 lines in total).
   - `DashboardLayout.jsx` ×4.
   - Technician data (Marc Dupont, Sophie Martin…) and `APPROVAL_THRESHOLD_EUR` repeated across `mockData.js` files.
   - Camera-capture code duplicated between `client/…/ReportProblem.jsx` and `technician/…/TaskDetail.jsx`.
7. **Inconsistent domain model.**
   - The status names differ between apps (`technician_assigned` vs `site_visit` vs `intervention_assigned`; `approved_sent` exists only in the director app).
   - Field names differ too: `caseId` vs `incidentId`, `images` vs `photos`, `jobs` vs `jobsCompleted`, `building` vs `buildingAddress`.
8. **Business rules hard-coded in UI layers.**
   - The approval threshold is a constant in two apps and an editable setting in a third, and they are not linked.
   - Reminder days and pricing logic live in front-end files.
9. **Weak ID generation.** `INC-${1000 + cases.length + random(80)}` ([client/src/context/ClientDataContext.jsx](client/src/context/ClientDataContext.jsx)) and `Date.now()` IDs will collide.
10. **Stale-closure bug pattern.** `planIntervention` ([manager/src/context/ManagerDataContext.jsx](manager/src/context/ManagerDataContext.jsx)) assigns `groupId` inside a `setIncidents` updater and reads it on the next line. React does not guarantee the updater has run by then, so `groupId` can still be `null` and the "intervention planned" chat message is silently skipped. `completeAndInvoice` reads `incidents` from the closure rather than from the updater.
11. **Base64 images in React state.** Memory grows unbounded and nothing is compressed or uploaded. This will not scale past a few photos.
12. **No TypeScript and no schema validation.** A rebuild with several developers and AI tool-calling needs typed contracts (TypeScript + Zod).

### 7.3 Error handling, quality and operations

13. **Minimal error handling.**
    - Camera and geolocation have try/catch with user messages, which is good.
    - There are no React error boundaries.
    - There are no loading states (nothing is async except geolocation).
    - The Nominatim calls have no `res.ok` check in the technician files.
14. **Nominatim usage-policy violation risk.**
    - Direct browser calls with no identifying User-Agent/Referer, no caching and no throttling.
    - This is acceptable for a demo; production needs a proxy or a commercial geocoder (Google, Mapbox, or the free French government `api-adresse.data.gouv.fr`).
15. **No tests** (unit, integration or e2e), **no CI**, **no deploy config**, no environment separation (dev, staging, prod).
16. **No observability.** No logging, error tracking or analytics.
17. **Accessibility gaps.**
    - `lang="en"` is hard-coded while the target is French.
    - Map iframes rely on `title` only.
    - Several images use empty `alt=""` (fine for decorative images, but some, like technician photos, are content).
18. **Hot-linked Unsplash images** in the data. Fine for a demo; must be replaced before launch.
19. **Template leftovers.** The per-app `README.md` files are the Vite template, and `react.svg`/`vite.svg` are unused. The root README lists features that do not exist.
20. **Git hygiene.** Commit messages are `ready`/`rady`, which gives no history to trace what changed. There is no branching strategy.

### 7.4 What is worth keeping

- **The UX flows and screens.** The incident lifecycle, approval-threshold routing, technician map selection, group chat per job, client receipt upload, and day-7/15 reminder concept are a solid **functional specification**.
- **The FR/EN translation dictionaries.** They can be migrated to `next-intl` or `i18next` nearly as-is.
- **The visual design system.** Fonts and colours in `index.css` can be extracted into one shared theme.
- **The camera capture and geolocation helpers.**

---

## 8. RECOMMENDED IMPLEMENTATION ORDER

**Assumptions:**
- Target stack (proposed): **Next.js (App Router, TypeScript)** single app on **Vercel (Paris region)**, **PostgreSQL (Supabase, EU)** + **Prisma**, **Supabase Auth**, **Supabase Storage**, **OpenAI API**, background jobs via **Inngest** or Vercel Cron.
- Each step is small enough to build **and test in one session**.

**Ordering:**
- **Phase 0 (foundation) must come first.** Every gap item depends on it.
- After that, the steps follow the **exact order of the gap list (a → l)**, as requested.
- Where an item depends on a later one, the dependency is noted. In particular, **g (AI brain)** is needed by a, b, c, d and h. **Step 0.10 delivers a minimal OpenAI client early** so that a–f can proceed in order.

### Phase 0: Foundation (prerequisite for everything)

| # | Step | Files involved |
|---|---|---|
| 0.1 | Create the Next.js + TypeScript monorepo root and set up ESLint, Prettier and Vitest. Keep the old apps in `legacy/` as reference. | `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `legacy/{client,manager,technician,director}/` |
| 0.2 | Add `.env.example` and typed env validation. | `.env.example`, `lib/env.ts` (Zod) |
| 0.3 | Port the design system: merge the 4 `index.css` files into one theme with shared components (Button, Panel, Badge, KPI tile, Table). | `app/globals.css`, `components/ui/*` ← `legacy/*/src/index.css` |
| 0.4 | Set up i18n with **French as default**: migrate the 4 `translations.js` files into `next-intl` message files and persist the locale. | `messages/fr.json`, `messages/en.json`, `i18n.ts`, `middleware.ts` |
| 0.5 | Provision the DB and Prisma. Write the schema for Company, User (roles: CLIENT, MANAGER, TECHNICIAN, DIRECTOR, ACCOUNTANT, ADMIN), Building, Lot, Contact, Incident, Assignment, Message, Group, Devis, DevisLine, Invoice, Reminder, Notification, Feedback, Settings and AuditLog. Use the **unified status enum** from §3.2. | `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts` (ported from the 4 `mockData.js` files) |
| 0.6 | Real authentication with Supabase Auth: sign-up, login, reset and magic link; session middleware; server-side RBAC helpers. | `lib/auth.ts`, `middleware.ts`, `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `lib/rbac.ts` |
| 0.7 | Multi-tenancy: `companyId` on all models, RLS policies, company creation at sign-up. | `prisma/schema.prisma`, `supabase/policies.sql`, `lib/tenant.ts` |
| 0.8 | File storage for photos and receipts, with signed upload URLs. Replace base64. Port the camera capture into one shared hook. | `lib/storage.ts`, `app/api/uploads/route.ts`, `hooks/useCamera.ts` ← `legacy/client/.../ReportProblem.jsx` |
| 0.9 | Port the **incident workflow** into one role-routed app, with server actions replacing every context action in §5.2: client report, manager assign, technician site report, approval, schedule, complete and invoice. **The workflow then works across roles for the first time.** | `app/(app)/incidents/*`, `app/(app)/tasks/*`, `app/(app)/approvals/*`, `lib/workflows/incident.ts` (state machine + threshold from `Settings`) |
| 0.10 | **Minimal OpenAI client** with French system prompt, plus the first real AI use: replace the fake `submitSiteReport` with an OpenAI call that turns photos and notes into a structured report and devis lines (JSON output), with the manager editing before approval. | `lib/ai/openai.ts`, `lib/ai/system-prompt.ts`, `lib/ai/site-report.ts`, `app/api/ai/site-report/route.ts` |
| 0.11 | Tests and CI: unit tests for the state machine and threshold routing, an e2e happy path (Playwright), and a GitHub Actions workflow. Deploy staging to Vercel (`cdg1`). | `tests/`, `e2e/`, `.github/workflows/ci.yml`, `vercel.json` |
| 0.12 | Monitoring: Sentry plus an audit-log writer on every mutation. | `sentry.*.config.ts`, `lib/audit.ts` |

### Phase a: AI voice assistant

| # | Step | Files |
|---|---|---|
| a.1 | Push-to-talk recording component (MediaRecorder) and upload. | `components/voice/VoiceButton.tsx` |
| a.2 | Speech-to-text endpoint (French), returning the transcript. | `app/api/voice/transcribe/route.ts`, `lib/ai/stt.ts` |
| a.3 | OpenAI TTS endpoint (streaming, French voice) and an audio player. | `app/api/voice/speak/route.ts`, `lib/voice/provider.ts` |
| a.4 | Voice command: transcript → OpenAI text agent with 3 read-only tools (list my incidents, today's schedule, unpaid invoices) → spoken answer. | `app/api/voice/command/route.ts`, `lib/ai/tools/read/*.ts` |
| a.5 | Voice write commands ("create an incident…", "schedule…") routed through the approval gate (built in g.2). | `lib/ai/tools/write/*.ts` |

### Phase b: Email management

| # | Step | Files |
|---|---|---|
| b.1 | Google OAuth connect and encrypted token storage. | `app/api/integrations/google/*`, `lib/integrations/registry.ts`, `lib/crypto.ts` |
| b.2 | Gmail inbox sync (read threads) and an inbox UI. | `lib/integrations/gmail.ts`, `app/(app)/inbox/page.tsx` |
| b.3 | Microsoft Graph (Outlook) connect and sync behind the same interface. | `app/api/integrations/microsoft/*`, `lib/integrations/outlook.ts`, `lib/email/provider.ts` |
| b.4 | AI-written email and suggested replies (OpenAI), with a send button. | `app/api/email/draft/route.ts`, `components/inbox/SuggestedReplies.tsx` |
| b.5 | Email → incident: classify incoming emails and auto-create incidents (the real "email" channel). | `lib/ai/triage.ts`, `jobs/email-ingest.ts` |
| b.6 | Automatic follow-ups: rules (e.g. no reply after N days), a scheduled job, and an AI draft that waits for approval. | `jobs/email-followups.ts`, `prisma` `FollowUpRule` |

### Phase c: Document management

| # | Step | Files |
|---|---|---|
| c.1 | Devis PDF template with French legal mentions and sequential numbering. | `lib/documents/templates/devis.tsx`, `lib/documents/pdf.ts`, `lib/documents/numbering.ts` |
| c.2 | Facture PDF template (and plan for Factur-X). | `lib/documents/templates/facture.tsx` |
| c.3 | AI contract generation from a template plus case data, with an editable preview. | `lib/documents/templates/contrat.tsx`, `app/api/documents/generate/route.ts` |
| c.4 | Documents library page (list, download, versions). | `app/(app)/documents/page.tsx`, `prisma` `Document` |
| c.5 | E-signature (Yousign): send the devis or contract, then a webhook updates the status to `client_signed`. **Replaces `simulateClientSign`.** | `lib/integrations/yousign.ts`, `app/api/webhooks/esign/route.ts` |

### Phase d: Smart automation

| # | Step | Files |
|---|---|---|
| d.1 | Generic task model, a tasks page and manual reminders. | `prisma` `Task`/`Reminder`, `app/(app)/tasks/page.tsx` |
| d.2 | Scheduled invoice reminders (days 7 and 15 from `Settings`), sent by email and WhatsApp. **Replaces the manual `sendReminder` buttons.** | `jobs/invoice-reminders.ts` |
| d.3 | AI-generated tasks: after each event (new email, site report), the OpenAI agent proposes tasks for the user to accept. | `lib/ai/suggest-tasks.ts`, `lib/automation/engine.ts` |
| d.4 | Meeting summaries: upload or record audio → STT → OpenAI summary, action items and tasks. | `lib/ai/summarize-meeting.ts`, `app/(app)/meetings/page.tsx` |
| d.5 | Proactive recommendations: a daily job that scans overdue invoices, stale incidents and idle technicians and writes recommendations to the dashboard. | `jobs/recommendations.ts`, `lib/ai/recommendations.ts` |

### Phase e: Accounting and service orders

| # | Step | Files |
|---|---|---|
| e.1 | Payments and transactions models. Mark an invoice paid; review receipts (ported from the client receipt upload). | `prisma` `Payment`/`Transaction`, `app/(app)/finance/*` |
| e.2 | Financial reporting: revenue, receivables and ageing, devis conversion rate (with charts). | `app/(app)/reports/page.tsx`, `app/api/reports/*` |
| e.3 | Generic approval-chain engine (generalise the manager/director threshold) and the `ACCOUNTANT` role. | `lib/workflows/approval-chain.ts`, `lib/rbac.ts` |
| e.4 | Service-order workflow: `draft → funds_check → accountant_review → esign (c.5) → sent`. | `lib/workflows/service-order.ts`, `app/(app)/service-orders/*` |
| e.5 | Funds check and sync with one accounting tool first (Pennylane or Qonto API), then others. | `lib/integrations/pennylane.ts` (or `qonto.ts`), `jobs/accounting-sync.ts` |
| e.6 | Accounting export (FEC/CSV) for accountants. | `app/api/reports/export/route.ts` |

### Phase f: Multimedia

| # | Step | Files |
|---|---|---|
| f.1 | Media library (MediaAsset model, storage, gallery UI). | `prisma` `MediaAsset`, `app/(app)/studio/page.tsx` |
| f.2 | AI image generation (provider API). | `app/api/media/image/generate/route.ts`, `lib/integrations/image-provider.ts` |
| f.3 | AI image editing (inpainting, enhancing site photos, before/after). | `app/api/media/image/edit/route.ts` |
| f.4 | AI video creation (Runway or HeyGen: async job + webhook). | `app/api/media/video/route.ts`, `app/api/webhooks/video/route.ts` |

### Phase g: Integrations hub (OpenAI as central brain)

| # | Step | Files |
|---|---|---|
| g.1 | Assistant chat panel with streaming OpenAI responses and conversation persistence. | `app/api/ai/chat/route.ts`, `components/assistant/AssistantPanel.tsx`, `prisma` `AiConversation`/`AiMessage` |
| g.2 | **Approval gate**: every write tool creates a pending `AiAction` that the user approves or rejects before it runs, with an audit log. | `lib/ai/approval-gate.ts`, `components/assistant/ActionApproval.tsx`, `prisma` `AiAction` |
| g.3 | Core tool set over internal data (incidents, technicians, devis, invoices, tasks). | `lib/ai/tools/*.ts`, `lib/ai/tool-registry.ts` |
| g.4 | WhatsApp Business (Meta Cloud API) inbound webhook → incident triage (**the real "whatsapp" channel and the "AI match" feature**), plus outbound messages. | `lib/integrations/whatsapp.ts`, `app/api/webhooks/whatsapp/route.ts`, `lib/ai/triage.ts` |
| g.5 | Google and Outlook calendar sync for interventions (**replaces the list-only Calendar page**). | `lib/integrations/google-calendar.ts`, `lib/integrations/outlook-calendar.ts` |
| g.6 | Integrations settings page (connect, disconnect, status) and expose Gmail, Outlook, calendar and accounting as assistant tools. | `app/(app)/settings/integrations/page.tsx` |

### Phase h: Per-worker AI agent

| # | Step | Files |
|---|---|---|
| h.1 | `AgentProfile` model and settings UI (name, tone, voice, avatar). | `prisma`, `app/(app)/settings/agent/page.tsx` |
| h.2 | Per-user system prompt and tool permissions by role. | `lib/ai/agent-context.ts` |
| h.3 | Per-user memory (facts and preferences, optional pgvector). | `lib/ai/memory.ts` |
| h.4 | Optional talking avatar (HeyGen streaming or OpenAI voice + static avatar). | `components/assistant/Avatar.tsx` |

### Phase i: Business templates

| # | Step | Files |
|---|---|---|
| i.1 | Template schema (stages, custom fields, documents, automations, prompt fragments) and the **BTP/maintenance** template extracted from the current workflow. | `templates/schema.ts`, `templates/btp.json` |
| i.2 | Immobilier template. | `templates/immobilier.json` |
| i.3 | Barber and entrepreneur templates. | `templates/barber.json`, `templates/entrepreneur.json` |
| i.4 | Onboarding wizard: pick a template, apply it, seed demo data. | `app/(app)/onboarding/page.tsx`, `lib/templates/apply.ts` |

### Phase j: Landing page

| # | Step | Files |
|---|---|---|
| j.1 | Port `Landing.jsx` to the marketing route (FR default) with SEO metadata and OpenGraph. | `app/(marketing)/page.tsx`, `app/sitemap.ts` ← `legacy/client/src/pages/Landing.jsx` |
| j.2 | Hero video component (60-second promo, autoplay muted loop, poster fallback, CDN-hosted). | `components/marketing/HeroVideo.tsx`, `public/media/` or Mux |
| j.3 | Demo video section and demo booking (Cal.com embed + lead capture). | `components/marketing/DemoVideo.tsx`, `app/(marketing)/demo/page.tsx`, `prisma` `Lead` |
| j.4 | Pricing page and Stripe subscriptions (checkout, customer portal, webhooks, plan limits). | `app/(marketing)/pricing/page.tsx`, `app/api/billing/*`, `lib/billing.ts` |
| j.5 | Legal pages: mentions légales, CGU/CGV, politique de confidentialité, cookies. | `app/(marketing)/{mentions-legales,cgu,confidentialite}/page.tsx` |

### Phase k: Dynamic dashboard

| # | Step | Files |
|---|---|---|
| k.1 | Server-side KPI aggregation per role (ported from the 4 `*DataContext` `kpis` blocks). | `app/api/dashboard/route.ts`, `app/(app)/dashboard/page.tsx` |
| k.2 | Realtime subscriptions (new incident, new message, devis approved). | `lib/realtime.ts` |
| k.3 | Priority scoring (urgency, SLA age, amount) and a "Top priorities" widget. | `lib/ai/prioritize.ts`, `components/dashboard/Priorities.tsx` |
| k.4 | Alert feed plus Web Push and email notifications. | `components/dashboard/AlertFeed.tsx`, `lib/notifications/*` |

### Phase l: Security, RGPD and backups

| # | Step | Files |
|---|---|---|
| l.1 | Security headers (CSP), rate limiting, Zod validation on every route, upload limits. | `middleware.ts`, `lib/ratelimit.ts`, `lib/validation/*` |
| l.2 | MFA for director, accountant and admin; session hardening. | `lib/auth.ts` |
| l.3 | RGPD: cookie consent, data export and deletion endpoints, retention jobs (photos, voice), geolocation consent. | `components/CookieBanner.tsx`, `app/api/gdpr/{export,delete}/route.ts`, `jobs/retention.ts` |
| l.4 | Processing register, sub-processor list and DPAs (non-code: OpenAI, Google, Microsoft, Meta, Yousign, Stripe, Supabase, Vercel). | `docs/rgpd/registre.md`, `docs/rgpd/sous-traitants.md` |
| l.5 | Backups: confirm daily backups and PITR, storage versioning, a documented restore drill. | `docs/ops/backup-restore.md` |
| l.6 | Security review and penetration-test checklist before launch. | `docs/security/checklist.md` |

---

*End of report. This audit is based on a full read of the repository at commit `f2c442f`. No code was modified.*
