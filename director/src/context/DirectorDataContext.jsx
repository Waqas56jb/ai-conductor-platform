import { createContext, useContext, useMemo, useState } from 'react'
import {
  directorUser,
  initialCases,
  initialInvoices,
  initialSettings,
} from '../data/mockData'

const DirectorDataContext = createContext(null)

export function DirectorDataProvider({ children }) {
  const [authed, setAuthed] = useState(false)
  const [cases, setCases] = useState(initialCases)
  const [invoices, setInvoices] = useState(initialInvoices)
  const [settings, setSettings] = useState(initialSettings)
  const user = directorUser

  const kpis = useMemo(() => {
    const ongoing = cases.filter((c) => !['closed', 'invoiced'].includes(c.status)).length
    const interventions = cases.filter((c) =>
      ['intervention_planned', 'in_progress'].includes(c.status),
    ).length
    const unpaidList = invoices.filter((i) => i.status === 'unpaid')
    const unpaid = unpaidList.length
    const remindersDue = unpaidList.filter((i) => {
      const has7 = i.reminders.some((r) => r.day === settings.reminderDay1)
      const has15 = i.reminders.some((r) => r.day === settings.reminderDay2)
      return !has7 || !has15
    }).length
    const pending = cases.filter((c) => c.status === 'devis_pending_director')
    const exposure = pending.reduce((sum, c) => sum + (c.amount || 0), 0)
    return {
      ongoing,
      interventions,
      unpaid,
      remindersDue,
      pending: pending.length,
      exposure,
    }
  }, [cases, invoices, settings])

  function login() {
    setAuthed(true)
  }
  function logout() {
    setAuthed(false)
  }

  function approveDevis(caseId) {
    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              status: 'approved_sent',
              aiReport: `${c.aiReport || ''} Director approved. Devis sent to client for e-signature.`,
            }
          : c,
      ),
    )
  }

  function rejectDevis(caseId) {
    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              status: 'site_visit',
              aiReport: 'Director rejected devis — returned for new site assessment.',
            }
          : c,
      ),
    )
  }

  function sendReminder(invoiceId, day) {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              reminders: [...inv.reminders, { day, sentAt: new Date().toISOString() }],
            }
          : inv,
      ),
    )
  }

  function saveSettings(next) {
    setSettings((prev) => ({ ...prev, ...next }))
  }

  const value = {
    authed,
    user,
    cases,
    invoices,
    settings,
    kpis,
    login,
    logout,
    approveDevis,
    rejectDevis,
    sendReminder,
    saveSettings,
  }

  return (
    <DirectorDataContext.Provider value={value}>{children}</DirectorDataContext.Provider>
  )
}

export function useDirectorData() {
  const ctx = useContext(DirectorDataContext)
  if (!ctx) throw new Error('useDirectorData must be used within DirectorDataProvider')
  return ctx
}
