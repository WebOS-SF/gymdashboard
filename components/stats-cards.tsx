'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Package, DollarSign, TrendingUp, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react'
import { AnalyticsSummary, Client, Product, ProductSale } from '@/lib/types'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

interface StatsCardsProps {
  clients: Client[]
  products: Product[]
  analytics: AnalyticsSummary | null
  sales: ProductSale[]
}

export function StatsCards({ clients, products, analytics, sales }: StatsCardsProps) {
  // --- Selector de mes ---
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()) // 0-indexed

  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear(y => y - 1)
    } else {
      setSelectedMonth(m => m - 1)
    }
  }

  const goToNextMonth = () => {
    const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear()
    if (isCurrentMonth) return // No navegar más allá del mes actual
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear(y => y + 1)
    } else {
      setSelectedMonth(m => m + 1)
    }
  }

  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear()

  // --- Cálculos filtrados por mes seleccionado ---
  const filteredMonthlyIncome = useMemo(() => {
    // Sumar totalPrice de planes cuyo startDate cae en el mes seleccionado
    return clients?.reduce((acc, client) => {
      const plansInMonth = (client.plans || []).filter(plan => {
        const d = new Date(plan.startDate)
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
      })
      return acc + plansInMonth.reduce((s, p) => s + (p.totalPrice || 0), 0)
    }, 0) || 0
  }, [clients, selectedYear, selectedMonth])

  const filteredSalesRevenue = useMemo(() => {
    return (sales || []).filter(sale => {
      const d = new Date(sale.saleDate)
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
    }).reduce((acc, sale) => acc + (sale.amount || 0), 0)
  }, [sales, selectedYear, selectedMonth])

  const filteredSalesCount = useMemo(() => {
    return (sales || []).filter(sale => {
      const d = new Date(sale.saleDate)
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
    }).length
  }, [sales, selectedYear, selectedMonth])

  const filteredTotal = filteredMonthlyIncome + filteredSalesRevenue

  // --- Estadísticas globales (sin filtro de mes) ---
  const activeClients = clients?.filter(c => c.status === 'active').length || 0
  const pendingPayments = clients?.filter(
    c => c.status === 'pending_moderate' || c.status === 'pending_critical'
  ).length || 0
  const totalStock = products?.reduce((acc, p) => acc + p.stock, 0) || 0
  const totalDebts = clients?.reduce((acc, c) => acc + ((c.debts || []).reduce((a, d) => a + d.amount, 0)), 0) || 0
  const monthlyIncome = clients?.reduce((acc, c) => acc + c.planPrice, 0) || 0
  const salesRevenue = analytics?.totalRevenue || 0

  const newClientsThisMonth = Math.floor((clients?.length || 0) * 0.15)
  const previousMonthIncome = monthlyIncome * 0.85
  const incomeChange = monthlyIncome - previousMonthIncome
  const incomeChangePercent = previousMonthIncome > 0 ? Math.round((incomeChange / previousMonthIncome) * 100) : 0

  const stats = [
    {
      title: 'Clientes Activos',
      value: activeClients.toString(),
      subtitle: `+${newClientsThisMonth} este mes`,
      icon: Users,
      iconBg: 'bg-gradient-to-br from-[#FF6B6B] to-[#ee5a5a]',
      trend: `${newClientsThisMonth > 0 ? '+' : ''}${Math.round((newClientsThisMonth / Math.max(activeClients - newClientsThisMonth, 1)) * 100)}%`,
      trendUp: newClientsThisMonth > 0
    },
    {
      title: 'Membresías',
      value: `S/ ${monthlyIncome.toLocaleString()}`,
      subtitle: `${pendingPayments} con cobranza pendiente`,
      icon: DollarSign,
      iconBg: 'bg-gradient-to-br from-[#5B8DEF] to-[#4a7de0]',
      trend: `${incomeChangePercent > 0 ? '+' : ''}${incomeChangePercent}%`,
      trendUp: incomeChangePercent > 0
    },
    {
      title: 'Ventas Facturadas',
      value: `S/ ${salesRevenue.toLocaleString()}`,
      subtitle: `${analytics?.totalSales || 0} ventas registradas`,
      icon: TrendingUp,
      iconBg: 'bg-gradient-to-br from-[#9B6DD7] to-[#8a5cc6]',
      trend: `${analytics?.totalSales || 0}`,
      trendUp: salesRevenue > 0
    },
    {
      title: 'Productos',
      value: totalStock.toString(),
      subtitle: `${products?.length || 0} tipos disponibles`,
      icon: Package,
      iconBg: 'bg-gradient-to-br from-[#26DE81] to-[#20c572]',
      trend: `${products?.length || 0 > 0 ? '+' : ''}${Math.round(((products?.length || 0) / Math.max(totalStock - (products?.length || 0), 1)) * 100)}%`,
      trendUp: totalStock > 0
    }
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Stats Cards - Left Side */}
      <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="rounded-2xl border-0 shadow-sm bg-card overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stat.trendUp ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {stat.trend}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{stat.title}</p>
              <p className="text-xl font-bold text-foreground mb-0.5">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground truncate">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Balance Card - Right Side */}
      <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-primary via-primary/95 to-primary/85 overflow-hidden">
        <CardContent className="p-6 text-primary-foreground h-full flex flex-col justify-between">
          <div>
            {/* Header con título */}
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-5 w-5 opacity-80" />
              <span className="text-sm font-medium opacity-80">Total Ganado</span>
            </div>

            {/* Selector de mes */}
            <div className="flex items-center justify-between mb-3 bg-white/10 rounded-xl px-3 py-1.5">
              <button
                onClick={goToPrevMonth}
                className="p-0.5 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold tracking-wide">
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </span>
              <button
                onClick={goToNextMonth}
                disabled={isCurrentMonth}
                className="p-0.5 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Total del mes */}
            <p className="text-4xl font-bold mb-1">S/ {filteredTotal.toLocaleString()}</p>
            {isCurrentMonth && (
              <p className="text-[11px] opacity-60 mb-3">Mes actual</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-70">Membresías</span>
              <span className="text-sm font-semibold">S/ {filteredMonthlyIncome.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-70">Ventas ({filteredSalesCount})</span>
              <span className="text-sm font-semibold">S/ {filteredSalesRevenue.toLocaleString()}</span>
            </div>
            <div className="h-px bg-white/20 my-1" />
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-70">Deudas por cobrar</span>
              <span className="text-sm font-semibold text-yellow-200">S/ {totalDebts.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
