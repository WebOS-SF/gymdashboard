'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { DashboardHeader } from './dashboard-header'
import { StatsCards } from './stats-cards'
import { DashboardCharts } from './dashboard-charts'
import { ClientsList } from './clients-list'
import { PlansList } from './plans-list'
import { ProductsList } from './products-list'
import { AdminAccounts } from './admin-accounts'
import { SalesList } from './sales-list'
import { PurchasesList } from './purchases-list'
import { AnalyticsSummary, AuthUser, Client, Product, MonthlyData, ProductSale, AttendanceStatus, Purchase } from '@/lib/types'
import { Users, Package, Shield, ShoppingCart, CalendarRange, Receipt } from 'lucide-react'

interface DashboardProps {
  user: AuthUser
  onLogout: () => void
}

type ViewMode = 'clients' | 'plans' | 'products' | 'sales' | 'purchases' | 'admins'

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<ProductSale[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('clients')
  const isSuperadmin = user.role === 'superadmin'

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/product')
    if (!res.ok) return
    const data = await res.json()
    setProducts(data)
  }, [])

  const fetchClients = useCallback(async () => {
    const res = await fetch('/api/clients')
    if (!res.ok) return
    const data = await res.json()
    setClients(data)
  }, [])

  const fetchMonthly = useCallback(async () => {
    if (!isSuperadmin) return
    const res = await fetch('/api/analytics/monthly')
    if (!res.ok) return
    const data = await res.json()
    setMonthlyData(data)
  }, [isSuperadmin])

  const fetchAnalytics = useCallback(async () => {
    if (!isSuperadmin) return
    const res = await fetch('/api/analytics')
    if (!res.ok) return
    const data = await res.json()
    setAnalytics({
      totalRevenue: data.totalRevenue || 0,
      totalSales: data.totalSales || 0,
    })
  }, [isSuperadmin])

  const fetchSales = useCallback(async () => {
    const res = await fetch('/api/sales')
    if (!res.ok) return
    const data = await res.json()
    setSales(data)
  }, [])

  const fetchPurchases = useCallback(async () => {
    if (!isSuperadmin) return
    const res = await fetch('/api/purchases')
    if (!res.ok) return
    const data = await res.json()
    setPurchases(data)
  }, [isSuperadmin])

  useEffect(() => {
    fetchProducts()
    fetchClients()
    fetchSales()
    fetchPurchases()
    fetchMonthly()
    fetchAnalytics()
  }, [fetchProducts, fetchClients, fetchSales, fetchPurchases, fetchMonthly, fetchAnalytics])

  const refreshAfterSale = useCallback(async () => {
    await Promise.all([
      fetchProducts(),
      fetchSales(),
      ...(isSuperadmin ? [fetchMonthly(), fetchAnalytics()] : []),
    ])
  }, [fetchProducts, fetchSales, fetchMonthly, fetchAnalytics, isSuperadmin])

  const handleAddPurchase = (newPurchase: Purchase) => {
    setPurchases(prev => [newPurchase, ...prev])
  }

  const handleUpdatePurchase = (updatedPurchase: Purchase) => {
    setPurchases(prev => prev.map(p => p.id === updatedPurchase.id ? updatedPurchase : p))
  }

  const handleDeletePurchase = (id: number) => {
    setPurchases(prev => prev.filter(p => p.id !== id))
  }

  const handleUpdateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c))
  }

  const handleAddClient = (newClient: Client) => {
    setClients(prev => [...prev, newClient])
  }

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p))
  }

  const handleAddProduct = (newProduct: Product) => {
    setProducts(prev => [...prev, newProduct])
  }

  const handleSetClients = (nextClients: Client[]) => {
    setClients(nextClients)
  }

  const handleAttendanceChange = (dni: string, status: AttendanceStatus) => {
    setClients(prev => prev.map(c => c.dni === dni ? { ...c, todayAttendance: status } : c))
  }

  const handleUpdateSale = (updatedSale: ProductSale) => {
    setSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s))
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} onLogout={onLogout} />

      <main className="p-4 space-y-4">
        {/* Stats Grid with Balance Card */}
        <StatsCards
          clients={clients}
          products={products}
          analytics={analytics}
          sales={sales}
          purchases={purchases}
          onUpdateClient={handleUpdateClient}
          onUpdateSale={handleUpdateSale}
          isSuperadmin={isSuperadmin}
        />

        {isSuperadmin && (
          /* Charts Section */
          <DashboardCharts data={monthlyData} purchases={purchases} />
        )}

        {/* Toggle View */}
        <div className="w-full overflow-x-auto">
          <div className="flex items-center gap-1 p-1 bg-card rounded-xl w-max min-w-full shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('clients')}
              className={`shrink-0 whitespace-nowrap rounded-lg transition-all ${viewMode === 'clients'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
            >
              <Users className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Clientes</span>
            </Button>
            {isSuperadmin && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('products')}
                  className={`shrink-0 whitespace-nowrap rounded-lg transition-all ${viewMode === 'products'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                >
                  <Package className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Productos</span>
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('plans')}
              className={`shrink-0 whitespace-nowrap rounded-lg transition-all ${viewMode === 'plans'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
            >
              <CalendarRange className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Planes</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('sales')}
              className={`shrink-0 whitespace-nowrap rounded-lg transition-all ${viewMode === 'sales'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
            >
              <ShoppingCart className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Ventas</span>
            </Button>
            {isSuperadmin && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('purchases')}
                  className={`shrink-0 whitespace-nowrap rounded-lg transition-all ${viewMode === 'purchases'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                >
                  <Receipt className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Compras</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('admins')}
                  className={`shrink-0 whitespace-nowrap rounded-lg transition-all ${viewMode === 'admins'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                >
                  <Shield className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Admins</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* List View */}
        {viewMode === 'clients' ? (
          <ClientsList
            clients={clients}
            onUpdateClient={handleUpdateClient}
            onAddClient={handleAddClient}
            onAttendanceChange={handleAttendanceChange}
            canViewMoney={isSuperadmin}
          />
        ) : viewMode === 'plans' ? (
          <PlansList
            clients={clients}
            canViewMoney={isSuperadmin}
            onClientsChange={handleSetClients}
          />
        ) : viewMode === 'products' && isSuperadmin ? (
          <ProductsList
            products={products}
            clients={clients}
            onUpdateProduct={handleUpdateProduct}
            onAddProduct={handleAddProduct}
            onSaleRecorded={refreshAfterSale}
          />
        ) : viewMode === 'sales' ? (
          <SalesList
            products={products}
            clients={clients}
            sales={sales}
            onUpdateProduct={handleUpdateProduct}
            onSaleRecorded={refreshAfterSale}
          />
        ) : viewMode === 'purchases' && isSuperadmin ? (
          <PurchasesList
            purchases={purchases}
            products={products}
            onAddPurchase={handleAddPurchase}
            onUpdatePurchase={handleUpdatePurchase}
            onDeletePurchase={handleDeletePurchase}
            onUpdateProduct={handleUpdateProduct}
          />
        ) : (
          <AdminAccounts currentUserId={user.id} />
        )}
      </main>
    </div>
  )
}
