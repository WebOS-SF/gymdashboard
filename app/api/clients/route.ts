import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth"
import { formatClient } from "@/lib/client-utils"
import { getPersistedUserId, notifySuperadmins } from "@/lib/notifications"
import { NextResponse } from "next/server"

export async function GET() {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const clients = await prisma.client.findMany({
      where: {
        dni: { not: 0 },
      },
      orderBy: {
        joinDate: "desc",
      },
      include: {
        sales: true,
        boletas: true,
        appointments: true,
        plans: {
          orderBy: {
            startDate: "desc",
          },
        },
      },
    })

    return NextResponse.json(clients.map(formatClient))
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener los clientes" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const body = await request.json()
    const dni = Number(body.dni)

    if (!Number.isFinite(dni)) {
      return NextResponse.json({ error: "DNI inválido" }, { status: 400 })
    }

    const persistedUserId = await getPersistedUserId(user)

    const existing = await prisma.client.findUnique({
      where: { dni },
    })

    if (existing) {
      return NextResponse.json({ error: "Ya existe un cliente con ese DNI" }, { status: 409 })
    }

    const result = await prisma.client.create({
      data: {
        dni,
        nameComplete: body.name,
        phone: body.phone || null,
        joinDate: new Date(),
        fee: 0,
        mode: "Sin plan",
        paymentMethod: "Efectivo",
        turn: "Mañana",
        debt: 0,
        status: "inactive",
        createdById: persistedUserId,
      },
      include: {
        plans: {
          orderBy: {
            startDate: "desc",
          },
        },
      },
    })

    if (!result) {
      return NextResponse.json({ error: "No se pudo registrar el cliente" }, { status: 500 })
    }

    if (user.role === "admin") {
      await notifySuperadmins({
        actorId: user.id,
        type: "client_created",
        title: "Registro de cliente actualizado",
        message: `${user.username} registró o renovó a ${result.nameComplete}.`,
        entityType: "client",
        entityId: result.dni,
      })
    }

    return NextResponse.json(formatClient(result))
  } catch (error) {
    return NextResponse.json(
      { error: "Error al crear el cliente" },
      { status: 500 }
    )
  }
}
