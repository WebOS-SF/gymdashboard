import { prisma } from "@/lib/prisma"
import { SessionUser } from "@/lib/auth"

export type NotificationType =
  | "sale_created"
  | "client_created"
  | "client_pending_payment"
  | "product_created"

interface NotificationInput {
  recipientIds: number[]
  actorId?: number
  type: NotificationType
  title: string
  message: string
  entityType?: string
  entityId?: string | number
}

function uniqueRecipientIds(recipientIds: number[]) {
  return Array.from(new Set(recipientIds.filter((id) => Number.isFinite(id) && id > 0)))
}

export async function getPersistedUserId(user: SessionUser) {
  const account = await prisma.adminAccount.findUnique({
    where: { id: user.id },
    select: { id: true },
  })

  return account?.id
}

export async function getUsersByRole(role: "admin" | "superadmin") {
  return prisma.adminAccount.findMany({
    where: { role },
    select: { id: true },
  })
}

export async function createNotifications({
  recipientIds,
  actorId,
  type,
  title,
  message,
  entityType,
  entityId,
}: NotificationInput) {
  const recipients = uniqueRecipientIds(recipientIds)
  if (recipients.length === 0) return
  const persistedActorId = actorId
    ? await prisma.adminAccount
        .findUnique({
          where: { id: actorId },
          select: { id: true },
        })
        .then((account) => account?.id)
    : undefined

  await prisma.notification.createMany({
    data: recipients.map((recipientId) => ({
      recipientId,
      actorId: persistedActorId,
      type,
      title,
      message,
      entityType,
      entityId: typeof entityId === "undefined" ? undefined : String(entityId),
    })),
  })
}

export async function notifySuperadmins(input: Omit<NotificationInput, "recipientIds">) {
  const superadmins = await getUsersByRole("superadmin")
  await createNotifications({
    ...input,
    recipientIds: superadmins.map((account) => account.id),
  })
}

export async function notifyAdmins(input: Omit<NotificationInput, "recipientIds">) {
  const admins = await getUsersByRole("admin")
  await createNotifications({
    ...input,
    recipientIds: admins.map((account) => account.id),
  })
}

export async function notifyPaymentPending(user: SessionUser, client: { dni: number; nameComplete: string; debt: number }) {
  const accounts = await prisma.adminAccount.findMany({
    select: { id: true },
  })

  const debtText = client.debt > 0 ? ` con deuda de S/ ${client.debt.toLocaleString("es-PE")}` : ""

  await createNotifications({
    recipientIds: accounts.map((account) => account.id),
    actorId: user.id,
    type: "client_pending_payment",
    title: "Cliente pendiente de pago",
    message: `${client.nameComplete}${debtText} está pendiente de pago.`,
    entityType: "client",
    entityId: client.dni,
  })
}
