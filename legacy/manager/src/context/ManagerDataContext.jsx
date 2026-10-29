import { createContext, useContext, useMemo, useState } from 'react'
import {
  APPROVAL_THRESHOLD_EUR,
  initialGroupChats,
  initialIncidents,
  initialInvoices,
  managerUser,
  techniciansPool,
} from '../data/mockData'

const ManagerDataContext = createContext(null)

export function ManagerDataProvider({ children }) {
  const [authed, setAuthed] = useState(false)
  const [incidents, setIncidents] = useState(initialIncidents)
  const [groupChats, setGroupChats] = useState(initialGroupChats)
  const [invoices, setInvoices] = useState(initialInvoices)
  const [technicians] = useState(techniciansPool)
  const user = managerUser

  const kpis = useMemo(() => {
    const open = incidents.filter((i) => !['closed', 'invoiced'].includes(i.status)).length
    const assign = incidents.filter((i) =>
      ['new', 'awaiting_assignment'].includes(i.status),
    ).length
    const devis = incidents.filter((i) => i.status === 'devis_pending_manager').length
    const planned = incidents.filter((i) =>
      ['intervention_planned', 'in_progress', 'client_signed'].includes(i.status),
    ).length
    const unpaid = invoices.filter((i) => i.status === 'unpaid').length
    return { open, assign, devis, planned, unpaid }
  }, [incidents, invoices])

  function login() {
    setAuthed(true)
  }
  function logout() {
    setAuthed(false)
  }

  function setUrgency(incidentId, urgency) {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? {
              ...inc,
              urgency,
              status: inc.status === 'new' ? 'awaiting_assignment' : inc.status,
            }
          : inc,
      ),
    )
  }

  function hireTechnicians(incidentId, techIds) {
    const groupId = `GRP-${incidentId.split('-')[1] || Date.now()}`
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? {
              ...inc,
              hiredTechIds: techIds,
              groupId,
              status: 'site_visit',
            }
          : inc,
      ),
    )
    setGroupChats((prev) => ({
      ...prev,
      [groupId]: [
        ...(prev[groupId] || []),
        {
          id: `g-${Date.now()}`,
          fromId: user.id,
          fromName: 'Manager',
          text: `Group created automatically. Hired: ${techIds
            .map((id) => technicians.find((t) => t.id === id)?.name || id)
            .join(', ')}. Please perform site visit (photos + constat).`,
          at: new Date().toISOString(),
        },
      ],
    }))
  }

  function sendGroupMessage(groupId, text) {
    setGroupChats((prev) => ({
      ...prev,
      [groupId]: [
        ...(prev[groupId] || []),
        {
          id: `g-${Date.now()}`,
          fromId: user.id,
          fromName: 'Manager',
          text,
          at: new Date().toISOString(),
        },
      ],
    }))
  }

  function approveDevis(incidentId) {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? {
              ...inc,
              status: 'sent_to_client',
              devis: inc.devis ? { ...inc.devis, status: 'sent_to_client' } : inc.devis,
            }
          : inc,
      ),
    )
  }

  function rejectDevis(incidentId) {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? {
              ...inc,
              status: 'site_visit',
              devis: inc.devis ? { ...inc.devis, status: 'rejected' } : inc.devis,
            }
          : inc,
      ),
    )
  }

  /** Simulate client e-signature */
  function simulateClientSign(incidentId) {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? {
              ...inc,
              status: 'client_signed',
              devis: inc.devis ? { ...inc.devis, status: 'client_signed' } : inc.devis,
            }
          : inc,
      ),
    )
  }

  function planIntervention(incidentId, scheduledAt) {
    let groupId = null
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== incidentId) return inc
        groupId = inc.groupId
        return {
          ...inc,
          status: 'intervention_planned',
          scheduledAt,
        }
      }),
    )
    if (groupId) {
      setGroupChats((prev) => ({
        ...prev,
        [groupId]: [
          ...(prev[groupId] || []),
          {
            id: `g-${Date.now()}`,
            fromId: user.id,
            fromName: 'Manager',
            text: `Intervention planned for ${new Date(scheduledAt).toLocaleString()}. Technicians notified.`,
            at: new Date().toISOString(),
          },
        ],
      }))
    }
  }

  function markInProgress(incidentId) {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === incidentId ? { ...inc, status: 'in_progress' } : inc)),
    )
  }

  function completeAndInvoice(incidentId) {
    const inc = incidents.find((i) => i.id === incidentId)
    setIncidents((prev) =>
      prev.map((item) =>
        item.id === incidentId
          ? {
              ...item,
              status: 'invoiced',
              devis: item.devis ? { ...item.devis, status: 'invoiced' } : item.devis,
            }
          : item,
      ),
    )
    if (inc?.devis) {
      const due = new Date()
      due.setDate(due.getDate() + 14)
      setInvoices((prev) => [
        {
          id: `FAC-${100 + prev.length}`,
          incidentId,
          title: inc.title,
          amount: inc.devis.amount,
          currency: inc.devis.currency,
          status: 'unpaid',
          issuedAt: new Date().toISOString(),
          dueAt: due.toISOString(),
          reminders: [],
        },
        ...prev,
      ])
    }
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

  const value = {
    authed,
    user,
    incidents,
    groupChats,
    invoices,
    technicians,
    kpis,
    threshold: APPROVAL_THRESHOLD_EUR,
    login,
    logout,
    setUrgency,
    hireTechnicians,
    sendGroupMessage,
    approveDevis,
    rejectDevis,
    simulateClientSign,
    planIntervention,
    markInProgress,
    completeAndInvoice,
    sendReminder,
  }

  return (
    <ManagerDataContext.Provider value={value}>{children}</ManagerDataContext.Provider>
  )
}

export function useManagerData() {
  const ctx = useContext(ManagerDataContext)
  if (!ctx) throw new Error('useManagerData must be used within ManagerDataProvider')
  return ctx
}
