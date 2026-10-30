# Database

Postgres on Supabase. All Pratonna tables live in `public` and are prefixed `ai_conductor_`.

> ⚠️ **The Supabase project is shared with other applications.** Never run `prisma migrate`, `prisma db push`, `supabase db reset` or any tool that manages the whole `public` schema: it would drop the other projects' tables. Use only the runner below.

## Migrations

```bash
pnpm db:status    # applied / pending
pnpm db:migrate   # apply pending migrations
```

Rules:

- One file per change: `db/migrations/NNNN_short_name.sql`, numbered in order.
- **Never edit an applied migration.** The runner stores a checksum and refuses edited files. Add a new migration instead.
- Each migration runs in a transaction. If it fails, it is rolled back.
- After every run, the runner enables RLS on every `ai_conductor_*` table, revokes everything from `anon`, removes TRUNCATE / REFERENCES / TRIGGER from `authenticated`, and revokes all `authenticated` grants on tables with no permissive policy.
- **A migration that creates a table must reset its grants explicitly** (`revoke all … from authenticated`, then grant exactly what the policies need). Supabase gives new tables ALL to `authenticated` by default; see `0005`.

### Access model

- Every business table has `company_id` and a **restrictive** `company_isolation` policy: whatever permissive policy exists, a user only ever reaches rows of their own company.
- **Permissive** policies are added per table when a feature needs client access. Without one, the table stays closed to signed-in users (server code uses the service role after its own checks).
- `ai_conductor_profile_id()`, `ai_conductor_company_id()` and `ai_conductor_role()` resolve the caller from `auth.uid()` → `ai_conductor_users.auth_user_id`.
- `password_hash` is never granted to `authenticated` (column-level grants on `ai_conductor_users`): always select explicit columns.
- **Reads** go through RLS with the user's session (per-role SELECT policies: a client sees their own cases, a technician the cases assigned to them, the office everything in the company). **Writes** go through server actions only: they check the role and the state machine, then write with the service role, guarded by `.eq("status", current)` against concurrent changes, and append to `ai_conductor_audit_log`.
- `id` is a random global key (`INC-…`, `DEV-…`, `FAC-…`); `reference` is the per-company sequential number shown to users. Invoice numbers are allocated only after the transition succeeds, so the sequence has no gaps.
- Photos and receipts live in the private buckets `ai-conductor-photos` and `ai-conductor-receipts`, served through short-lived signed URLs.
- The Supabase Auth pool is shared with other apps: an Auth account without an `ai_conductor_users` row is not a Pratonna user. **Never add triggers on `auth.users`** — they would fire for the other applications too.

Applied history is stored in `ai_conductor_schema_migrations`.

| Migration                              | What it does                                                                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0000_baseline`                        | The 18 original tables as found on 2026-10-29 (no-op on the live DB, recreates them on a new one)                                                                               |
| `0001_lockdown`                        | RLS on and REST/GraphQL grants revoked: the tables were publicly readable and writable, including `password_hash`                                                               |
| `0002_integrity`                       | Allowed-value checks, missing foreign keys, indexes, `updated_at` triggers, `auth_user_id` link to Supabase Auth, `fr` default locale                                           |
| `0003_platform`                        | New tables: audit log, contacts, documents, payments, reminders, integrations, AI conversations / messages / approval-gated actions                                             |
| `0004_tenancy`                         | `ai_conductor_companies`, `company_id` on every business table (existing rows → "Pratonna Gestion"), `accountant` role, caller helpers, company isolation + Phase 1 policies    |
| `0005_company_grants`                  | Resets the default privileges Supabase gave the new companies table                                                                                                             |
| `0006_workflow`                        | Workflow helpers, per-company counters (`ai_conductor_next_number`), case / invoice / technician columns, per-role read policies, realtime publication, private storage buckets |
| `0007_users_visibility`                | Clients no longer see the other clients of their company                                                                                                                        |
| `0008_case_reference`                  | Per-company references (`INC-2026-0001`) separate from the random global ids; required and unique per company                                                                   |
| `0009_ai_assistant`                    | Per-user agent profile; users read only their own assistant conversations, messages and proposals                                                                               |
| `0010_assistant_personalization`       | Agent profile → assistant profile (Maya, avatar, voice, tones, colour); memories (approved only reach the model); company colour                                                |
| `0011_signature_requests`              | DocuSign envelopes per document (status, events, signed PDF in the private signatures bucket); signer and office read                                                           |
| `0012_smart_notifications`             | Notification priority / source; priority rules (unapproved suggestions); reminders (scaffold table reused); web push subscriptions                                              |
| `0013_phase5_documents_tasks_meetings` | Contracts (CTR counter), team tasks, meeting summaries; email accounts stay in integrations (server-only, encrypted tokens)                                                     |
| `0014_contracts_hide_drafts`           | Clients only see contracts once sent                                                                                                                                            |

## Connection

The direct host `db.<ref>.supabase.co` is IPv6-only, so both URLs use the IPv4 pooler (see `.env.example`):

- `DATABASE_URL`: transaction mode, port 6543, for the app at runtime.
- `DIRECT_URL`: session mode, port 5432, for migrations.

Set `DATABASE_CA_CERT` to the Supabase CA file (Project Settings → Database → SSL) for verified TLS. Without it, the connection is encrypted but the server certificate is not verified.

## Known follow-ups

- **Region and isolation:** the project is in `ap-northeast-1` (Tokyo) and shared. Before launch, move to a dedicated EU project (Paris). `0000_baseline` + the runner rebuild the schema there.
- **Files in rows:** `pdf_base64` on quotations and tasks should move to Supabase Storage, referenced from `ai_conductor_documents`.
- **Auth:** the app uses Supabase Auth. The 5 pre-existing users still only have the legacy `password_hash` and no `auth_user_id`; they need a Supabase account (invite) before they can sign in to the new app.
- **Auth settings are project-wide** (shared project): email templates, SMTP, Site URL and redirect allow-list cannot be tuned for Pratonna alone. Real confirmation / reset emails need the app URL in the redirect allow-list.
