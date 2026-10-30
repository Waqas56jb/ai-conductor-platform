"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { LogOut, Plug, Sparkles, UserRound } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { LanguageSwitcher } from "./LanguageSwitcher";
import type { ShellUser } from "./types";
import { usePopover } from "./usePopover";
import styles from "./shell.module.css";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function UserMenu({ user }: { user: ShellUser }) {
  const t = useTranslations("shell");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const { open, setOpen, close, rootRef, triggerRef } = usePopover();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className={styles.popoverRoot} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.userButton}
        aria-label={t("userMenu")}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.avatar} aria-hidden="true">
          {initials(user.name)}
        </span>
        <span className={styles.userText}>
          <span className={styles.userName}>{user.name}</span>
          <span className={styles.userRole}>{user.roleLabel}</span>
        </span>
      </button>

      {open ? (
        <div className={styles.popover} role="menu" aria-label={t("userMenu")}>
          <div className={styles.popoverHead}>
            <span>
              <strong>{user.name}</strong>
              <span className={styles.userEmail}>{user.email}</span>
              <span className={styles.userEmail}>{user.companyName}</span>
            </span>
          </div>
          <div className={styles.menuLang}>
            <LanguageSwitcher />
          </div>
          <Link href="/app/profile" role="menuitem" className={styles.menuItem} onClick={close}>
            <UserRound aria-hidden="true" />
            {tn("profile")}
          </Link>
          <Link
            href="/app/settings/assistant"
            role="menuitem"
            className={styles.menuItem}
            onClick={close}
          >
            <Sparkles aria-hidden="true" />
            {tn("assistantSettings")}
          </Link>
          {user.role !== "client" ? (
            <Link
              href="/app/settings/integrations"
              role="menuitem"
              className={styles.menuItem}
              onClick={close}
            >
              <Plug aria-hidden="true" />
              {tn("integrations")}
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            onClick={() => {
              close();
              setConfirmOpen(true);
            }}
          >
            <LogOut aria-hidden="true" />
            {t("signOut")}
          </button>
        </div>
      ) : null}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t("signOutTitle")}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              {tc("cancel")}
            </Button>
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="danger">
                {t("signOut")}
              </Button>
            </form>
          </>
        }
      >
        {t("signOutText")}
      </Modal>
    </div>
  );
}
