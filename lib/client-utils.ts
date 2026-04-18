export const planPrices: Record<string, number> = {
  "Básico": 15000,
  Premium: 25000,
  VIP: 35000,
}

export function normalizeClientStatus(status: unknown) {
  const value = String(status || "active").trim().toLowerCase()

  if (value === "inactive" || value === "inactivo") return "inactive"
  if (
    value === "pending_payment" ||
    value === "pending payment" ||
    value === "pago pendiente" ||
    value === "pendiente"
  ) {
    return "pending_payment"
  }

  return "active"
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

export function formatClient(client: {
  dni: number
  nameComplete: string
  joinDate: Date
  fee: number
  mode: string
  paymentMethod: string
  turn: string
  debt: number
  status: string
}) {
  const joinDate = client.joinDate.toISOString().split("T")[0]

  return {
    id: client.dni.toString(),
    dni: client.dni.toString(),
    name: client.nameComplete,
    phone: "",
    plan: client.mode,
    planPrice: client.fee,
    status: normalizeClientStatus(client.status),
    joinDate,
    paymentMethod: normalizePaymentMethod(client.paymentMethod),
    turn: normalizeTurn(client.turn),
    debt: client.debt,
    debts: client.debt > 0 ? [{
      id: `debt-${client.dni}`,
      productId: "general",
      productName: "Deuda General",
      amount: client.debt,
      date: joinDate,
    }] : [],
  }
}
