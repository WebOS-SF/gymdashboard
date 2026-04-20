import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      }),
      prisma.notification.count({
        where: {
          recipientId: user.id,
          readAt: null,
        },
      }),
    ])

    return NextResponse.json({
      unreadCount,
      notifications: notifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        entityType: notification.entityType,
        entityId: notification.entityId,
        readAt: notification.readAt?.toISOString() ?? null,
        createdAt: notification.createdAt.toISOString(),
        actor: notification.actor
          ? {
              id: notification.actor.id,
              username: notification.actor.username,
              role: notification.actor.role,
            }
          : null,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener notificaciones" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const id = Number(body.id)

    if (Number.isFinite(id) && id > 0) {
      await prisma.notification.updateMany({
        where: {
          id,
          recipientId: user.id,
          readAt: null,
        },
        data: { readAt: new Date() },
      })
    } else {
      await prisma.notification.updateMany({
        where: {
          recipientId: user.id,
          readAt: null,
        },
        data: { readAt: new Date() },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar notificaciones" }, { status: 500 })
  }
}
