import { createContext, useContext, useMemo, useState } from 'react'
import {
  APPROVAL_THRESHOLD_EUR,
  defaultProfile,
  estimateDevisFromNotes,
  initialGroupMessages,
  initialNotifications,
  initialTasks,
  peerTechnicians,
  routeForAmount,
} from '../data/mockData'

const TechDataContext = createContext(null)

export function TechDataProvider({ children }) {
  const [authed, setAuthed] = useState(false)
  const [profile, setProfile] = useState(defaultProfile)
  const [tasks, setTasks] = useState(initialTasks)
  const [groupMessages, setGroupMessages] = useState(initialGroupMessages)
  const [notifications, setNotifications] = useState(initialNotifications)

  const kpis = useMemo(() => {
    const active = tasks.filter((t) => t.stage !== 'completed').length
    const reports = tasks.filter((t) => t.aiReport).length
    const unread = notifications.filter((n) => !n.read).length
    return {
      active,
      reports,
      unread,
      hireLabel: profile.visibleToManager ? 'available' : 'hidden',
    }
  }, [tasks, notifications, profile.visibleToManager])

  function login() {
    setAuthed(true)
  }

  function logout() {
    setAuthed(false)
  }

  function registerProfile(data) {
    setProfile((prev) => ({
      ...prev,
      ...data,
      visibleToManager: true,
      hireStatus: 'available',
    }))
    setAuthed(true)
  }

  function updateProfile(data) {
    setProfile((prev) => ({ ...prev, ...data, visibleToManager: true }))
  }

  function sendGroupMessage(groupId, text) {
    const msg = {
      id: `gm-${Date.now()}`,
      fromId: profile.id,
      fromName: profile.name,
      text,
      at: new Date().toISOString(),
    }
    setGroupMessages((prev) => ({
      ...prev,
      [groupId]: [...(prev[groupId] || []), msg],
    }))
  }

  function submitSiteReport(taskId, { photos, notes }) {
    const amount = estimateDevisFromNotes(notes, photos.length)
    const approvalRoute = routeForAmount(amount)
    const summary = `On-site constat analyzed (${photos.length} photo(s)). ${notes.slice(0, 180)}${
      notes.length > 180 ? '…' : ''
    } Recommended repair scope generated automatically.`

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              photos,
              notes,
              stage: 'awaiting_approval',
              aiReport: {
                summary,
                generatedAt: new Date().toISOString(),
              },
              devis: {
                amount,
                currency: 'EUR',
                approvalRoute,
                status: 'pending_approval',
                threshold: APPROVAL_THRESHOLD_EUR,
              },
            }
          : task,
      ),
    )

    setNotifications((prev) => [
      {
        id: `n-${Date.now()}`,
        type: 'report',
        title: `AI report sent — ${taskId}`,
        body:
          approvalRoute === 'director'
            ? `Devis ${amount} EUR exceeds threshold → sent to director for approval.`
            : `Devis ${amount} EUR under threshold → sent to manager for approval.`,
        at: new Date().toISOString(),
        read: false,
        taskId,
      },
      ...prev,
    ])
  }

  /** Simulates manager/director approve → client sign → intervention assign */
  function simulateClientSignedAssignment(taskId) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              stage: 'intervention_assigned',
              assignedAfterClientSign: true,
              scheduledAt: new Date(Date.now() + 86400000).toISOString(),
              devis: task.devis
                ? { ...task.devis, status: 'client_signed' }
                : task.devis,
            }
          : task,
      ),
    )
    setNotifications((prev) => [
      {
        id: `n-${Date.now()}`,
        type: 'assignment',
        title: `Intervention assigned — ${taskId}`,
        body: 'Client signed the quotation. The task from your site photos is now assigned for intervention.',
        at: new Date().toISOString(),
        read: false,
        taskId,
      },
      ...prev,
    ])
  }

  function startWork(taskId) {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, stage: 'in_progress' } : task)),
    )
  }

  function completeWork(taskId) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              stage: 'completed',
              completedAt: new Date().toISOString(),
              devis: task.devis ? { ...task.devis, status: 'invoiced' } : task.devis,
            }
          : task,
      ),
    )
    setNotifications((prev) => [
      {
        id: `n-${Date.now()}`,
        type: 'invoice',
        title: `Invoice sent to client — ${taskId}`,
        body: 'Work marked complete. Invoice was generated automatically for the client.',
        at: new Date().toISOString(),
        read: false,
        taskId,
      },
      ...prev,
    ])
  }

  function markAllNotificationsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const value = {
    authed,
    profile,
    tasks,
    groupMessages,
    notifications,
    peerTechnicians,
    kpis,
    threshold: APPROVAL_THRESHOLD_EUR,
    login,
    logout,
    registerProfile,
    updateProfile,
    sendGroupMessage,
    submitSiteReport,
    simulateClientSignedAssignment,
    startWork,
    completeWork,
    markAllNotificationsRead,
  }

  return <TechDataContext.Provider value={value}>{children}</TechDataContext.Provider>
}

export function useTechData() {
  const ctx = useContext(TechDataContext)
  if (!ctx) throw new Error('useTechData must be used within TechDataProvider')
  return ctx
}
