'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { Client, ClientStatus, Product } from '@/lib/types'
import { plans, planPrices } from '@/lib/mock-data'

const paymentMethods = ['Efectivo', 'Tarjeta', 'Plin', 'Yape']
const turns = ['Mañana', 'Tarde', 'Noche']

function normalizeSelectValue(value: string | undefined, options: string[], fallback: string) {
  const current = options.find((option) => option.toLowerCase() === String(value || '').toLowerCase())
  return current || fallback
}

function normalizeStatusValue(value: string | undefined): ClientStatus {
  const current = String(value || 'active').trim().toLowerCase()

  if (current === 'inactive' || current === 'inactivo') return 'inactive'
  if (
    current === 'pending_payment' ||
    current === 'pending payment' ||
    current === 'pago pendiente' ||
    current === 'pendiente'
  ) {
    return 'pending_payment'
  }

  return 'active'
}

interface ClientModalProps {
  client: Client | null
  products: Product[]
  canViewMoney: boolean
  isOpen: boolean
  onClose: () => void
  onSave: (client: Client) => void
}

export function ClientModal({ client, products, canViewMoney, isOpen, onClose, onSave }: ClientModalProps) {
  const [formData, setFormData] = useState<Client>({
    id: '',
    name: '',
    phone: '',
    dni: '',
    status: 'active',
    plan: 'Básico',
    planPrice: 15000,
    joinDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Efectivo',
    turn: 'Mañana',
    debt: 0,
    debts: []
  })

  useEffect(() => {
    if (client) {
      setFormData({
        ...client,
        status: normalizeStatusValue(client.status),
        paymentMethod: normalizeSelectValue(client.paymentMethod, paymentMethods, 'Efectivo'),
        turn: normalizeSelectValue(client.turn, turns, 'Mañana'),
        debt: Number(client.debt || 0),
      })
    } else {
      setFormData({   
        id: crypto.randomUUID(),
        name: '',
        phone: '',
        dni: '',
        status: 'active',
        plan: 'Básico',
        planPrice: 15000,
        joinDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Efectivo',
        turn: 'Mañana',
        debt: 0,
        debts: []
      })
    }
  }, [client, isOpen])

  const handlePlanChange = (plan: string) => {
    setFormData({
      ...formData,
      plan,
      planPrice: planPrices[plan] || 15000
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      status: normalizeStatusValue(formData.status),
      debt: Number(formData.debt || 0),
      debts: Number(formData.debt || 0) > 0 ? [{
        id: `debt-${formData.dni}`,
        productId: 'general',
        productName: 'Deuda General',
        amount: Number(formData.debt || 0),
        date: formData.joinDate,
      }] : [],
    })
  }

  const getStatusLabel = (status: ClientStatus) => {
    switch (status) {
      case 'active': return 'Activo'
      case 'inactive': return 'Inactivo'
      case 'pending_payment': return 'Pago Pendiente'
    }
  }

  const totalDebt = Number(formData.debt || 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-foreground">
              {client ? 'Editar Cliente' : 'Nuevo Cliente'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {client ? 'Modifica los datos del cliente' : 'Completa los datos del nuevo cliente'}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Nombre Completo</FieldLabel>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-input border-border text-foreground"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="dni">DNI</FieldLabel>
                <Input
                  id="dni"
                  value={formData.dni}
                  onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                  className="bg-input border-border text-foreground"
                  required
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Plan</FieldLabel>
                  <Select value={formData.plan} onValueChange={handlePlanChange}>
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {plans.map((plan) => (
                        <SelectItem key={plan} value={plan} className="text-foreground hover:bg-secondary">
                          {canViewMoney ? `${plan} - $${planPrices[plan].toLocaleString()}` : plan}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Estado</FieldLabel>
                  <Select 
                    value={normalizeStatusValue(formData.status)}
                    onValueChange={(value: ClientStatus) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="active" className="text-foreground hover:bg-secondary">Activo</SelectItem>
                      <SelectItem value="inactive" className="text-foreground hover:bg-secondary">Inactivo</SelectItem>
                      <SelectItem value="pending_payment" className="text-foreground hover:bg-secondary">Pago Pendiente</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="joinDate">Fecha de Ingreso</FieldLabel>
                  <Input
                    id="joinDate"
                    type="date"
                    value={formData.joinDate}
                    onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                    className="bg-input border-border text-foreground"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="planPrice">Cuota</FieldLabel>
                  <Input
                    id="planPrice"
                    type="number"
                    min={0}
                    value={formData.planPrice}
                    onChange={(e) => setFormData({ ...formData, planPrice: Number(e.target.value) })}
                    className="bg-input border-border text-foreground"
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Medio de Pago</FieldLabel>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(paymentMethod) => setFormData({ ...formData, paymentMethod })}
                  >
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {paymentMethods.map((method) => (
                        <SelectItem key={method} value={method} className="text-foreground hover:bg-secondary">
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Turno</FieldLabel>
                  <Select
                    value={formData.turn}
                    onValueChange={(turn) => setFormData({ ...formData, turn })}
                  >
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {turns.map((turn) => (
                        <SelectItem key={turn} value={turn} className="text-foreground hover:bg-secondary">
                          {turn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="debt">Deuda</FieldLabel>
                <Input
                  id="debt"
                  type="number"
                  min={0}
                  value={formData.debt}
                  onChange={(e) => setFormData({ ...formData, debt: Number(e.target.value) })}
                  className="bg-input border-border text-foreground"
                />
              </Field>
            </FieldGroup>

            {canViewMoney && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground">Resumen del Cliente</h4>
                  <Badge variant={totalDebt > 0 ? 'destructive' : 'outline'}>
                    Deuda: ${totalDebt.toLocaleString()}
                  </Badge>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="flex-1 border-border text-foreground hover:bg-secondary"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {client ? 'Guardar Cambios' : 'Crear Cliente'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
