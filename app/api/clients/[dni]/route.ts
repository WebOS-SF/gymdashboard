import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatClient, normalizeClientStatus, normalizePaymentMethod, normalizeTurn, planPrices } from "@/lib/client-utils";

import { NextResponse } from "next/server";


export async function GET(

    request:Request,

    { params }: { params: Promise<{ dni: string }> }

) {
    const user = await requireUser()
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    try {

        const { dni } = await params

        const client = await prisma.client.findUnique({

            where: {

                dni: Number(dni)

            },

            include: {

                sales:true,

                boletas:true,

                appointments:true

            }

        })



        if (!client) {

            return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })

        }
        return NextResponse.json(formatClient(client))

    } catch (error) {

        return NextResponse.json({ error: "Error al obtener el cliente" }, { status: 500 })

    }

}



export async function PUT(

    request: Request,

    { params }: { params: Promise<{ dni: string }> }

) {
    const user = await requireUser()
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    try {

        const { dni } = await params

        const body = await request.json()
        const plan = String(body.plan || "Básico")
        const planPrice = Number(body.planPrice ?? planPrices[plan] ?? 0)

        const totalDebt = typeof body.debt !== "undefined"
            ? Number(body.debt || 0)
            : Array.isArray(body.debts)
            ? body.debts.reduce((sum: number, debt: { amount?: number }) => sum + Number(debt?.amount || 0), 0)
            : 0

        const updateClient = await prisma.client.update({

            where: {

                dni: Number(dni)

            },

            data: {

                nameComplete: body.name,

                joinDate: body.joinDate ? new Date(body.joinDate) : undefined,

                fee: Number.isFinite(planPrice) ? planPrice : 0,

                mode: plan,

                paymentMethod: normalizePaymentMethod(body.paymentMethod),

                turn: normalizeTurn(body.turn),

                debt: Number.isFinite(totalDebt) ? totalDebt : 0,

                status: normalizeClientStatus(body.status),

            }

        })

        return NextResponse.json(formatClient(updateClient))

    } catch (error) {

        return NextResponse.json({ error: "Error al actualizar el cliente" }, { status: 500 })

    }

}



export async function DELETE(

    request:Request,

    { params }: {params: Promise<{dni: string}>}

) {
    const user = await requireUser()
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    try {

        const { dni } = await params

        await prisma.client.delete({

            where:{

                dni:Number(dni)

            }

        })

        return NextResponse.json({ message: "Cliente eliminado exitosamente" })

    } catch (error) {

        return NextResponse.json({ error: "Error al eliminar el cliente" }, { status: 500 })

    }

}
