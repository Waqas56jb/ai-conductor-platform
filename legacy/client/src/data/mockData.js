const techProfiles = {
  t1: {
    id: 't1',
    name: 'Marc Dupont',
    role: 'Senior technician',
    specialty: 'Plumbing & water damage',
    phone: '+33 6 12 34 56 78',
    rating: 4.9,
    jobs: 186,
    avatar:
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
  },
  t2: {
    id: 't2',
    name: 'Sophie Martin',
    role: 'Field technician',
    specialty: 'Electrical & building systems',
    phone: '+33 6 98 76 54 32',
    rating: 4.8,
    jobs: 142,
    avatar:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
  },
}

export const initialCases = [
  {
    id: 'INC-1042',
    title: 'Water leak — bathroom ceiling',
    buildingAddress: '14 Rue de Rivoli, 75001 Paris',
    city: 'Paris',
    status: 'technician_assigned',
    urgency: 'high',
    createdAt: '2026-07-28T09:20:00',
    images: [
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    ],
    technicianId: 't1',
    notes: 'AI detected likely pipe leak above bathroom.',
  },
  {
    id: 'INC-1038',
    title: 'Broken lobby light fixture',
    buildingAddress: '8 Avenue Victor Hugo, 75016 Paris',
    city: 'Paris',
    status: 'awaiting_assignment',
    urgency: 'medium',
    createdAt: '2026-07-26T14:05:00',
    images: [
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80',
    ],
    technicianId: null,
    notes: 'Waiting for manager to assign a technician.',
  },
  {
    id: 'INC-1021',
    title: 'Intercom not working',
    buildingAddress: '22 Boulevard Haussmann, 75009 Paris',
    city: 'Paris',
    status: 'invoiced',
    urgency: 'low',
    createdAt: '2026-07-12T11:40:00',
    images: [],
    technicianId: 't2',
    notes: 'Repair completed. Invoice issued.',
  },
]

export const initialMessages = {
  'INC-1042': [
    {
      id: 'm1',
      from: 'technician',
      text: 'Bonjour — I reviewed your photos. I can visit tomorrow morning.',
      at: '2026-07-28T10:15:00',
    },
    {
      id: 'm2',
      from: 'client',
      text: 'Perfect. Between 9 and 11 works for me.',
      at: '2026-07-28T10:22:00',
    },
    {
      id: 'm3',
      from: 'technician',
      text: 'Booked for 09:30. I will bring pipe sealing materials.',
      at: '2026-07-28T10:30:00',
    },
  ],
  'INC-1021': [
    {
      id: 'm4',
      from: 'technician',
      text: 'Intercom panel replaced. Please confirm it works on your side.',
      at: '2026-07-15T16:00:00',
    },
    {
      id: 'm5',
      from: 'client',
      text: 'Confirmed — thank you!',
      at: '2026-07-15T16:20:00',
    },
  ],
}

export const initialQuotations = [
  {
    id: 'DEV-220',
    caseId: 'INC-1042',
    title: 'Bathroom ceiling water damage repair',
    amount: 780,
    currency: 'EUR',
    status: 'pending_client',
    approvedByManager: true,
    fromDirector: true,
    issuedAt: '2026-07-29T08:00:00',
    lines: [
      { label: 'Leak diagnosis & materials', amount: 180 },
      { label: 'Pipe repair labor', amount: 320 },
      { label: 'Ceiling plaster & paint', amount: 280 },
    ],
  },
  {
    id: 'DEV-198',
    caseId: 'INC-1021',
    title: 'Lobby intercom replacement',
    amount: 245,
    currency: 'EUR',
    status: 'accepted',
    approvedByManager: true,
    fromDirector: true,
    issuedAt: '2026-07-13T09:30:00',
    lines: [
      { label: 'Intercom unit', amount: 140 },
      { label: 'Installation labor', amount: 105 },
    ],
  },
]

export const initialInvoices = [
  {
    id: 'FAC-088',
    caseId: 'INC-1021',
    quotationId: 'DEV-198',
    title: 'Lobby intercom replacement',
    amount: 245,
    currency: 'EUR',
    status: 'awaiting_receipt',
    issuedAt: '2026-07-16T10:00:00',
    dueAt: '2026-07-30T23:59:00',
    receiptUrl: null,
  },
  {
    id: 'FAC-071',
    caseId: 'INC-0990',
    quotationId: 'DEV-170',
    title: 'Stairwell painting touch-up',
    amount: 390,
    currency: 'EUR',
    status: 'paid',
    issuedAt: '2026-06-20T10:00:00',
    dueAt: '2026-07-04T23:59:00',
    receiptUrl:
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80',
  },
]

export { techProfiles }

export function statusLabel(status, lang = 'en') {
  const map = {
    en: {
      new: 'New',
      awaiting_assignment: 'Awaiting technician',
      technician_assigned: 'Technician assigned',
      in_progress: 'In progress',
      quotation: 'Quotation ready',
      invoiced: 'Invoiced',
      closed: 'Closed',
      pending_client: 'Awaiting your approval',
      accepted: 'Accepted',
      rejected: 'Rejected',
      awaiting_receipt: 'Awaiting payment proof',
      paid: 'Paid',
      under_review: 'Receipt under review',
    },
    fr: {
      new: 'Nouveau',
      awaiting_assignment: 'En attente de technicien',
      technician_assigned: 'Technicien assigné',
      in_progress: 'En cours',
      quotation: 'Devis prêt',
      invoiced: 'Facturé',
      closed: 'Clôturé',
      pending_client: 'En attente de votre accord',
      accepted: 'Accepté',
      rejected: 'Refusé',
      awaiting_receipt: 'Preuve de paiement attendue',
      paid: 'Payé',
      under_review: 'Reçu en vérification',
    },
  }
  return map[lang]?.[status] || status
}
