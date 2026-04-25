'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonSpinner } from '@/components/ui/button-spinner'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { X } from 'lucide-react'
import { Client } from '@/lib/types'

interface ClientModalProps {
  client: Client | null
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSave: (client: Record<string, unknown>) => Promise<void>
}

interface ClientFormState {
  id: string
  name: string
  phone: string
  dni: string
}

function buildInitialState(client: Client | null): ClientFormState {
  return {
    id: client?.id || crypto.randomUUID(),
    name: client?.name || '',
    phone: client?.phone || '',
    dni: client?.dni || '',
  }
}

export function ClientModal({ client, isOpen, isSaving, onClose, onSave }: ClientModalProps) {
  const [formData, setFormData] = useState<ClientFormState>(buildInitialState(client))

  useEffect(() => {
    setFormData(buildInitialState(client))
  }, [client, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return
    await onSave({ ...formData })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-foreground">
              {client ? 'Editar Cliente' : 'Nuevo Cliente'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Aquí solo se editan los datos personales del cliente.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isSaving} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="client-name">Nombre Completo</FieldLabel>
                <Input
                  id="client-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-input border-border text-foreground"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="client-phone">Teléfono</FieldLabel>
                <Input
                  id="client-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-input border-border text-foreground"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="client-dni">DNI</FieldLabel>
                <Input
                  id="client-dni"
                  value={formData.dni}
                  onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                  className="bg-input border-border text-foreground"
                  required
                  disabled={Boolean(client)}
                />
              </Field>
            </FieldGroup>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <ButtonSpinner />}
                {client ? 'Guardar Cliente' : 'Crear Cliente'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
