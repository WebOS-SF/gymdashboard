import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

import { NextResponse } from "next/server";

const planPrices: Record<string, number> = {
    "Básico": 15000,
    Premium: 25000,
    VIP: 35000,
}


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
        const formattedClient = {
            id: client.dni.toString(),
            dni: client.dni.toString(),
            name: client.nameComplete,
            phone: "",
            plan: client.mode,
            planPrice: user.role === "superadmin" ? client.fee : 0,
            status: client.debt > 0 ? "pending_payment" : "active",
            joinDate: client.joinDate.toISOString().split('T')[0],
                debts: user.role === "superadmin" && client.debt > 0 ? [{

                id: `debt-${client.dni}`,

                productId: 'general',

                productName: 'Deuda General',

                amount: client.debt,

                date: client.joinDate.toISOString().split('T')[0]

            }] : []

        }



        return NextResponse.json(formattedClient)

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

        const totalDebt = user.role === "superadmin" && Array.isArray(body.debts)
            ? body.debts.reduce((sum: number, debt: { amount?: number }) => sum + Number(debt?.amount || 0), 0)
            : user.role === "superadmin" ? Number(body.debt || 0) : undefined

        const updateClient = await prisma.client.update({

            where: {

                dni: Number(dni)

            },

            data: {

                nameComplete: body.name,

                fee: user.role === "superadmin" ? Number(body.planPrice || planPrices[plan] || 0) : undefined,

                mode: plan,

                paymentMethod: body.paymentMethod ?? "efectivo",

                turn: body.turn ?? "mañana",

                debt: totalDebt

            }

        })

        // Return formatted client data like the GET endpoint
        const formattedClient = {
            id: updateClient.dni.toString(),
            dni: updateClient.dni.toString(),
            name: updateClient.nameComplete,
            phone: "",
            plan: updateClient.mode,
            planPrice: user.role === "superadmin" ? updateClient.fee : 0,
            status: updateClient.debt > 0 ? "pending_payment" : "active",
            joinDate: updateClient.joinDate.toISOString().split('T')[0],
            debts: user.role === "superadmin" && updateClient.debt > 0 ? [{
                id: `debt-${updateClient.dni}`,
                productId: 'general',
                productName: 'Deuda General',
                amount: updateClient.debt,
                date: updateClient.joinDate.toISOString().split('T')[0]
            }] : []
        }

        return NextResponse.json(formattedClient)

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
