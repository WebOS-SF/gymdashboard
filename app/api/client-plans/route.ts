import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth"
import { buildPlanPayload, formatClient, parseLocalDate } from "@/lib/client-utils"
import { getPersistedUserId } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const body = await request.json()
    const clientDni = Number(body.clientDni)

    if (!Number.isFinite(clientDni)) {
      return NextResponse.json({ error: "DNI inválido" }, { status: 400 })
    }

    const persistedUserId = await getPersistedUserId(user)
    const client = await prisma.client.findUnique({
      where: { dni: clientDni },
      include: {
        plans: {
          orderBy: {
            startDate: "desc",
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    let startDateInput = body.joinDate;
    if (!startDateInput) {
      const now = new Date();
      const peruTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
      startDateInput = `${peruTime.getUTCFullYear()}-${String(peruTime.getUTCMonth() + 1).padStart(2, '0')}-${String(peruTime.getUTCDate()).padStart(2, '0')}`;
    }
    const startDate = parseLocalDate(startDateInput)

    const computedPlan = buildPlanPayload({
      planTier: body.planTier,
      startDate,
      durationValue: Number(body.durationValue || 1),
      durationUnit: body.durationUnit || "month",
      attendanceDays: body.attendanceDays,
      amountPaid: Number(body.amountPaid || 0),
      paymentMethod: body.paymentMethod,
      turn: body.turn,
    })
    const { clientStatus, ...planPayload } = computedPlan

    const result = await prisma.$transaction(async (tx) => {
      await tx.clientPlan.updateMany({
        where: {
          clientDni,
          status: "active",
        },
        data: {
          status: "expired",
        },
      })

      await tx.clientPlan.create({
        data: {
          clientDni,
          createdById: persistedUserId,
          ...planPayload,
        },
      })

      return tx.client.update({
        where: { dni: clientDni },
        data: {
          fee: planPayload.totalPrice,
          mode: planPayload.name,
          paymentMethod: planPayload.paymentMethod,
          turn: planPayload.turn,
          debt: planPayload.debt,
          status: clientStatus,
        },
        include: {
          plans: {
            orderBy: {
              startDate: "desc",
            },
          },
        },
      })
    })


    return NextResponse.json(formatClient(result))
  } catch (error) {
    return NextResponse.json({ error: "Error al crear el plan" }, { status: 500 })
  }
}
