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
import { AnalyticsSummary, AuthUser, Client, Product, MonthlyData, ProductSale } from '@/lib/types'
import { Users, Package, Shield, ShoppingCart, CalendarRange } from 'lucide-react'

interface DashboardProps {
  user: AuthUser
  onLogout: () => void
}

type ViewMode = 'clients' | 'plans' | 'products' | 'sales' | 'admins'

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<ProductSale[]>([])
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

  useEffect(() => {
    fetchProducts()
    fetchClients()
    fetchSales()
    fetchMonthly()
    fetchAnalytics()
  }, [fetchProducts, fetchClients, fetchSales, fetchMonthly, fetchAnalytics])

  const refreshAfterSale = useCallback(async () => {
    await Promise.all([
      fetchProducts(),
      fetchSales(),
      ...(isSuperadmin ? [fetchMonthly(), fetchAnalytics()] : []),
    ])
  }, [fetchProducts, fetchSales, fetchMonthly, fetchAnalytics, isSuperadmin])

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

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} onLogout={onLogout} />
      
      <main className="p-4 space-y-4">
        {isSuperadmin && (
          <>
            {/* Stats Grid with Balance Card */}
            <StatsCards clients={clients} products={products} analytics={analytics} />

            {/* Charts Section */}
            <DashboardCharts data={monthlyData} />
          </>
        )}

        {/* Toggle View */}
        <div className="flex items-center gap-1 p-1 bg-card rounded-xl w-fit shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('clients')}
            className={`rounded-lg transition-all ${
              viewMode === 'clients' 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <Users className="h-4 w-4 mr-2" />
            Clientes
          </Button>
          {isSuperadmin && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('products')}
                className={`rounded-lg transition-all ${
                  viewMode === 'products' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                <Package className="h-4 w-4 mr-2" />
                Productos
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('plans')}
            className={`rounded-lg transition-all ${
              viewMode === 'plans'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <CalendarRange className="h-4 w-4 mr-2" />
            Planes
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('sales')}
            className={`rounded-lg transition-all ${
              viewMode === 'sales'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Ventas
          </Button>
          {isSuperadmin && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('admins')}
                className={`rounded-lg transition-all ${
                  viewMode === 'admins'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                <Shield className="h-4 w-4 mr-2" />
                Admins
              </Button>
            </>
          )}
        </div>

        {/* List View */}
        {viewMode === 'clients' ? (
          <ClientsList
            clients={clients}
            onUpdateClient={handleUpdateClient}
            onAddClient={handleAddClient}
          />
        ) : viewMode === 'plans' ? (
          <PlansList
            clients={clients}
            canViewMoney={true}
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
        ) : (
          <AdminAccounts currentUserId={user.id} />
        )}
      </main>
    </div>
  )
}
