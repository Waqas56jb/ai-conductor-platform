# Pratonna

AI-assisted operations platform for French SMEs in real estate (immobilier), property management (syndic) and construction (BTP). The first workflow is building repair: a client reports an incident with a photo, a manager assigns technicians, AI drafts the site report and quote (devis), the manager or director approves it, the client signs, and the job is scheduled, invoiced and followed up.

## Status

Rebuild in progress, phase by phase (see [PRATONNA_AUDIT.md](PRATONNA_AUDIT.md)).

- **Phase 1 — done:** design system, French/English (French default), Supabase Auth (sign-up with company creation, login, password reset, email confirmation), roles, multi-company data isolation, app shell.
- **Phase 2 — done:** the repair workflow end to end, one app for every role (client, technician, manager, director): report with photos, triage, technician map and assignment, AI-drafted devis, threshold-based approval, client signature, calendar, intervention, invoice, receipt, payment, reminders, realtime chats and notifications.
- **Phase 3 — done:** AI text assistant (`/app/assistant`) for every role. It answers from real data through read tools that run as the user (RLS), and turns every change it suggests into a proposal the user approves or rejects; approved proposals run through the same workflow actions as the panels and are audited. Each user sets the assistant's name, tone, language and personal instructions.
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
- Reminders: Vercel Cron calls `/api/cron/reminders` every 15 minutes with `CRON_SECRET`; web push uses the VAPID pair (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).
- Brand assets are generated: `pnpm brand:avatar` (assistant avatar heads, landing portrait) and `node scripts/brand/icons.mjs` (PWA icons).
- To test a deployment instead of the local dev server: `E2E_BASE_URL=https://pratonna-app.vercel.app pnpm test:e2e`.

## Roles

| Role         | Access (phase 2)                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| `client`     | Own cases (report, track, chat), quotes (accept / decline), invoices (receipt upload), support               |
| `technician` | Assigned tasks (photos, AI report and devis, start / complete), calendar, team chats, directory, geolocation |
| `manager`    | All cases, technician map and assignment, approvals below the threshold, calendar, invoices and reminders    |
| `director`   | Everything a manager does, approvals at or above the threshold, workflow settings, company and team          |
| `admin`      | Same as director                                                                                             |
| `accountant` | Cases (read), invoices, payments                                                                             |

Sign-up creates a company and its director account. Every page checks the role on the server. Every status change goes through one state machine ([src/lib/workflows/incident.ts](src/lib/workflows/incident.ts)). The database enforces company isolation with row-level security.
