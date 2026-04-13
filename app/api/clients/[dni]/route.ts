import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
    request:Request,
    { params }: { params: Promise<{ dni: string }> }
) {
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
            planPrice: client.fee,
            status: client.debt > 0 ? "pending_payment" : "active",
            joinDate: client.joinDate.toISOString().split('T')[0],
            debts: client.debt > 0 ? [{
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
    try {
        const { dni } = await params
        const body = await request.json()
        // Calcular deuda total a partir del array de debts
        const totalDebt = body.debts ? body.debts.reduce((sum: number, debt: any) => sum + debt.amount, 0) : 0
        
        const updateClient = await prisma.client.update({
            where: {
                dni: Number(dni)
            },
            data: {
                nameComplete: body.name,
                fee: body.planPrice,
                mode: body.plan,
                paymentMethod: "efectivo",
                turn: "mañana",
                debt: totalDebt
            }
        })
        return NextResponse.json(updateClient)
    } catch (error) {
        return NextResponse.json({ error: "Error al actualizar el cliente" }, { status: 500 })
    }
}

export async function DELETE(
    request:Request,
    { params }: {params: Promise<{dni: string}>}
) {
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
