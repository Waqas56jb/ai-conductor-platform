#!/usr/bin/env node
// Versioned SQL migrations for the ai_conductor_* tables.
//
//   pnpm db:migrate   apply pending migrations from db/migrations
//   pnpm db:status    list applied / pending migrations
//
// Why not Prisma Migrate: the Supabase project's public schema is shared with
// other applications. Prisma treats unknown tables as drift and offers to reset
// the schema, which would drop them. This runner only touches ai_conductor_*.
//
// Guarantees:
// - one runner at a time (advisory lock)
// - each migration runs in its own transaction
// - an applied migration whose file changed is refused (checksum)
// - after every run, every ai_conductor_* table has RLS on and no anon grants;
//   `authenticated` keeps grants only on tables with a permissive policy, and never
//   TRUNCATE / REFERENCES / TRIGGER

import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATIONS_DIR = join(ROOT, "db", "migrations");
const LOCK_ID = 727274; // arbitrary, unique to this runner
const TABLE = "public.ai_conductor_schema_migrations";

const LOCKDOWN_SQL = `
do $$
declare t record;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname like 'ai\\_conductor\\_%'
  loop
    execute format('alter table public.%I enable row level security', t.relname);
    execute format('revoke all on table public.%I from anon', t.relname);
    execute format('revoke truncate, references, trigger on table public.%I from authenticated', t.relname);
    -- No permissive policy means no intended client access: drop every grant.
    if not exists (
      select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = t.relname and p.permissive = 'PERMISSIVE'
    ) then
      execute format('revoke all on table public.%I from authenticated', t.relname);
    end if;
  end loop;
end $$;`;

function sslConfig() {
  const caPath = process.env.DATABASE_CA_CERT;
  if (caPath) return { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true };
  console.warn(
    "⚠  DATABASE_CA_CERT not set: connection is encrypted but the server certificate is not verified.\n" +
      "   Download the CA from Supabase → Project Settings → Database → SSL and point DATABASE_CA_CERT at it.\n",
  );
  return { rejectUnauthorized: false };
}

function loadMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_[\w-]+\.sql$/.test(f))
    .sort()
    .map((file) => {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8").replace(/\r\n/g, "\n");
      return {
        version: file.slice(0, 4),
        name: file.slice(5, -4),
        sql,
        checksum: createHash("sha256").update(sql).digest("hex"),
      };
    });
}

async function main() {
  const command = process.argv[2] ?? "migrate";
  if (!["migrate", "status"].includes(command)) {
    console.error(`Unknown command "${command}". Use "migrate" or "status".`);
    process.exit(1);
  }

  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) {
    console.error("DIRECT_URL is not set (see .env.example).");
    process.exit(1);
  }

  // pg's URL parser would override the ssl object below with sslmode from the URL.
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  const client = new pg.Client({ connectionString: url.toString(), ssl: sslConfig() });
  await client.connect();

  try {
    await client.query("select pg_advisory_lock($1)", [LOCK_ID]);
    await client.query(`
      create table if not exists ${TABLE} (
        version text primary key,
        name text not null,
        checksum text not null,
        applied_at timestamptz not null default now()
      )`);

    const applied = new Map(
      (await client.query(`select version, name, checksum, applied_at from ${TABLE}`)).rows.map(
        (r) => [r.version, r],
      ),
    );
    const migrations = loadMigrations();

    for (const m of migrations) {
      const row = applied.get(m.version);
      if (row && row.checksum !== m.checksum) {
        throw new Error(
          `Migration ${m.version}_${m.name} was edited after being applied. ` +
            "Never change an applied migration — add a new one instead.",
        );
      }
    }

    if (command === "status") {
      for (const m of migrations) {
        const row = applied.get(m.version);
        console.log(
          `${row ? "✔ applied" : "• pending"}  ${m.version}_${m.name}${
            row ? `  (${row.applied_at.toISOString()})` : ""
          }`,
        );
      }
      return;
    }

    const pending = migrations.filter((m) => !applied.has(m.version));
    if (!pending.length) console.log("No pending migrations.");

    for (const m of pending) {
      process.stdout.write(`→ ${m.version}_${m.name} … `);
      await client.query("begin");
      try {
        await client.query(m.sql);
        await client.query(`insert into ${TABLE} (version, name, checksum) values ($1, $2, $3)`, [
          m.version,
          m.name,
          m.checksum,
        ]);
        await client.query("commit");
        console.log("done");
      } catch (error) {
        await client.query("rollback");
        console.log("FAILED (rolled back)");
        throw error;
      }
    }

    await client.query(LOCKDOWN_SQL);
    console.log(
      "✔ Lockdown verified: RLS on everywhere, anon fully revoked, authenticated only where a policy allows.",
    );
  } finally {
    await client.query("select pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    await client.end();
  }
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
