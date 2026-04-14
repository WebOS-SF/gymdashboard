'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { DashboardHeader } from './dashboard-header'
import { StatsCards } from './stats-cards'
import { DashboardCharts } from './dashboard-charts'
import { ClientsList } from './clients-list'
import { ProductsList } from './products-list'
import { Client, Product, MonthlyData } from '@/lib/types'
import { Users, Package } from 'lucide-react'

interface DashboardProps {
  onLogout: () => void
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [viewMode, setViewMode] = useState<'clients' | 'products'>('clients')

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/product')
    const data = await res.json()
    setProducts(data)
  }, [])

  const fetchClients = useCallback(async () => {
    const res = await fetch('/api/clients')
    const data = await res.json()
    setClients(data)
  }, [])

  const fetchMonthly = useCallback(async () => {
    const res = await fetch('/api/analytics/monthly')
    const data = await res.json()
    setMonthlyData(data)
  }, [])

  useEffect(() => {
    fetchProducts()
    fetchClients()
    fetchMonthly()
  }, [fetchProducts, fetchClients, fetchMonthly])

  const refreshAfterSale = useCallback(async () => {
    await Promise.all([
      fetchProducts(),
      fetchMonthly(),
    ])
  }, [fetchProducts, fetchMonthly])

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

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onLogout={onLogout} />
      
      <main className="p-4 space-y-4">
        {/* Stats Grid with Balance Card */}
        <StatsCards clients={clients} products={products} />

        {/* Charts Section */}
        <DashboardCharts data={monthlyData} />

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
        </div>

        {/* List View */}
        {viewMode === 'clients' ? (
          <ClientsList
            clients={clients}
            products={products}
            onUpdateClient={handleUpdateClient}
            onAddClient={handleAddClient}
          />
        ) : (
          <ProductsList
            products={products}
            clients={clients}
            onUpdateProduct={handleUpdateProduct}
            onAddProduct={handleAddProduct}
            onSaleRecorded={refreshAfterSale}
          />
        )}
      </main>
    </div>
  )
}
