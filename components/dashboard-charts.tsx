'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MonthlyData, Purchase } from '@/lib/types'
import { useTheme } from '@/hooks/use-theme'
import { useMemo, useState } from 'react'
import { toLocalDate, formatDebtDate } from '@/lib/date-utils'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

interface DashboardChartsProps {
  data: MonthlyData[]
  purchases: Purchase[]
}

export function DashboardCharts({ data, purchases }: DashboardChartsProps) {
  const { theme, mounted } = useTheme()
  const [period, setPeriod] = useState<'month' | 'year'>('year')
  const [isExpensesModalOpen, setIsExpensesModalOpen] = useState(false)
  const [expensesCategoryFilter, setExpensesCategoryFilter] = useState<'Todos' | 'Producto' | 'Servicio'>('Todos')

  const primaryColor = "#FF6B6B"
  const isDark = !mounted || theme === 'dark'
  const gridColor = isDark ? "#374151" : "#f0f0f0"
  const textColor = isDark ? "#9ca3af" : "#9ca3af"
  const tooltipBg = isDark ? "#1f2937" : "#ffffff"
  const tooltipBorder = isDark ? "#374151" : "#e5e7eb"
  const tooltipText = isDark ? "#f9fafb" : "#111827"
  const areaFill = isDark ? "rgba(255, 107, 107, 0.1)" : "rgba(255, 107, 107, 0.15)"

  const chartData = useMemo(() => {
    if (period === 'month') return data.slice(-6)
    return data
  }, [data, period])

  const last = chartData[chartData.length - 1]
  const prev = chartData[chartData.length - 2]

  const clientsChange = last && prev ? last.clients - prev.clients : 0
  const clientsChangePct = last && prev && prev.clients > 0 ? Math.round((clientsChange / prev.clients) * 100) : 0

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()

  const monthlyExpensesList = useMemo(() => {
    return (purchases || []).filter(purchase => {
      const d = toLocalDate(purchase.purchaseDate)
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth
    }).sort((a, b) => toLocalDate(b.purchaseDate).getTime() - toLocalDate(a.purchaseDate).getTime())
  }, [purchases, currentYear, currentMonth])

  const totalExpenses = monthlyExpensesList.reduce((acc, p) => acc + (p.amount || 0), 0)
  const productExpenses = monthlyExpensesList.filter(p => p.category === 'Producto').reduce((acc, p) => acc + (p.amount || 0), 0)
  const serviceExpenses = monthlyExpensesList.filter(p => p.category === 'Servicio').reduce((acc, p) => acc + (p.amount || 0), 0)

  const expensesByCategory = useMemo(() => {
    if (expensesCategoryFilter === 'Todos') return monthlyExpensesList
    return monthlyExpensesList.filter(p => p.category === expensesCategoryFilter)
  }, [monthlyExpensesList, expensesCategoryFilter])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Main Chart */}
      <Card className="lg:col-span-2 rounded-2xl border-0 shadow-sm bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold text-foreground">Resumen de Ventas</CardTitle>
          <Select value={period} onValueChange={(v: 'month' | 'year') => setPeriod(v)}>
            <SelectTrigger className="w-28 h-8 text-xs rounded-lg border-0 bg-secondary/50">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mensual</SelectItem>
              <SelectItem value="year">Anual</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={primaryColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke={textColor}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke={textColor}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: tooltipBg, 
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: '12px',
                    color: tooltipText,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  labelStyle={{ color: tooltipText, fontWeight: 600 }}
                  cursor={{ stroke: primaryColor, strokeWidth: 1, strokeDasharray: '5 5' }}
                />
                <Area 
                  type="monotone"
                  dataKey="clients" 
                  name="Clientes"
                  stroke={primaryColor}
                  strokeWidth={3}
                  fill="url(#colorClients)"
                  dot={{ fill: primaryColor, strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: primaryColor, stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Side Charts */}
      <div className="space-y-4">
        {/* Mini Chart 1 - Gastos del Mes */}
        <Card
          className="rounded-2xl border-0 shadow-sm bg-card cursor-pointer hover:shadow-lg transition-all duration-200"
          onClick={() => {
            setExpensesCategoryFilter('Todos')
            setIsExpensesModalOpen(true)
          }}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground shrink-0">Gastos del Mes</CardTitle>
              <span className="text-xs font-medium px-2 py-1 rounded-full shrink-0 text-destructive bg-destructive/10">
                {monthlyExpensesList.length} registro{monthlyExpensesList.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="mt-1">
              <p className="text-2xl font-bold text-foreground">S/ {totalExpenses.toLocaleString()}</p>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Producto</span>
                <span className="font-semibold text-foreground">S/ {productExpenses.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Servicio</span>
                <span className="font-semibold text-foreground">S/ {serviceExpenses.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mini Chart 2 */}
        <Card className="rounded-2xl border-0 shadow-sm bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Nuevos Miembros</CardTitle>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${clientsChangePct >= 0 ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'}`}>
                {clientsChangePct >= 0 ? '+' : ''}{clientsChangePct}%
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{chartData.reduce((a, d) => a + d.clients, 0)}</p>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-[80px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.slice(-6)}>
                  <defs>
                    <linearGradient id="colorMini" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9B6DD7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#9B6DD7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone"
                    dataKey="clients" 
                    stroke="#9B6DD7"
                    strokeWidth={2}
                    fill="url(#colorMini)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Gastos del Mes */}
      <Dialog open={isExpensesModalOpen} onOpenChange={setIsExpensesModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gastos del Mes - {MONTH_NAMES[currentMonth]} {currentYear}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-2">
            {(['Todos', 'Producto', 'Servicio'] as const).map(option => (
              <button
                key={option}
                onClick={() => setExpensesCategoryFilter(option)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  expensesCategoryFilter === option
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="space-y-3 mt-4">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs text-muted-foreground">{expensesByCategory.length} registro{expensesByCategory.length === 1 ? '' : 's'}</span>
              <span className="text-sm font-bold text-foreground">
                S/ {expensesByCategory.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}
              </span>
            </div>
            {expensesByCategory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay gastos en esta categoría este mes</p>
            ) : (
              <div className="space-y-2">
                {expensesByCategory.map(purchase => (
                  <div key={purchase.id} className="p-3 bg-secondary/30 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{purchase.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {purchase.category} · {formatDebtDate(purchase.purchaseDate)}
                          {purchase.category !== 'Servicio' && ` · Cant. ${purchase.quantity}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">S/ {purchase.amount.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">{purchase.paymentMethod}</p>
                      </div>
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
