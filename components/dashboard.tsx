'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { DashboardHeader } from './dashboard-header'
import { StatsCards } from './stats-cards'
import { DashboardCharts } from './dashboard-charts'
import { ClientsList } from './clients-list'
import { ProductsList } from './products-list'
import { Client, Product } from '@/lib/types'
import { mockClients, mockProducts, mockMonthlyData } from '@/lib/mock-data'
import { Users, Package } from 'lucide-react'

interface DashboardProps {
  onLogout: () => void
}

export function Dashboard({ onLogout }: DashboardProps) {
 
 useEffect(() => {
  fetch('/api/product')
    .then(res => res.json())
    .then(data => setProducts(data))
}, [])

useEffect(() => {
  fetch('/api/clients')
    .then(res => res.json())
    .then(data => setClients(data))
}, [])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [viewMode, setViewMode] = useState<'clients' | 'products'>('clients')

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
        <DashboardCharts data={mockMonthlyData} />

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
            onUpdateProduct={handleUpdateProduct}
            onAddProduct={handleAddProduct}
          />
        )}
      </main>
    </div>
  )
}
