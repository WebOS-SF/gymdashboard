'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ButtonSpinner } from '@/components/ui/button-spinner'
import { X } from 'lucide-react'
import { Client, ClientPlan, DurationUnit, PlanTier, Weekday } from '@/lib/types'
import {
  buildPlanPayload,
  durationUnitLabels,
  planTierLabels,
  weekdayLabels,
  weekdayOrder,
} from '@/lib/client-utils'

const paymentMethods = ['Efectivo', 'Tarjeta', 'Plin', 'Yape']
const turns = ['Mañana', 'Tarde', 'Noche']
type AttendancePreset = 'daily' | 'alternate' | 'custom'
type PlanModalMode = 'create' | 'renew' | 'edit'

interface PlanModalProps {
  mode: PlanModalMode
  clients: Client[]
  client: Client | null
  plan: ClientPlan | null
  canViewMoney: boolean
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSave: (plan: Record<string, unknown>) => Promise<void>
}

interface PlanFormState {
  id?: number
  clientDni: string
  planTier: PlanTier
  joinDate: string
  durationValue: number
  durationUnit: DurationUnit
  attendancePreset: AttendancePreset
  attendanceDays: Weekday[]
  paymentMethod: string
  turn: string
  amountPaid: number
}

const defaultAttendanceDays: Weekday[] = [...weekdayOrder]
const alternateAttendanceDays: Weekday[] = ['monday', 'wednesday', 'friday']

const normalizeSearchValue = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const getClientMatchScore = (client: Client, term: string) => {
  const name = normalizeSearchValue(client.name || '')
  const dni = String(client.dni || '')

  if (!term) return 0
  if (dni === term || name === term) return 100
  if (dni.startsWith(term) || name.startsWith(term)) return 80
  if (dni.includes(term) || name.includes(term)) return 60

  return name.split(/\s+/).some((word) => word.startsWith(term)) ? 50 : 0
}

function inferPreset(days: Weekday[]): AttendancePreset {
  if (days.length === weekdayOrder.length) return 'daily'
  if (days.join(',') === alternateAttendanceDays.join(',')) return 'alternate'
  return 'custom'
}

function buildInitialState(mode: PlanModalMode, client: Client | null, plan: ClientPlan | null): PlanFormState {
  if (mode === 'edit' && plan && client) {
    return {
      id: plan.id,
      clientDni: client.dni,
      planTier: plan.planTier,
      joinDate: plan.startDate,
      durationValue: plan.durationValue,
      durationUnit: plan.durationUnit,
      attendancePreset: inferPreset(plan.attendanceDays),
      attendanceDays: plan.attendanceDays,
      paymentMethod: plan.paymentMethod || 'Efectivo',
      turn: plan.turn || 'Mañana',
      amountPaid: plan.amountPaid,
    }
  }

  return {
    clientDni: client?.dni || '',
    planTier: client?.planTier || 'basic',
    joinDate: new Date().toISOString().split('T')[0],
    durationValue: 0,
    durationUnit: 'month',
    attendancePreset: 'daily',
    attendanceDays: defaultAttendanceDays,
    paymentMethod: 'Efectivo',
    turn: 'Mañana',
    amountPaid: 0,
  }
}

function paymentSummaryLabel(amountPaid: number, totalPrice: number) {
  if (amountPaid >= totalPrice) return 'Pagado completo'
  if (amountPaid > 0) return 'Pago parcial'
  return 'Sin pago'
}

export function PlanModal({ mode, clients, client, plan, canViewMoney, isOpen, isSaving, onClose, onSave }: PlanModalProps) {
  const [formData, setFormData] = useState<PlanFormState>(buildInitialState(mode, client, plan))

  useEffect(() => {
    setFormData(buildInitialState(mode, client, plan))
  }, [mode, client, plan, isOpen])

  const selectedClient = clients.find((item) => item.dni === formData.clientDni) || client
  const clientSuggestions = useMemo(() => {
    const term = normalizeSearchValue(formData.clientDni)

    if (!term || mode === 'edit') return []

    return clients
      .map((item) => ({
        client: item,
        score: getClientMatchScore(item, term),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return (a.client.name || '').localeCompare(b.client.name || '')
      })
      .slice(0, 5)
      .map(({ client }) => client)
  }, [clients, formData.clientDni, mode])
  const hasPlanInputs = Boolean(
    formData.clientDni &&
    formData.joinDate &&
    formData.durationValue > 0 &&
    formData.attendanceDays.length > 0
  )

  const planPreview = useMemo(() => {
    if (!hasPlanInputs) return null

    return buildPlanPayload({
      planTier: formData.planTier,
      startDate: new Date(formData.joinDate),
      durationValue: formData.durationValue,
      durationUnit: formData.durationUnit,
      attendanceDays: formData.attendanceDays,
      amountPaid: formData.amountPaid,
      paymentMethod: formData.paymentMethod,
      turn: formData.turn,
    })
  }, [formData, hasPlanInputs])

  const handleAttendancePresetChange = (preset: AttendancePreset) => {
    setFormData((current) => ({
      ...current,
      attendancePreset: preset,
      attendanceDays:
        preset === 'daily'
          ? defaultAttendanceDays
          : preset === 'alternate'
            ? alternateAttendanceDays
            : current.attendanceDays.length > 0
              ? current.attendanceDays
              : ['monday', 'thursday'],
    }))
  }

  const toggleDay = (day: Weekday, checked: boolean) => {
    setFormData((current) => {
      const nextDays = checked
        ? [...current.attendanceDays, day]
        : current.attendanceDays.filter((value) => value !== day)

      return {
        ...current,
        attendancePreset: 'custom',
        attendanceDays: weekdayOrder.filter((value) => nextDays.includes(value)),
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!planPreview || isSaving) return

    await onSave({
      id: formData.id,
      clientDni: formData.clientDni,
      planTier: formData.planTier,
      joinDate: formData.joinDate,
      durationValue: formData.durationValue,
      durationUnit: formData.durationUnit,
      attendanceDays: formData.attendanceDays,
      paymentMethod: formData.paymentMethod,
      turn: formData.turn,
      amountPaid: formData.amountPaid,
      plan: planPreview.name,
      planPrice: planPreview.totalPrice,
      debt: planPreview.debt,
    })
  }

  if (!isOpen) return null

  const isDaysLocked = formData.attendancePreset !== 'custom'
  const title =
    mode === 'edit'
      ? 'Editar Plan'
      : mode === 'renew'
        ? 'Renovar Plan'
        : 'Crear Plan'
  const description =
    mode === 'edit'
      ? 'Este modal modifica solo ese plan. No crea una renovación.'
      : 'Aquí se crea un nuevo plan o una renovación para un cliente existente.'

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-foreground">{title}</CardTitle>
            <CardDescription className="text-muted-foreground">{description}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isSaving} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="plan-client-dni">DNI del Cliente</FieldLabel>
                  <div className="relative">
                    <Input
                      id="plan-client-dni"
                      value={formData.clientDni}
                      onChange={(e) => setFormData({ ...formData, clientDni: e.target.value })}
                      className="bg-input border-border text-foreground"
                      required
                      disabled={mode === 'edit'}
                    />
                    {clientSuggestions.length > 0 && !selectedClient && (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-50 overflow-hidden rounded-xl border border-border/80 bg-popover shadow-xl">
                        {clientSuggestions.map((suggestedClient) => (
                          <button
                            key={suggestedClient.id}
                            type="button"
                            onClick={() =>
                              setFormData((current) => ({
                                ...current,
                                clientDni: suggestedClient.dni,
                                planTier: suggestedClient.planTier || current.planTier,
                              }))
                            }
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-secondary focus:bg-secondary focus:outline-none"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {suggestedClient.name || 'Sin nombre'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                DNI {suggestedClient.dni}
                              </p>
                            </div>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {suggestedClient.plan || 'Sin plan'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Field>
                <Field>
                  <FieldLabel>Cliente</FieldLabel>
                  <Input
                    value={selectedClient?.name || ''}
                    readOnly
                    placeholder="Se autocompleta al escribir un DNI registrado"
                    className="bg-input border-border text-foreground"
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Plan</FieldLabel>
                  <Select
                    value={formData.planTier}
                    onValueChange={(planTier: PlanTier) => setFormData({ ...formData, planTier })}
                  >
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {Object.entries(planTierLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-foreground hover:bg-secondary">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="plan-join-date">Inicio del Plan</FieldLabel>
                  <Input
                    id="plan-join-date"
                    type="date"
                    value={formData.joinDate}
                    onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                    className="bg-input border-border text-foreground"
                    required
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Periodo</FieldLabel>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={formData.durationValue}
                      onChange={(e) => setFormData({ ...formData, durationValue: Number(e.target.value) || 0 })}
                      className="bg-input border-border text-foreground"
                      required
                    />
                    <Select
                      value={formData.durationUnit}
                      onValueChange={(durationUnit: DurationUnit) => setFormData({ ...formData, durationUnit })}
                    >
                      <SelectTrigger className="bg-input border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {Object.entries(durationUnitLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value} className="text-foreground hover:bg-secondary">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Field>

                <Field>
                  <FieldLabel>Frecuencia</FieldLabel>
                  <Select value={formData.attendancePreset} onValueChange={(value: AttendancePreset) => handleAttendancePresetChange(value)}>
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="daily" className="text-foreground hover:bg-secondary">Diario</SelectItem>
                      <SelectItem value="alternate" className="text-foreground hover:bg-secondary">Interdiario</SelectItem>
                      <SelectItem value="custom" className="text-foreground hover:bg-secondary">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <FieldLabel>Días permitidos</FieldLabel>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 rounded-xl border border-border/60 p-4">
                  {weekdayOrder.map((day) => (
                    <label key={day} className="flex items-center gap-2 text-sm text-foreground">
                      <Checkbox
                        checked={formData.attendanceDays.includes(day)}
                        disabled={isDaysLocked}
                        onCheckedChange={(checked) => toggleDay(day, Boolean(checked))}
                      />
                      {weekdayLabels[day]}
                    </label>
                  ))}
                </div>
              </Field>

              <div className="grid gap-4 md:grid-cols-3">
                <Field>
                  <FieldLabel>Medio de Pago</FieldLabel>
                  <Select value={formData.paymentMethod} onValueChange={(paymentMethod) => setFormData({ ...formData, paymentMethod })}>
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
                  <Select value={formData.turn} onValueChange={(turn) => setFormData({ ...formData, turn })}>
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
                <Field>
                  <FieldLabel htmlFor="plan-amount-paid">Monto Pagado</FieldLabel>
                  <Input
                    id="plan-amount-paid"
                    type="number"
                    min={0}
                    step="0.01"
                    value={formData.amountPaid}
                    onChange={(e) => setFormData({ ...formData, amountPaid: Number(e.target.value) || 0 })}
                    className="bg-input border-border text-foreground"
                    required
                  />
                </Field>
              </div>
            </FieldGroup>

            <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-3">
              {planPreview ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-lg border-border/60">{planPreview.name}</Badge>
                  <Badge variant="outline" className="rounded-lg border-border/60">
                    Vence: {planPreview.endDate.toISOString().split('T')[0]}
                  </Badge>
                  <Badge variant="outline" className="rounded-lg border-border/60">
                    {paymentSummaryLabel(formData.amountPaid, planPreview.totalPrice)}
                  </Badge>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-lg border-border/60">
                    Completa cliente, periodo y días para ver el cálculo
                  </Badge>
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Sesiones</p>
                  <p className="font-semibold text-foreground">{planPreview?.sessionCount || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Precio Total</p>
                  <p className="font-semibold text-foreground">
                    {canViewMoney ? `S/ ${(planPreview?.totalPrice || 0).toLocaleString()}` : 'Restringido'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pagado</p>
                  <p className="font-semibold text-foreground">
                    {canViewMoney ? `S/ ${formData.amountPaid.toLocaleString()}` : 'Restringido'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Deuda</p>
                  <p className={`font-semibold ${(planPreview?.debt || 0) > 0 ? 'text-[#FF6B6B]' : 'text-[#26DE81]'}`}>
                    {canViewMoney ? `S/ ${(planPreview?.debt || 0).toLocaleString()}` : 'Restringido'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!planPreview || !selectedClient || isSaving}>
                {isSaving && <ButtonSpinner />}
                {mode === 'edit' ? 'Guardar Plan' : 'Crear Plan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
