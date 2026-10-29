"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Modal } from "@/components/ui";
import { NAV_ICONS } from "./navIcons";
import type { ShellNavItem } from "./types";
import styles from "./shell.module.css";

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Ctrl/⌘ K palette over the pages the user's role can open. */
export function SearchPalette({ nav }: { nav: ShellNavItem[] }) {
  const t = useTranslations("shell");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const results = useMemo(
    () => nav.filter((item) => normalize(item.label).includes(normalize(query))),
    [nav, query],
  );

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function close() {
    setOpen(false);
    setQuery("");
    setIndex(0);
  }

  function go(item: ShellNavItem | undefined) {
    if (!item) return;
    close();
    router.push(item.href);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[index]);
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.searchTrigger}
        aria-label={t("searchTitle")}
        onClick={() => setOpen(true)}
      >
        <Search aria-hidden="true" />
        <span className={styles.searchText}>{t("search")}</span>
        <kbd className={styles.kbd}>{t("searchShortcut")}</kbd>
      </button>

      <Modal
        open={open}
        onClose={close}
        title={t("searchTitle")}
        closeLabel={tc("close")}
        position="top"
      >
        <input
          className={styles.searchInput}
          type="text"
          role="searchbox"
          enterKeyHint="go"
          autoFocus
          placeholder={t("search")}
          aria-label={t("searchTitle")}
          aria-controls="search-results"
          aria-activedescendant={results[index] ? `search-${results[index].href}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={onKeyDown}
        />
        <ul id="search-results" role="listbox" className={styles.searchResults}>
          {results.length ? (
            results.map((item, i) => {
              const Icon = NAV_ICONS[item.icon];
              return (
                <li
                  key={item.href}
                  id={`search-${item.href}`}
                  role="option"
                  aria-selected={i === index}
                  className={i === index ? styles.searchActive : undefined}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => go(item)}
                >
                  <Icon aria-hidden="true" />
                  {item.label}
                </li>
              );
            })
          ) : (
            <li className={styles.searchEmpty}>{t("noResults")}</li>
          )}
        </ul>
      </Modal>
    </>
  );
}
