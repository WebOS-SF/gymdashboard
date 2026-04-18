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
