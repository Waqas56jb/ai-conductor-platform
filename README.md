# Pratonna

AI-assisted operations platform for French SMEs in real estate (immobilier), property management (syndic) and construction (BTP). The first workflow is building repair: a client reports an incident with a photo, a manager assigns technicians, AI drafts the site report and quote (devis), the manager or director approves it, the client signs, and the job is scheduled, invoiced and followed up.

## Status

Rebuild in progress, phase by phase (see [PRATONNA_AUDIT.md](PRATONNA_AUDIT.md)).

- **Phase 1 — done:** design system, French/English (French default), Supabase Auth (sign-up with company creation, login, password reset, email confirmation), roles, multi-company data isolation, app shell.
- **Phase 2 — done:** the repair workflow end to end, one app for every role (client, technician, manager, director): report with photos, triage, technician map and assignment, AI-drafted devis, threshold-based approval, client signature, calendar, intervention, invoice, receipt, payment, reminders, realtime chats and notifications.
- **Phase 3 — done:** AI text assistant (`/app/assistant`) for every role. It answers from real data through read tools that run as the user (RLS), and turns every change it suggests into a proposal the user approves or rejects; approved proposals run through the same workflow actions as the panels and are audited. Each user sets the assistant's name, tone, language and personal instructions.
- **Phase 4 — done:** voice agent. The mic in the assistant (panel and page) opens an OpenAI Realtime conversation over WebRTC: the browser gets a one-minute client secret from `/api/voice/session` (persona, approved memories and the role's tools set server-side; the API key never leaves the server), hears the answer in the user's voice setting, and shows the live transcript. Tool calls run on the server through `/api/voice/turn` with the same approval gate as text (writes are proposals to approve on screen). Without WebRTC, or with the voice off, it falls back to record → transcription → text assistant → speech. Provider: [src/lib/voice/provider.ts](src/lib/voice/provider.ts).
- **Phase 5 — done:** Gmail / Outlook (OAuth 2.0 code flow with state cookie, tokens encrypted with `ENCRYPTION_KEY`, inbox, read, reply / send after confirmation, assistant `list_emails` + `send_email` with approval; "Connexion non configurée" until the OAuth apps are set); invoice and contract PDFs (one renderer for devis / facture / contrat), contracts numbered `CTR-YYYY-NNNN` and signed with DocuSign; team tasks (`/app/tasks`, assistant `create_task` with approval); meeting summaries from notes or a recording (summary, decisions, action items → tasks after confirmation); dashboard recommendations.
- **Phase 6 — done:** accounting. Payments against invoices (partial or full, method, date, reference; the case closes once paid), review of the client's receipt (accept → payment, refuse with a reason sent to the client), `/app/payments`; service orders `OS-YYYY-NNNN` through a generic approval chain ([src/lib/workflows/approval-chain.ts](src/lib/workflows/approval-chain.ts)): draft → funds check (director, with collected vs committed cash) → accountant review → DocuSign signature by the director (the supplier is copied on the envelope and gets the signed order) → sent, every decision logged with its note and notified to the next role; `/app/reports` (invoiced vs collected per month, receivables ageing, quote conversion) with FEC (art. A47 A-1 LPF) and CSV exports for director / accountant / admin; Pennylane and Qonto declared behind an `AccountingProvider` interface (stubs, "Bientôt" in Intégrations).
- **Feedback round 1 — done** (Martin's handoff): human-first landing with the assistant avatar, honest "Disponible / Bientôt" chips, industry and real-screens carousels, pilot programme; the assistant on every page (header button + slide-over, streamed replies) and a "priorités du jour" welcome card; assistant personalisation (`/app/settings/assistant`: avatar, name, voice, tone, context-aware tone, workspace colour, memory & rules); DocuSign e-signature for quotes; smart inbox (urgent / important / digest, rules only applied once accepted); reminders with a cron and web push; installable PWA; confirmations before payments, reminders and deletions. Video brief: [docs/video-brief.md](docs/video-brief.md).
- `src/` is the Next.js app (the product, under `/app`).
- `db/` holds the Postgres schema as versioned SQL migrations. Read [db/README.md](db/README.md) first: the Supabase project is shared with other applications.
- `legacy/client` is the original prototype, still serving the live marketing site. The manager, technician and director prototypes were removed once ported.

## Stack

Next.js 15 (App Router, TypeScript strict), pnpm, Supabase (Auth, Postgres, Storage, Realtime), next-intl, Zod, Vitest, Playwright. AI: **OpenAI only** (text agent, Realtime voice agent, transcription, images).

## Getting started

Requires Node.js 22+ and pnpm 10.

```bash
pnpm install
cp .env.example .env          # fill in values
pnpm db:migrate               # apply pending SQL migrations
pnpm dev                      # http://localhost:3000
```

| Script            | Purpose                                                 |
| ----------------- | ------------------------------------------------------- |
| `pnpm dev`        | Start the dev server                                    |
| `pnpm build`      | Production build                                        |
| `pnpm lint`       | ESLint                                                  |
| `pnpm format`     | Format with Prettier (`format:check` to verify only)    |
| `pnpm test`       | Unit tests (Vitest)                                     |
| `pnpm test:e2e`   | Browser tests (Playwright, Chrome, 390 / 768 / 1440 px) |
| `pnpm db:status`  | List applied / pending migrations                       |
| `pnpm db:migrate` | Apply pending migrations                                |
| `pnpm db:seed`    | Recreate the "Pratonna Démo" company with demo data     |

`pnpm db:seed` creates 10 accounts `<role>@pratonna-demo.test` (password `SEED_PASSWORD`, default `Demo-Pratonna-2026`) and cases at every stage. Only that company is touched.

Environment variables are validated in [src/lib/env.ts](src/lib/env.ts). Set `SKIP_ENV_VALIDATION=1` to build without real secrets.

### Browser tests

`pnpm test:e2e` starts `pnpm dev`, creates an isolated test company with one account per role (email domain `pratonna-e2e.test`, created through the Admin API, so no emails are sent) and deletes it afterwards. The single real sign-up test (desktop only) uses an `e2e-*@example.com` address, which triggers one Supabase confirmation email to a domain with no mail server. Screenshots are written to `tests/screenshots/<phase>/` (`E2E_PHASE`). Set `E2E_PORT` when port 3000 is taken. The landing spec runs against `vite preview` on port 4173 (`LANDING_URL` to test another URL).

## Deployment

Two Vercel projects (team `us`), deployed with the Vercel CLI:

| Project            | Directory       | URL                                 |
| ------------------ | --------------- | ----------------------------------- |
| `pratonna-app`     | repo root       | https://pratonna-app.vercel.app     |
| `pratonna-landing` | `legacy/client` | https://pratonna-landing.vercel.app |

- The app's functions run in `hnd1` (Tokyo), next to the Supabase project ([vercel.json](vercel.json)).
- App environment: the variables of `.env.example` except `DATABASE_URL` / `DIRECT_URL` (only used by the migration and seed scripts). `NEXT_PUBLIC_SITE_URL` sends signed-out visitors of `/` to the landing.
- Landing environment: `VITE_APP_URL`, the app URL used by its sign-in / sign-up buttons.
- E-signature: `DOCUSIGN_*` (integration key, API user id, account id, RSA private key, base URL, Connect HMAC key). Without them, "Signer le devis" shows "Signature électronique non configurée" and is disabled. The Connect webhook is `/api/webhooks/docusign`; grant JWT consent once for the integration key.
- Email: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and `MS_CLIENT_ID` / `MS_CLIENT_SECRET` (`MS_TENANT_ID`, default `common`). Redirect URIs to register: `<NEXT_PUBLIC_APP_URL>/api/integrations/google/callback` and `<NEXT_PUBLIC_APP_URL>/api/integrations/microsoft/callback`. Scopes: Gmail `gmail.readonly` + `gmail.send` (+ `openid email`); Microsoft `offline_access openid email User.Read Mail.Read Mail.Send`.
- Accounting connectors (not implemented yet, optional): `PENNYLANE_API_KEY`, `QONTO_ORGANIZATION_SLUG`, `QONTO_SECRET_KEY`.
- Reminders: Vercel Cron calls `/api/cron/reminders` with `CRON_SECRET` (daily at 07:00 UTC on the Hobby plan; set `*/15 * * * *` in vercel.json on Pro); web push uses the VAPID pair (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).
- Brand assets are generated: `pnpm brand:avatar` (assistant avatar heads, landing portrait) and `node scripts/brand/icons.mjs` (PWA icons).
- To test a deployment instead of the local dev server: `E2E_BASE_URL=https://pratonna-app.vercel.app pnpm test:e2e`.

## Roles

| Role         | Access                                                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client`     | Own cases (report, track, chat), quotes (accept / decline), invoices (receipt upload), support                                                                        |
| `technician` | Assigned tasks (photos, AI report and devis, start / complete), calendar, team chats, directory, geolocation                                                          |
| `manager`    | All cases, technician map and assignment, approvals below the threshold, calendar, invoices, payments, drafting service orders                                        |
| `director`   | Everything a manager does, approvals at or above the threshold, funds check and signature of service orders, reports and exports, workflow settings, company and team |
| `admin`      | Same as director                                                                                                                                                      |
| `accountant` | Cases (read), invoices, payments and receipt review, accountant review of service orders, reports, FEC / CSV exports                                                  |

Sign-up creates a company and its director account. Every page checks the role on the server. Every status change goes through one state machine ([src/lib/workflows/incident.ts](src/lib/workflows/incident.ts)). The database enforces company isolation with row-level security.
