import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth"
import { formatClient, normalizeClientStatus, normalizePaymentMethod, normalizeTurn, planPrices } from "@/lib/client-utils"
import { getPersistedUserId, notifyPaymentPending, notifySuperadmins } from "@/lib/notifications"
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
        appointments: true
      }
    });

    const formattedClients = clients.map(formatClient);

    return NextResponse.json(formattedClients);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener los clientes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request){
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const body = await request.json()
    const plan = String(body.plan || "Básico")
    const planPrice = Number(body.planPrice ?? planPrices[plan] ?? 0)
    const debt = Number(body.debt ?? 0)
    const status = normalizeClientStatus(body.status)
    const persistedUserId = await getPersistedUserId(user)

    const newClient = await prisma.client.create({
      data:{
        dni: Number(body.dni),
        nameComplete: body.name,
        joinDate: body.joinDate ? new Date(body.joinDate) : new Date(),
        fee: Number.isFinite(planPrice) ? planPrice : 0,
        mode: plan,
        paymentMethod: normalizePaymentMethod(body.paymentMethod),
        turn: normalizeTurn(body.turn),
        debt: Number.isFinite(debt) ? debt : 0,
        status,
        createdById: persistedUserId,
      }
    })

    if (user.role === "admin") {
      await notifySuperadmins({
        actorId: user.id,
        type: "client_created",
        title: "Nuevo cliente registrado",
        message: `${user.username} registró a ${newClient.nameComplete}.`,
        entityType: "client",
        entityId: newClient.dni,
      })
    }

    if (status === "pending_payment" || newClient.debt > 0) {
      await notifyPaymentPending(user, newClient)
    }

    return NextResponse.json(formatClient(newClient))
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear el cliente' },
      { status: 500 }
    )
  }
}
