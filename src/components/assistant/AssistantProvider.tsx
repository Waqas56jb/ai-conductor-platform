"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { themeVariables, type AssistantSettings } from "@/lib/assistant/defaults";
import type { Role } from "@/lib/auth/roles";
import type { ThemeColor } from "@/lib/db/types";

type Panel = { open: boolean; prefill: string; nonce: number };

type AssistantContext = {
  role: Role;
  settings: AssistantSettings;
  /** Applies settings immediately (header, panel, theme) while they are saved. */
  preview: (patch: Partial<AssistantSettings>) => void;
  companyTheme: ThemeColor;
  previewCompanyTheme: (color: ThemeColor) => void;
  panel: Panel;
  /** Opens the slide-over; a prefilled task starts a new conversation. */
  openPanel: (prefill?: string) => void;
  closePanel: () => void;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
};

const Context = createContext<AssistantContext | null>(null);

export function useAssistant(): AssistantContext {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useAssistant outside AssistantProvider");
  return ctx;
}

export function AssistantProvider({
  role,
  settings: saved,
  companyTheme: savedCompanyTheme,
  children,
}: {
  role: Role;
  settings: AssistantSettings;
  companyTheme: ThemeColor;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState(saved);
  const [companyTheme, setCompanyTheme] = useState(savedCompanyTheme);
  const [panel, setPanel] = useState<Panel>({ open: false, prefill: "", nonce: 0 });
  const [conversationId, setConversationId] = useState<string | null>(null);

  // A server render (after a save or a navigation) brings the stored values back.
  const savedKey = JSON.stringify(saved);
  useEffect(() => setSettings(JSON.parse(savedKey) as AssistantSettings), [savedKey]);
  useEffect(() => setCompanyTheme(savedCompanyTheme), [savedCompanyTheme]);

  // The colour lives on :root so portals (modals, toasts) follow it too.
  const theme = settings.theme_color ?? companyTheme;
  useEffect(() => {
    const root = document.documentElement.style;
    for (const [name, value] of Object.entries(themeVariables(theme)))
      root.setProperty(name, value);
  }, [theme]);

  const openPanel = useCallback((prefill?: string) => {
    if (prefill) setConversationId(null);
    setPanel((p) => ({ open: true, prefill: prefill ?? "", nonce: p.nonce + 1 }));
  }, []);
  const closePanel = useCallback(() => setPanel((p) => ({ ...p, open: false, prefill: "" })), []);

  const value = useMemo<AssistantContext>(
    () => ({
      role,
      settings,
      preview: (patch) => setSettings((s) => ({ ...s, ...patch })),
      companyTheme,
      previewCompanyTheme: setCompanyTheme,
      panel,
      openPanel,
      closePanel,
      conversationId,
      setConversationId,
    }),
    [role, settings, companyTheme, panel, openPanel, closePanel, conversationId],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
