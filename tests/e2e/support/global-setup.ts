import { ROLES, type Role } from "../../../src/lib/auth/roles";
import {
  E2E_COMPANY,
  E2E_PASSWORD,
  adminClient,
  deleteE2EAuthUsers,
  deleteE2ECompanies,
  e2eEmail,
  saveState,
  type E2EState,
} from "./admin";

const NAMES: Record<Role, string> = {
  client: "Camille Client",
  technician: "Théo Technicien",
  manager: "Léa Gestionnaire",
  director: "Antoine Dirigeant",
  accountant: "Clara Comptable",
  admin: "Alex Admin",
};

/** Fresh, isolated test company with one confirmed account per role. */
export default async function globalSetup() {
  await deleteE2ECompanies();
  await deleteE2EAuthUsers();
  const admin = adminClient();

  const { data: company, error } = await admin
    .from("ai_conductor_companies")
    .insert({ name: E2E_COMPANY, city: "Paris" })
    .select("id")
    .single();
  if (error || !company) throw error ?? new Error("company insert failed");
  await admin
    .from("ai_conductor_settings")
    .insert({ company_id: company.id, company_name: E2E_COMPANY });

  async function createAccount(email: string, name: string, role: Role | null) {
    const { data, error: authError } = await admin.auth.admin.createUser({
      email,
      password: E2E_PASSWORD,
      email_confirm: true,
    });
    if (authError || !data.user) throw authError ?? new Error(`auth user ${email}`);
    if (!role) return { authId: data.user.id, profileId: "" };
    const { data: profile, error: profileError } = await admin
      .from("ai_conductor_users")
      .insert({
        email,
        role,
        display_name: name,
        locale: "fr",
        company_id: company!.id,
        auth_user_id: data.user.id,
      })
      .select("id")
      .single();
    if (profileError || !profile) throw profileError ?? new Error(`profile ${email}`);
    return { authId: data.user.id, profileId: profile.id as string };
  }

  const users = {} as E2EState["users"];
  for (const role of ROLES) {
    const email = e2eEmail(role);
    users[role] = { ...(await createAccount(email, NAMES[role], role)), email, name: NAMES[role] };
  }
  const orphanEmail = e2eEmail("orphan");
  const orphan = {
    authId: (await createAccount(orphanEmail, "", null)).authId,
    email: orphanEmail,
  };
  const recoveryEmail = e2eEmail("recovery");
  const recovery = {
    ...(await createAccount(recoveryEmail, "Rémi Récupération", "client")),
    email: recoveryEmail,
  };

  const client2 = {
    ...(await createAccount(e2eEmail("client2"), "Bruno Client", "client")),
    email: e2eEmail("client2"),
    name: "Bruno Client",
  };
  const technician2 = {
    ...(await createAccount(e2eEmail("technician2"), "Ines Technicienne", "technician")),
    email: e2eEmail("technician2"),
    name: "Ines Technicienne",
  };

  // Field profiles, so the assignment map has someone to show.
  await admin.from("ai_conductor_technicians").insert([
    {
      user_id: users.technician.profileId,
      company_id: company.id,
      specialty: "Plomberie",
      experience_years: 8,
      rating: 4.8,
      lat: 48.8606,
      lng: 2.3376,
      city: "Paris",
      available: true,
    },
    {
      user_id: technician2.profileId,
      company_id: company.id,
      specialty: "Électricité",
      experience_years: 4,
      rating: 4.5,
      lat: 48.8682,
      lng: 2.3488,
      city: "Paris",
      available: true,
    },
  ]);

  saveState({ companyId: company.id as string, users, orphan, recovery, client2, technician2 });
}
