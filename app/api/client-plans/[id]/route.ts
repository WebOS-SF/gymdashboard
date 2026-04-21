import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth"
import { buildPlanPayload, formatClient } from "@/lib/client-utils"
import { notifyPaymentPending } from "@/lib/notifications"
import { NextResponse } from "next/server"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json()
    const planId = Number(id)

    const existingPlan = await prisma.clientPlan.findUnique({
      where: { id: planId },
      include: {
        client: {
          include: {
            plans: {
              orderBy: {
                startDate: "desc",
              },
            },
          },
        },
      },
    })

    if (!existingPlan) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })
    }

    const computedPlan = buildPlanPayload({
      planTier: body.planTier || existingPlan.planTier,
      startDate: body.joinDate ? new Date(body.joinDate) : existingPlan.startDate,
      durationValue: Number(body.durationValue || existingPlan.durationValue || 1),
      durationUnit: body.durationUnit || existingPlan.durationUnit || "month",
      attendanceDays: body.attendanceDays || existingPlan.attendanceDays,
      amountPaid: Number(typeof body.amountPaid !== "undefined" ? body.amountPaid : existingPlan.amountPaid),
      paymentMethod: body.paymentMethod || existingPlan.paymentMethod,
      turn: body.turn || existingPlan.turn,
    })
    const { clientStatus, ...planPayload } = computedPlan

    const result = await prisma.$transaction(async (tx) => {
      await tx.clientPlan.update({
        where: { id: planId },
        data: planPayload,
      })

      const activePlan = await tx.clientPlan.findFirst({
        where: {
          clientDni: existingPlan.clientDni,
          status: "active",
        },
        orderBy: {
          startDate: "desc",
        },
      })

      const shouldSyncClient = activePlan?.id === planId

      return tx.client.update({
        where: { dni: existingPlan.clientDni },
        data: shouldSyncClient
          ? {
              fee: planPayload.totalPrice,
              mode: planPayload.name,
              paymentMethod: planPayload.paymentMethod,
              turn: planPayload.turn,
              debt: planPayload.debt,
              status: clientStatus,
            }
          : {},
        include: {
          plans: {
            orderBy: {
              startDate: "desc",
            },
          },
        },
      })
    })

    if (computedPlan.debt > 0) {
      await notifyPaymentPending(user, {
        dni: result.dni,
        nameComplete: result.nameComplete,
        debt: computedPlan.debt,
      })
    }

    return NextResponse.json(formatClient(result))
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar el plan" }, { status: 500 })
  }
}
