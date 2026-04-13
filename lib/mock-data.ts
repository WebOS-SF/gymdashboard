import { Client, Product, MonthlyData } from './types'



export const mockProducts: Product[] = [
  { id: '1', name: 'Proteína Whey 1kg', price: 45000, stock: 25, category: 'Suplementos' },
  { id: '2', name: 'Creatina 300g', price: 28000, stock: 40, category: 'Suplementos' },
  { id: '3', name: 'Guantes de Entrenamiento', price: 15000, stock: 15, category: 'Accesorios' },
  { id: '4', name: 'Botella Deportiva', price: 8000, stock: 30, category: 'Accesorios' },
  { id: '5', name: 'Pre-Entreno 250g', price: 35000, stock: 20, category: 'Suplementos' },
  { id: '6', name: 'Toalla Gym', price: 12000, stock: 50, category: 'Accesorios' },
  { id: '7', name: 'BCAA 500g', price: 32000, stock: 18, category: 'Suplementos' },
  { id: '8', name: 'Banda Elástica Set', price: 22000, stock: 12, category: 'Equipamiento' },
]

export const mockClients: Client[] = [
  {
    id: '1',
    name: 'Carlos Mendoza',
    phone: '+54 9 11 4567-8901',
    dni: '32456789',
    status: 'active',
    plan: 'Premium',
    planPrice: 25000,
    joinDate: '2025-01-15',
    debts: []
  },
  {
    id: '2',
    name: 'María García',
    phone: '+54 9 11 5678-1234',
    dni: '28765432',
    status: 'pending_payment',
    plan: 'Básico',
    planPrice: 15000,
    joinDate: '2024-11-20',
    debts: [
      { id: 'd1', productId: '1', productName: 'Proteína Whey 1kg', amount: 45000, date: '2026-03-10' }
    ]
  },
  {
    id: '3',
    name: 'Juan Pérez',
    phone: '+54 9 11 6789-2345',
    dni: '35678901',
    status: 'active',
    plan: 'Premium',
    planPrice: 25000,
    joinDate: '2025-02-01',
    debts: []
  },
  {
    id: '4',
    name: 'Ana Rodríguez',
    phone: '+54 9 11 7890-3456',
    dni: '30123456',
    status: 'inactive',
    plan: 'Básico',
    planPrice: 15000,
    joinDate: '2024-08-15',
    debts: []
  },
  {
    id: '5',
    name: 'Luis Fernández',
    phone: '+54 9 11 8901-4567',
    dni: '33456789',
    status: 'active',
    plan: 'VIP',
    planPrice: 35000,
    joinDate: '2025-03-10',
    debts: []
  },
  {
    id: '6',
    name: 'Sofia Martinez',
    phone: '+54 9 11 9012-5678',
    dni: '29876543',
    status: 'pending_payment',
    plan: 'Premium',
    planPrice: 25000,
    joinDate: '2024-12-01',
    debts: [
      { id: 'd2', productId: '2', productName: 'Creatina 300g', amount: 28000, date: '2026-02-25' },
      { id: 'd3', productId: '4', productName: 'Botella Deportiva', amount: 8000, date: '2026-03-05' }
    ]
  },
  {
    id: '7',
    name: 'Diego López',
    phone: '+54 9 11 1234-6789',
    dni: '31234567',
    status: 'active',
    plan: 'Básico',
    planPrice: 15000,
    joinDate: '2026-01-05',
    debts: []
  },
  {
    id: '8',
    name: 'Valentina Torres',
    phone: '+54 9 11 2345-7890',
    dni: '34567890',
    status: 'active',
    plan: 'VIP',
    planPrice: 35000,
    joinDate: '2025-04-20',
    debts: []
  },
]

export const mockMonthlyData: MonthlyData[] = [
  { month: 'Sep', clients: 45, products: 120 },
  { month: 'Oct', clients: 52, products: 145 },
  { month: 'Nov', clients: 48, products: 130 },
  { month: 'Dic', clients: 60, products: 180 },
  { month: 'Ene', clients: 75, products: 200 },
  { month: 'Feb', clients: 68, products: 175 },
  { month: 'Mar', clients: 82, products: 220 },
  { month: 'Abr', clients: 90, products: 250 },
]

export const plans = ['Básico', 'Premium', 'VIP']
export const planPrices: Record<string, number> = {
  'Básico': 15000,
  'Premium': 25000,
  'VIP': 35000
}
