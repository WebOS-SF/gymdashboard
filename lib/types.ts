export type ClientStatus = 'active' | 'inactive' | 'pending_payment'
export type UserRole = 'admin' | 'superadmin'

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

export interface Client {
  id: string
  name: string
  phone: string
  dni: string
  status: ClientStatus
  plan: string
  planPrice: number
  joinDate: string
  paymentMethod?: string
  turn?: string
  debt?: number
  debts: ClientDebt[]
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
