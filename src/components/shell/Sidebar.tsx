"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronsLeft, X } from "lucide-react";
import { NAV_ICONS } from "./navIcons";
import type { ShellNavItem } from "./types";
import styles from "./shell.module.css";

type Props = {
  nav: ShellNavItem[];
  pathname: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
};

function isActive(href: string, pathname: string) {
  return href === "/app"
    ? pathname === "/app"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  nav,
  pathname,
  collapsed,
  onToggleCollapsed,
  drawerOpen,
  onCloseDrawer,
}: Props) {
  const t = useTranslations("shell");

  return (
    <>
      <div
        className={`${styles.scrim} ${drawerOpen ? styles.scrimOpen : ""}`}
        aria-hidden="true"
        onClick={onCloseDrawer}
      />
      <aside
        id="app-sidebar"
        className={`${styles.sidebar} ${drawerOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.sidebarTop}>
          <Link href="/app" className={styles.brand} aria-label="Pratonna">
            <span className={styles.logo} aria-hidden="true" />
            <span className={styles.brandText}>Pratonna</span>
          </Link>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.drawerClose}`}
            aria-label={t("closeMenu")}
            onClick={onCloseDrawer}
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <nav className={styles.nav} aria-label={t("mainNav")}>
          <ul>
            {nav.map((item) => {
              const Icon = NAV_ICONS[item.icon];
              const active = isActive(item.href, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`${styles.navLink} ${active ? styles.navActive : ""}`}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon aria-hidden="true" />
                    <span className={styles.navLabel}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          type="button"
          className={styles.collapseButton}
          onClick={onToggleCollapsed}
          aria-label={collapsed ? t("expand") : t("collapse")}
          aria-pressed={collapsed}
        >
          <ChevronsLeft aria-hidden="true" />
          <span className={styles.navLabel}>{t("collapse")}</span>
        </button>
      </aside>
    </>
  );
}
