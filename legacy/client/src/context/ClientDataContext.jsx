import { createContext, useContext, useMemo, useState } from 'react'
import {
  initialCases,
  initialInvoices,
  initialMessages,
  initialQuotations,
  techProfiles,
} from '../data/mockData'

const ClientDataContext = createContext(null)

export function ClientDataProvider({ children }) {
  const [cases, setCases] = useState(initialCases)
  const [messages, setMessages] = useState(initialMessages)
  const [quotations, setQuotations] = useState(initialQuotations)
  const [invoices, setInvoices] = useState(initialInvoices)
  const [feedback, setFeedback] = useState([])
  const [user] = useState({
    name: 'Camille Moreau',
    email: 'camille.moreau@email.com',
    phone: '+33 6 45 12 98 70',
    address: '14 Rue de Rivoli',
    city: 'Paris',
    country: 'France',
  })

  const kpis = useMemo(() => {
    const open = cases.filter((c) => !['closed', 'invoiced'].includes(c.status)).length
    const assigned = cases.filter((c) => c.technicianId).length
    const pendingQuotes = quotations.filter((q) => q.status === 'pending_client').length
    const unpaid = invoices.filter((i) => i.status !== 'paid').length
    return { open, assigned, pendingQuotes, unpaid, total: cases.length }
  }, [cases, quotations, invoices])

  function addCase(payload) {
    const id = `INC-${1000 + cases.length + Math.floor(Math.random() * 80)}`
    const next = {
      id,
      title: payload.title || 'New building issue',
      buildingAddress: payload.buildingAddress,
      city: payload.city || '',
      status: 'awaiting_assignment',
      urgency: payload.urgency || 'medium',
      createdAt: new Date().toISOString(),
      images: payload.images || [],
      technicianId: null,
      notes: 'AI is preparing your case report for our team.',
    }
    setCases((prev) => [next, ...prev])
    setMessages((prev) => ({ ...prev, [id]: [] }))
    return next
  }

  function sendMessage(caseId, text) {
    const msg = {
      id: `m-${Date.now()}`,
      from: 'client',
      text,
      at: new Date().toISOString(),
    }
    setMessages((prev) => ({
      ...prev,
      [caseId]: [...(prev[caseId] || []), msg],
    }))
  }

  function respondQuotation(id, decision) {
    setQuotations((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, status: decision === 'accept' ? 'accepted' : 'rejected' } : q,
      ),
    )
  }

  function uploadReceipt(invoiceId, receiptUrl) {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, receiptUrl, status: 'under_review' }
          : inv,
      ),
    )
  }

  function submitFeedback(entry) {
    setFeedback((prev) => [{ id: `fb-${Date.now()}`, ...entry, at: new Date().toISOString() }, ...prev])
  }

  const value = {
    user,
    cases,
    messages,
    quotations,
    invoices,
    feedback,
    techProfiles,
    kpis,
    addCase,
    sendMessage,
    respondQuotation,
    uploadReceipt,
    submitFeedback,
  }

  return <ClientDataContext.Provider value={value}>{children}</ClientDataContext.Provider>
}

export function useClientData() {
  const ctx = useContext(ClientDataContext)
  if (!ctx) throw new Error('useClientData must be used within ClientDataProvider')
  return ctx
}
