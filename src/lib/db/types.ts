// Hand-maintained types for the ai_conductor_* tables the app reads/writes.
// Keep in sync with db/migrations. Each phase adds the tables it uses.
import type { Role } from "@/lib/auth/roles";

type Timestamps = { created_at: string; updated_at: string };

export type CompanyRow = Timestamps & {
  id: string;
  name: string;
  legal_form: string | null;
  siret: string | null;
  vat_number: string | null;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  phone: string | null;
  email: string | null;
  template_key: "btp" | "immobilier" | "barber" | "entrepreneur";
};

export type UserRow = Timestamps & {
  id: string;
  email: string;
  role: Role;
  display_name: string;
  phone: string | null;
  photo_url: string | null;
  locale: "fr" | "en";
  active: boolean;
  company_id: string;
  auth_user_id: string | null;
  last_login_at: string | null;
};

export type SettingsRow = {
  id: string;
  company_id: string;
  company_name: string | null;
  approval_threshold_eur: number;
  reminder_day1: number;
  reminder_day2: number;
  ai_pricing_note: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type NotificationRow = {
  id: string;
  company_id: string;
  user_id: string;
  role: string | null;
  type: string | null;
  title: string;
  body: string | null;
  read: boolean;
  incident_id: string | null;
  task_id: string | null;
  quotation_id: string | null;
  invoice_id: string | null;
  created_at: string;
};

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      ai_conductor_companies: Table<CompanyRow, Partial<CompanyRow> & Pick<CompanyRow, "name">>;
      ai_conductor_users: Table<
        UserRow & { password_hash: string | null },
        Partial<UserRow> & Pick<UserRow, "email" | "role" | "company_id">
      >;
      ai_conductor_directors: Table<
        { user_id: string; company_id: string; title: string | null } & Timestamps,
        { user_id: string; company_id: string; title?: string | null }
      >;
      ai_conductor_settings: Table<
        SettingsRow,
        Partial<SettingsRow> & Pick<SettingsRow, "company_id">
      >;
      ai_conductor_notifications: Table<
        NotificationRow,
        Partial<NotificationRow> & Pick<NotificationRow, "company_id" | "user_id" | "title">
      >;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
