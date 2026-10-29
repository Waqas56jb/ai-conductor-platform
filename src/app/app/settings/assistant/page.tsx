import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AssistantSettingsForm } from "@/components/assistant/AssistantSettingsForm";
import { MemoryList } from "@/components/assistant/MemoryList";
import { Card } from "@/components/ui";
import { listMemories } from "@/lib/ai/assistant/session";
import { COMPANY_ADMIN_ROLES, hasRole } from "@/lib/auth/roles";
import { requireProfile } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("assistantSettings"))("title") };
}

/** Each user's own assistant: look, voice, tone, colour, and what she remembers. */
export default async function AssistantSettingsPage() {
  const profile = await requireProfile();
  const t = await getTranslations("assistantSettings");
  const memories = await listMemories();

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
      </div>
      <AssistantSettingsForm canSetCompanyTheme={hasRole(profile.role, COMPANY_ADMIN_ROLES)} />
      <Card title={t("memory.title")} description={t("memory.description")}>
        <MemoryList
          memories={memories.map((m) => ({
            id: m.id,
            kind: m.kind,
            content: m.content,
            approved: m.approved,
            source: m.source,
          }))}
        />
      </Card>
    </div>
  );
}
