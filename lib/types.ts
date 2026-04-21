export type ClientStatus = 'active' | 'inactive' | 'pending_moderate' | 'pending_critical'
export type UserRole = 'admin' | 'superadmin'
export type DurationUnit = 'day' | 'week' | 'month' | 'year'
export type PaymentState = 'paid' | 'partial' | 'unpaid'
export type PaymentSeverity = 'none' | 'moderate' | 'critical'
export type PlanTier = 'basic' | 'premium' | 'vip'
export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface AuthUser {
  id: number
  username: string
  role: UserRole
}

export interface AdminAccount {
  id: number
  username: string
  role: UserRole
  createdAt?: string
  updatedAt?: string
}

export interface Product {
  id: string
  name: string
  price: number
  stock: number
  category: string
}

export interface ProductSale {
  id: number
  saleDate: string
  product: string
  amount: number
  clientDni: number
  client?: {
    dni: number
    nameComplete: string
  } | null
  soldBy?: {
    id: number
    username: string
    role: UserRole
  } | null
}

export interface AppNotification {
  id: number
  type: string
  title: string
  message: string
  entityType?: string | null
  entityId?: string | null
  readAt: string | null
  createdAt: string
  actor?: {
    id: number
    username: string
    role: UserRole
  } | null
}

export interface ClientDebt {
  id: string
  productId: string
  productName: string
  amount: number
  date: string
}

export interface ClientPlan {
  id: string
  planTier: PlanTier
  name: string
  startDate: string
  endDate: string
  durationValue: number
  durationUnit: DurationUnit
  attendanceDays: Weekday[]
  attendanceLabel: string
  pricingMode: string
  sessionCount: number
  totalPrice: number
  amountPaid: number
  debt: number
  paymentState: PaymentState
  paymentSeverity: PaymentSeverity
  paymentMethod?: string
  turn?: string
  status: 'active' | 'expired'
}

export interface Client {
  id: string
  name: string
  phone: string
  dni: string
  status: ClientStatus
  plan: string
  planTier?: PlanTier
  planPrice: number
  joinDate: string
  memberSince?: string
  expiresAt?: string
  attendanceLabel?: string
  attendanceDays?: Weekday[]
  amountPaid?: number
  paymentState?: PaymentState
  paymentSeverity?: PaymentSeverity
  totalPaid?: number
  paymentMethod?: string
  turn?: string
  debt?: number
  debts: ClientDebt[]
  plans?: ClientPlan[]
}

export interface MonthlyData {
  month: string
  clients: number
  products: number
}

export interface AnalyticsSummary {
  totalRevenue: number
  totalSales: number
}
