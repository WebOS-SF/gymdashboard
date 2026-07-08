'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Users, Package, DollarSign, TrendingUp, CreditCard, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { AnalyticsSummary, Client, Product, ProductSale, Purchase } from '@/lib/types'
import { toLocalDate, toLocalDateStr, formatDebtDate } from '@/lib/date-utils'
import { toast } from 'sonner'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

interface StatsCardsProps {
  clients: Client[]
  products: Product[]
  analytics: AnalyticsSummary | null
  sales: ProductSale[]
  purchases: Purchase[]
  onUpdateClient: (client: Client) => void
  onUpdateSale: (sale: ProductSale) => void
  isSuperadmin: boolean
}

export function StatsCards({ clients, products, analytics, sales, purchases, onUpdateClient, onUpdateSale, isSuperadmin }: StatsCardsProps) {
  // --- Selector de mes ---
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()) // 0-indexed

  // --- Selector de día para Ganado Hoy ---
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isProductDebtsModalOpen, setIsProductDebtsModalOpen] = useState(false)
  const [isPlanDebtsModalOpen, setIsPlanDebtsModalOpen] = useState(false)
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false)
  const [incomeCategoryFilter, setIncomeCategoryFilter] = useState<'Todos' | 'Membresias' | 'Productos'>('Todos')
  const [incomeSubFilter, setIncomeSubFilter] = useState<string>('Todos')

  // --- Registro de pagos de deudas ---
  const PAYMENT_METHODS = ['Efectivo', 'Plin', 'Yape']

  const [payingPlanId, setPayingPlanId] = useState<number | null>(null)
  const [planPaymentAmount, setPlanPaymentAmount] = useState('')
  const [planPaymentMethod, setPlanPaymentMethod] = useState('Efectivo')
  const [isPayingPlan, setIsPayingPlan] = useState(false)

  const [payingSaleId, setPayingSaleId] = useState<number | null>(null)
  const [salePaymentAmount, setSalePaymentAmount] = useState('')
  const [salePaymentMethod, setSalePaymentMethod] = useState('Efectivo')
  const [isPayingSale, setIsPayingSale] = useState(false)

  const handlePayPlanDebt = async (planId: number, currentAmountPaid: number, debt: number) => {
    const amount = Math.min(Number(planPaymentAmount), debt)
    if (!amount || amount <= 0 || isPayingPlan) return

    setIsPayingPlan(true)
    try {
      const res = await fetch(`/api/client-plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountPaid: currentAmountPaid + amount, paymentMethod: planPaymentMethod }),
      })
      const updatedClient = await res.json()

      if (!res.ok) {
        throw new Error(updatedClient?.error || 'No se pudo registrar el pago')
      }

      onUpdateClient(updatedClient)
      setPayingPlanId(null)
      setPlanPaymentAmount('')
      setPlanPaymentMethod('Efectivo')
      toast.success('Pago registrado', { description: 'La deuda de la membresía fue actualizada.' })
    } catch (error) {
      console.error('Error registrando pago de membresía:', error)
      toast.error('No se pudo registrar el pago', {
        description: error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      })
    } finally {
      setIsPayingPlan(false)
    }
  }

  const handlePaySaleDebt = async (saleId: number, debt: number) => {
    const amount = Math.min(Number(salePaymentAmount), debt)
    if (!amount || amount <= 0 || isPayingSale) return

    setIsPayingSale(true)
    try {
      const res = await fetch(`/api/sales/${saleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentAmount: amount, paymentMethod: salePaymentMethod }),
      })
      const updatedSale = await res.json()

      if (!res.ok) {
        throw new Error(updatedSale?.error || 'No se pudo registrar el pago')
      }

      onUpdateSale(updatedSale)
      setPayingSaleId(null)
      setSalePaymentAmount('')
      setSalePaymentMethod('Efectivo')
      toast.success('Pago registrado', { description: 'La deuda del producto fue actualizada.' })
    } catch (error) {
      console.error('Error registrando pago de producto:', error)
      toast.error('No se pudo registrar el pago', {
        description: error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      })
    } finally {
      setIsPayingSale(false)
    }
  }

  const goToPrevDay = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() - 1)
      return newDate
    })
  }

  const goToNextDay = () => {
    const now = new Date()
    const isToday = selectedDate.toDateString() === now.toDateString()
    if (isToday) return // No navegar más allá del día actual
    setSelectedDate(prev => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() + 1)
      return newDate
    })
  }

  const isToday = selectedDate.toDateString() === new Date().toDateString()

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
        const d = toLocalDate(plan.startDate)
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
      })
      return acc + plansInMonth.reduce((s, p) => s + (p.totalPrice || 0), 0)
    }, 0) || 0
  }, [clients, selectedYear, selectedMonth])

  const filteredSalesRevenue = useMemo(() => {
    return (sales || []).filter(sale => {
      const d = toLocalDate(sale.saleDate)
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
    }).reduce((acc, sale) => acc + (sale.amount || 0), 0)
  }, [sales, selectedYear, selectedMonth])

  const filteredSalesCount = useMemo(() => {
    return (sales || []).filter(sale => {
      const d = toLocalDate(sale.saleDate)
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
    }).length
  }, [sales, selectedYear, selectedMonth])

  const filteredTotal = filteredMonthlyIncome + filteredSalesRevenue

  // --- Cálculos del día actual ---
  const todayIncome = useMemo(() => {
    const todayStr = toLocalDateStr(selectedDate)

    return clients?.reduce((acc, client) => {
      const plansToday = (client.plans || []).filter(plan => {
        return toLocalDateStr(plan.startDate) === todayStr
      })
      return acc + plansToday.reduce((s, p) => s + (p.amountPaid || 0), 0)
    }, 0) || 0
  }, [clients, selectedDate])

  const todaySalesRevenue = useMemo(() => {
    const todayStr = toLocalDateStr(selectedDate)

    return (sales || []).filter(sale => {
      return toLocalDateStr(sale.saleDate) === todayStr
    }).reduce((acc, sale) => acc + (sale.amountPaid || 0), 0)
  }, [sales, selectedDate])

  const todaySalesCount = useMemo(() => {
    const todayStr = toLocalDateStr(selectedDate)

    return (sales || []).filter(sale => {
      return toLocalDateStr(sale.saleDate) === todayStr && (sale.amountPaid || 0) > 0
    }).length
  }, [sales, selectedDate])

  const todayTotal = todayIncome + todaySalesRevenue

  const [isClosureOpen, setIsClosureOpen] = useState(false);

  const openClosure = () => setIsClosureOpen(true);
  const closeClosure = () => setIsClosureOpen(false);

  // --- Estadísticas globales (sin filtro de mes) ---
  const activeClients = clients?.filter(c => c.status === 'active').length || 0
  const totalStock = products?.reduce((acc, p) => acc + p.stock, 0) || 0
  const totalDebts = useMemo(() => {
    const todayStr = toLocalDateStr(selectedDate)

    // Deudas de planes creados el día seleccionado
    const planDebts = clients?.reduce((acc, client) => {
      const plansToday = (client.plans || []).filter(plan => {
        return toLocalDateStr(plan.startDate) === todayStr
      })
      return acc + plansToday.reduce((s, p) => s + ((p.totalPrice || 0) - (p.amountPaid || 0)), 0)
    }, 0) || 0

    // Deudas de ventas del día seleccionado
    const productDebts = (sales || []).filter(sale => {
      return toLocalDateStr(sale.saleDate) === todayStr
    }).reduce((acc, sale) => acc + Math.max((sale.amount || 0) - (sale.amountPaid || 0), 0), 0)

    return planDebts + productDebts
  }, [clients, sales, selectedDate])

  // Deudas del mes (planes) con listado
  const monthlyPlanDebts = useMemo(() => {
    const debtsList: Array<{ name: string; amount: number; dni: string; date: string; planId: number; amountPaid: number }> = []

    clients?.forEach(client => {
      (client.plans || []).forEach(plan => {
        const planDate = toLocalDate(plan.startDate)

        if (
          planDate.getFullYear() === selectedYear &&
          planDate.getMonth() === selectedMonth &&
          plan.debt > 0
        ) {
          debtsList.push({
            name: client.name || `DNI ${client.dni}`,
            amount: plan.debt,
            dni: String(client.dni),
            date: plan.startDate,
            planId: plan.id,
            amountPaid: plan.amountPaid
          })
        }
      })
    })

    return debtsList.sort((a, b) => b.amount - a.amount)
  }, [clients, selectedYear, selectedMonth])

  // Deudas de productos con listado
  const productDebtsList = useMemo(() => {
    const debtsMap = new Map<string, { name: string; amount: number; dni: string; details: Array<{ id: number; amount: number; amountPaid: number; debt: number; date: string; product: string }> }>()

    ;(sales || []).forEach((sale: any) => {
      const debt = (sale.amount || 0) - (sale.amountPaid || 0)

      if (debt > 0) {
        const saleDate = toLocalDate(sale.saleDate)

        if (
          saleDate.getFullYear() === selectedYear &&
          saleDate.getMonth() === selectedMonth
        ) {
          const dni = String(sale.clientDni)
          const existing = debtsMap.get(dni)
          const clientName = sale.client?.nameComplete || `DNI ${sale.clientDni}`
          const detail = { id: sale.id, amount: sale.amount || 0, amountPaid: sale.amountPaid || 0, debt, date: sale.saleDate, product: sale.product }

          if (existing) {
            existing.amount += debt
            existing.details.push(detail)
          } else {
            debtsMap.set(dni, {
              name: clientName,
              amount: debt,
              dni,
              details: [detail]
            })
          }
        }
      }
    })

    return Array.from(debtsMap.values()).sort((a: any, b: any) => b.amount - a.amount)
  }, [sales, selectedYear, selectedMonth])
  const monthlyIncome = useMemo(() => {
    // Calcular lo cobrado (amountPaid) de planes creados en el mes seleccionado
    const planIncome = clients?.reduce((acc, client) => {
      const plansInMonth = (client.plans || []).filter(plan => {
        const d = toLocalDate(plan.startDate)
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
      })
      return acc + plansInMonth.reduce((s, p) => s + (p.amountPaid || 0), 0)
    }, 0) || 0

    // Calcular lo cobrado (amountPaid) de ventas de productos en el mes seleccionado
    const productIncome = (sales || []).filter(sale => {
      const saleDate = toLocalDate(sale.saleDate)
      return saleDate.getFullYear() === selectedYear && saleDate.getMonth() === selectedMonth
    }).reduce((acc, sale) => acc + (sale.amountPaid || 0), 0)

    return planIncome + productIncome
  }, [clients, sales, selectedYear, selectedMonth])
  const salesRevenue = analytics?.totalRevenue || 0

  // Gastos del mes (para restarlos del ingreso mensual)
  const filteredExpenses = useMemo(() => {
    return (purchases || []).filter(purchase => {
      const d = toLocalDate(purchase.purchaseDate)
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
    }).reduce((acc, purchase) => acc + (purchase.amount || 0), 0)
  }, [purchases, selectedYear, selectedMonth])

  const netMonthlyIncome = monthlyIncome - filteredExpenses

  // Detalle de ingresos por membresía en el mes seleccionado
  const monthlyPlanIncomeList = useMemo(() => {
    const list: Array<{ name: string; planName: string; amount: number; date: string; dni: string }> = []

    clients?.forEach(client => {
      (client.plans || []).forEach(plan => {
        const d = toLocalDate(plan.startDate)
        if (d.getFullYear() === selectedYear && d.getMonth() === selectedMonth) {
          list.push({
            name: client.name || `DNI ${client.dni}`,
            planName: plan.name,
            amount: plan.amountPaid || 0,
            date: plan.startDate,
            dni: String(client.dni)
          })
        }
      })
    })

    return list.sort((a, b) => b.amount - a.amount)
  }, [clients, selectedYear, selectedMonth])

  // Detalle de ingresos por venta de productos en el mes seleccionado
  const monthlyProductIncomeList = useMemo(() => {
    return (sales || []).filter(sale => {
      const d = toLocalDate(sale.saleDate)
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth && (sale.amountPaid || 0) > 0
    }).map(sale => ({
      name: sale.client?.nameComplete || `DNI ${sale.clientDni}`,
      product: sale.product,
      amount: sale.amountPaid || 0,
      date: sale.saleDate
    })).sort((a, b) => b.amount - a.amount)
  }, [sales, selectedYear, selectedMonth])

  const planNameOptions = useMemo(() => {
    return Array.from(new Set(monthlyPlanIncomeList.map(p => p.planName)))
  }, [monthlyPlanIncomeList])

  const productNameOptions = useMemo(() => {
    return Array.from(new Set(monthlyProductIncomeList.map(p => p.product)))
  }, [monthlyProductIncomeList])

  const incomeDetailList = useMemo(() => {
    if (incomeCategoryFilter === 'Membresias') {
      return monthlyPlanIncomeList
        .filter(p => incomeSubFilter === 'Todos' || p.planName === incomeSubFilter)
        .map(p => ({ name: p.name, type: p.planName, amount: p.amount, date: p.date }))
    }

    if (incomeCategoryFilter === 'Productos') {
      return monthlyProductIncomeList
        .filter(p => incomeSubFilter === 'Todos' || p.product === incomeSubFilter)
        .map(p => ({ name: p.name, type: p.product, amount: p.amount, date: p.date }))
    }

    return [
      ...monthlyPlanIncomeList.map(p => ({ name: p.name, type: p.planName, amount: p.amount, date: p.date })),
      ...monthlyProductIncomeList.map(p => ({ name: p.name, type: p.product, amount: p.amount, date: p.date }))
    ].sort((a, b) => toLocalDate(b.date).getTime() - toLocalDate(a.date).getTime())
  }, [incomeCategoryFilter, incomeSubFilter, monthlyPlanIncomeList, monthlyProductIncomeList])

  const newClientsThisMonth = Math.floor((clients?.length || 0) * 0.15)
  const previousMonthIncome = netMonthlyIncome * 0.85
  const incomeChange = netMonthlyIncome - previousMonthIncome
  const incomeChangePercent = previousMonthIncome > 0 ? Math.round((incomeChange / previousMonthIncome) * 100) : 0

  type StatItem = {
    title: string
    value: string
    subtitle: string
    icon: typeof Users
    iconBg: string
    trend: string
    trendUp: boolean
    isClickable?: boolean
    onClick?: () => void
    isDebtList?: boolean
    debtList?: Array<{ name: string; amount: number }>
  }

  const debtStats: StatItem[] = [
    {
      title: 'Deudas de Membresías',
      value: monthlyPlanDebts.length.toString(),
      subtitle: `${monthlyPlanDebts.reduce((sum, d) => sum + d.amount, 0).toLocaleString()} soles pendientes`,
      icon: DollarSign,
      iconBg: 'bg-gradient-to-br from-[#FF6B6B] to-[#ee5a5a]',
      trend: `${monthlyPlanDebts.length}`,
      trendUp: false,
      isDebtList: true,
      debtList: monthlyPlanDebts.slice(0, 5),
      isClickable: true,
      onClick: () => setIsPlanDebtsModalOpen(true)
    },
    {
      title: 'Deudas de Productos',
      value: productDebtsList.length.toString(),
      subtitle: `${productDebtsList.reduce((sum, d) => sum + d.amount, 0).toLocaleString()} soles pendientes`,
      icon: Package,
      iconBg: 'bg-gradient-to-br from-[#9B6DD7] to-[#8a5cc6]',
      trend: `${productDebtsList.length}`,
      trendUp: false,
      isDebtList: true,
      debtList: productDebtsList.slice(0, 5),
      isClickable: true,
      onClick: () => setIsProductDebtsModalOpen(true)
    }
  ]

  const stats: StatItem[] = isSuperadmin
    ? [
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
        title: 'Ingreso Mensual',
        value: `S/ ${netMonthlyIncome.toLocaleString()}`,
        subtitle: `Gastos: S/ ${filteredExpenses.toLocaleString()}`,
        icon: DollarSign,
        iconBg: 'bg-gradient-to-br from-[#5B8DEF] to-[#4a7de0]',
        trend: `${incomeChangePercent > 0 ? '+' : ''}${incomeChangePercent}%`,
        trendUp: incomeChangePercent > 0,
        isClickable: true,
        onClick: () => {
          setIncomeCategoryFilter('Todos')
          setIncomeSubFilter('Todos')
          setIsIncomeModalOpen(true)
        }
      },
      ...debtStats
    ]
    : debtStats

  return (
    <div className={isSuperadmin ? 'grid grid-cols-1 lg:grid-cols-3 gap-4' : 'space-y-4'}>
      {/* Stats Cards - Left Side */}
      <div className={isSuperadmin ? 'lg:col-span-2 space-y-4' : 'space-y-4'}>
        {/* Month Selector */}
        <div className="flex items-center justify-between bg-card rounded-2xl border-0 shadow-sm p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Período: {MONTH_NAMES[selectedMonth]} {selectedYear}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevMonth}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNextMonth}
              disabled={isCurrentMonth}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stats Cards Grid */}
        <div className={`grid grid-cols-2 gap-4 ${isSuperadmin ? 'md:grid-cols-4' : 'md:grid-cols-2'}`}>
          {stats.map((stat) => (
            <Card 
              key={stat.title} 
              className={`rounded-2xl border-0 shadow-sm bg-card overflow-hidden ${stat.isClickable ? 'cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200' : ''}`}
              onClick={stat.isClickable ? stat.onClick : undefined}
            >
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
                <p className="text-[10px] text-muted-foreground truncate mb-2">{stat.subtitle}</p>
                {stat.isDebtList && stat.debtList && stat.debtList.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                    {stat.debtList.map((debt: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-[10px]">
                        <span className="text-muted-foreground truncate flex-1">{debt.name}</span>
                        <span className="font-semibold text-foreground ml-2">S/ {debt.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                {stat.isDebtList && (!stat.debtList || stat.debtList.length === 0) && (
                  <p className="text-[10px] text-muted-foreground mt-2">Sin deudas este mes</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Balance Card - Right Side */}
      {isSuperadmin && (
      <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-primary via-primary/95 to-primary/85 overflow-hidden">
        <CardContent className="p-6 text-primary-foreground h-full flex flex-col justify-between">
          <div>
            {/* Header con título */}
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-5 w-5 opacity-80" />
              <span className="text-sm font-medium opacity-80">Ganado</span>
            </div>

            {/* Selector de día */}
            <div className="flex items-center justify-between mb-3 bg-white/10 rounded-xl px-3 py-1.5">
              <button
                onClick={goToPrevDay}
                className="p-0.5 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Día anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold tracking-wide">
                {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
              <button
                onClick={goToNextDay}
                disabled={isToday}
                className="p-0.5 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Día siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Total del día */}
            <p className="text-4xl font-bold mb-1">S/ {todayTotal.toLocaleString()}</p>
            {isToday && (
              <p className="text-[11px] opacity-60 mb-3">Día actual</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-70">Membresías</span>
              <span className="text-sm font-semibold">S/ {todayIncome.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-70">Ventas ({todaySalesCount})</span>
              <span className="text-sm font-semibold">S/ {todaySalesRevenue.toLocaleString()}</span>
            </div>
            <div className="h-px bg-white/20 my-1" />
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-70">Deudas por cobrar</span>
              <span className="text-sm font-semibold text-yellow-200">S/ {totalDebts.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Modal de Deudas de Productos */}
      <Dialog open={isProductDebtsModalOpen} onOpenChange={setIsProductDebtsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deudas de Productos - {MONTH_NAMES[selectedMonth]} {selectedYear}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {productDebtsList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay deudas de productos este mes</p>
            ) : (
              <div className="space-y-2">
                {productDebtsList.map((debt: any, idx: number) => (
                  <div key={idx} className="p-3 bg-secondary/30 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{debt.name}</p>
                        <p className="text-xs text-muted-foreground">DNI: {debt.dni}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">S/ {debt.amount.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
                      {debt.details.map((detail: any, dIdx: number) => (
                        <div key={dIdx} className="space-y-1">
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>
                              {detail.product} · {formatDebtDate(detail.date)}
                              {detail.amountPaid > 0 ? ` · Abonado S/ ${detail.amountPaid.toLocaleString()}` : ''}
                            </span>
                            <span>S/ {detail.debt.toLocaleString()}</span>
                          </div>
                          {payingSaleId === detail.id ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={detail.debt}
                                  value={salePaymentAmount}
                                  onChange={(e) => setSalePaymentAmount(e.target.value)}
                                  placeholder="Monto abonado"
                                  autoFocus
                                  className="h-7 flex-1 rounded-lg bg-card border-0 px-2 text-xs text-foreground"
                                />
                                {PAYMENT_METHODS.map(method => (
                                  <button
                                    key={method}
                                    onClick={() => setSalePaymentMethod(method)}
                                    className={`text-[10px] font-medium px-2 py-1 rounded-lg transition-colors ${
                                      salePaymentMethod === method
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-card text-muted-foreground hover:bg-secondary'
                                    }`}
                                  >
                                    {method}
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handlePaySaleDebt(detail.id, detail.debt)}
                                  disabled={isPayingSale}
                                  className="text-[10px] font-medium px-2 py-1 rounded-lg bg-[#26DE81] text-white hover:opacity-90 disabled:opacity-50"
                                >
                                  Confirmar
                                </button>
                                <button
                                  onClick={() => { setPayingSaleId(null); setSalePaymentAmount('') }}
                                  className="text-[10px] font-medium px-2 py-1 rounded-lg text-muted-foreground hover:bg-secondary"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setPayingSaleId(detail.id); setSalePaymentAmount(''); setSalePaymentMethod('Efectivo') }}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
                            >
                              Registrar pago
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Deudas de Membresías */}
      <Dialog open={isPlanDebtsModalOpen} onOpenChange={setIsPlanDebtsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deudas de Membresías - {MONTH_NAMES[selectedMonth]} {selectedYear}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {monthlyPlanDebts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay deudas de membresías este mes</p>
            ) : (
              <div className="space-y-2">
                {monthlyPlanDebts.map((debt: any, idx: number) => (
                  <div key={idx} className="p-3 bg-secondary/30 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{debt.name}</p>
                        <p className="text-xs text-muted-foreground">DNI: {debt.dni} · {formatDebtDate(debt.date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">S/ {debt.amount.toLocaleString()}</p>
                      </div>
                    </div>
                    {payingPlanId === debt.planId ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={debt.amount}
                            value={planPaymentAmount}
                            onChange={(e) => setPlanPaymentAmount(e.target.value)}
                            placeholder="Monto abonado"
                            autoFocus
                            className="h-8 flex-1 rounded-lg bg-card border-0 px-2 text-sm text-foreground"
                          />
                          {PAYMENT_METHODS.map(method => (
                            <button
                              key={method}
                              onClick={() => setPlanPaymentMethod(method)}
                              className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                                planPaymentMethod === method
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-card text-muted-foreground hover:bg-secondary'
                              }`}
                            >
                              {method}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePayPlanDebt(debt.planId, debt.amountPaid, debt.amount)}
                            disabled={isPayingPlan}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#26DE81] text-white hover:opacity-90 disabled:opacity-50"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => { setPayingPlanId(null); setPlanPaymentAmount('') }}
                            className="text-xs font-medium px-2 py-1.5 rounded-lg text-muted-foreground hover:bg-secondary"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setPayingPlanId(debt.planId); setPlanPaymentAmount(''); setPlanPaymentMethod('Efectivo') }}
                        className="text-xs font-medium px-3 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
                      >
                        Registrar pago
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Ingreso Mensual */}
      <Dialog open={isIncomeModalOpen} onOpenChange={setIsIncomeModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ingreso Mensual - {MONTH_NAMES[selectedMonth]} {selectedYear}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-2">
            {(['Todos', 'Membresias', 'Productos'] as const).map(option => (
              <button
                key={option}
                onClick={() => {
                  setIncomeCategoryFilter(option)
                  setIncomeSubFilter('Todos')
                }}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  incomeCategoryFilter === option
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                }`}
              >
                {option === 'Membresias' ? 'Membresías' : option}
              </button>
            ))}
          </div>
          {incomeCategoryFilter === 'Membresias' && planNameOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button
                onClick={() => setIncomeSubFilter('Todos')}
                className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                  incomeSubFilter === 'Todos'
                    ? 'bg-primary/80 text-primary-foreground'
                    : 'bg-secondary/30 text-muted-foreground hover:bg-secondary'
                }`}
              >
                Todos los planes
              </button>
              {planNameOptions.map(planName => (
                <button
                  key={planName}
                  onClick={() => setIncomeSubFilter(planName)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                    incomeSubFilter === planName
                      ? 'bg-primary/80 text-primary-foreground'
                      : 'bg-secondary/30 text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {planName}
                </button>
              ))}
            </div>
          )}
          {incomeCategoryFilter === 'Productos' && productNameOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button
                onClick={() => setIncomeSubFilter('Todos')}
                className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                  incomeSubFilter === 'Todos'
                    ? 'bg-primary/80 text-primary-foreground'
                    : 'bg-secondary/30 text-muted-foreground hover:bg-secondary'
                }`}
              >
                Todos los productos
              </button>
              {productNameOptions.map(productName => (
                <button
                  key={productName}
                  onClick={() => setIncomeSubFilter(productName)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                    incomeSubFilter === productName
                      ? 'bg-primary/80 text-primary-foreground'
                      : 'bg-secondary/30 text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {productName}
                </button>
              ))}
            </div>
          )}
          <div className="space-y-3 mt-4">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs text-muted-foreground">{incomeDetailList.length} registro{incomeDetailList.length === 1 ? '' : 's'}</span>
              <span className="text-sm font-bold text-foreground">
                S/ {incomeDetailList.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}
              </span>
            </div>
            {incomeDetailList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay ingresos en esta categoría este mes</p>
            ) : (
              <div className="space-y-2">
                {incomeDetailList.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.type} · {formatDebtDate(item.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">S/ {item.amount.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
