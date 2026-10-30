import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LiveRefresh } from "@/components/cases/LiveRefresh";
import { TaskBoard, type TaskItem } from "@/components/tasks/TaskBoard";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("tasks"))("title") };
}

/** The team's tasks: to do, in progress, done; mine or everyone's. */
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const profile = await requireRole(["technician", "manager", "director", "accountant", "admin"]);
  const { all } = await searchParams;
  const t = await getTranslations("tasks");
  const supabase = await createClient();
  let query = supabase
    .from("ai_conductor_team_tasks")
    .select(
      "id, title, description, status, priority, due_at, assignee_id, incident_id, source, created_by",
    )
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(300);
  if (!all) query = query.or(`assignee_id.eq.${profile.id},created_by.eq.${profile.id}`);
  const [{ data }, { data: team }] = await Promise.all([
    query,
    supabase
      .from("ai_conductor_users")
      .select("id, display_name, email")
      .neq("role", "client")
      .eq("active", true)
      .order("display_name"),
  ]);
  const members = (team ?? []).map((m) => ({ id: m.id, name: m.display_name || m.email }));
  const names = new Map(members.map((m) => [m.id, m.name]));
  const tasks: TaskItem[] = (data ?? []).map((x) => ({
    id: x.id,
    title: x.title,
    description: x.description,
    status: x.status,
    priority: x.priority,
    dueAt: x.due_at,
    assignee: x.assignee_id ? (names.get(x.assignee_id) ?? null) : null,
    incidentId: x.incident_id,
    source: x.source,
    canDelete:
      x.created_by === profile.id || ["manager", "director", "admin"].includes(profile.role),
  }));

  return (
    <div className="stack">
      <LiveRefresh channel="tasks" tables={[{ table: "ai_conductor_team_tasks" }]} />
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
      </div>
      <TaskBoard
        tasks={tasks}
        members={members}
        meId={profile.id}
        showAll={Boolean(all)}
        now={new Date().toISOString()}
      />
    </div>
  );
}
