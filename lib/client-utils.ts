import { AttendanceStatus, ClientStatus, DurationUnit, PaymentSeverity, PaymentState, PlanTier, Weekday } from "./types"

export const planTierLabels: Record<PlanTier, string> = {
  basic: "Básico",
  interdiario: "Interdiario (3x)",
  diario: "Diario",
  por_dia: "Pago por día",
  promo_exclusiva_diario: "Promo Exclusiva Diario",
  cliente_antiguo_3meses: "Cliente Antiguo (3 meses)",
  promo_cliente_medium_3meses: "Promo Cliente Medium (3 meses)",
}

export const planTierPrices: Record<PlanTier, Record<string, number>> = {
  basic: {
    day: 8,
    month: 80,
  },
  interdiario: {
    month: 50,
  },
  diario: {
    month: 80,
  },
  por_dia: {
    day: 8,
  },
  promo_exclusiva_diario: {
    month: 75,
  },
  cliente_antiguo_3meses: {
    month: 200,
  },
  promo_cliente_medium_3meses: {
    month: 210,
  },
}

export const weekdayOrder: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]

export const weekdayLabels: Record<Weekday, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mie",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sab",
  sunday: "Dom",
}

export const durationUnitLabels: Record<string, string> = {
  day: "dia",
  month: "mes",
  week: "semana",
  year: "año",
}

export function normalizePlanTier(planTier: unknown): PlanTier {
  const value = String(planTier || "basic").trim().toLowerCase()
  if (value.includes("interdiario") || value.includes("inter")) return "interdiario"
  if (value.includes("diario") || value.includes("daily") || value.includes("completo")) return "diario"
  if (value.includes("por_dia") || value.includes("pago por dia") || value.includes("dia")) return "por_dia"
  if (value.includes("promo_exclusiva") || value.includes("promocion exclusiva")) return "promo_exclusiva_diario"
  if (value.includes("cliente_antiguo") || value.includes("cliente antiguo")) return "cliente_antiguo_3meses"
  if (value.includes("promo_cliente_medium") || value.includes("promo cliente medium")) return "promo_cliente_medium_3meses"
  if (value.includes("basic") || value.includes("basico") || value.includes("clasico")) return "basic"
  return "basic"
}

export function normalizeDurationUnit(unit: unknown): DurationUnit {
  const value = String(unit || "month").trim().toLowerCase()
  if (value === "day" || value === "dia") return "day"
  if (value === "week" || value === "semana") return "week"
  if (value === "month" || value === "mes" || value === "meses") return "month"
  if (value === "year" || value === "año") return "year"
  return "month"
}

export function normalizeClientStatus(status: unknown): ClientStatus {
  const value = String(status || "active").trim().toLowerCase()

  if (value === "inactive" || value === "inactivo") return "inactive"
  if (
    value === "pending_critical" ||
    value === "pending critical" ||
    value === "pago pendiente critico" ||
    value === "critico"
  ) {
    return "pending_critical"
  }
  if (
    value === "pending_moderate" ||
    value === "pending moderate" ||
    value === "pago pendiente moderado" ||
    value === "pendiente"
  ) {
    return "pending_moderate"
  }

  return "active"
}

export function normalizeAttendanceStatus(status: unknown): AttendanceStatus {
  const value = String(status || "").trim().toUpperCase()
  if (value === "ABSENT") return "ABSENT"
  if (value === "PRESENT") return "PRESENT"
  return "NONE"
}

export function normalizePaymentMethod(paymentMethod: unknown) {
  const value = String(paymentMethod || "Efectivo").trim().toLowerCase()

  if (value === "tarjeta") return "Tarjeta"
  if (value === "plin") return "Plin"
  if (value === "yape") return "Yape"

  return "Efectivo"
}

export function normalizeTurn(turn: unknown) {
  const value = String(turn || "Mañana").trim().toLowerCase()

  if (value === "tarde") return "Tarde"
  if (value === "noche") return "Noche"

  return "Mañana"
}

function toIsoDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDuration(startDate: Date, durationValue: number, durationUnit: DurationUnit) {
  const endDate = new Date(startDate)

  if (durationUnit === "day") {
    endDate.setDate(endDate.getDate() + Math.max(durationValue - 1, 0))
  } else if (durationUnit === "week") {
    endDate.setDate(endDate.getDate() + Math.max(durationValue * 7 - 1, 0))
  } else if (durationUnit === "month") {
    endDate.setMonth(endDate.getMonth() + durationValue)
    endDate.setDate(endDate.getDate() - 1)
  } else if (durationUnit === "year") {
    endDate.setFullYear(endDate.getFullYear() + durationValue)
    endDate.setDate(endDate.getDate() - 1)
  } else {
    // Default to month to avoid explosive duration jumps
    endDate.setMonth(endDate.getMonth() + durationValue)
    endDate.setDate(endDate.getDate() - 1)
  }

  return endDate
}

function getWeekday(date: Date): Weekday {
  const index = date.getDay()
  return weekdayOrder[(index + 6) % 7]
}

export function getTodayWeekday(): Weekday {
  const now = new Date()
  // Ajustar a la zona horaria de Perú (UTC-5) para determinar el día correcto
  const peruTime = new Date(now.getTime() - (5 * 60 * 60 * 1000))
  const index = peruTime.getUTCDay() // 0=Dom, 1=Lun, ...
  return weekdayOrder[(index + 6) % 7]
}

export function normalizeWeekdays(days: unknown): Weekday[] {
  const values = Array.isArray(days) ? days : []
  const normalized = values
    .map((day) => String(day || "").trim().toLowerCase())
    .filter((day): day is Weekday => weekdayOrder.includes(day as Weekday))

  return weekdayOrder.filter((day) => normalized.includes(day))
}

export function formatAttendanceLabel(days: Weekday[]) {
  if (days.length === 0) return "Sin dias"
  if (days.length === weekdayOrder.length) return "Diario"
  return days.map((day) => weekdayLabels[day]).join(", ")
}

export function countSessionsBetween(startDate: Date, endDate: Date, attendanceDays: Weekday[]) {
  const selected = new Set(attendanceDays)
  let total = 0
  const cursor = startOfDay(startDate)
  const limit = startOfDay(endDate)

  while (cursor <= limit) {
    if (selected.has(getWeekday(cursor))) {
      total += 1
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return total
}

export function calculatePlanPrice(input: {
  planTier: PlanTier
  startDate: Date
  durationValue: number
  durationUnit: DurationUnit
  attendanceDays: Weekday[]
}) {
  const { planTier, startDate, durationValue, durationUnit, attendanceDays } = input
  const endDate = addDuration(startDate, durationValue, durationUnit)
  const isFullSchedule = attendanceDays.length === weekdayOrder.length
  let sessionCount = countSessionsBetween(startDate, endDate, attendanceDays)
  
  // For single day plans, ensure at least 1 session if the day is not specified correctly
  if (durationValue === 1 && durationUnit === "day" && sessionCount === 0) {
    sessionCount = 1
  }

  const prices = planTierPrices[planTier] || planTierPrices.basic

  let pricingMode = "per_day"
  let totalPrice = sessionCount * (prices.day || 8)

  if (planTier === "interdiario" && durationUnit === "month") {
    pricingMode = "fixed_interdiario"
    totalPrice = durationValue * 50
  } else if (planTier === "diario" && durationUnit === "month") {
    pricingMode = "fixed_diario"
    totalPrice = durationValue * 80
  } else if (planTier === "promo_exclusiva_diario" && durationUnit === "month") {
    pricingMode = "fixed_promo_exclusiva"
    totalPrice = durationValue * 75
  } else if (planTier === "cliente_antiguo_3meses" && durationUnit === "month") {
    pricingMode = "fixed_cliente_antiguo"
    totalPrice = durationValue * 200
  } else if (planTier === "promo_cliente_medium_3meses" && durationUnit === "month") {
    pricingMode = "fixed_promo_medium"
    totalPrice = durationValue * 210
  } else if (planTier === "por_dia") {
    pricingMode = "fixed_day"
    totalPrice = Math.max(1, sessionCount) * 8
  } else if (durationUnit === "month" && prices.month) {
    pricingMode = "full_month"
    totalPrice = durationValue * prices.month
  } else if (isFullSchedule && durationUnit === "week" && prices.week) {
    pricingMode = "full_week"
    totalPrice = durationValue * prices.week
  } else if (isFullSchedule && durationUnit === "year" && prices.year) {
    pricingMode = "full_year"
    totalPrice = durationValue * prices.year
  }

  return {
    endDate,
    pricingMode,
    sessionCount,
    totalPrice,
  }
}

export function normalizePaymentState(state: unknown): PaymentState {
  const value = String(state || "").trim().toLowerCase()

  if (value === "paid" || value === "pagado" || value === "complete") return "paid"
  if (value === "partial" || value === "parcial") return "partial"
  return "unpaid"
}

export function calculatePaymentState(amountPaid: number, totalPrice: number): PaymentState {
  if (amountPaid >= totalPrice) return "paid"
  if (amountPaid > 0) return "partial"
  return "unpaid"
}

export function calculatePaymentSeverity(input: {
  startDate: Date
  endDate: Date
  debt: number
  now?: Date
}): PaymentSeverity {
  const now = startOfDay(input.now || new Date())
  if (input.debt <= 0) return "none"

  const start = startOfDay(input.startDate)
  const end = startOfDay(input.endDate)

  if (now > end) return "critical"

  const totalDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1)
  const elapsedDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000) + 1)

  return elapsedDays / totalDays >= 0.5 ? "moderate" : "none"
}

export function deriveClientStatus(input: {
  endDate: Date
  debt: number
  paymentSeverity: PaymentSeverity
  now?: Date
}): ClientStatus {
  const now = startOfDay(input.now || new Date())
  const end = startOfDay(input.endDate)

  if (input.debt > 0 && input.paymentSeverity === "critical") return "pending_critical"
  if (input.debt > 0 && input.paymentSeverity === "moderate") return "pending_moderate"
  if (now > end) return "inactive"
  return "active"
}

export function buildPlanName(planTier: PlanTier, durationValue: number, durationUnit: DurationUnit, attendanceDays: Weekday[]) {
  const unit = durationUnitLabels[durationUnit] || durationUnit
  const amountLabel = `${durationValue} ${unit}${durationValue === 1 ? "" : durationUnit === "month" ? "es" : "s"}`
  return `${planTierLabels[planTier] || planTier} · ${amountLabel} · ${formatAttendanceLabel(attendanceDays)}`
}

export function buildPlanPayload(input: {
  planTier: unknown
  startDate: Date
  durationValue: number
  durationUnit: DurationUnit
  attendanceDays: Weekday[]
  amountPaid: number
  paymentMethod: unknown
  turn: unknown
}) {
  const planTier = normalizePlanTier(input.planTier)
  const durationValue = Math.max(1, Number(input.durationValue || 1))
  const durationUnit = input.durationUnit
  const attendanceDays = normalizeWeekdays(input.attendanceDays)
  const startDate = startOfDay(input.startDate)
  const { endDate, pricingMode, sessionCount, totalPrice } = calculatePlanPrice({
    planTier,
    startDate,
    durationValue,
    durationUnit,
    attendanceDays,
  })
  const amountPaid = Math.max(0, Number(input.amountPaid || 0))
  const debt = Math.max(totalPrice - amountPaid, 0)
  const paymentState = calculatePaymentState(amountPaid, totalPrice)
  const paymentSeverity = calculatePaymentSeverity({ startDate, endDate, debt })
  const status = deriveClientStatus({ endDate, debt, paymentSeverity })
  const attendanceLabel = formatAttendanceLabel(attendanceDays)
  const name = buildPlanName(planTier, durationValue, durationUnit, attendanceDays)

  return {
    planTier,
    name,
    startDate,
    endDate,
    durationValue,
    durationUnit,
    attendanceDays,
    attendanceLabel,
    pricingMode,
    sessionCount,
    totalPrice,
    amountPaid,
    debt,
    paymentState,
    paymentSeverity,
    paymentMethod: normalizePaymentMethod(input.paymentMethod),
    turn: normalizeTurn(input.turn),
    status: status === "inactive" ? "expired" : "active",
    clientStatus: status,
  }
}

export function formatClient(client: {
  dni: number
  nameComplete: string
  phone?: string | null
  joinDate: Date
  fee: number
  mode: string
  paymentMethod: string
  turn: string
  debt: number
  status: string
  plans?: Array<{
    id: number
    planTier?: string
    name: string
    startDate: Date
    endDate: Date
    durationValue: number
    durationUnit: string
    attendanceDays: string[]
    attendanceLabel: string
    pricingMode: string
    sessionCount: number
    totalPrice: number
    amountPaid: number
    debt: number
    paymentState: string
    paymentSeverity: string
    paymentMethod: string
    turn: string
    status: string
  }>
  attendances?: Array<{
    id: string
    date: Date
    status: string
  }>
}) {
  const memberSince = toIsoDate(client.joinDate)
  const orderedPlans = [...(client.plans || [])].sort(
    (a, b) => b.startDate.getTime() - a.startDate.getTime()
  )
  const currentPlan = orderedPlans[0]
  const debt = currentPlan?.debt ?? client.debt ?? 0
  const status = currentPlan
    ? deriveClientStatus({
      endDate: currentPlan.endDate,
      debt,
      paymentSeverity: calculatePaymentSeverity({
        startDate: currentPlan.startDate,
        endDate: currentPlan.endDate,
        debt,
      }),
    })
    : normalizeClientStatus(client.status)
  const totalPaid = orderedPlans.reduce((sum, plan) => sum + Number(plan.amountPaid || 0), 0)

  return {
    id: client.dni.toString(),
    dni: client.dni.toString(),
    name: client.nameComplete,
    phone: client.phone || "",
    plan: currentPlan?.name || client.mode,
    planTier: normalizePlanTier(currentPlan?.planTier),
    planPrice: currentPlan?.totalPrice ?? client.fee,
    status,
    joinDate: currentPlan ? toIsoDate(currentPlan.startDate) : memberSince,
    memberSince,
    expiresAt: currentPlan ? toIsoDate(currentPlan.endDate) : undefined,
    attendanceLabel: currentPlan?.attendanceLabel || undefined,
    attendanceDays: normalizeWeekdays(currentPlan?.attendanceDays || []),
    amountPaid: currentPlan?.amountPaid ?? Math.max((client.fee || 0) - debt, 0),
    paymentState: normalizePaymentState(currentPlan?.paymentState),
    paymentSeverity: calculatePaymentSeverity({
      startDate: currentPlan?.startDate || client.joinDate,
      endDate: currentPlan?.endDate || client.joinDate,
      debt,
    }),
    totalPaid,
    paymentMethod: normalizePaymentMethod(currentPlan?.paymentMethod || client.paymentMethod),
    turn: normalizeTurn(currentPlan?.turn || client.turn),
    debt,
    debts: debt > 0 ? [{
      id: `debt-${client.dni}-${currentPlan?.id || "current"}`,
      productId: "membership",
      productName: currentPlan?.name || "Plan vigente",
      amount: debt,
      date: currentPlan ? toIsoDate(currentPlan.endDate) : memberSince,
    }] : [],
    plans: orderedPlans.map((plan) => ({
      id: String(plan.id),
      planTier: normalizePlanTier(plan.planTier),
      name: plan.name,
      startDate: toIsoDate(plan.startDate),
      endDate: toIsoDate(plan.endDate),
      durationValue: plan.durationValue,
      durationUnit: normalizeDurationUnit(plan.durationUnit),
      attendanceDays: normalizeWeekdays(plan.attendanceDays),
      attendanceLabel: plan.attendanceLabel,
      pricingMode: plan.pricingMode,
      sessionCount: plan.sessionCount,
      totalPrice: plan.totalPrice,
      amountPaid: plan.amountPaid,
      debt: plan.debt,
      paymentState: normalizePaymentState(plan.paymentState),
      paymentSeverity: calculatePaymentSeverity({
        startDate: plan.startDate,
        endDate: plan.endDate,
        debt: plan.debt,
      }),
      paymentMethod: normalizePaymentMethod(plan.paymentMethod),
      turn: normalizeTurn(plan.turn),
      status: deriveClientStatus({
        endDate: plan.endDate,
        debt: plan.debt,
        paymentSeverity: calculatePaymentSeverity({
          startDate: plan.startDate,
          endDate: plan.endDate,
          debt: plan.debt,
        }),
      }) === "inactive" ? "expired" : "active",
    })),
    todayAttendance: normalizeAttendanceStatus(client.attendances?.[0]?.status),
  }
}
