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
import { X, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Client, ClientPlan, DurationUnit, PlanTier, Weekday } from '@/lib/types'
import {
  buildPlanPayload,
  durationUnitLabels,
  normalizePlanTier,
  normalizeDurationUnit,
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
  onDelete?: (planId: number) => Promise<void>
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
      planTier: normalizePlanTier(plan.planTier),
      joinDate: plan.startDate,
      durationValue: plan.durationValue,
      durationUnit: normalizeDurationUnit(plan.durationUnit),
      attendancePreset: inferPreset(plan.attendanceDays),
      attendanceDays: plan.attendanceDays,
      paymentMethod: plan.paymentMethod || 'Efectivo',
      turn: plan.turn || 'Mañana',
      amountPaid: plan.amountPaid,
    }
  }

  const d = new Date()
  const todayLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const initialPlanTier = client?.planTier || 'basic'

  if (initialPlanTier === 'por_dia') {
    return {
      clientDni: client?.dni || '',
      planTier: 'por_dia',
      joinDate: todayLocal,
      durationValue: 1,
      durationUnit: 'day',
      attendancePreset: 'custom',
      attendanceDays: [weekdayOrder[(d.getDay() + 6) % 7]],
      paymentMethod: 'Efectivo',
      turn: 'Mañana',
      amountPaid: 0,
    }
  }

  return {
    clientDni: client?.dni || '',
    planTier: initialPlanTier,
    joinDate: todayLocal,
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

export function PlanModal({ mode, clients, client, plan, canViewMoney, isOpen, isSaving, onClose, onSave, onDelete }: PlanModalProps) {
  const [formData, setFormData] = useState<PlanFormState>(buildInitialState(mode, client, plan))
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  useEffect(() => {
    setFormData(buildInitialState(mode, client, plan))
  }, [mode, client, plan, isOpen])

  useEffect(() => {
    if (formData.planTier === 'por_dia' && formData.joinDate) {
      const [year, month, day] = formData.joinDate.split('-').map(Number)
      if (year && month && day) {
        // Crear fecha localmente para obtener el día de la semana correcto
        const date = new Date(year, month - 1, day)
        const dayOfWeek = weekdayOrder[(date.getDay() + 6) % 7]

        setFormData((prev) => {
          if (prev.attendanceDays.length === 1 && prev.attendanceDays[0] === dayOfWeek) {
            return prev
          }
          return {
            ...prev,
            attendanceDays: [dayOfWeek],
            attendancePreset: 'custom',
          }
        })
      }
    }
  }, [formData.planTier, formData.joinDate])

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
  const hasValidDaySelection = useMemo(() => {
    if (formData.planTier === 'interdiario') return true
    if (formData.planTier === 'interdiario_trotadora') return true
    if (formData.planTier === 'diario') return formData.attendanceDays.length === 6
    if (formData.planTier === 'diario_trotadora') return formData.attendanceDays.length === 6
    if (formData.planTier === 'promo_exclusiva_diario') return formData.attendanceDays.length === 6
    if (formData.planTier === 'cliente_antiguo_3meses') return formData.attendanceDays.length === 6
    if (formData.planTier === 'promo_cliente_medium_3meses') return formData.attendanceDays.length === 6
    if (formData.planTier === 'por_dia') return formData.attendanceDays.length === 1
    return formData.attendanceDays.length > 0
  }, [formData.planTier, formData.attendanceDays])

  const hasPlanInputs = Boolean(
    formData.clientDni &&
    formData.joinDate &&
    formData.durationValue > 0 &&
    hasValidDaySelection
  )

  const validationMessage = useMemo(() => {
    if (!formData.clientDni) return 'Selecciona un cliente con su DNI'
    if (formData.durationValue <= 0) return 'Ingresa un periodo (ej: 1 mes)'
    if (formData.planTier === 'diario' && formData.attendanceDays.length !== 6) {
      return 'Plan Diario: Debes marcar los 6 días (lun-sab)'
    }
    if (formData.planTier === 'diario_trotadora' && formData.attendanceDays.length !== 6) {
      return 'Diario + Trotadora: Debes marcar los 6 días (lun-sab) para el gym'
    }
    if (formData.planTier === 'promo_exclusiva_diario' && formData.attendanceDays.length !== 6) {
      return 'Promo Exclusiva Diario: Debes marcar los 6 días (lun-sab)'
    }
    if (formData.planTier === 'cliente_antiguo_3meses' && formData.attendanceDays.length !== 6) {
      return 'Cliente Antiguo (3 meses): Debes marcar los 6 días (lun-sab)'
    }
    if (formData.planTier === 'promo_cliente_medium_3meses' && formData.attendanceDays.length !== 6) {
      return 'Promo Cliente Medium (3 meses): Debes marcar los 6 días (lun-sab)'
    }
    if (formData.planTier === 'por_dia' && formData.attendanceDays.length !== 1) {
      return 'Pago por día: Selecciona exactamente 1 día'
    }
    if (formData.attendanceDays.length === 0) return 'Selecciona al menos un día de asistencia'
    return null
  }, [formData])

  const planPreview = useMemo(() => {
    if (!hasPlanInputs) return null

    // Parsear fecha de forma segura (YYYY-MM-DD) para evitar desfases de zona horaria
    const [y, m, d] = formData.joinDate.split('-').map(Number)
    const startDate = new Date(y, m - 1, d)

    return buildPlanPayload({
      planTier: formData.planTier,
      startDate,
      durationValue: formData.durationValue,
      durationUnit: formData.durationUnit,
      attendanceDays: formData.attendanceDays,
      amountPaid: formData.amountPaid,
      paymentMethod: formData.paymentMethod,
      turn: formData.turn,
    })
  }, [formData, hasPlanInputs])

  const handlePlanTierChange = (planTier: PlanTier) => {
    setFormData((current) => {
      const updates: Partial<PlanFormState> = { planTier }

      if (planTier === 'interdiario' || planTier === 'interdiario_trotadora') {
        updates.durationValue = 1
        updates.durationUnit = 'month'
        updates.attendancePreset = 'daily'
        updates.attendanceDays = defaultAttendanceDays
      } else if (planTier === 'diario' || planTier === 'diario_trotadora') {
        updates.durationValue = 1
        updates.durationUnit = 'month'
        updates.attendancePreset = 'daily'
        updates.attendanceDays = defaultAttendanceDays
      } else if (planTier === 'promo_exclusiva_diario') {
        updates.durationValue = 1
        updates.durationUnit = 'month'
        updates.attendancePreset = 'daily'
        updates.attendanceDays = defaultAttendanceDays
      } else if (planTier === 'cliente_antiguo_3meses') {
        updates.durationValue = 3
        updates.durationUnit = 'month'
        updates.attendancePreset = 'daily'
        updates.attendanceDays = defaultAttendanceDays
      } else if (planTier === 'promo_cliente_medium_3meses') {
        updates.durationValue = 3
        updates.durationUnit = 'month'
        updates.attendancePreset = 'daily'
        updates.attendanceDays = defaultAttendanceDays
      } else if (planTier === 'por_dia') {
        updates.durationValue = 1
        updates.durationUnit = 'day'
        updates.attendancePreset = 'daily'
        updates.attendanceDays = [weekdayOrder[(new Date().getDay() + 6) % 7]] // Hoy
      }

      return { ...current, ...updates }
    })
  }

  const handleAttendancePresetChange = (preset: AttendancePreset) => {
    if (formData.planTier === 'por_dia') return

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
      // En pago por día no permitimos cambiar los días manualmente (se rige por la fecha)
      if (current.planTier === 'por_dia') {
        return current
      }

      // Si es plan interdiario y se intenta agregar un 4to día, no hacer nada
      if (checked && (current.planTier === 'interdiario' || current.planTier === 'interdiario_trotadora') && current.attendanceDays.length >= 3) {
        return current
      }

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

  const handleDelete = async () => {
    if (!formData.id || !onDelete) return
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!formData.id || !onDelete) return
    await onDelete(formData.id)
    setIsDeleteDialogOpen(false)
    onClose()
  }

  if (!isOpen) return null

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
                            onClick={() => {
                              const isPagoPorDia = Number(suggestedClient.dni) < 0;
                              if (isPagoPorDia) {
                                handlePlanTierChange('por_dia');
                                setFormData((current) => ({
                                  ...current,
                                  clientDni: suggestedClient.dni,
                                }));
                              } else {
                                setFormData((current) => ({
                                  ...current,
                                  clientDni: suggestedClient.dni,
                                  planTier: suggestedClient.planTier || current.planTier,
                                }));
                              }
                            }}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-secondary focus:bg-secondary focus:outline-none"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {suggestedClient.name || 'Sin nombre'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {Number(suggestedClient.dni) < 0 ? 'Pago por día' : `DNI ${suggestedClient.dni}`}
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
                    onValueChange={handlePlanTierChange}
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
                      min={1}
                      value={formData.durationValue}
                      onChange={(e) => setFormData({ ...formData, durationValue: Number(e.target.value) || 1 })}
                      className="bg-input border-border text-foreground"
                      required
                      disabled={formData.planTier === 'por_dia'}
                    />
                    <Select
                      value={formData.durationUnit}
                      onValueChange={(durationUnit: DurationUnit) => setFormData({ ...formData, durationUnit })}
                      disabled={formData.planTier !== 'basic'}
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

              </div>

              {!(formData.planTier === 'interdiario' || formData.planTier === 'interdiario_trotadora') && (
                <Field>
                  <FieldLabel>Días permitidos {formData.planTier === 'por_dia' && '(Sincronizado con fecha de inicio)'}</FieldLabel>
                  <div className={`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 rounded-xl border border-border/60 p-4 ${formData.planTier === 'por_dia' ? 'opacity-60 bg-secondary/10' : ''}`}>
                    {weekdayOrder.map((day) => (
                      <label key={day} className="flex items-center gap-2 text-sm text-foreground">
                        <Checkbox
                          checked={formData.attendanceDays.includes(day)}
                          onCheckedChange={(checked) => toggleDay(day, Boolean(checked))}
                          disabled={formData.planTier === 'por_dia'}
                        />
                        {weekdayLabels[day]}
                      </label>
                    ))}
                  </div>
                </Field>
              )}

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
                    Vence: {(() => {
                    const ed = planPreview.endDate;
                    return `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, '0')}-${String(ed.getDate()).padStart(2, '0')}`;
                  })()}{' '}                 </Badge>
                  <Badge variant="outline" className="rounded-lg border-border/60">
                    {paymentSummaryLabel(formData.amountPaid, planPreview.totalPrice)}
                  </Badge>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-lg border-border/60 text-[#FF6B6B]">
                    {validationMessage}
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

            <div className="flex justify-between gap-3">
              {mode === 'edit' && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Plan
                </Button>
              )}
              <div className="flex gap-3 ml-auto">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!planPreview || !selectedClient || isSaving}>
                  {isSaving && <ButtonSpinner />}
                  {mode === 'edit' ? 'Guardar Plan' : 'Crear Plan'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">¿Eliminar este plan?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Esta acción no se puede deshacer. El plan será eliminado permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-secondary">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
