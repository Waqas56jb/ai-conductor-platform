import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import { requestByToken } from "@/lib/demo/booking";
import { slotLabel } from "@/lib/demo/slots";
import { transactionalEmailEnabled } from "@/lib/email/transactional";
import { cancelDemoAction, confirmDemoAction } from "./actions";
import styles from "./demo.module.css";

export const metadata: Metadata = { title: "Démo gratuite · Pratonna", robots: { index: false } };

const STATUS = {
  requested: { label: "À confirmer", tone: "warning" },
  confirmed: { label: "Confirmée", tone: "success" },
  cancelled: { label: "Annulée", tone: "neutral" },
} as const;

/** Team page behind the link of the "new demo" email: confirm or cancel. */
export default async function DemoRequestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await requestByToken(token);
  if (!r) notFound();
  const status = STATUS[r.status];
  const rows: [string, string | null][] = [
    ["E-mail", r.email],
    ["Téléphone", r.phone],
    ["Entreprise", r.company],
    ["Secteur", r.sector],
    ["Message", r.message],
    ["Provenance", [r.source, r.medium, r.campaign].filter(Boolean).join(" · ") || null],
  ];

  return (
    <main className={styles.page}>
      <Card>
        <div className={styles.head}>
          <h1>{r.name}</h1>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className={styles.slot}>Démo gratuite le {slotLabel(r.slot_start, "fr")} (heure de Paris, 30 min)</p>
        <dl className={styles.details}>
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>
        {r.status === "cancelled" ? null : (
          <div className={styles.actions}>
            {r.status === "requested" ? (
              <form action={confirmDemoAction.bind(null, token)}>
                <Button type="submit">Confirmer le rendez-vous</Button>
              </form>
            ) : null}
            <form action={cancelDemoAction.bind(null, token)}>
              <Button type="submit" variant="secondary">
                Annuler et libérer le créneau
              </Button>
            </form>
          </div>
        )}
        <p className={styles.note}>
          {transactionalEmailEnabled()
            ? "À la confirmation, le prospect reçoit un e-mail avec l’invitation à ajouter à son agenda."
            : "L’envoi d’e-mails n’est pas encore configuré : prévenez le prospect vous-même."}
        </p>
      </Card>
    </main>
  );
}
