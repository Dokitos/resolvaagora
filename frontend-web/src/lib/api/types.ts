export type Role = 'CLIENT' | 'TECHNICIAN' | 'ADMIN'
export type ServiceStatus =
  | 'DRAFT' | 'AWAITING_PAYMENT' | 'PAID' | 'IN_DISTRIBUTION'
  | 'ASSIGNED' | 'IN_TRANSIT' | 'ARRIVED' | 'IN_DIAGNOSIS'
  | 'QUOTE_SENT' | 'QUOTE_APPROVED' | 'IN_EXECUTION'
  | 'COMPLETED' | 'CANCELLED' | 'QUOTE_REJECTED' | 'EXPIRED'
export type QuoteStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
export type Specialty =
  | 'ELECTRICITY'
  | 'PLUMBING'
  | 'HVAC'
  | 'APPLIANCES'
  | 'PAINTING'
  | 'FURNITURE'
  | 'CLEANING'
  | 'LOCKSMITH'
  | 'GARDEN'
  | 'FLOORING'
  | 'TV_ANTENNA'
export type AlertLevel = 'WARNING' | 'CRITICAL'
export type SlaMetric = 'FIRST_RESPONSE' | 'ARRIVAL' | 'RESOLUTION' | 'QUOTE_EXPIRY'

export interface Address {
  id: string
  label: string
  street: string
  number: string
  floor?: string
  postalCode: string
  city: string
  district: string
  latitude?: number
  longitude?: number
  isDefault: boolean
}

export interface Client {
  id: string
  firstName: string
  lastName: string
  phone?: string
  nif?: string
}

export interface Technician {
  id: string
  firstName: string
  lastName: string
  phone: string
  status: string
  dailyServiceLimit: number
  specialties: { specialty: Specialty }[]
  coverageDistricts: { district: string }[]
}

export interface ServiceRequest {
  id: string
  specialty: Specialty
  description: string
  status: ServiceStatus
  scheduledDate?: string
  confirmedDate?: string
  displacementFee: number
  isDisplacementFeePaid: boolean
  isPriority: boolean
  isFreeVisit: boolean
  assignedAt?: string
  completedAt?: string
  createdAt: string
  client?: Client
  technician?: Technician
  address?: Address
  quote?: Quote
  photos?: ServicePhoto[]
  slaAlerts?: SlaAlert[]
  review?: Review
}

export interface Quote {
  id: string
  description: string
  laborCost: number
  materialsCost: number
  vatRate: number
  totalCost: number
  status: QuoteStatus
  expiresAt: string
  respondedAt?: string
  rejectionReason?: string
  createdAt: string
}

export interface Review {
  id: string
  rating: number
  comment?: string
  createdAt: string
}

export interface ServicePhoto {
  id: string
  type: 'PROBLEM' | 'PROOF'
  url: string
  uploadedByRole: Role
  createdAt: string
}

export interface Subscription {
  id: string
  status: string
  startsAt: string
  expiresAt: string
  freeVisitsUsed: number
  plan: SubscriptionPlan
}

export interface SubscriptionPlan {
  id: string
  name: string
  description?: string | null
  imageUrl?: string | null
  benefits?: string[]
  yearlyPrice: number
  displacementDiscountPct: number
  freeVisitsCount: number
  priorityScheduling: boolean
}

export interface SlaAlert {
  id: string
  metric: SlaMetric
  level: AlertLevel
  triggeredAt: string
  resolvedAt?: string
  serviceRequest?: ServiceRequest
}

export interface DashboardMetrics {
  today: { totalRequests: number; revenue: number }
  byStatus: { status: ServiceStatus; count: number }[]
  activeTechnicians: number
  activeAlerts: number
}

export interface AnalyticsData {
  requestsBySpecialty: { specialty: Specialty; count: number }[]
  averageRating: number
  quoteAcceptanceRate: number
  completionRate: number
}
