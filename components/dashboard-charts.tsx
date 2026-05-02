'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { MonthlyData, ProductSale } from '@/lib/types'
import { useTheme } from '@/hooks/use-theme'
import { useMemo, useState } from 'react'

interface DashboardChartsProps {
  data: MonthlyData[]
  sales: ProductSale[]
}

export function DashboardCharts({ data, sales }: DashboardChartsProps) {
  const { theme, mounted } = useTheme()
  const [period, setPeriod] = useState<'month' | 'year'>('year')
  const [productsDate, setProductsDate] = useState<string>('')
  
  const primaryColor = "#FF6B6B"
  const accentColor = "#5B8DEF"
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

  const productsChartData = useMemo(() => {
    if (!productsDate) {
      return chartData.slice(-6).map(d => ({ name: d.month, products: d.products }))
    }
    const filteredSales = sales.filter(s => {
      const d = new Date(s.saleDate)
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return ds === productsDate
    })
    const grouped = new Map<string, number>()
    for (const s of filteredSales) {
      grouped.set(s.product, (grouped.get(s.product) || 0) + 1)
    }
    return Array.from(grouped.entries()).map(([name, products]) => ({ name, products }))
  }, [chartData, sales, productsDate])

  const totalProducts = productsDate 
    ? productsChartData.reduce((a, d) => a + d.products, 0)
    : chartData.reduce((a, d) => a + d.products, 0)

  const productsChange = last && prev ? last.products - prev.products : 0
  const productsChangePct = last && prev && prev.products > 0 ? Math.round((productsChange / prev.products) * 100) : 0

  const clientsChange = last && prev ? last.clients - prev.clients : 0
  const clientsChangePct = last && prev && prev.clients > 0 ? Math.round((clientsChange / prev.clients) * 100) : 0
  
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
        {/* Mini Chart 1 */}
        <Card className="rounded-2xl border-0 shadow-sm bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground shrink-0">Productos Vendidos</CardTitle>
              <div className="flex items-center gap-2">
                <Input 
                  type="date" 
                  value={productsDate} 
                  onChange={e => setProductsDate(e.target.value)}
                  className="h-7 w-[110px] sm:w-[120px] text-xs px-2 py-1 bg-secondary/50 border-0 text-muted-foreground"
                />
                {productsDate ? (
                  <button onClick={() => setProductsDate('')} className="text-xs text-muted-foreground hover:text-foreground shrink-0">
                    Limpiar
                  </button>
                ) : (
                  <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${productsChangePct >= 0 ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'}`}>
                    {productsChangePct >= 0 ? '+' : ''}{productsChangePct}%
                  </span>
                )}
              </div>
            </div>
            <div className="mt-1">
              <p className="text-2xl font-bold text-foreground">{totalProducts}</p>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-[80px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productsChartData}>
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: tooltipText, fontWeight: 600, marginBottom: '4px' }}
                    formatter={(val: number) => [val, 'Ventas']}
                  />
                  <Bar 
                    dataKey="products" 
                    fill={accentColor}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
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
    </div>
  )
}
