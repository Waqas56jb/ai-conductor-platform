import type { NavIcon } from "@/lib/navigation";

/** Serializable shapes passed from the server layout to the client shell. */
export type ShellNavItem = { href: string; label: string; icon: NavIcon };

export type ShellUser = {
  name: string;
  email: string;
  roleLabel: string;
  companyName: string;
};

export type ShellNotification = {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
};
