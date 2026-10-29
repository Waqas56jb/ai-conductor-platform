"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { AssistantButton } from "@/components/assistant/AssistantButton";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { AssistantProvider } from "@/components/assistant/AssistantProvider";
import type { AssistantSettings } from "@/lib/assistant/defaults";
import type { Role } from "@/lib/auth/roles";
import type { ThemeColor } from "@/lib/db/types";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationsMenu } from "./NotificationsMenu";
import { SearchPalette } from "./SearchPalette";
import { Sidebar } from "./Sidebar";
import type { ShellNavItem, ShellNotification, ShellUser } from "./types";
import { UserMenu } from "./UserMenu";
import styles from "./shell.module.css";

const COLLAPSE_KEY = "pratonna.sidebar.collapsed";

type Props = {
  nav: ShellNavItem[];
  user: ShellUser;
  notifications: ShellNotification[];
  unreadCount: number;
  assistant: { role: Role; settings: AssistantSettings; companyTheme: ThemeColor };
  children: ReactNode;
};

export function AppShell({ nav, user, notifications, unreadCount, assistant, children }: Props) {
  const t = useTranslations("shell");
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Restore the desktop preference (storage can be unavailable: ignore).
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1");
      } catch {}
      return !value;
    });
  }

  // Navigating closes the mobile drawer.
  useEffect(() => setDrawerOpen(false), [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [drawerOpen]);

  return (
    <AssistantProvider {...assistant}>
      <div className={`${styles.shell} ${collapsed ? styles.collapsed : ""}`}>
        <a href="#main" className={styles.skip}>
          {t("skip")}
        </a>

        <Sidebar
          nav={nav}
          pathname={pathname}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          drawerOpen={drawerOpen}
          onCloseDrawer={() => setDrawerOpen(false)}
        />

        <div className={styles.column}>
          <header className={styles.topbar}>
            <button
              type="button"
              className={`${styles.iconButton} ${styles.burger}`}
              aria-label={t("openMenu")}
              aria-expanded={drawerOpen}
              aria-controls="app-sidebar"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu aria-hidden="true" />
            </button>
            <SearchPalette nav={nav} />
            <div className={styles.topActions}>
              <div className={styles.topLang}>
                <LanguageSwitcher />
              </div>
              <AssistantButton />
              <NotificationsMenu notifications={notifications} unreadCount={unreadCount} />
              <UserMenu user={user} />
            </div>
          </header>
          <main id="main" className={styles.main} tabIndex={-1}>
            {children}
          </main>
        </div>
        <AssistantPanel />
      </div>
    </AssistantProvider>
  );
}
