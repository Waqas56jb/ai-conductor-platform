#!/usr/bin/env node
// Demo data for local development and demos (ported from the legacy mock data).
//
//   pnpm db:seed
//
// Creates (or recreates) the company "Pratonna Démo" with one account per role
// and cases at every stage of the workflow. Accounts use the reserved domain
// pratonna-demo.test (no email is ever sent). Password: SEED_PASSWORD or the
// default below. Only this demo company is touched.

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const COMPANY = "Pratonna Démo";
const DOMAIN = "pratonna-demo.test";
const PASSWORD = process.env.SEED_PASSWORD || "Demo-Pratonna-2026";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (see .env.example).",
  );
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const check = (label, { error, data }) => {
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};

const PEOPLE = [
  { key: "director", role: "director", name: "Antoine Lefèvre", phone: "+33 6 10 20 30 40" },
  { key: "manager", role: "manager", name: "Léa Bernard", phone: "+33 6 22 33 44 55" },
  { key: "accountant", role: "accountant", name: "Clara Moreau", phone: "+33 6 33 44 55 66" },
  { key: "admin", role: "admin", name: "Alex Admin", phone: null },
  {
    key: "marc",
    role: "technician",
    name: "Marc Dupont",
    phone: "+33 6 12 34 56 78",
    tech: {
      specialty: "Plomberie & dégâts des eaux",
      experience_years: 9,
      rating: 4.9,
      jobs_completed: 186,
      lat: 48.8606,
      lng: 2.3376,
      city: "Paris",
      available: true,
    },
  },
  {
    key: "sophie",
    role: "technician",
    name: "Sophie Martin",
    phone: "+33 6 98 76 54 32",
    tech: {
      specialty: "Électricité",
      experience_years: 7,
      rating: 4.8,
      jobs_completed: 142,
      lat: 48.8682,
      lng: 2.3488,
      city: "Paris",
      available: true,
    },
  },
  {
    key: "karim",
    role: "technician",
    name: "Karim Benali",
    phone: "+33 6 45 67 89 01",
    tech: {
      specialty: "Peinture & finitions",
      experience_years: 11,
      rating: 4.7,
      jobs_completed: 203,
      lat: 48.853,
      lng: 2.3499,
      city: "Paris",
      available: true,
    },
  },
  {
    key: "emma",
    role: "technician",
    name: "Emma Rousseau",
    phone: "+33 6 56 78 90 12",
    tech: {
      specialty: "CVC (chauffage, ventilation)",
      experience_years: 6,
      rating: 4.6,
      jobs_completed: 97,
      lat: 48.874,
      lng: 2.32,
      city: "Paris",
      available: false,
    },
  },
  {
    key: "camille",
    role: "client",
    name: "Camille Moreau",
    phone: "+33 6 45 12 98 70",
    client: {
      address: "14 Rue de Rivoli",
      city: "Paris",
      country: "France",
      lat: 48.8556,
      lng: 2.3597,
    },
  },
  {
    key: "syndic",
    role: "client",
    name: "Conseil syndical Vendôme",
    phone: "+33 1 42 60 00 00",
    client: {
      address: "5 Place Vendôme",
      city: "Paris",
      country: "France",
      lat: 48.8675,
      lng: 2.3292,
    },
  },
];

async function reset() {
  const { data: old } = await db.from("ai_conductor_companies").select("id").eq("name", COMPANY);
  if (old?.length)
    check(
      "delete company",
      await db
        .from("ai_conductor_companies")
        .delete()
        .in(
          "id",
          old.map((c) => c.id),
        ),
    );
  for (let page = 1; page < 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users)
      if (u.email?.endsWith(`@${DOMAIN}`)) await db.auth.admin.deleteUser(u.id);
    if (data.users.length < 200) break;
  }
}

/** Random global key; the human number goes in `reference` (see migration 0008). */
const uniqueId = (prefix) =>
  `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

const days = (n, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const cents = (n) => Math.round(n * 100) / 100;
const totals = (lines, rate) => {
  const subtotal_ht = cents(lines.reduce((s, l) => s + cents(l.quantity * l.unit_price_ht), 0));
  const tax_amount = cents((subtotal_ht * rate) / 100);
  return { subtotal_ht, tax_amount, total_ttc: cents(subtotal_ht + tax_amount) };
};

async function main() {
  await reset();
  const company = check(
    "company",
    await db
      .from("ai_conductor_companies")
      .insert({
        name: COMPANY,
        legal_form: "SAS",
        city: "Paris",
        address: "8 Avenue Victor Hugo",
        postal_code: "75016",
        template_key: "immobilier",
      })
      .select("id")
      .single(),
  );
  const cid = company.id;
  check(
    "settings",
    await db.from("ai_conductor_settings").insert({
      company_id: cid,
      company_name: COMPANY,
      approval_threshold_eur: 1000,
      reminder_day1: 7,
      reminder_day2: 15,
      ai_pricing_note: "Main-d’œuvre 55 € HT/h, déplacement Paris 35 € HT.",
    }),
  );

  const ids = {};
  for (const p of PEOPLE) {
    const email = `${p.key}@${DOMAIN}`;
    const auth = check(
      `auth ${email}`,
      await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true }),
    );
    const profile = check(
      `profile ${email}`,
      await db
        .from("ai_conductor_users")
        .insert({
          email,
          role: p.role,
          display_name: p.name,
          phone: p.phone,
          locale: "fr",
          company_id: cid,
          auth_user_id: auth.user.id,
        })
        .select("id")
        .single(),
    );
    ids[p.key] = profile.id;
    if (p.tech)
      check(
        `tech ${email}`,
        await db.from("ai_conductor_technicians").insert({
          user_id: profile.id,
          company_id: cid,
          ...p.tech,
          geolocated_at: new Date().toISOString(),
        }),
      );
    if (p.client)
      check(
        `client ${email}`,
        await db
          .from("ai_conductor_clients")
          .insert({ user_id: profile.id, company_id: cid, ...p.client }),
      );
    if (p.role === "manager")
      check(
        "manager ext",
        await db.from("ai_conductor_managers").insert({ user_id: profile.id, company_id: cid }),
      );
    if (p.role === "director")
      check(
        "director ext",
        await db.from("ai_conductor_directors").insert({ user_id: profile.id, company_id: cid }),
      );
  }

  const ref = async (kind, prefix) => {
    const n = check(
      `counter ${kind}`,
      await db.rpc("ai_conductor_next_number", { company: cid, counter_kind: kind }),
    );
    return `${prefix}-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;
  };

  // Cases at every stage, from the legacy manager mock data.
  const cases = [
    {
      title: "Fuite d’eau — plafond de la salle de bain",
      status: "awaiting_assignment",
      urgency: "high",
      client: "camille",
      address: "14 Rue de Rivoli 75004 Paris",
      unit: "Apt 3B",
      lat: 48.8556,
      lng: 2.3597,
      created: -2,
      description:
        "Une tache d’humidité s’étend au plafond de la salle de bain depuis hier soir, avec des gouttes au niveau du luminaire.",
    },
    {
      title: "Interphone hors service dans le hall",
      status: "new",
      channel: "email",
      complainant: "Jean Petit",
      address: "22 Boulevard Haussmann 75009 Paris",
      unit: "Hall",
      lat: 48.8738,
      lng: 2.3321,
      created: 0,
      description: "Les résidents ne peuvent plus ouvrir la porte à distance.",
    },
    {
      title: "Main courante descellée dans l’escalier",
      status: "devis_pending_manager",
      urgency: "medium",
      client: "camille",
      address: "8 Avenue Victor Hugo 75016 Paris",
      unit: "Escalier, étages 2-3",
      lat: 48.8698,
      lng: 2.2885,
      techs: ["marc", "karim"],
      created: -5,
      quote: {
        title: "Refixation de la main courante",
        summary:
          "Les fixations de la main courante sont desserrées aux étages 2 et 3. Remplacement des chevilles et serrage complet, avec contrôle de sécurité.",
        diagnosis: "Chevilles d’origine fatiguées ; aucun dommage au garde-corps.",
        rate: 10,
        lines: [
          { label: "Chevilles et boulonnerie inox", quantity: 1, unit_price_ht: 90 },
          { label: "Main-d’œuvre (h)", quantity: 6, unit_price_ht: 55 },
        ],
      },
    },
    {
      title: "Rupture de canalisation au sous-sol",
      status: "devis_pending_director",
      urgency: "high",
      client: "syndic",
      address: "5 Place Vendôme 75001 Paris",
      unit: "Sous-sol",
      lat: 48.8675,
      lng: 2.3292,
      techs: ["marc", "sophie"],
      created: -4,
      quote: {
        title: "Remplacement de la canalisation principale",
        summary:
          "Rupture de la canalisation principale au sous-sol. Isolation d’urgence effectuée ; remplacement complet recommandé.",
        diagnosis: "Corrosion avancée du tronçon en acier galvanisé.",
        rate: 10,
        lines: [
          { label: "Fournitures canalisation PER", quantity: 1, unit_price_ht: 980 },
          { label: "Main-d’œuvre d’urgence (h)", quantity: 16, unit_price_ht: 55 },
          { label: "Nettoyage et assèchement", quantity: 1, unit_price_ht: 520 },
        ],
      },
    },
    {
      title: "Luminaire du hall fissuré",
      status: "intervention_planned",
      urgency: "low",
      client: "camille",
      address: "3 Rue du Bac 75007 Paris",
      unit: "Hall",
      lat: 48.8555,
      lng: 2.3305,
      techs: ["sophie"],
      created: -9,
      schedule: 1,
      quote: {
        title: "Remplacement du luminaire du hall",
        summary: "Le luminaire est fissuré ; remplacement à l’identique.",
        diagnosis: "Choc mécanique.",
        rate: 20,
        signed: true,
        lines: [
          { label: "Luminaire LED étanche", quantity: 1, unit_price_ht: 95 },
          { label: "Pose et raccordement", quantity: 1, unit_price_ht: 55 },
        ],
      },
    },
    {
      title: "Remplacement de la platine d’interphone",
      status: "invoiced",
      urgency: "medium",
      client: "syndic",
      address: "22 Boulevard Haussmann 75009 Paris",
      unit: "Hall",
      lat: 48.8738,
      lng: 2.3321,
      techs: ["sophie"],
      created: -20,
      schedule: -14,
      invoice: { paid: false, issued: -12 },
      quote: {
        title: "Platine d’interphone",
        summary: "Platine défectueuse remplacée.",
        diagnosis: "Carte électronique hors d’usage.",
        rate: 20,
        signed: true,
        lines: [
          { label: "Platine audio 2 fils", quantity: 1, unit_price_ht: 140 },
          { label: "Installation", quantity: 1, unit_price_ht: 64.17 },
        ],
      },
    },
    {
      title: "Réparation de la serrure de la porte d’entrée",
      status: "closed",
      urgency: "medium",
      client: "camille",
      address: "14 Rue de Rivoli 75004 Paris",
      unit: "Porte d’entrée",
      lat: 48.8556,
      lng: 2.3597,
      techs: ["karim"],
      created: -40,
      schedule: -33,
      invoice: { paid: true, issued: -32 },
      quote: {
        title: "Serrure trois points",
        summary: "Serrure grippée remplacée.",
        diagnosis: "Usure du cylindre.",
        rate: 20,
        signed: true,
        lines: [
          { label: "Cylindre de sécurité", quantity: 1, unit_price_ht: 78.33 },
          { label: "Main-d’œuvre", quantity: 1, unit_price_ht: 55 },
        ],
      },
    },
  ];

  for (const c of cases) {
    const id = uniqueId("INC");
    const reference = await ref("incident", "INC");
    const techIds = (c.techs ?? []).map((k) => ids[k]);
    const groupId = techIds.length ? `GRP-${id}` : null;
    const created = days(c.created, 10);
    check(
      `incident ${id}`,
      await db.from("ai_conductor_incidents").insert({
        id,
        reference,
        company_id: cid,
        title: c.title,
        description: c.description ?? "",
        channel: c.channel ?? "app",
        status: c.status,
        urgency: c.urgency ?? null,
        client_id: c.client ? ids[c.client] : null,
        complainant_name:
          c.complainant ?? (c.client ? PEOPLE.find((p) => p.key === c.client).name : null),
        manager_id: c.status === "new" ? null : ids.manager,
        building_address: c.address,
        unit_label: c.unit,
        city: "Paris",
        lat: c.lat,
        lng: c.lng,
        photos: [],
        hired_tech_ids: techIds,
        created_at: created,
        closed_at: c.status === "closed" ? days(c.created + 10) : null,
      }),
    );

    if (groupId) {
      check(
        "group",
        await db.from("ai_conductor_task_groups").insert({
          id: groupId,
          company_id: cid,
          incident_id: id,
          member_ids: techIds,
          created_by: ids.manager,
        }),
      );
      check(
        "group link",
        await db.from("ai_conductor_incidents").update({ group_id: groupId }).eq("id", id),
      );
      check(
        "group msg",
        await db.from("ai_conductor_group_messages").insert({
          company_id: cid,
          group_id: groupId,
          from_id: ids.manager,
          from_name: "Léa Bernard",
          from_role: "manager",
          text: "Équipe constituée. Merci d’organiser la visite et d’envoyer le constat.",
        }),
      );
    }
    if (c.client) {
      check(
        "case msg",
        await db.from("ai_conductor_incident_messages").insert({
          company_id: cid,
          incident_id: id,
          from_id: ids[c.client],
          from_name: PEOPLE.find((p) => p.key === c.client).name,
          from_role: "client",
          text: "Bonjour, je reste disponible pour donner accès au logement.",
        }),
      );
    }

    if (c.quote) {
      const qid = uniqueId("DEV");
      const qref = await ref("devis", "DEV");
      const tt = totals(c.quote.lines, c.quote.rate);
      const route = tt.total_ttc >= 1000 ? "director" : "manager";
      const qStatus =
        c.status === "devis_pending_manager"
          ? "pending_manager"
          : c.status === "devis_pending_director"
            ? "pending_director"
            : "accepted";
      check(
        `quote ${qref}`,
        await db.from("ai_conductor_quotations").insert({
          id: qid,
          reference: qref,
          company_id: cid,
          incident_id: id,
          client_id: c.client ? ids[c.client] : null,
          tech_ids: techIds,
          created_by: techIds[0],
          created_by_role: "technician",
          title: c.quote.title,
          summary: c.quote.summary,
          diagnosis: c.quote.diagnosis,
          line_items: c.quote.lines,
          tax_rate: c.quote.rate,
          ...tt,
          approval_route: route,
          status: qStatus,
          threshold_used: 1000,
          signed_at: c.quote.signed ? days(c.created + 2) : null,
        }),
      );
      let interventionId = null;
      if (c.schedule !== undefined) {
        interventionId = `INT-${id}`;
        check(
          "intervention",
          await db.from("ai_conductor_interventions").insert({
            id: interventionId,
            company_id: cid,
            incident_id: id,
            quotation_id: qid,
            client_id: c.client ? ids[c.client] : null,
            manager_id: ids.manager,
            tech_ids: techIds,
            scheduled_at: days(c.schedule, 10),
            status: c.status === "intervention_planned" ? "planned" : "completed",
            building_address: c.address,
          }),
        );
      }
      let invoiceId = null;
      if (c.invoice) {
        invoiceId = uniqueId("FAC");
        const fref = await ref("facture", "FAC");
        check(
          "invoice",
          await db.from("ai_conductor_invoices").insert({
            id: invoiceId,
            reference: fref,
            company_id: cid,
            incident_id: id,
            quotation_id: qid,
            client_id: c.client ? ids[c.client] : null,
            title: c.quote.title,
            amount: tt.total_ttc,
            status: c.invoice.paid ? "paid" : "unpaid",
            issued_at: days(c.invoice.issued),
            due_at: days(c.invoice.issued + 30),
            paid_at: c.invoice.paid ? days(c.invoice.issued + 5) : null,
            reminders: [],
          }),
        );
      }
      check(
        "incident links",
        await db
          .from("ai_conductor_incidents")
          .update({
            quotation_id: qid,
            intervention_id: interventionId,
            invoice_id: invoiceId,
            ai_summary: c.quote.summary,
          })
          .eq("id", id),
      );
    }
  }

  check(
    "notifications",
    await db.from("ai_conductor_notifications").insert([
      {
        company_id: cid,
        user_id: ids.manager,
        type: "incident",
        title: "Nouveau dossier à assigner",
        body: "Fuite d’eau — plafond de la salle de bain",
      },
      {
        company_id: cid,
        user_id: ids.director,
        type: "quotation",
        title: "Devis à valider (au-delà du seuil)",
        body: "Rupture de canalisation au sous-sol",
      },
      {
        company_id: cid,
        user_id: ids.marc,
        type: "assignment",
        title: "Nouvelle mission",
        body: "Main courante descellée dans l’escalier",
      },
    ]),
  );

  console.log(`✔ Seeded "${COMPANY}": ${PEOPLE.length} accounts, ${cases.length} cases.`);
  console.log(
    `  Sign in with <role>@${DOMAIN} (director, manager, accountant, admin, marc, sophie, karim, emma, camille, syndic)`,
  );
  console.log(`  Password: ${process.env.SEED_PASSWORD ? "(SEED_PASSWORD)" : PASSWORD}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
