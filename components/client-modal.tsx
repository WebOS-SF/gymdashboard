'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Trash2, Plus } from 'lucide-react'
import { Client, ClientStatus, Product } from '@/lib/types'
import { plans, planPrices } from '@/lib/mock-data'

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
    debts: []
  })
  const [newDebtProductId, setNewDebtProductId] = useState('')

  useEffect(() => {
    if (client) {
      setFormData(client)
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

  const handleAddDebt = () => {
    if (!newDebtProductId) return
    const product = products.find(p => String(p.id) === newDebtProductId)
    if (!product) return
    
    const newDebt = {
      id: crypto.randomUUID(),
      productId: String(product.id),
      productName: product.name,
      amount: product.price,
      date: new Date().toISOString().split('T')[0]
    }
    
    setFormData({
      ...formData,
      debts: [...formData.debts, newDebt],
      status: 'pending_payment'
    })
    setNewDebtProductId('')
  }

  const handleRemoveDebt = (debtId: string) => {
    const newDebts = formData.debts.filter(d => d.id !== debtId)
    setFormData({
      ...formData,
      debts: newDebts,
      status: newDebts.length === 0 && formData.status === 'pending_payment' ? 'active' : formData.status
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onClose()
  }

  const getStatusLabel = (status: ClientStatus) => {
    switch (status) {
      case 'active': return 'Activo'
      case 'inactive': return 'Inactivo'
      case 'pending_payment': return 'Pago Pendiente'
    }
  }

  const totalDebt = formData.debts.reduce((acc, d) => acc + d.amount, 0)

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
                    value={formData.status} 
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
            </FieldGroup>

            {canViewMoney && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground">Deudas de Productos</h4>
                  {totalDebt > 0 && (
                    <Badge variant="destructive">Total: ${totalDebt.toLocaleString()}</Badge>
                  )}
                </div>

                {formData.debts.length > 0 && (
                  <div className="space-y-2">
                    {formData.debts.map((debt) => (
                      <div
                        key={debt.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{debt.productName}</p>
                          <p className="text-xs text-muted-foreground">{debt.date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-destructive">
                            ${debt.amount.toLocaleString()}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveDebt(debt.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Select value={newDebtProductId} onValueChange={setNewDebtProductId}>
                    <SelectTrigger className="flex-1 bg-input border-border text-foreground">
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {products.map((product) => (
                        <SelectItem key={product.id} value={String(product.id)} className="text-foreground hover:bg-secondary">
                          {product.name} - ${product.price.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddDebt}
                    disabled={!newDebtProductId}
                    className="border-border text-foreground hover:bg-secondary"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
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
