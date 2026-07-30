export const APPROVAL_THRESHOLD_EUR = 1000

export const peerTechnicians = {
  t2: {
    id: 't2',
    name: 'Sophie Martin',
    photo:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    specialty: 'Electrical',
  },
  t3: {
    id: 't3',
    name: 'Karim Benali',
    photo:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    specialty: 'Painting & finishes',
  },
}

export const defaultProfile = {
  id: 't1',
  name: 'Marc Dupont',
  email: 'marc.dupont@pratonna.tech',
  age: 34,
  experienceYears: 9,
  specialty: 'Plumbing & water damage',
  phone: '+33 6 12 34 56 78',
  bio: 'Field technician specialized in water damage and building repairs.',
  photo:
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
  location: {
    lat: 48.8566,
    lng: 2.3522,
    address: 'Paris, France',
    city: 'Paris',
    country: 'France',
  },
  hireStatus: 'available',
  visibleToManager: true,
  rating: 4.9,
  jobsCompleted: 186,
}

export const initialTasks = [
  {
    id: 'TASK-540',
    caseId: 'INC-1042',
    title: 'Water leak — bathroom ceiling',
    buildingAddress: '14 Rue de Rivoli, 75001 Paris',
    city: 'Paris',
    lat: 48.8606,
    lng: 2.3376,
    stage: 'site_visit',
    // site_visit → report_sent → awaiting_approval → awaiting_client_sign → intervention_assigned → in_progress → completed
    hiredTechIds: ['t1', 't2'],
    groupId: 'GRP-540',
    urgency: 'high',
    notes: '',
    photos: [],
    aiReport: null,
    devis: null,
    assignedAfterClientSign: false,
    createdAt: '2026-07-28T09:20:00',
  },
  {
    id: 'TASK-531',
    caseId: 'INC-1031',
    title: 'Stairwell handrail loose',
    buildingAddress: '8 Avenue Victor Hugo, 75016 Paris',
    city: 'Paris',
    lat: 48.8698,
    lng: 2.2885,
    stage: 'intervention_assigned',
    hiredTechIds: ['t1', 't3'],
    groupId: 'GRP-531',
    urgency: 'medium',
    notes: 'Initial visit done. Client signed devis. Intervention scheduled.',
    photos: [
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80',
    ],
    aiReport: {
      summary: 'Loose handrail bolts on floors 2–3. Replace anchors and tighten assembly.',
      generatedAt: '2026-07-20T11:00:00',
    },
    devis: {
      amount: 420,
      currency: 'EUR',
      approvalRoute: 'manager',
      status: 'client_signed',
    },
    assignedAfterClientSign: true,
    scheduledAt: '2026-07-31T10:00:00',
    createdAt: '2026-07-18T14:05:00',
  },
  {
    id: 'TASK-512',
    caseId: 'INC-1010',
    title: 'Lobby intercom replacement',
    buildingAddress: '22 Boulevard Haussmann, 75009 Paris',
    city: 'Paris',
    lat: 48.8738,
    lng: 2.3321,
    stage: 'completed',
    hiredTechIds: ['t1'],
    groupId: 'GRP-512',
    urgency: 'low',
    notes: 'Unit replaced and tested.',
    photos: [],
    aiReport: {
      summary: 'Defective intercom panel. Replace unit and reconnect wiring.',
      generatedAt: '2026-07-10T09:00:00',
    },
    devis: {
      amount: 245,
      currency: 'EUR',
      approvalRoute: 'manager',
      status: 'invoiced',
    },
    assignedAfterClientSign: true,
    completedAt: '2026-07-15T16:00:00',
    createdAt: '2026-07-08T11:40:00',
  },
]

export const initialGroupMessages = {
  'GRP-540': [
    {
      id: 'gm1',
      fromId: 't2',
      fromName: 'Sophie Martin',
      text: 'Manager hired us for this water-damage case. I can cover electrical checks.',
      at: '2026-07-28T09:40:00',
    },
    {
      id: 'gm2',
      fromId: 'manager',
      fromName: 'Manager',
      text: 'Group created automatically. Please do the site visit and submit photos + constat.',
      at: '2026-07-28T09:42:00',
    },
  ],
  'GRP-531': [
    {
      id: 'gm3',
      fromId: 'manager',
      fromName: 'Manager',
      text: 'Client signed the devis. Intervention is assigned to this group.',
      at: '2026-07-29T08:10:00',
    },
  ],
  'GRP-512': [],
}

export const initialNotifications = [
  {
    id: 'n1',
    type: 'hire',
    title: 'Hired for TASK-540',
    body: 'Manager selected you on the map. Task group chat is ready.',
    at: '2026-07-28T09:35:00',
    read: false,
    taskId: 'TASK-540',
  },
  {
    id: 'n2',
    type: 'assignment',
    title: 'Intervention assigned — TASK-531',
    body: 'Client signed the quotation. Your site photos led to this approved devis. Intervention is planned.',
    at: '2026-07-29T08:05:00',
    read: false,
    taskId: 'TASK-531',
  },
]

export function routeForAmount(amount) {
  return amount >= APPROVAL_THRESHOLD_EUR ? 'director' : 'manager'
}

export function estimateDevisFromNotes(notes, photoCount) {
  const base = 180 + photoCount * 40
  const lengthBonus = Math.min(600, (notes || '').length * 2)
  const amount = Math.round((base + lengthBonus) / 10) * 10
  return Math.max(220, amount)
}
