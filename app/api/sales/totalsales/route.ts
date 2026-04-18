import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(){
    const user = await requireSuperadmin()
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    try {
    const totalSales = await prisma.salesRecord.aggregate({
        _sum: {
            amount: true
        }
    })
    return NextResponse.json(totalSales)
    } catch (error) {
        return NextResponse.json({ error: "Error al obtener las ventas totales" })
    }
}
