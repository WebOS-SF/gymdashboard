'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus, Edit2, CalendarRange } from 'lucide-react'
import { Client, ClientPlan } from '@/lib/types'
import { PlanModal } from './plan-modal'
import { toast } from 'sonner'

interface FlattenedPlan extends ClientPlan {
  clientDni: string
  clientName: string
}

interface PlansListProps {
  clients: Client[]
  canViewMoney: boolean
  onClientsChange: (clients: Client[]) => void
}

export function PlansList({ clients, canViewMoney, onClientsChange }: PlansListProps) {
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'renew' | 'edit'>('create')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<FlattenedPlan | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const plans = useMemo<FlattenedPlan[]>(() => {
    return clients.flatMap((client) =>
      (client.plans || []).map((plan) => ({
        ...plan,
        clientDni: client.dni,
        clientName: client.name,
      }))
    ).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
  }, [clients])

  const filteredPlans = plans.filter((plan) => {
    const term = search.toLowerCase()
    return (
      plan.clientDni.includes(term) ||
      plan.clientName.toLowerCase().includes(term) ||
      plan.name.toLowerCase().includes(term)
    )
  })

  const replaceClient = (updatedClient: Client) => {
    const exists = clients.some((client) => client.dni === updatedClient.dni)
    if (exists) {
      onClientsChange(clients.map((client) => client.dni === updatedClient.dni ? updatedClient : client))
    } else {
      onClientsChange([...clients, updatedClient])
    }
  }

  const openCreate = () => {
    setSelectedClient(null)
    setSelectedPlan(null)
    setModalMode('create')
    setIsModalOpen(true)
  }

  const openRenew = (client: Client) => {
    setSelectedClient(client)
    setSelectedPlan(null)
    setModalMode('renew')
    setIsModalOpen(true)
  }

  const openEdit = (plan: FlattenedPlan) => {
    setSelectedPlan(plan)
    setSelectedClient(clients.find((client) => client.dni === plan.clientDni) || null)
    setModalMode('edit')
    setIsModalOpen(true)
  }

  const handleSave = async (payload: Record<string, unknown>) => {
    if (isSaving) return

    setIsSaving(true)
    try {
      const endpoint = modalMode === 'edit' ? `/api/client-plans/${payload.id}` : '/api/client-plans'
      const method = modalMode === 'edit' ? 'PUT' : 'POST'
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Error guardando plan')
      }

      replaceClient(data)
      setIsModalOpen(false)
      toast.success(
        modalMode === 'edit' ? 'Plan actualizado' : modalMode === 'renew' ? 'Plan renovado' : 'Plan creado',
        {
          description:
            modalMode === 'edit'
              ? 'Los cambios del plan quedaron guardados.'
              : 'El plan ya quedó registrado para el cliente.',
        }
      )
    } catch (error) {
      console.error('Error guardando plan:', error)
      toast.error('No se pudo guardar el plan', {
        description: error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Card className="rounded-2xl border-0 shadow-sm bg-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#26DE81] to-[#20c572] flex items-center justify-center shadow-lg">
                <CalendarRange className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-foreground">Planes</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {filteredPlans.length} de {plans.length} planes registrados
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, DNI o plan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10 rounded-xl bg-secondary/50 border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
                />
              </div>
              <Button
                onClick={openCreate}
                className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Plan / Renovar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl bg-secondary/30">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Cliente</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Plan</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Periodo</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider hidden xl:table-cell">Asistencia</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Estado</TableHead>
                  {canViewMoney && (
                    <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Monto</TableHead>
                  )}
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.map((plan, index) => (
                  <TableRow
                    key={plan.id}
                    className={`border-0 hover:bg-secondary/50 transition-colors ${index % 2 === 0 ? 'bg-card' : 'bg-transparent'}`}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{plan.clientName}</p>
                        <p className="text-xs text-muted-foreground">{plan.clientDni}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-border/50 text-foreground font-normal rounded-lg">
                        {plan.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      <div>
                        <p>Inicio: {plan.startDate}</p>
                        <p>Vence: {plan.endDate}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-muted-foreground">
                      <div>
                        <p>{plan.attendanceLabel}</p>
                        <p className="text-xs">{plan.turn} · {plan.paymentMethod}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={plan.status === 'active' ? 'bg-[#26DE81]/15 text-[#26DE81] border-0 font-medium' : 'bg-secondary text-muted-foreground border-0 font-medium'}>
                        {plan.status === 'active' ? 'Activo' : 'Vencido'}
                      </Badge>
                    </TableCell>
                    {canViewMoney && (
                      <TableCell className="hidden sm:table-cell">
                        <div>
                          <p className="text-foreground font-semibold">S/ {plan.totalPrice.toLocaleString()}</p>
                          <p className={`${plan.debt > 0 ? 'text-[#FF6B6B]' : 'text-muted-foreground'} text-xs`}>
                            Deuda: S/ {plan.debt.toLocaleString()}
                          </p>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(plan)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openRenew(clients.find((client) => client.dni === plan.clientDni)!)}
                          className="rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                          Renovar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPlans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {search ? 'No se encontraron planes con ese criterio' : 'No hay planes registrados'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PlanModal
        key={selectedPlan ? `edit-${selectedPlan.id}` : selectedClient ? `renew-${selectedClient.dni}` : 'create'}
        mode={modalMode}
        clients={clients}
        client={selectedClient}
        plan={selectedPlan}
        canViewMoney={true}
        isOpen={isModalOpen}
        isSaving={isSaving}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </>
  )
}
